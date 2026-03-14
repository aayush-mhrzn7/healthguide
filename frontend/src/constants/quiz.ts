/**
 * Quiz constants for the health assessment.
 * Used by both frontend (display) and backend (disease prediction).
 */

export const QUIZ_QUESTIONS = [
  {
    id: "fever",
    text: "Do you have a fever?",
    symptomKey: "fever",
  },
  {
    id: "cough",
    text: "Do you have a cough (dry or productive)?",
    symptomKey: "cough",
  },
  {
    id: "headache",
    text: "Do you have a headache?",
    symptomKey: "headache",
  },
  {
    id: "sore_throat",
    text: "Do you have a sore throat?",
    symptomKey: "soreThroat",
  },
  {
    id: "runny_nose",
    text: "Do you have a runny or stuffy nose?",
    symptomKey: "runnyNose",
  },
  {
    id: "body_aches",
    text: "Do you have body aches or muscle pain?",
    symptomKey: "bodyAches",
  },
  {
    id: "fatigue",
    text: "Do you feel unusually tired or fatigued?",
    symptomKey: "fatigue",
  },
  {
    id: "nausea",
    text: "Do you feel nauseous or have vomiting?",
    symptomKey: "nausea",
  },
  {
    id: "shortness_of_breath",
    text: "Do you have shortness of breath or difficulty breathing?",
    symptomKey: "shortnessOfBreath",
  },
  {
    id: "chest_pain",
    text: "Do you have chest pain or pressure?",
    symptomKey: "chestPain",
  },
  {
    id: "itchy_eyes",
    text: "Do you have itchy or watery eyes?",
    symptomKey: "itchyEyes",
  },
  {
    id: "sneezing",
    text: "Do you have frequent sneezing?",
    symptomKey: "sneezing",
  },
] as const;

export type SymptomKey = (typeof QUIZ_QUESTIONS)[number]["symptomKey"];

/**
 * Maps symptom keys (from answers) to disease predictions.
 * Each disease has required symptoms and optional supporting symptoms.
 * First matching disease wins (order matters for tie-breaking).
 */
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

/**
 * Fallback when no disease matches.
 */
export const DEFAULT_RECOMMENDATION = {
  disease: "General wellness check recommended",
  specialty: "general",
  confidence: "low" as const,
};
