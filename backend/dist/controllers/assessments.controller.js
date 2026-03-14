"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAssessment = submitAssessment;
exports.getUserAssessments = getUserAssessments;
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const quiz_1 = require("../constants/quiz");
const submitAssessmentSchema = zod_1.z.object({
    answers: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()),
});
function predictDisease(answers) {
    const positiveSymptoms = new Set();
    for (const id of quiz_1.QUIZ_QUESTION_IDS) {
        const symptomKey = id;
        if (answers[symptomKey] === true) {
            positiveSymptoms.add(symptomKey);
        }
    }
    for (const mapping of quiz_1.DISEASE_SYMPTOM_MAP) {
        const hasAllRequired = mapping.requiredSymptoms.every((s) => positiveSymptoms.has(s));
        if (hasAllRequired) {
            return {
                disease: mapping.disease,
                specialty: mapping.specialty,
                confidence: mapping.confidence,
            };
        }
    }
    return quiz_1.DEFAULT_RECOMMENDATION;
}
async function submitAssessment(req, res) {
    const { authUser } = req;
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
    const [created] = await client_1.db
        .insert(schema_1.assessments)
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
async function getUserAssessments(req, res) {
    const { authUser } = req;
    if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const rows = await client_1.db
        .select()
        .from(schema_1.assessments)
        .where((0, drizzle_orm_1.eq)(schema_1.assessments.userId, authUser.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.assessments.createdAt))
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
