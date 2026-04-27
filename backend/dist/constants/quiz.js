"use strict";
/**
 * Lightweight category metadata used to:
 *  - bias adaptive quiz question selection toward the chosen body system
 *  - route ML predictions to the correct doctor specialty during booking
 *
 * Everything else (quiz questions, symptom→disease mappings, default
 * predictions) is sourced dynamically from the ML feature service and the
 * raw test_data.csv schema, so this file is intentionally small.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_TO_SPECIALTY = exports.CATEGORY_KEYWORDS = void 0;
exports.normalizeCategory = normalizeCategory;
exports.diseaseMatchesCategory = diseaseMatchesCategory;
exports.inferSpecialty = inferSpecialty;
exports.CATEGORY_KEYWORDS = {
    respiratory: [
        "cough", "breath", "wheez", "chest_tight", "throat", "lung", "sneez",
        "asthma", "pneumonia", "bronch", "tuberc", "respir", "sputum", "phlegm",
        "rapid_breathing", "post_nasal_drip",
    ],
    digestive: [
        "stomach", "abd", "abdomen", "nausea", "vomit", "diarr", "constip",
        "indigest", "acid", "reflux", "gerd", "hepatit", "jaund", "ulcer",
        "liver", "piles", "hemorrh", "bowel", "appet", "epigastric", "cholestasis",
    ],
    neurological: [
        "head", "migraine", "dizz", "neuro", "numb", "tingl", "memory", "seizure",
        "balance", "brain", "paralys", "vertigo", "tremor", "speech",
        "facial_droop", "concentration", "brain_fog",
    ],
    cardiovascular: [
        "heart", "cardio", "pulse", "palpit", "bp", "pressure", "chest_pain",
        "cardiac", "hypertens", "ankle_swell", "orthopnea", "syncope", "varicose",
        "edema", "exertion", "left_arm",
    ],
    musculoskeletal: [
        "joint", "muscle", "back", "bone", "stiff", "spondyl", "osteo", "arthrit",
        "knee", "shoulder", "hip", "wrist", "ankle_pain", "movement_stiffness",
        "range_motion", "pain_walking", "pain_bending",
    ],
    skin: [
        "skin", "rash", "itch", "acne", "spot", "lesion", "redness", "peeling",
        "blister", "psoriasis", "fungal", "impetigo", "eczema", "hives", "scaling",
        "ringworm", "pigmentation",
    ],
    infectious: [
        "fever", "chills", "infect", "viral", "bacter", "typhoid", "malaria",
        "dengue", "aids", "sweats", "malaise", "weakness", "petechiae",
        "swollen_glands", "post_fever",
    ],
    eyes: [
        "eye", "vision", "blur", "watery_eyes", "conjunct", "glaucoma", "cataract",
        "retina", "pupil", "light_sensitivity", "halo", "floaters", "gritty",
        "eyelid",
    ],
    ent: [
        "ear", "nose", "throat", "sinus", "tonsil", "sore_throat", "runny_nose",
        "hearing", "tinnitus", "allergy", "voice", "snoring", "swallow",
    ],
    endocrine: [
        "thyroid", "sugar", "glucose", "hormone", "weight", "metabol", "diabet",
        "hypoglycem", "hunger", "thirst", "menstrual", "cold_intolerance",
        "heat_intolerance", "hair_thinning",
    ],
    urinary: [
        "urin", "kidney", "bladder", "renal", "micturition", "pelvic", "urethr",
        "flank", "groin", "void", "stream",
    ],
    general: [],
};
exports.CATEGORY_TO_SPECIALTY = {
    respiratory: "respiratory",
    digestive: "gastroenterology",
    neurological: "neurology",
    cardiovascular: "cardiology",
    musculoskeletal: "orthopedics",
    skin: "dermatology",
    infectious: "internal_medicine",
    eyes: "ophthalmology",
    ent: "ent",
    endocrine: "endocrinology",
    urinary: "urology",
    general: "general",
};
function normalizeCategory(value) {
    const v = (value ?? "").trim().toLowerCase();
    if (v in exports.CATEGORY_KEYWORDS)
        return v;
    return "general";
}
function diseaseMatchesCategory(disease, category) {
    const cat = normalizeCategory(category);
    if (cat === "general")
        return true;
    const keywords = exports.CATEGORY_KEYWORDS[cat];
    if (!keywords.length)
        return true;
    const name = disease.toLowerCase();
    return keywords.some((kw) => name.includes(kw));
}
/**
 * Infer a doctor specialty from a disease name using the same keyword index.
 * Falls back to "general" so booking always has a valid value.
 */
function inferSpecialty(disease) {
    const name = disease.toLowerCase();
    for (const category of Object.keys(exports.CATEGORY_KEYWORDS)) {
        if (category === "general")
            continue;
        const keywords = exports.CATEGORY_KEYWORDS[category];
        if (keywords.some((kw) => name.includes(kw))) {
            return exports.CATEGORY_TO_SPECIALTY[category];
        }
    }
    return "general";
}
