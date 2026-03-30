import type { Request, Response } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { assessments, appointments, users } from "../db/schema";
import type { AuthRequest } from "../middleware/verifyJwt";
import {
  DISEASE_SYMPTOM_MAP,
  DEFAULT_RECOMMENDATION,
  QUIZ_QUESTION_IDS,
  SYMPTOM_TO_ML_FEATURES,
  DISEASE_TO_SPECIALTY,
  type SymptomKey,
} from "../constants/quiz";

const submitAssessmentSchema = z.object({
  answers: z.record(z.string(), z.boolean()),
});

const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8001";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();

type MlPredictResponse = {
  predicted_disease: string;
  confidence: number;
  top_diseases: { disease: string; confidence: number }[];
};

type MlFeaturesResponse = {
  features: string[];
  count: number;
};

type PredictionResult = {
  disease: string;
  specialty: string;
  confidence: "high" | "medium" | "low";
  topPredictions: Array<{ disease: string; confidence: number }>;
  selectedSymptoms: string[];
};

let cachedMlFeatures: { features: string[]; expiresAt: number } | null = null;

function titleCaseWords(value: string): string {
  return value
    .replace(/[._]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildSelectedSymptoms(answers: Record<string, boolean>): string[] {
  const labels = new Set<string>();
  for (const [key, value] of Object.entries(answers)) {
    if (!value) continue;
    labels.add(titleCaseWords(key));
    const mapped = SYMPTOM_TO_ML_FEATURES[key as SymptomKey];
    if (mapped) {
      for (const f of mapped) labels.add(titleCaseWords(f));
    }
  }
  return Array.from(labels).slice(0, 12);
}

function getActiveMlFeatures(answers: Record<string, boolean>): Set<string> {
  const activeFeatures = new Set<string>();
  for (const [symptomKey, answered] of Object.entries(answers)) {
    if (!answered) continue;
    const mapped = SYMPTOM_TO_ML_FEATURES[symptomKey as SymptomKey];
    if (mapped) {
      for (const f of mapped) activeFeatures.add(f);
    } else {
      activeFeatures.add(symptomKey);
    }
  }
  return activeFeatures;
}

function buildMlPayload(
  answers: Record<string, boolean>,
  allFeatureNames: string[],
): Record<string, number> {
  const activeFeatures = getActiveMlFeatures(answers);
  const payload: Record<string, number> = {};
  for (const feature of allFeatureNames) {
    payload[feature] = activeFeatures.has(feature) ? 1 : 0;
  }
  return payload;
}

async function fetchMlFeatures(): Promise<string[]> {
  if (cachedMlFeatures && cachedMlFeatures.expiresAt > Date.now()) {
    return cachedMlFeatures.features;
  }
  const featuresRes = await fetch(`${ML_API_URL}/api/v1/features`);
  if (!featuresRes.ok) {
    throw new Error("ML features endpoint failed");
  }
  const featuresData = (await featuresRes.json()) as MlFeaturesResponse;
  cachedMlFeatures = {
    features: featuresData.features,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  return featuresData.features;
}

function buildFallbackReasoning(prediction: PredictionResult): string {
  const symptomsList = prediction.selectedSymptoms.slice(0, 8);
  const symptoms = symptomsList.join(", ");
  const primary = prediction.topPredictions[0];
  const alternatives = prediction.topPredictions
    .slice(1, 3)
    .map((p) => `${p.disease} (${Math.round(p.confidence * 100)}%)`);

  if (prediction.confidence === "low") {
    return [
      `The model's highest-ranked match is ${prediction.disease}${primary ? ` (${Math.round(primary.confidence * 100)}%)` : ""}, but confidence is low due to overlap across conditions.`,
      alternatives.length > 0
        ? `We also considered ${alternatives.join(" and ")} while reviewing the same symptom pattern${symptoms ? ` (${symptoms})` : ""}.`
        : `We also considered multiple alternative conditions while reviewing the same symptom pattern${symptoms ? ` (${symptoms})` : ""}.`,
      "Use this as guidance only and confirm with a clinician.",
    ].join(" ");
  }

  return [
    `The highest-confidence pattern match is ${prediction.disease}${primary ? ` (${Math.round(primary.confidence * 100)}%)` : ""}.`,
    symptoms
      ? `Key signals included: ${symptoms}.`
      : "The prediction is based on the full symptom profile you submitted.",
    alternatives.length > 0
      ? `Other considered possibilities were ${alternatives.join(" and ")}.`
      : "Alternative differential possibilities were evaluated as lower-likelihood.",
    "This is a triage aid, not a definitive diagnosis.",
  ].join(" ");
}

async function generateReasoningWithGemini(
  prediction: PredictionResult,
): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  const prompt = [
    "You are a medical triage assistant.",
    "Write 3-4 concise but in-depth sentences for a non-clinical user.",
    "Explain why the highest-ranked condition is strongest using symptom pattern language.",
    "Always mention at least two alternatives considered.",
    "If confidence is low, explicitly say confidence is low and alternatives remain plausible.",
    "Do not claim diagnosis certainty. Mention this is informational only.",
    `Top prediction: ${prediction.disease}`,
    `Confidence bucket: ${prediction.confidence}`,
    `Selected symptoms: ${prediction.selectedSymptoms.join(", ") || "None"}`,
    `Top 3 predictions: ${prediction.topPredictions
      .map((p) => `${p.disease} (${Math.round(p.confidence * 100)}%)`)
      .join(", ")}`,
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 260 },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function predictWithMlApi(
  answers: Record<string, boolean>,
): Promise<PredictionResult> {
  const selectedSymptoms = buildSelectedSymptoms(answers);
  try {
    const features = await fetchMlFeatures();
    const payload = buildMlPayload(answers, features);

    const predictRes = await fetch(`${ML_API_URL}/api/v1/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms: payload, top_n: 3 }),
    });

    if (!predictRes.ok) throw new Error("ML predict endpoint failed");
    const prediction = (await predictRes.json()) as MlPredictResponse;

    const confidenceScore = prediction.confidence;
    const confidenceLevel: "high" | "medium" | "low" =
      confidenceScore >= 0.7
        ? "high"
        : confidenceScore >= 0.4
          ? "medium"
          : "low";

    return {
      disease: prediction.predicted_disease,
      specialty: DISEASE_TO_SPECIALTY[prediction.predicted_disease] ?? "general",
      confidence: confidenceLevel,
      topPredictions: (prediction.top_diseases || [])
        .slice(0, 3)
        .map((d) => ({ disease: d.disease, confidence: d.confidence })),
      selectedSymptoms,
    };
  } catch {
    return predictDiseaseRuleBased(answers);
  }
}

function predictDiseaseRuleBased(
  answers: Record<string, boolean>,
): PredictionResult {
  const positiveSymptoms = new Set<SymptomKey>();
  for (const id of QUIZ_QUESTION_IDS) {
    const symptomKey = id as SymptomKey;
    if (answers[symptomKey] === true) {
      positiveSymptoms.add(symptomKey);
    }
  }

  for (const mapping of DISEASE_SYMPTOM_MAP) {
    const hasAllRequired = mapping.requiredSymptoms.every((s) =>
      positiveSymptoms.has(s),
    );
    if (hasAllRequired) {
      return {
        disease: mapping.disease,
        specialty: mapping.specialty,
        confidence: mapping.confidence,
        topPredictions: [{ disease: mapping.disease, confidence: 0.72 }],
        selectedSymptoms: buildSelectedSymptoms(answers),
      };
    }
  }

  return {
    disease: DEFAULT_RECOMMENDATION.disease,
    specialty: DEFAULT_RECOMMENDATION.specialty,
    confidence: DEFAULT_RECOMMENDATION.confidence,
    topPredictions: [{ disease: DEFAULT_RECOMMENDATION.disease, confidence: 0.35 }],
    selectedSymptoms: buildSelectedSymptoms(answers),
  };
}

async function buildReasoning(prediction: PredictionResult): Promise<string> {
  const gemini = await generateReasoningWithGemini(prediction);
  return gemini ?? buildFallbackReasoning(prediction);
}

export async function getQuizSymptoms(_req: Request, res: Response) {
  try {
    const features = await fetchMlFeatures();
    const quizSymptoms = features.map((feature) => ({
      id: feature,
      symptomKey: feature,
      text: `Do you have ${titleCaseWords(feature).toLowerCase()}?`,
    }));
    return res.json({ symptoms: quizSymptoms, source: "ml_features" });
  } catch {
    const fallbackSet = new Set<string>();
    for (const symptomKey of QUIZ_QUESTION_IDS) fallbackSet.add(symptomKey);
    for (const mapped of Object.values(SYMPTOM_TO_ML_FEATURES)) {
      for (const value of mapped) fallbackSet.add(value);
    }
    const fallback = Array.from(fallbackSet).map((symptomKey) => ({
      id: symptomKey,
      symptomKey,
      text: `Do you have ${titleCaseWords(symptomKey).toLowerCase()}?`,
    }));
    return res.json({ symptoms: fallback, source: "fallback" });
  }
}

export async function submitAssessment(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = submitAssessmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { answers } = parseResult.data;
  const prediction = await predictWithMlApi(answers);
  const reasoning = await buildReasoning(prediction);

  const [created] = await db
    .insert(assessments)
    .values({
      userId: authUser.id,
      answers,
      predictedDisease: prediction.disease,
      recommendedSpecialty: prediction.specialty,
      confidence: prediction.confidence,
      topPredictions: prediction.topPredictions,
      reasoning,
      selectedSymptoms: prediction.selectedSymptoms,
    })
    .returning();

  return res.status(201).json({
    assessment: {
      id: created.id,
      predictedDisease: created.predictedDisease,
      recommendedSpecialty: created.recommendedSpecialty,
      confidence: created.confidence,
      topPredictions: created.topPredictions ?? [],
      reasoning: created.reasoning ?? "",
      selectedSymptoms: created.selectedSymptoms ?? [],
      createdAt: created.createdAt,
    },
  });
}

export async function getUserAssessments(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.userId, authUser.id))
    .orderBy(desc(assessments.createdAt))
    .limit(20);

  return res.json({
    assessments: rows.map((a) => ({
      id: a.id,
      predictedDisease: a.predictedDisease,
      recommendedSpecialty: a.recommendedSpecialty,
      confidence: a.confidence,
      topPredictions: a.topPredictions ?? [],
      reasoning: a.reasoning ?? "",
      selectedSymptoms: a.selectedSymptoms ?? [],
      createdAt: a.createdAt,
      answers: a.answers,
    })),
  });
}

export async function getDashboardSummary(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const [lastCheckupRow] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.userId, authUser.id))
    .orderBy(desc(assessments.createdAt))
    .limit(1);

  const now = new Date();
  const upcomingRows = await db
    .select({
      appointment: appointments,
      doctor: users,
    })
    .from(appointments)
    .leftJoin(users, eq(users.id, appointments.doctorId))
    .where(eq(appointments.patientId, authUser.id))
    .orderBy(appointments.startsAt)
    .limit(10);

  const nextAppointment =
    upcomingRows
      .filter(
        (r) =>
          new Date(r.appointment.startsAt) >= now &&
          r.appointment.status === "scheduled",
      )
      .map((r) => ({
        id: r.appointment.id,
        doctorName: r.doctor?.name ?? "Unknown doctor",
        doctorSpecialty: r.doctor?.specialty ?? null,
        startsAt: r.appointment.startsAt,
        endsAt: r.appointment.endsAt,
        status: r.appointment.status,
      }))[0] ?? null;

  const allAssessmentRows = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(eq(assessments.userId, authUser.id));

  return res.json({
    lastCheckup: lastCheckupRow
      ? {
          id: lastCheckupRow.id,
          predictedDisease: lastCheckupRow.predictedDisease,
          recommendedSpecialty: lastCheckupRow.recommendedSpecialty,
          confidence: lastCheckupRow.confidence,
          createdAt: lastCheckupRow.createdAt,
        }
      : null,
    nextAppointment,
    totalAssessments: allAssessmentRows.length,
  });
}
