"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizSymptoms = getQuizSymptoms;
exports.submitAssessment = submitAssessment;
exports.getUserAssessments = getUserAssessments;
exports.getAssessmentById = getAssessmentById;
exports.getDashboardSummary = getDashboardSummary;
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const quiz_1 = require("../constants/quiz");
const submitAssessmentSchema = zod_1.z.object({
    answers: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()),
    category: zod_1.z.string().trim().optional(),
});
const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8001";
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
const CATEGORY_DEFAULT_PREDICTIONS = {
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
function categoryMatchesDisease(category, disease) {
    const normalizedCategory = category.trim().toLowerCase();
    if (!normalizedCategory || normalizedCategory === "general")
        return true;
    const diseaseName = disease.toLowerCase();
    const allowedDiseases = {
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
    const keywords = {
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
    if (byKeywords.some((kw) => diseaseName.includes(kw)))
        return true;
    const specialty = (quiz_1.DISEASE_TO_SPECIALTY[disease] ?? "general").toLowerCase();
    const specialtyByCategory = {
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
function alignPredictionToCategory(category, prediction) {
    if (!category || category === "general")
        return prediction;
    const filtered = prediction.topPredictions.filter((p) => categoryMatchesDisease(category, p.disease));
    if (filtered.length === 0) {
        const fallback = CATEGORY_DEFAULT_PREDICTIONS[category.trim().toLowerCase()];
        if (!fallback?.length)
            return prediction;
        return {
            ...prediction,
            disease: fallback[0].disease,
            specialty: quiz_1.DISEASE_TO_SPECIALTY[fallback[0].disease] ?? prediction.specialty,
            confidence: prediction.confidence === "high" ? "medium" : prediction.confidence,
            topPredictions: fallback,
        };
    }
    const best = filtered[0];
    return {
        ...prediction,
        disease: best.disease,
        specialty: quiz_1.DISEASE_TO_SPECIALTY[best.disease] ?? prediction.specialty,
        topPredictions: filtered,
    };
}
let cachedMlFeatures = null;
let cachedCsvSymptoms = null;
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
function loadSymptomsFromTestCsv() {
    if (cachedCsvSymptoms)
        return cachedCsvSymptoms;
    try {
        const csvPath = path_1.default.resolve(process.cwd(), "..", "models", "data", "raw", "test_data.csv");
        const file = fs_1.default.readFileSync(csvPath, "utf-8");
        const [headerLine] = file.split(/\r?\n/);
        const byNormalizedKey = new Map();
        for (const rawHeader of (headerLine ?? "").split(",")) {
            const raw = rawHeader.trim();
            if (!raw || raw === "prognosis")
                continue;
            byNormalizedKey.set(normalizeSymptomKey(raw), raw);
        }
        const parsed = Array.from(byNormalizedKey.values());
        cachedCsvSymptoms = parsed;
        return parsed;
    }
    catch {
        // Keep API functional if CSV is unavailable.
        return [];
    }
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
    const activeNormalizedFeatures = new Set(Array.from(activeFeatures).map((feature) => normalizeSymptomKey(feature)));
    const payload = {};
    for (const feature of allFeatureNames) {
        payload[feature] =
            activeFeatures.has(feature) || activeNormalizedFeatures.has(normalizeSymptomKey(feature))
                ? 1
                : 0;
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
function getLocalAdaptiveFeatures() {
    const localSet = new Set();
    const csvSymptoms = loadSymptomsFromTestCsv();
    for (const symptom of csvSymptoms)
        localSet.add(symptom);
    for (const symptomKey of quiz_1.QUIZ_QUESTION_IDS)
        localSet.add(symptomKey);
    for (const mapped of Object.values(quiz_1.SYMPTOM_TO_ML_FEATURES)) {
        for (const value of mapped)
            localSet.add(value);
    }
    return Array.from(localSet);
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
async function predictWithMlApi(answers, category = "general") {
    const selectedSymptoms = buildSelectedSymptoms(answers);
    try {
        const features = await fetchMlFeatures();
        const payload = buildMlPayload(answers, features);
        const predictRes = await fetch(`${ML_API_URL}/api/v1/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symptoms: payload, top_n: 12 }),
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
        const rawPrediction = {
            disease: prediction.predicted_disease,
            specialty: quiz_1.DISEASE_TO_SPECIALTY[prediction.predicted_disease] ?? "general",
            confidence: confidenceLevel,
            topPredictions: (prediction.top_diseases || [])
                .slice(0, 12)
                .map((d) => ({ disease: d.disease, confidence: d.confidence })),
            selectedSymptoms,
        };
        return alignPredictionToCategory(category, rawPrediction);
    }
    catch {
        return alignPredictionToCategory(category, predictDiseaseRuleBased(answers));
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
    return buildFallbackReasoning(prediction);
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
    const localFeatures = getLocalAdaptiveFeatures();
    let source = "adaptive_local";
    let allFeatures = localFeatures;
    try {
        const mlFeatures = await fetchMlFeatures();
        allFeatures = Array.from(new Set([...localFeatures, ...mlFeatures]));
        source = "adaptive_ml_enhanced";
    }
    catch {
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
    const { answers, category } = parseResult.data;
    const prediction = await predictWithMlApi(answers, category ?? "general");
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
async function getAssessmentById(req, res) {
    const { authUser } = req;
    if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const assessmentId = Number(req.params.id);
    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
        return res.status(400).json({ error: "Invalid assessment id" });
    }
    const [row] = await client_1.db
        .select()
        .from(schema_1.assessments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.assessments.id, assessmentId), (0, drizzle_orm_1.eq)(schema_1.assessments.userId, authUser.id)))
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
