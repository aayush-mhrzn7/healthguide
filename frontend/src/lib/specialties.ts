export const DOCTOR_SPECIALTIES = [
  { value: "general", label: "General" },
  { value: "family_medicine", label: "Family Medicine" },
  { value: "internal_medicine", label: "Internal Medicine" },
  { value: "cardiology", label: "Cardiology" },
  { value: "respiratory", label: "Respiratory" },
  { value: "pulmonology", label: "Pulmonology" },
  { value: "allergy", label: "Allergy" },
  { value: "gastroenterology", label: "Gastroenterology" },
  { value: "neurology", label: "Neurology" },
  { value: "orthopedics", label: "Orthopedics" },
  { value: "dermatology", label: "Dermatology" },
  { value: "infectious_disease", label: "Infectious Disease" },
  { value: "ophthalmology", label: "Ophthalmology" },
  { value: "ent", label: "ENT" },
  { value: "endocrinology", label: "Endocrinology" },
  { value: "urology", label: "Urology" },
  { value: "gynecology", label: "Gynecology" },
  { value: "pediatrics", label: "Pediatrics" },
  { value: "psychiatry", label: "Psychiatry" },
] as const;

export function formatSpecialty(value: string | null | undefined): string {
  const specialty = DOCTOR_SPECIALTIES.find((item) => item.value === value);
  return specialty?.label ?? (value ? value.replace(/_/g, " ") : "General");
}
