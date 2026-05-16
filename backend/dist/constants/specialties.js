"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCTOR_SPECIALTIES = void 0;
exports.isDoctorSpecialty = isDoctorSpecialty;
exports.DOCTOR_SPECIALTIES = [
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
];
function isDoctorSpecialty(value) {
    return exports.DOCTOR_SPECIALTIES.includes(value);
}
