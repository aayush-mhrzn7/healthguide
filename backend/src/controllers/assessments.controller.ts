import type { Request, Response } from "express";
import { z } from "zod";

import { eq, desc } from "drizzle-orm";

import { db } from "../db/client";
import { assessments } from "../db/schema";
import type { AuthRequest } from "../middleware/verifyJwt";
import {
  DISEASE_SYMPTOM_MAP,
  DEFAULT_RECOMMENDATION,
  QUIZ_QUESTION_IDS,
  type SymptomKey,
} from "../constants/quiz";

const submitAssessmentSchema = z.object({
  answers: z.record(z.string(), z.boolean()),
});

function predictDisease(answers: Record<string, boolean>): {
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
  const prediction = predictDisease(answers);

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
    })),
  });
}
