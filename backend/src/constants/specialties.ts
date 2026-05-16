export const DOCTOR_SPECIALTIES = [
  "general",
  "family_medicine",
  "internal_medicine",
  "cardiology",
  "respiratory",
  "pulmonology",
  "allergy",
  "gastroenterology",
  "neurology",
  "orthopedics",
  "dermatology",
  "infectious_disease",
  "ophthalmology",
  "ent",
  "endocrinology",
  "urology",
  "gynecology",
  "pediatrics",
  "psychiatry",
] as const;

export type DoctorSpecialty = (typeof DOCTOR_SPECIALTIES)[number];

export function isDoctorSpecialty(value: string): value is DoctorSpecialty {
  return DOCTOR_SPECIALTIES.includes(value as DoctorSpecialty);
}
