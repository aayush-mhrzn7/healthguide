"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizSymptoms = getQuizSymptoms;
exports.submitAssessment = submitAssessment;
exports.getUserAssessments = getUserAssessments;
exports.getDashboardSummary = getDashboardSummary;
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const quiz_1 = require("../constants/quiz");
const submitAssessmentSchema = zod_1.z.object({
    answers: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()),
});
const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8001";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const ADAPTIVE_LIMIT = 30;
const CATEGORY_KEYWORDS = {
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
const FOLLOWUP_FAMILIES = [
    { key: "fever_family", keywords: ["fever", "chills", "sweat"] },
    { key: "resp_family", keywords: ["cough", "breath", "wheez", "throat"] },
    { key: "digestive_family", keywords: ["nausea", "vomit", "stomach", "abd", "diarr"] },
    { key: "neuro_family", keywords: ["head", "dizz", "seizure", "memory"] },
    { key: "pain_family", keywords: ["pain", "ache", "stiff", "swelling"] },
];
let cachedMlFeatures = null;
function titleCaseWords(value) {
    return value
        .replace(/[._]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
function normalizeSymptomKey(value) {
    return value
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[.\s-]+/g, "_")
        .toLowerCase();
}
function symptomTokens(value) {
    return normalizeSymptomKey(value).split("_").filter(Boolean);
}
function belongsToCategory(feature, category) {
    const keywords = CATEGORY_KEYWORDS[category] ?? [];
    if (keywords.length === 0)
        return true;
    const key = normalizeSymptomKey(feature);
    return keywords.some((kw) => key.includes(kw));
}
function sameFamily(featureA, featureB) {
    const a = normalizeSymptomKey(featureA);
    const b = normalizeSymptomKey(featureB);
    return FOLLOWUP_FAMILIES.some((f) => f.keywords.some((kw) => a.includes(kw)) && f.keywords.some((kw) => b.includes(kw)));
}
function tokenOverlap(a, b) {
    const aTokens = new Set(symptomTokens(a));
    let overlap = 0;
    for (const token of symptomTokens(b)) {
        if (aTokens.has(token))
            overlap += 1;
    }
    return overlap;
}
function rankAdaptiveSymptoms(params) {
    const { allFeatures, category, positiveFeatures, askedFeatures, negativeFeatures, limit } = params;
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
        const priorityScore = baseWeight + followupBoost + categoryBoost - contradictionPenalty;
        return { feature, priorityScore };
    })
        .sort((a, b) => b.priorityScore - a.priorityScore);
    return scored.slice(0, Math.max(1, Math.min(limit, ADAPTIVE_LIMIT))).map((x) => x.feature);
}
function buildSelectedSymptoms(answers) {
    const labels = new Set();
    for (const [key, value] of Object.entries(answers)) {
        if (!value)
            continue;
        labels.add(titleCaseWords(key));
        const mapped = quiz_1.SYMPTOM_TO_ML_FEATURES[key];
        if (mapped) {
            for (const f of mapped)
                labels.add(titleCaseWords(f));
        }
    }
    return Array.from(labels).slice(0, 12);
}
function getActiveMlFeatures(answers) {
    const activeFeatures = new Set();
    for (const [symptomKey, answered] of Object.entries(answers)) {
        if (!answered)
            continue;
        const mapped = quiz_1.SYMPTOM_TO_ML_FEATURES[symptomKey];
        if (mapped) {
            for (const f of mapped)
                activeFeatures.add(f);
        }
        else {
            activeFeatures.add(symptomKey);
        }
    }
    return activeFeatures;
}
function buildMlPayload(answers, allFeatureNames) {
    const activeFeatures = getActiveMlFeatures(answers);
    const payload = {};
    for (const feature of allFeatureNames) {
        payload[feature] = activeFeatures.has(feature) ? 1 : 0;
    }
    return payload;
}
async function fetchMlFeatures() {
    if (cachedMlFeatures && cachedMlFeatures.expiresAt > Date.now()) {
        return cachedMlFeatures.features;
    }
    const featuresRes = await fetch(`${ML_API_URL}/api/v1/features`);
    if (!featuresRes.ok) {
        throw new Error("ML features endpoint failed");
    }
    const featuresData = (await featuresRes.json());
    cachedMlFeatures = {
        features: featuresData.features,
        expiresAt: Date.now() + 10 * 60 * 1000,
    };
    return featuresData.features;
}
function buildFallbackReasoning(prediction) {
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
async function generateReasoningWithGemini(prediction) {
    if (!GEMINI_API_KEY)
        return null;
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 260 },
            }),
            signal: controller.signal,
        });
        if (!response.ok)
            return null;
        const data = (await response.json());
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return text || null;
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timeout);
    }
}
async function predictWithMlApi(answers) {
    const selectedSymptoms = buildSelectedSymptoms(answers);
    try {
        const features = await fetchMlFeatures();
        const payload = buildMlPayload(answers, features);
        const predictRes = await fetch(`${ML_API_URL}/api/v1/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symptoms: payload, top_n: 3 }),
        });
        if (!predictRes.ok)
            throw new Error("ML predict endpoint failed");
        const prediction = (await predictRes.json());
        const confidenceScore = prediction.confidence;
        const confidenceLevel = confidenceScore >= 0.7
            ? "high"
            : confidenceScore >= 0.4
                ? "medium"
                : "low";
        return {
            disease: prediction.predicted_disease,
            specialty: quiz_1.DISEASE_TO_SPECIALTY[prediction.predicted_disease] ?? "general",
            confidence: confidenceLevel,
            topPredictions: (prediction.top_diseases || [])
                .slice(0, 3)
                .map((d) => ({ disease: d.disease, confidence: d.confidence })),
            selectedSymptoms,
        };
    }
    catch {
        return predictDiseaseRuleBased(answers);
    }
}
function predictDiseaseRuleBased(answers) {
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
                topPredictions: [{ disease: mapping.disease, confidence: 0.72 }],
                selectedSymptoms: buildSelectedSymptoms(answers),
            };
        }
    }
    return {
        disease: quiz_1.DEFAULT_RECOMMENDATION.disease,
        specialty: quiz_1.DEFAULT_RECOMMENDATION.specialty,
        confidence: quiz_1.DEFAULT_RECOMMENDATION.confidence,
        topPredictions: [{ disease: quiz_1.DEFAULT_RECOMMENDATION.disease, confidence: 0.35 }],
        selectedSymptoms: buildSelectedSymptoms(answers),
    };
}
async function buildReasoning(prediction) {
    const gemini = await generateReasoningWithGemini(prediction);
    return gemini ?? buildFallbackReasoning(prediction);
}
async function getQuizSymptoms(_req, res) {
    const reqQuery = _req.query ?? {};
    const category = String(reqQuery.category ?? "general").trim().toLowerCase();
    const askedFeatures = new Set(String(reqQuery.asked ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean));
    const positiveFeatures = new Set(String(reqQuery.positive ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean));
    const negativeFeatures = new Set(Array.from(askedFeatures).filter((x) => !positiveFeatures.has(x)));
    const requestedLimit = Number(reqQuery.limit ?? ADAPTIVE_LIMIT);
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : ADAPTIVE_LIMIT;
    try {
        const features = await fetchMlFeatures();
        const ranked = rankAdaptiveSymptoms({
            allFeatures: features,
            category,
            positiveFeatures,
            askedFeatures,
            negativeFeatures,
            limit,
        });
        const quizSymptoms = ranked.map((feature) => ({
            id: feature,
            symptomKey: feature,
            text: `Do you have ${titleCaseWords(feature).toLowerCase()}?`,
        }));
        return res.json({ symptoms: quizSymptoms, source: "adaptive_ml_features" });
    }
    catch {
        const fallbackSet = new Set();
        for (const symptomKey of quiz_1.QUIZ_QUESTION_IDS)
            fallbackSet.add(symptomKey);
        for (const mapped of Object.values(quiz_1.SYMPTOM_TO_ML_FEATURES)) {
            for (const value of mapped)
                fallbackSet.add(value);
        }
        const fallbackFeatures = Array.from(fallbackSet);
        const rankedFallback = rankAdaptiveSymptoms({
            allFeatures: fallbackFeatures,
            category,
            positiveFeatures,
            askedFeatures,
            negativeFeatures,
            limit,
        });
        const fallback = rankedFallback.map((symptomKey) => ({
            id: symptomKey,
            symptomKey,
            text: `Do you have ${titleCaseWords(symptomKey).toLowerCase()}?`,
        }));
        return res.json({ symptoms: fallback, source: "fallback" });
    }
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
    const prediction = await predictWithMlApi(answers);
    const reasoning = await buildReasoning(prediction);
    const [created] = await client_1.db
        .insert(schema_1.assessments)
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
            topPredictions: a.topPredictions ?? [],
            reasoning: a.reasoning ?? "",
            selectedSymptoms: a.selectedSymptoms ?? [],
            createdAt: a.createdAt,
            answers: a.answers,
        })),
    });
}
async function getDashboardSummary(req, res) {
    const { authUser } = req;
    if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const [lastCheckupRow] = await client_1.db
        .select()
        .from(schema_1.assessments)
        .where((0, drizzle_orm_1.eq)(schema_1.assessments.userId, authUser.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.assessments.createdAt))
        .limit(1);
    const now = new Date();
    const upcomingRows = await client_1.db
        .select({
        appointment: schema_1.appointments,
        doctor: schema_1.users,
    })
        .from(schema_1.appointments)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.appointments.doctorId))
        .where((0, drizzle_orm_1.eq)(schema_1.appointments.patientId, authUser.id))
        .orderBy(schema_1.appointments.startsAt)
        .limit(10);
    const nextAppointment = upcomingRows
        .filter((r) => new Date(r.appointment.startsAt) >= now &&
        r.appointment.status === "scheduled")
        .map((r) => ({
        id: r.appointment.id,
        doctorName: r.doctor?.name ?? "Unknown doctor",
        doctorSpecialty: r.doctor?.specialty ?? null,
        startsAt: r.appointment.startsAt,
        endsAt: r.appointment.endsAt,
        status: r.appointment.status,
    }))[0] ?? null;
    const allAssessmentRows = await client_1.db
        .select({ id: schema_1.assessments.id })
        .from(schema_1.assessments)
        .where((0, drizzle_orm_1.eq)(schema_1.assessments.userId, authUser.id));
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
