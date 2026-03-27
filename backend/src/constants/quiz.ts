/**
 * Quiz constants for disease prediction (server-side).
 * Mirrors frontend constants - used for assessment submission.
 *
 * QUIZ_QUESTION_COUNT is controlled by the QUIZ_QUESTION_COUNT env var (default 12).
 * The ML model uses 132 binary features; SYMPTOM_TO_ML_FEATURE maps each quiz
 * symptom key to the corresponding feature name(s) in the trained model.
 */

export type SymptomKey =
  | "fever"
  | "cough"
  | "headache"
  | "soreThroat"
  | "runnyNose"
  | "bodyAches"
  | "fatigue"
  | "nausea"
  | "shortnessOfBreath"
  | "chestPain"
  | "itchyEyes"
  | "sneezing";

export const ALL_QUIZ_QUESTION_IDS: SymptomKey[] = [
  "fever",
  "cough",
  "headache",
  "soreThroat",
  "runnyNose",
  "bodyAches",
  "fatigue",
  "nausea",
  "shortnessOfBreath",
  "chestPain",
  "itchyEyes",
  "sneezing",
];

export const QUIZ_QUESTION_COUNT = Math.min(
  Number(process.env.QUIZ_QUESTION_COUNT ?? 12) || 12,
  ALL_QUIZ_QUESTION_IDS.length
);

export const QUIZ_QUESTION_IDS = ALL_QUIZ_QUESTION_IDS.slice(
  0,
  QUIZ_QUESTION_COUNT
);

/**
 * Maps each quiz symptom key to the ML model feature name(s).
 * When a user answers "yes" to a symptom, all mapped ML features are set to 1.
 */
export const SYMPTOM_TO_ML_FEATURES: Record<SymptomKey, string[]> = {
  fever: ["high_fever", "mild_fever"],
  cough: ["cough"],
  headache: ["headache"],
  soreThroat: ["patches_in_throat", "throat_irritation"],
  runnyNose: ["runny_nose", "congestion"],
  bodyAches: ["muscle_pain", "joint_pain"],
  fatigue: ["fatigue", "lethargy", "malaise"],
  nausea: ["nausea", "vomiting"],
  shortnessOfBreath: ["breathlessness"],
  chestPain: ["chest_pain"],
  itchyEyes: ["redness_of_eyes", "watering_from_eyes"],
  sneezing: ["continuous_sneezing"],
};

export const DISEASE_SYMPTOM_MAP: Array<{
  disease: string;
  specialty: string;
  requiredSymptoms: SymptomKey[];
  optionalSymptoms: SymptomKey[];
  confidence: "high" | "medium" | "low";
}> = [
  {
    disease: "Seasonal flu",
    specialty: "general",
    requiredSymptoms: ["fever", "cough", "bodyAches"],
    optionalSymptoms: ["headache", "fatigue", "soreThroat", "runnyNose"],
    confidence: "high",
  },
  {
    disease: "Common cold",
    specialty: "general",
    requiredSymptoms: ["runnyNose", "soreThroat"],
    optionalSymptoms: ["cough", "sneezing", "headache", "fatigue"],
    confidence: "high",
  },
  {
    disease: "COVID-19 (suspected)",
    specialty: "respiratory",
    requiredSymptoms: ["fever", "cough"],
    optionalSymptoms: [
      "shortnessOfBreath",
      "fatigue",
      "bodyAches",
      "soreThroat",
      "headache",
    ],
    confidence: "medium",
  },
  {
    disease: "Respiratory infection",
    specialty: "respiratory",
    requiredSymptoms: ["cough", "shortnessOfBreath"],
    optionalSymptoms: ["fever", "chestPain", "fatigue"],
    confidence: "medium",
  },
  {
    disease: "Migraine",
    specialty: "general",
    requiredSymptoms: ["headache"],
    optionalSymptoms: ["nausea", "fatigue"],
    confidence: "medium",
  },
  {
    disease: "Allergic rhinitis",
    specialty: "allergy",
    requiredSymptoms: ["itchyEyes", "sneezing"],
    optionalSymptoms: ["runnyNose", "cough"],
    confidence: "high",
  },
  {
    disease: "Stomach flu / Gastroenteritis",
    specialty: "general",
    requiredSymptoms: ["nausea"],
    optionalSymptoms: ["fatigue", "bodyAches", "fever"],
    confidence: "medium",
  },
  {
    disease: "General fatigue / Stress",
    specialty: "general",
    requiredSymptoms: ["fatigue"],
    optionalSymptoms: ["headache", "bodyAches"],
    confidence: "low",
  },
];

export const DEFAULT_RECOMMENDATION = {
  disease: "General wellness check recommended",
  specialty: "general",
  confidence: "low" as const,
};

/**
 * Maps a predicted disease name from the ML model to a medical specialty.
 */
export const DISEASE_TO_SPECIALTY: Record<string, string> = {
  "(vertigo) Paroymsal  Positional Vertigo": "general",
  AIDS: "general",
  Acne: "dermatology",
  "Alcoholic hepatitis": "general",
  Allergy: "allergy",
  Arthritis: "general",
  "Bronchial Asthma": "respiratory",
  "Cervical spondylosis": "general",
  "Chicken pox": "general",
  "Chronic cholestasis": "general",
  "Common Cold": "general",
  Dengue: "general",
  "Diabetes ": "general",
  "Dimorphic hemmorhoids(piles)": "general",
  "Drug Reaction": "general",
  "Fungal infection": "dermatology",
  GERD: "general",
  Gastroenteritis: "general",
  "Heart attack": "cardiology",
  "Hepatitis B": "general",
  "Hepatitis C": "general",
  "Hepatitis D": "general",
  "Hepatitis E": "general",
  "Hypertension ": "cardiology",
  Hyperthyroidism: "general",
  Hypoglycemia: "general",
  Hypothyroidism: "general",
  Impetigo: "dermatology",
  Jaundice: "general",
  Malaria: "general",
  Migraine: "general",
  Osteoarthristis: "general",
  "Paralysis (brain hemorrhage)": "general",
  "Peptic ulcer diseae": "general",
  Pneumonia: "respiratory",
  Psoriasis: "dermatology",
  Tuberculosis: "respiratory",
  Typhoid: "general",
  "Urinary tract infection": "general",
  "Varicose veins": "general",
  "hepatitis A": "general",
};
