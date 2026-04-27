from __future__ import annotations

import csv
import random
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INPUT_PATH = ROOT / "data" / "raw" / "training_data.csv"
BACKUP_PATH = ROOT / "data" / "raw" / "training_data.backup.csv"


NEW_SYMPTOMS = [
    "eye_pain",
    "blurred_vision",
    "double_vision",
    "light_sensitivity",
    "eye_discharge",
    "gritty_eyes",
    "eyelid_swelling",
    "eye_strain",
    "visual_halos",
    "night_vision_difficulty",
    "chest_tightness",
    "wheezing",
    "productive_cough",
    "dry_cough",
    "chest_congestion",
    "sore_throat_worse_morning",
    "sinus_pressure",
    "post_nasal_drip",
    "voice_hoarseness",
    "rapid_breathing",
    "abdominal_cramps",
    "acid_reflux",
    "heartburn",
    "bloated_after_meals",
    "loss_of_appetite",
    "early_satiety",
    "constipation",
    "diarrhea",
    "dark_stools",
    "abdominal_bloating",
    "dizziness",
    "fainting_spell",
    "memory_issues",
    "brain_fog",
    "tingling_hands",
    "numbness_feet",
    "balance_issues",
    "difficulty_concentrating",
    "sleep_disturbance",
    "migraine_aura",
    "palpitations",
    "rapid_heartbeat",
    "ankle_swelling",
    "shortness_on_exertion",
    "orthopnea",
    "left_arm_discomfort",
    "jaw_pain",
    "cold_sweats",
    "exercise_intolerance",
    "high_blood_pressure_history",
    "joint_stiffness_morning",
    "joint_swelling",
    "lower_back_pain",
    "neck_stiffness",
    "muscle_spasm",
    "reduced_range_motion",
    "pain_walking",
    "pain_bending",
    "joint_warmth",
    "muscle_weakness",
    "itchy_skin",
    "dry_flaky_skin",
    "skin_scaling",
    "skin_blistering",
    "localized_redness",
    "hives",
    "eczema_like_patch",
    "acne_flare",
    "skin_burning",
    "skin_peeling",
    "high_grade_fever",
    "low_grade_fever",
    "chills",
    "night_sweats",
    "general_malaise",
    "body_weakness",
    "loss_of_smell",
    "loss_of_taste",
    "recent_infection_contact",
    "recent_travel_history",
    "ear_pain",
    "hearing_reduction",
    "tinnitus",
    "nasal_blockage",
    "runny_nose_clear",
    "runny_nose_colored",
    "throat_dryness",
    "difficulty_swallowing",
    "facial_pressure",
    "post_ear_fullness",
    "weight_gain_unexplained",
    "weight_loss_unexplained",
    "cold_intolerance",
    "heat_intolerance",
    "excessive_thirst",
    "frequent_urination",
    "increased_hunger",
    "hair_thinning",
    "dry_hair",
    "menstrual_irregularity",
    "burning_urination",
    "urgency_urination",
    "cloudy_urine",
    "urine_foul_smell",
    "blood_in_urine",
    "flank_pain",
    "lower_pelvic_pain",
    "incomplete_bladder_emptying",
    "nighttime_urination",
    "urinary_leakage",
]


SYSTEM_KEYWORDS = {
    "eyes": ["eye", "vision", "blind", "conjunct", "retina", "glaucoma", "cataract"],
    "respiratory": ["asthma", "pneumonia", "bronchial", "tuberculosis", "cold", "allergy"],
    "digestive": ["hepatitis", "jaundice", "gastro", "ulcer", "typhoid", "diarr", "vomit"],
    "neurological": ["migraine", "vertigo", "paralysis", "brain"],
    "cardiovascular": ["heart", "hypertension"],
    "musculoskeletal": ["arthritis", "spondyl", "osteo"],
    "skin": ["fungal", "acne", "psoriasis", "impetigo", "skin", "drug reaction"],
    "infectious": ["dengue", "malaria", "chicken pox", "aids"],
    "endocrine": ["diabetes", "thyroid", "hypo"],
    "urinary": ["urinary", "kidney"],
    "ent": ["sinus", "throat"],
}

SYSTEM_TO_SYMPTOMS = {
    "eyes": NEW_SYMPTOMS[0:10],
    "respiratory": NEW_SYMPTOMS[10:20],
    "digestive": NEW_SYMPTOMS[20:30],
    "neurological": NEW_SYMPTOMS[30:40],
    "cardiovascular": NEW_SYMPTOMS[40:50],
    "musculoskeletal": NEW_SYMPTOMS[50:60],
    "skin": NEW_SYMPTOMS[60:70],
    "infectious": NEW_SYMPTOMS[70:80],
    "ent": NEW_SYMPTOMS[80:90],
    "endocrine": NEW_SYMPTOMS[90:100],
    "urinary": NEW_SYMPTOMS[100:110],
}


def infer_system(disease: str) -> str:
    name = disease.lower()
    for system, keywords in SYSTEM_KEYWORDS.items():
        if any(word in name for word in keywords):
            return system
    return "infectious"


def build_value(system: str, symptom: str) -> str:
    own = symptom in SYSTEM_TO_SYMPTOMS.get(system, [])
    if own:
        return "1" if random.random() < 0.72 else "0"
    return "1" if random.random() < 0.04 else "0"


def synthetic_copy(base_row: dict[str, str], feature_cols: list[str]) -> dict[str, str]:
    row = dict(base_row)
    for col in feature_cols:
        if col in ("prognosis", "") or col in NEW_SYMPTOMS:
            continue
        value = row.get(col, "0")
        if random.random() < 0.02:
            row[col] = "0" if value == "1" else "1"
    return row


def main() -> None:
    random.seed(42)
    with INPUT_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])

    if not rows or "prognosis" not in fieldnames:
        raise RuntimeError("Invalid training_data.csv format")

    if not BACKUP_PATH.exists():
        BACKUP_PATH.write_text(INPUT_PATH.read_text(encoding="utf-8"), encoding="utf-8")

    for symptom in NEW_SYMPTOMS:
        if symptom not in fieldnames:
            fieldnames.insert(-1, symptom)

    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        disease = row.get("prognosis", "").strip()
        grouped[disease].append(row)

    expanded_rows: list[dict[str, str]] = []
    for disease, disease_rows in grouped.items():
        system = infer_system(disease)
        for row in disease_rows:
            enriched = dict(row)
            for symptom in NEW_SYMPTOMS:
                enriched[symptom] = build_value(system, symptom)
            expanded_rows.append(enriched)

        # Add realistic synthetic rows per disease class.
        target_extra = max(20, len(disease_rows) // 2)
        for _ in range(target_extra):
            template = random.choice(disease_rows)
            synth = synthetic_copy(template, fieldnames)
            for symptom in NEW_SYMPTOMS:
                synth[symptom] = build_value(system, symptom)
            synth["prognosis"] = disease
            expanded_rows.append(synth)

    with INPUT_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(expanded_rows)

    print(f"Augmented dataset written: {INPUT_PATH}")
    print(f"Rows: {len(expanded_rows)}")
    print(f"Features added: {len(NEW_SYMPTOMS)}")
    print(f"Total columns: {len(fieldnames)}")


if __name__ == "__main__":
    main()
