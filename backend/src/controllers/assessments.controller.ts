import type { Request, Response } from "express";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";

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

function buildMlPayload(
  answers: Record<string, boolean>,
  allFeatureNames: string[]
): Record<string, number> {
  const activeFeatures = new Set<string>();

  for (const [symptomKey, answered] of Object.entries(answers)) {
    if (answered === true) {
      const mlFeatures = SYMPTOM_TO_ML_FEATURES[symptomKey as SymptomKey];
      if (mlFeatures) {
        for (const f of mlFeatures) {
          activeFeatures.add(f);
        }
      }
    }
  }

  const payload: Record<string, number> = {};
  for (const feature of allFeatureNames) {
    payload[feature] = activeFeatures.has(feature) ? 1 : 0;
  }
  return payload;
}

type MlPredictResponse = {
  predicted_disease: string;
  confidence: number;
  top_diseases: { disease: string; confidence: number }[];
};

type MlFeaturesResponse = {
  features: string[];
  count: number;
};

async function predictWithMlApi(answers: Record<string, boolean>): Promise<{
  disease: string;
  specialty: string;
  confidence: "high" | "medium" | "low";
}> {
  try {
    const featuresRes = await fetch(`${ML_API_URL}/api/v1/features`);
    if (!featuresRes.ok) throw new Error("ML features endpoint failed");

    const featuresData = (await featuresRes.json()) as MlFeaturesResponse;
    const payload = buildMlPayload(answers, featuresData.features);

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

    const specialty =
      DISEASE_TO_SPECIALTY[prediction.predicted_disease] ?? "general";

    return {
      disease: prediction.predicted_disease,
      specialty,
      confidence: confidenceLevel,
    };
  } catch {
    return predictDiseaseRuleBased(answers);
  }
}

function predictDiseaseRuleBased(answers: Record<string, boolean>): {
  disease: string;
  specialty: string;
  confidence: "high" | "medium" | "low";
} {
  const positiveSymptoms = new Set<SymptomKey>();

  for (const id of QUIZ_QUESTION_IDS) {
    const symptomKey = id as SymptomKey;
    if (answers[symptomKey] === true) {
      positiveSymptoms.add(symptomKey);
    }
  }

  for (const mapping of DISEASE_SYMPTOM_MAP) {
    const hasAllRequired = mapping.requiredSymptoms.every((s) =>
      positiveSymptoms.has(s)
    );
    if (hasAllRequired) {
      return {
        disease: mapping.disease,
        specialty: mapping.specialty,
        confidence: mapping.confidence,
      };
    }
  }

  return DEFAULT_RECOMMENDATION;
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

  const [created] = await db
    .insert(assessments)
    .values({
      userId: authUser.id,
      answers,
      predictedDisease: prediction.disease,
      recommendedSpecialty: prediction.specialty,
      confidence: prediction.confidence,
    })
    .returning();

  return res.status(201).json({
    assessment: {
      id: created.id,
      predictedDisease: created.predictedDisease,
      recommendedSpecialty: created.recommendedSpecialty,
      confidence: created.confidence,
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
    .where(
      eq(appointments.patientId, authUser.id)
    )
    .orderBy(appointments.startsAt)
    .limit(10);

  const nextAppointment = upcomingRows
    .filter(
      (r) =>
        new Date(r.appointment.startsAt) >= now &&
        r.appointment.status === "scheduled"
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
