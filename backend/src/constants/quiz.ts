/**
 * Quiz constants for disease prediction (server-side).
 * Mirrors frontend constants - used for assessment submission.
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

export const QUIZ_QUESTION_IDS = [
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
] as const;

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
