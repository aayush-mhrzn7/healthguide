import type { Request, Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

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
  category: z.string().trim().optional(),
});

const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8001";

type MlPredictResponse = {
  predicted_disease: string;
  confidence: number;
  top_diseases: { disease: string; confidence: number }[];
};

type MlFeaturesResponse = {
  features: string[];
  count: number;
};

const ADAPTIVE_LIMIT = 30;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  respiratory: ["cough", "breath", "wheez", "chest", "throat", "lung", "sneez", "cold"],
  digestive: ["stomach", "abd", "nausea", "vomit", "diarr", "constip", "indigest", "acid"],
  neurological: ["head", "migraine", "dizz", "neuro", "numb", "tingl", "memory", "seizure"],
  cardiovascular: ["heart", "cardio", "pulse", "palpit", "bp", "pressure", "chest_pain"],
  musculoskeletal: ["joint", "muscle", "back", "bone", "stiff", "swelling", "neck", "pain"],
  skin: ["skin", "rash", "itch", "acne", "spot", "lesion", "redness"],
  infectious: ["fever", "chills", "infection", "viral", "bacterial", "typhoid", "malaria"],
  eyes: ["eye", "vision", "blur", "watery", "redness_of_eyes"],
  ent: ["ear", "nose", "throat", "sinus", "tonsil", "sore_throat", "runny_nose"],
  endocrine: ["thyroid", "sugar", "glucose", "hormone", "weight", "metabolism", "diabetes"],
  urinary: ["urine", "kidney", "bladder", "burning_micturition", "urinary"],
  general: [],
};

const FOLLOWUP_FAMILIES: Array<{ key: string; keywords: string[] }> = [
  { key: "fever_family", keywords: ["fever", "chills", "sweat"] },
  { key: "resp_family", keywords: ["cough", "breath", "wheez", "throat"] },
  { key: "digestive_family", keywords: ["nausea", "vomit", "stomach", "abd", "diarr"] },
  { key: "neuro_family", keywords: ["head", "dizz", "seizure", "memory"] },
  { key: "pain_family", keywords: ["pain", "ache", "stiff", "swelling"] },
];

type PredictionResult = {
  disease: string;
  specialty: string;
  confidence: "high" | "medium" | "low";
  topPredictions: Array<{ disease: string; confidence: number }>;
  selectedSymptoms: string[];
};

const CATEGORY_DEFAULT_PREDICTIONS: Record<
  string,
  Array<{ disease: string; confidence: number }>
> = {
  eyes: [
    { disease: "Allergy", confidence: 0.55 },
    { disease: "Common Cold", confidence: 0.25 },
    { disease: "Migraine", confidence: 0.2 },
  ],
  respiratory: [
    { disease: "Bronchial Asthma", confidence: 0.45 },
    { disease: "Common Cold", confidence: 0.35 },
    { disease: "Pneumonia", confidence: 0.2 },
  ],
  digestive: [
    { disease: "GERD", confidence: 0.4 },
    { disease: "Gastroenteritis", confidence: 0.35 },
    { disease: "Peptic ulcer diseae", confidence: 0.25 },
  ],
  neurological: [
    { disease: "Migraine", confidence: 0.5 },
    { disease: "(vertigo) Paroymsal  Positional Vertigo", confidence: 0.3 },
    { disease: "Cervical spondylosis", confidence: 0.2 },
  ],
  cardiovascular: [
    { disease: "Hypertension ", confidence: 0.45 },
    { disease: "Heart attack", confidence: 0.35 },
    { disease: "Varicose veins", confidence: 0.2 },
  ],
  musculoskeletal: [
    { disease: "Arthritis", confidence: 0.4 },
    { disease: "Osteoarthristis", confidence: 0.35 },
    { disease: "Cervical spondylosis", confidence: 0.25 },
  ],
  skin: [
    { disease: "Fungal infection", confidence: 0.35 },
    { disease: "Acne", confidence: 0.3 },
    { disease: "Psoriasis", confidence: 0.25 },
  ],
  infectious: [
    { disease: "Dengue", confidence: 0.35 },
    { disease: "Typhoid", confidence: 0.3 },
    { disease: "Malaria", confidence: 0.25 },
  ],
  ent: [
    { disease: "Common Cold", confidence: 0.45 },
    { disease: "Allergy", confidence: 0.35 },
    { disease: "Bronchial Asthma", confidence: 0.2 },
  ],
  endocrine: [
    { disease: "Diabetes ", confidence: 0.4 },
    { disease: "Hypothyroidism", confidence: 0.3 },
    { disease: "Hyperthyroidism", confidence: 0.3 },
  ],
  urinary: [{ disease: "Urinary tract infection", confidence: 0.75 }],
};

function categoryMatchesDisease(category: string, disease: string): boolean {
  const normalizedCategory = category.trim().toLowerCase();
  if (!normalizedCategory || normalizedCategory === "general") return true;

  const diseaseName = disease.toLowerCase();
  const allowedDiseases: Record<string, string[]> = {
    eyes: ["allergy", "common cold", "migraine", "dengue"],
    respiratory: ["bronchial asthma", "pneumonia", "common cold", "tuberculosis", "allergy"],
    digestive: [
      "gerd",
      "gastroenteritis",
      "peptic ulcer",
      "typhoid",
      "jaundice",
      "hepatitis",
      "chronic cholestasis",
    ],
    neurological: ["migraine", "vertigo", "cervical spondylosis", "paralysis"],
    cardiovascular: ["heart attack", "hypertension", "varicose veins"],
    musculoskeletal: ["arthritis", "osteo", "spondylosis", "varicose veins"],
    skin: ["fungal infection", "acne", "psoriasis", "impetigo", "drug reaction", "chicken pox"],
    infectious: ["malaria", "dengue", "typhoid", "chicken pox", "tuberculosis", "aids"],
    ent: ["common cold", "allergy", "tuberculosis", "pneumonia"],
    endocrine: ["diabetes", "hypothyroidism", "hyperthyroidism", "hypoglycemia"],
    urinary: ["urinary tract infection"],
  };
  if ((allowedDiseases[normalizedCategory] ?? []).some((allowed) => diseaseName.includes(allowed))) {
    return true;
  }

  const keywords: Record<string, string[]> = {
    respiratory: ["asthma", "pneumonia", "cold", "tuberculosis", "bronchial", "respiratory"],
    digestive: ["gastro", "hepatitis", "jaundice", "ulcer", "vomit", "diarr", "stomach"],
    neurological: ["migraine", "vertigo", "paralysis", "neuro", "brain"],
    cardiovascular: ["heart", "hypertension", "cardio"],
    musculoskeletal: ["arthritis", "spondyl", "osteo", "joint", "bone", "muscle"],
    skin: ["fungal", "acne", "psoriasis", "impetigo", "skin", "allergy", "drug reaction"],
    infectious: ["dengue", "malaria", "typhoid", "chicken pox", "infection", "viral"],
    eyes: ["eye", "vision", "conjunct", "glaucoma", "cataract", "allergy", "migraine"],
    ent: ["ear", "nose", "throat", "sinus", "tonsil"],
    endocrine: ["diabetes", "thyroid", "hypoglycemia", "hormone", "metabolism"],
    urinary: ["urinary", "kidney", "bladder", "renal"],
  };

  const byKeywords = keywords[normalizedCategory] ?? [];
  if (byKeywords.some((kw) => diseaseName.includes(kw))) return true;

  const specialty = (DISEASE_TO_SPECIALTY[disease] ?? "general").toLowerCase();
  const specialtyByCategory: Record<string, string[]> = {
    respiratory: ["respiratory", "pulmonology"],
    digestive: ["gastroenterology"],
    neurological: ["neurology"],
    cardiovascular: ["cardiology"],
    musculoskeletal: ["orthopedics", "rheumatology"],
    skin: ["dermatology", "allergy"],
    infectious: ["infectious"],
    eyes: ["ophthalmology", "allergy"],
    ent: ["ent", "otolaryngology"],
    endocrine: ["endocrinology"],
    urinary: ["urology", "nephrology"],
  };
  const allowedSpecialties = specialtyByCategory[normalizedCategory] ?? ["general"];
  return allowedSpecialties.some((allowed) => specialty.includes(allowed));
}

function alignPredictionToCategory(
  category: string,
  prediction: PredictionResult,
): PredictionResult {
  if (!category || category === "general") return prediction;
  const filtered = prediction.topPredictions.filter((p) =>
    categoryMatchesDisease(category, p.disease),
  );
  if (filtered.length === 0) {
    const fallback = CATEGORY_DEFAULT_PREDICTIONS[category.trim().toLowerCase()];
    if (!fallback?.length) return prediction;
    return {
      ...prediction,
      disease: fallback[0].disease,
      specialty: DISEASE_TO_SPECIALTY[fallback[0].disease] ?? prediction.specialty,
      confidence: prediction.confidence === "high" ? "medium" : prediction.confidence,
      topPredictions: fallback,
    };
  }

  const best = filtered[0];
  return {
    ...prediction,
    disease: best.disease,
    specialty: DISEASE_TO_SPECIALTY[best.disease] ?? prediction.specialty,
    topPredictions: filtered,
  };
}

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
    const byNormalizedKey = new Map<string, string>();
    for (const rawHeader of (headerLine ?? "").split(",")) {
      const raw = rawHeader.trim();
      if (!raw || raw === "prognosis") continue;
      byNormalizedKey.set(normalizeSymptomKey(raw), raw);
    }
    const parsed = Array.from(byNormalizedKey.values());
    cachedCsvSymptoms = parsed;
    return parsed;
  } catch {
    // Keep API functional if CSV is unavailable.
    return [];
  }
}

function symptomTokens(value: string): string[] {
  return normalizeSymptomKey(value).split("_").filter(Boolean);
}

function belongsToCategory(feature: string, category: string): boolean {
  const keywords = CATEGORY_KEYWORDS[category] ?? [];
  if (keywords.length === 0) return true;
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
  category: string;
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
        if (overlap > 0) {
          followupBoost += Math.min(6, overlap * 2);
        }
        if (sameFamily(feature, positive)) {
          followupBoost += 2;
        }
      }

      let contradictionPenalty = 0;
      for (const negative of negativeFeatures) {
        const overlap = tokenOverlap(feature, negative);
        if (overlap > 0) {
          contradictionPenalty += Math.min(8, overlap * 3);
        }
        if (sameFamily(feature, negative)) {
          contradictionPenalty += 2;
        }
      }

      const priorityScore =
        baseWeight + followupBoost + categoryBoost - contradictionPenalty;

      return { feature, priorityScore };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return scored.slice(0, Math.max(1, Math.min(limit, ADAPTIVE_LIMIT))).map((x) => x.feature);
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
  const activeNormalizedFeatures = new Set(
    Array.from(activeFeatures).map((feature) => normalizeSymptomKey(feature)),
  );
  const payload: Record<string, number> = {};
  for (const feature of allFeatureNames) {
    payload[feature] =
      activeFeatures.has(feature) || activeNormalizedFeatures.has(normalizeSymptomKey(feature))
        ? 1
        : 0;
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

function getLocalAdaptiveFeatures(): string[] {
  const localSet = new Set<string>();
  const csvSymptoms = loadSymptomsFromTestCsv();
  for (const symptom of csvSymptoms) localSet.add(symptom);
  for (const symptomKey of QUIZ_QUESTION_IDS) localSet.add(symptomKey);
  for (const mapped of Object.values(SYMPTOM_TO_ML_FEATURES)) {
    for (const value of mapped) localSet.add(value);
  }
  return Array.from(localSet);
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

async function predictWithMlApi(
  answers: Record<string, boolean>,
  category = "general",
): Promise<PredictionResult> {
  const selectedSymptoms = buildSelectedSymptoms(answers);
  try {
    const features = await fetchMlFeatures();
    const payload = buildMlPayload(answers, features);

    const predictRes = await fetch(`${ML_API_URL}/api/v1/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms: payload, top_n: 12 }),
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

    const rawPrediction: PredictionResult = {
      disease: prediction.predicted_disease,
      specialty: DISEASE_TO_SPECIALTY[prediction.predicted_disease] ?? "general",
      confidence: confidenceLevel,
      topPredictions: (prediction.top_diseases || [])
        .slice(0, 12)
        .map((d) => ({ disease: d.disease, confidence: d.confidence })),
      selectedSymptoms,
    };
    return alignPredictionToCategory(category, rawPrediction);
  } catch {
    return alignPredictionToCategory(category, predictDiseaseRuleBased(answers));
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
  return buildFallbackReasoning(prediction);
}

export async function getQuizSymptoms(_req: Request, res: Response) {
  const reqQuery = (_req as Request).query ?? {};
  const category = String(reqQuery.category ?? "general").trim().toLowerCase();
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
  let source = "adaptive_local";
  let allFeatures = localFeatures;

  try {
    const mlFeatures = await fetchMlFeatures();
    allFeatures = Array.from(new Set([...localFeatures, ...mlFeatures]));
    source = "adaptive_ml_enhanced";
  } catch {
    // Keep quiz functional even when ML feature service is unavailable.
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

  const { answers, category } = parseResult.data;
  const prediction = await predictWithMlApi(answers, category ?? "general");
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

export async function getAssessmentById(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const assessmentId = Number(req.params.id);
  if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
    return res.status(400).json({ error: "Invalid assessment id" });
  }

  const [row] = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.userId, authUser.id)))
    .limit(1);

  if (!row) {
    return res.status(404).json({ error: "Assessment not found" });
  }

  return res.json({
    assessment: {
      id: row.id,
      predictedDisease: row.predictedDisease,
      recommendedSpecialty: row.recommendedSpecialty,
      confidence: row.confidence,
      topPredictions: row.topPredictions ?? [],
      reasoning: row.reasoning ?? "",
      selectedSymptoms: row.selectedSymptoms ?? [],
      createdAt: row.createdAt,
      answers: row.answers,
    },
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
