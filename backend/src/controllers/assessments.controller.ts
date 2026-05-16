import type { Request, Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

import { db } from "../db/client";
import { assessments, appointments, users } from "../db/schema";
import type { AuthRequest } from "../middleware/verifyJwt";
import {
  CATEGORY_KEYWORDS,
  diseaseMatchesCategory,
  inferSpecialty,
  normalizeCategory,
  type Category,
} from "../constants/quiz";

const submitAssessmentSchema = z.object({
  answers: z.record(z.string(), z.boolean()),
  category: z.string().trim().optional(),
});

const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8001";
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "qwen/qwen3-32b";
const ADAPTIVE_LIMIT = 30;

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

type AssessmentAdvice = {
  overview: string;
  medications: string[];
  selfCare: string[];
  warningSigns: string[];
  disclaimer: string;
  source: "groq" | "fallback";
};

type QuestionFamily = { key: string; keywords: string[] };

const FOLLOWUP_FAMILIES: QuestionFamily[] = [
  { key: "fever", keywords: ["fever", "chills", "sweat"] },
  { key: "respiratory", keywords: ["cough", "breath", "wheez", "throat"] },
  { key: "digestive", keywords: ["nausea", "vomit", "stomach", "abd", "diarr"] },
  { key: "neurological", keywords: ["head", "dizz", "seizure", "memory"] },
  { key: "pain", keywords: ["pain", "ache", "stiff", "swelling"] },
];

let cachedMlFeatures: { features: string[]; expiresAt: number } | null = null;
let cachedCsvSymptoms: string[] | null = null;

function titleCaseWords(value: string): string {
  return value
    .replace(/[._]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeSymptomKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[.\s-]+/g, "_")
    .toLowerCase();
}

function loadSymptomsFromTestCsv(): string[] {
  if (cachedCsvSymptoms) return cachedCsvSymptoms;
  try {
    const csvPath = path.resolve(
      process.cwd(),
      "..",
      "models",
      "data",
      "raw",
      "test_data.csv",
    );
    const file = fs.readFileSync(csvPath, "utf-8");
    const [headerLine] = file.split(/\r?\n/);
    const seen = new Map<string, string>();
    for (const rawHeader of (headerLine ?? "").split(",")) {
      const raw = rawHeader.trim();
      if (!raw || raw === "prognosis") continue;
      seen.set(normalizeSymptomKey(raw), raw);
    }
    cachedCsvSymptoms = Array.from(seen.values());
    return cachedCsvSymptoms;
  } catch {
    return [];
  }
}

function symptomTokens(value: string): string[] {
  return normalizeSymptomKey(value).split("_").filter(Boolean);
}

function belongsToCategory(feature: string, category: Category): boolean {
  if (category === "general") return true;
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords.length) return true;
  const key = normalizeSymptomKey(feature);
  return keywords.some((kw) => key.includes(kw));
}

function sameFamily(featureA: string, featureB: string): boolean {
  const a = normalizeSymptomKey(featureA);
  const b = normalizeSymptomKey(featureB);
  return FOLLOWUP_FAMILIES.some(
    (f) =>
      f.keywords.some((kw) => a.includes(kw)) && f.keywords.some((kw) => b.includes(kw)),
  );
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(symptomTokens(a));
  let overlap = 0;
  for (const token of symptomTokens(b)) {
    if (aTokens.has(token)) overlap += 1;
  }
  return overlap;
}

function rankAdaptiveSymptoms(params: {
  allFeatures: string[];
  category: Category;
  positiveFeatures: Set<string>;
  askedFeatures: Set<string>;
  negativeFeatures: Set<string>;
  limit: number;
}): string[] {
  const { allFeatures, category, positiveFeatures, askedFeatures, negativeFeatures, limit } =
    params;

  const scored = allFeatures
    .filter((feature) => !askedFeatures.has(feature))
    .map((feature) => {
      const baseWeight = 1;
      const categoryBoost = belongsToCategory(feature, category) ? 5 : 0;

      let followupBoost = 0;
      for (const positive of positiveFeatures) {
        const overlap = tokenOverlap(feature, positive);
        if (overlap > 0) followupBoost += Math.min(6, overlap * 2);
        if (sameFamily(feature, positive)) followupBoost += 2;
      }

      let contradictionPenalty = 0;
      for (const negative of negativeFeatures) {
        const overlap = tokenOverlap(feature, negative);
        if (overlap > 0) contradictionPenalty += Math.min(8, overlap * 3);
        if (sameFamily(feature, negative)) contradictionPenalty += 2;
      }

      return {
        feature,
        priorityScore: baseWeight + followupBoost + categoryBoost - contradictionPenalty,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return scored.slice(0, Math.max(1, Math.min(limit, ADAPTIVE_LIMIT))).map((x) => x.feature);
}

function buildSelectedSymptoms(answers: Record<string, boolean>): string[] {
  const labels = new Set<string>();
  for (const [key, value] of Object.entries(answers)) {
    if (value) labels.add(titleCaseWords(key));
  }
  return Array.from(labels).slice(0, 12);
}

function buildMlPayload(
  answers: Record<string, boolean>,
  allFeatureNames: string[],
): Record<string, number> {
  const positiveExact = new Set<string>();
  const positiveNormalized = new Set<string>();
  for (const [key, value] of Object.entries(answers)) {
    if (!value) continue;
    positiveExact.add(key);
    positiveNormalized.add(normalizeSymptomKey(key));
  }
  const payload: Record<string, number> = {};
  for (const feature of allFeatureNames) {
    const isActive =
      positiveExact.has(feature) ||
      positiveNormalized.has(normalizeSymptomKey(feature));
    payload[feature] = isActive ? 1 : 0;
  }
  return payload;
}

async function fetchMlFeatures(): Promise<string[]> {
  if (cachedMlFeatures && cachedMlFeatures.expiresAt > Date.now()) {
    return cachedMlFeatures.features;
  }
  const featuresRes = await fetch(`${ML_API_URL}/api/v1/features`);
  if (!featuresRes.ok) throw new Error("ML features endpoint failed");
  const data = (await featuresRes.json()) as MlFeaturesResponse;
  cachedMlFeatures = { features: data.features, expiresAt: Date.now() + 10 * 60 * 1000 };
  return data.features;
}

function alignPredictionToCategory(
  category: Category,
  prediction: PredictionResult,
): PredictionResult {
  if (category === "general") return prediction;

  const filtered = prediction.topPredictions.filter((p) =>
    diseaseMatchesCategory(p.disease, category),
  );

  if (filtered.length === 0) {
    // Trust the model: keep its top picks but downgrade confidence so the
    // user (and the report) reflect the uncertainty.
    return {
      ...prediction,
      confidence: prediction.confidence === "high" ? "medium" : "low",
    };
  }

  const best = filtered[0];
  return {
    ...prediction,
    disease: best.disease,
    specialty: inferSpecialty(best.disease),
    topPredictions: filtered,
  };
}

function buildReasoning(prediction: PredictionResult): string {
  const symptomsList = prediction.selectedSymptoms.slice(0, 8);
  const symptoms = symptomsList.join(", ");
  const primary = prediction.topPredictions[0];
  const alternatives = prediction.topPredictions
    .slice(1, 3)
    .map((p) => `${p.disease} (${Math.round(p.confidence * 100)}%)`);

  if (prediction.confidence === "low") {
    return [
      `The model's highest-ranked match is ${prediction.disease}${primary ? ` (${Math.round(primary.confidence * 100)}%)` : ""}, but confidence is low because several conditions share this symptom pattern.`,
      alternatives.length > 0
        ? `We also considered ${alternatives.join(" and ")} while reviewing your responses${symptoms ? ` (${symptoms})` : ""}.`
        : `We also considered alternative conditions while reviewing your responses${symptoms ? ` (${symptoms})` : ""}.`,
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

function fallbackAdvice(prediction: PredictionResult): AssessmentAdvice {
  return {
    overview: `${prediction.disease} can have overlapping symptoms with several other conditions, so this result should be treated as a starting point for a conversation with a clinician.`,
    medications: [
      "Avoid starting prescription medication without a clinician's guidance.",
      "For mild fever or aches, some people use over-the-counter paracetamol/acetaminophen if it is safe for them.",
      "If you already take medicines or have liver, kidney, stomach, heart, pregnancy, or allergy concerns, ask a doctor or pharmacist first.",
    ],
    selfCare: [
      "Rest, hydrate, and keep a simple symptom log with temperature, pain level, and timing.",
      "Book a doctor if symptoms persist, worsen, or feel unusual for you.",
    ],
    warningSigns: [
      "Severe chest pain, breathing difficulty, fainting, confusion, blue lips, severe dehydration, or rapidly worsening symptoms need urgent medical care.",
    ],
    disclaimer:
      "This is just a recommendation. Consult a doctor for more depth and a confirmed diagnosis.",
    source: "fallback",
  };
}

function coerceAdviceJson(value: unknown, prediction: PredictionResult): AssessmentAdvice {
  if (!value || typeof value !== "object") return fallbackAdvice(prediction);
  const obj = value as Partial<AssessmentAdvice>;
  return {
    overview:
      typeof obj.overview === "string" && obj.overview.trim()
        ? obj.overview.trim()
        : fallbackAdvice(prediction).overview,
    medications: Array.isArray(obj.medications)
      ? obj.medications.filter((x): x is string => typeof x === "string").slice(0, 5)
      : fallbackAdvice(prediction).medications,
    selfCare: Array.isArray(obj.selfCare)
      ? obj.selfCare.filter((x): x is string => typeof x === "string").slice(0, 5)
      : fallbackAdvice(prediction).selfCare,
    warningSigns: Array.isArray(obj.warningSigns)
      ? obj.warningSigns.filter((x): x is string => typeof x === "string").slice(0, 5)
      : fallbackAdvice(prediction).warningSigns,
    disclaimer:
      typeof obj.disclaimer === "string" && obj.disclaimer.trim()
        ? obj.disclaimer.trim()
        : fallbackAdvice(prediction).disclaimer,
    source: "groq",
  };
}

async function buildGroqAdvice(prediction: PredictionResult): Promise<AssessmentAdvice> {
  if (!GROQ_API_KEY) return fallbackAdvice(prediction);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write cautious patient education for a symptom-checker app. Return only valid JSON. Do not claim a confirmed diagnosis. Keep medication suggestions general, safe, and framed as options to discuss with a doctor/pharmacist. Always include this exact disclaimer: This is just a recommendation. Consult a doctor for more depth and a confirmed diagnosis.",
          },
          {
            role: "user",
            content: JSON.stringify({
              predictedDisease: prediction.disease,
              recommendedSpecialty: prediction.specialty,
              confidence: prediction.confidence,
              selectedSymptoms: prediction.selectedSymptoms,
              requiredShape: {
                overview: "2-3 plain-language sentences about what this disease/condition generally is",
                medications: ["3-5 cautious medicine or treatment discussion points"],
                selfCare: ["2-4 practical home-care or next-step points"],
                warningSigns: ["2-4 urgent-care warning signs"],
                disclaimer:
                  "This is just a recommendation. Consult a doctor for more depth and a confirmed diagnosis.",
              },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq advice failed (${response.status})`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallbackAdvice(prediction);

    return coerceAdviceJson(JSON.parse(content), prediction);
  } catch (error) {
    console.error("Groq advice generation failed", error);
    return fallbackAdvice(prediction);
  } finally {
    clearTimeout(timeout);
  }
}

async function predictWithMlApi(
  answers: Record<string, boolean>,
  category: Category,
): Promise<PredictionResult> {
  const selectedSymptoms = buildSelectedSymptoms(answers);
  const features = await fetchMlFeatures();
  const payload = buildMlPayload(answers, features);

  const predictRes = await fetch(`${ML_API_URL}/api/v1/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms: payload, top_n: 10 }),
  });

  if (!predictRes.ok) {
    const detail = await predictRes.text();
    throw new Error(`ML predict endpoint failed (${predictRes.status}): ${detail}`);
  }
  const prediction = (await predictRes.json()) as MlPredictResponse;

  const score = prediction.confidence;
  const confidenceLevel: "high" | "medium" | "low" =
    score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low";

  const rawPrediction: PredictionResult = {
    disease: prediction.predicted_disease,
    specialty: inferSpecialty(prediction.predicted_disease),
    confidence: confidenceLevel,
    topPredictions: (prediction.top_diseases ?? [])
      .slice(0, 12)
      .map((d) => ({ disease: d.disease, confidence: d.confidence })),
    selectedSymptoms,
  };
  return alignPredictionToCategory(category, rawPrediction);
}

function getLocalAdaptiveFeatures(): string[] {
  return loadSymptomsFromTestCsv();
}

export async function getQuizSymptoms(req: Request, res: Response) {
  const reqQuery = req.query ?? {};
  const category = normalizeCategory(String(reqQuery.category ?? "general"));
  const askedFeatures = new Set(
    String(reqQuery.asked ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  );
  const positiveFeatures = new Set(
    String(reqQuery.positive ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  );
  const negativeFeatures = new Set(
    Array.from(askedFeatures).filter((x) => !positiveFeatures.has(x)),
  );
  const requestedLimit = Number(reqQuery.limit ?? ADAPTIVE_LIMIT);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : ADAPTIVE_LIMIT;

  const localFeatures = getLocalAdaptiveFeatures();
  let allFeatures = localFeatures;
  let source = "csv";

  try {
    const mlFeatures = await fetchMlFeatures();
    allFeatures = Array.from(new Set([...localFeatures, ...mlFeatures]));
    source = "ml_enhanced";
  } catch {
    // Quiz still works from the CSV header even if the ML service is down.
  }

  if (allFeatures.length === 0) {
    return res.status(503).json({
      error: "Symptom catalog is not available right now.",
    });
  }

  const ranked = rankAdaptiveSymptoms({
    allFeatures,
    category,
    positiveFeatures,
    askedFeatures,
    negativeFeatures,
    limit,
  });

  const symptoms = ranked.map((symptomKey) => ({
    id: symptomKey,
    symptomKey,
    text: `Do you have ${titleCaseWords(symptomKey).toLowerCase()}?`,
  }));

  return res.json({ symptoms, source });
}

export async function submitAssessment(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });

  const parseResult = submitAssessmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { answers, category } = parseResult.data;
  const normalizedCategory = normalizeCategory(category);

  let prediction: PredictionResult;
  try {
    prediction = await predictWithMlApi(answers, normalizedCategory);
  } catch (err) {
    return res.status(502).json({
      error:
        "We couldn't reach the prediction service. Please try again in a moment.",
      detail: err instanceof Error ? err.message : "ml_api_unavailable",
    });
  }

  const reasoning = buildReasoning(prediction);
  const llmAdvice = await buildGroqAdvice(prediction);

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
      llmAdvice,
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
      llmAdvice: created.llmAdvice ?? llmAdvice,
      selectedSymptoms: created.selectedSymptoms ?? [],
      createdAt: created.createdAt,
    },
  });
}

export async function getUserAssessments(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });

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
      llmAdvice: a.llmAdvice ?? null,
      selectedSymptoms: a.selectedSymptoms ?? [],
      createdAt: a.createdAt,
      answers: a.answers,
    })),
  });
}

export async function getAssessmentById(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });

  const assessmentId = Number(req.params.id);
  if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
    return res.status(400).json({ error: "Invalid assessment id" });
  }

  const [row] = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.userId, authUser.id)))
    .limit(1);

  if (!row) return res.status(404).json({ error: "Assessment not found" });

  return res.json({
    assessment: {
      id: row.id,
      predictedDisease: row.predictedDisease,
      recommendedSpecialty: row.recommendedSpecialty,
      confidence: row.confidence,
      topPredictions: row.topPredictions ?? [],
      reasoning: row.reasoning ?? "",
      llmAdvice: row.llmAdvice ?? null,
      selectedSymptoms: row.selectedSymptoms ?? [],
      createdAt: row.createdAt,
      answers: row.answers,
    },
  });
}

export async function getDashboardSummary(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });

  const [lastCheckupRow] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.userId, authUser.id))
    .orderBy(desc(assessments.createdAt))
    .limit(1);

  const now = new Date();
  const upcomingRows = await db
    .select({ appointment: appointments, doctor: users })
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
          ["pending", "accepted", "scheduled"].includes(r.appointment.status),
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
