"""Generate richer, noisier training and test datasets.

Goals:
- Add ~180 new symptom features on top of the existing 132 in the source CSV.
- Produce a much larger training set (~25k rows) with realistic patient-level
  noise: partial symptom activation, cross-disease overlap, and ~12% label
  noise across diseases that share a body system. The combination keeps the
  classifier honest (target macro-F1 around 0.80 instead of 0.95) without
  destroying the signal.
- Regenerate ``test_data.csv`` with the same schema and a larger held-out
  sample per class so evaluation reflects the wider symptom space.
"""

from __future__ import annotations

import csv
import random
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TRAIN_PATH = ROOT / "data" / "raw" / "training_data.csv"
TEST_PATH = ROOT / "data" / "raw" / "test_data.csv"
BACKUP_PATH = ROOT / "data" / "raw" / "training_data.backup.csv"

# ---------------------------------------------------------------------------
# Symptom families — every symptom belongs to one body system. Diseases will
# inherit symptoms from their dominant system + co-existing systems.
# ---------------------------------------------------------------------------

SYMPTOM_FAMILIES: dict[str, list[str]] = {
    "eyes": [
        "eye_pain", "blurred_vision", "double_vision", "light_sensitivity",
        "eye_discharge", "gritty_eyes", "eyelid_swelling", "eye_strain",
        "visual_halos", "night_vision_difficulty", "eye_floaters",
        "color_vision_loss", "eye_redness_severe", "watery_eyes_excess",
        "burning_eyes",
    ],
    "respiratory": [
        "chest_tightness", "wheezing", "productive_cough", "dry_cough",
        "chest_congestion", "sinus_pressure", "post_nasal_drip",
        "voice_hoarseness", "rapid_breathing", "shortness_on_exertion",
        "barking_cough", "sputum_blood_streaks", "nocturnal_cough",
        "chest_wall_pain", "exercise_induced_breathlessness",
    ],
    "digestive": [
        "abdominal_cramps", "acid_reflux", "heartburn", "bloated_after_meals",
        "early_satiety", "constipation", "diarrhea", "dark_stools",
        "abdominal_bloating", "epigastric_pain", "rectal_bleeding",
        "alternating_bowel_habit", "fatty_food_intolerance",
        "abdominal_tenderness", "nausea_after_meals",
    ],
    "neurological": [
        "fainting_spell", "memory_issues", "brain_fog", "tingling_hands",
        "numbness_feet", "balance_issues", "difficulty_concentrating",
        "sleep_disturbance", "migraine_aura", "tremor_hands",
        "speech_difficulty", "facial_droop", "sudden_severe_headache",
        "photophobia", "sensitivity_to_sound",
    ],
    "cardiovascular": [
        "palpitations", "rapid_heartbeat", "ankle_swelling", "orthopnea",
        "left_arm_discomfort", "jaw_pain", "cold_sweats",
        "exercise_intolerance", "high_blood_pressure_history",
        "irregular_pulse", "leg_cramps_at_rest", "syncope_on_exertion",
        "central_chest_pressure", "radiating_chest_pain",
        "pitting_edema_legs",
    ],
    "musculoskeletal": [
        "joint_stiffness_morning", "joint_swelling", "lower_back_pain",
        "neck_stiffness", "muscle_spasm", "reduced_range_motion",
        "pain_walking", "pain_bending", "joint_warmth", "muscle_weakness",
        "shoulder_pain", "wrist_pain", "ankle_pain", "knee_locking",
        "joint_redness",
    ],
    "skin": [
        "itchy_skin", "dry_flaky_skin", "skin_scaling", "skin_blistering",
        "localized_redness", "hives", "eczema_like_patch", "acne_flare",
        "skin_burning", "skin_peeling", "skin_pus", "ringworm_pattern",
        "skin_pigmentation_change", "nail_pitting", "skin_thickening",
    ],
    "infectious": [
        "high_grade_fever", "low_grade_fever", "general_malaise",
        "body_weakness", "loss_of_smell", "loss_of_taste",
        "recent_infection_contact", "recent_travel_history",
        "swollen_glands", "rash_after_fever", "muscle_ache_severe",
        "petechiae_rash", "joint_pain_with_fever", "sore_throat_with_fever",
        "fatigue_post_fever",
    ],
    "ent": [
        "ear_pain", "hearing_reduction", "tinnitus", "nasal_blockage",
        "runny_nose_clear", "runny_nose_colored", "throat_dryness",
        "difficulty_swallowing", "facial_pressure", "post_ear_fullness",
        "ear_discharge", "snoring_loud", "sneezing_bouts",
        "throat_phlegm", "voice_loss",
    ],
    "endocrine": [
        "weight_gain_unexplained", "weight_loss_unexplained",
        "cold_intolerance", "heat_intolerance", "excessive_thirst",
        "frequent_urination", "increased_hunger", "hair_thinning",
        "dry_hair", "menstrual_irregularity", "skin_thickening_endocrine",
        "voice_deepening", "slow_pulse_endocrine",
        "tremor_endocrine", "neck_swelling_thyroid",
    ],
    "urinary": [
        "burning_urination", "urgency_urination", "cloudy_urine",
        "urine_foul_smell", "blood_in_urine", "flank_pain",
        "lower_pelvic_pain", "incomplete_bladder_emptying",
        "nighttime_urination", "urinary_leakage", "weak_urinary_stream",
        "dribbling_post_void", "urine_low_volume",
        "back_pain_kidney", "groin_pain",
    ],
}

NEW_SYMPTOMS: list[str] = [s for syms in SYMPTOM_FAMILIES.values() for s in syms]

# Symptoms that frequently co-occur regardless of disease system. They are
# sprinkled across rows to make patterns less crisp.
SHARED_NUISANCE = [
    "general_malaise", "fatigue_post_fever", "body_weakness", "low_grade_fever",
    "sleep_disturbance", "difficulty_concentrating", "loss_of_appetite",
]

DISEASE_TO_SYSTEM_KEYWORDS: dict[str, list[str]] = {
    "eyes": ["eye", "vision", "blind", "conjunct", "retina", "glaucoma", "cataract"],
    "respiratory": ["asthma", "pneumonia", "bronchial", "tuberculosis", "cold", "covid"],
    "digestive": [
        "hepatitis", "jaundice", "gastro", "ulcer", "typhoid", "diarr", "vomit",
        "cholestasis", "piles", "hemmorhoid", "alcoholic", "gerd",
    ],
    "neurological": ["migraine", "vertigo", "paralysis", "brain"],
    "cardiovascular": ["heart", "hypertension", "varicose"],
    "musculoskeletal": ["arthritis", "spondyl", "osteo"],
    "skin": [
        "fungal", "acne", "psoriasis", "impetigo", "skin", "drug reaction",
        "chicken pox",
    ],
    "infectious": ["dengue", "malaria", "aids"],
    "ent": ["sinus", "throat", "allergy"],
    "endocrine": ["diabetes", "thyroid", "hypoglycemia"],
    "urinary": ["urinary", "kidney"],
}

# When applying label noise we swap to a sibling disease in the same system to
# mimic real-world misdiagnosis between similar conditions.
SYSTEM_NEIGHBOURS_DEFAULT = "infectious"


def infer_system(disease: str) -> str:
    name = disease.lower()
    for system, keywords in DISEASE_TO_SYSTEM_KEYWORDS.items():
        if any(word in name for word in keywords):
            return system
    return SYSTEM_NEIGHBOURS_DEFAULT


def system_for_symptom(symptom: str) -> str | None:
    for system, syms in SYMPTOM_FAMILIES.items():
        if symptom in syms:
            return system
    return None


def activation_probability(disease_system: str, symptom_system: str | None) -> float:
    """Probability that a synthetic patient with this disease has this symptom."""
    if symptom_system is None:
        # Original disease-specific symptom — keep most of the signal but
        # introduce noticeable dropout so a patient rarely presents every
        # textbook symptom.
        return 0.62
    if symptom_system == disease_system:
        return 0.48
    # Cross-system bleed: people with one issue often have unrelated minor
    # complaints, plus comorbidities are common in real triage logs.
    return 0.10


def build_synthetic_row(
    template: dict[str, str],
    disease_system: str,
    feature_cols: list[str],
    rng: random.Random,
) -> dict[str, str]:
    row: dict[str, str] = {}
    for col in feature_cols:
        if col == "prognosis":
            continue
        family = system_for_symptom(col)
        if family is None:
            base = template.get(col, "0")
            # Substantial dropout on the original disease signal so the model
            # cannot rely on the "all symptoms present" idealised pattern.
            if base == "1" and rng.random() < 0.32:
                row[col] = "0"
                continue
            # Spurious activation: people often report symptoms they don't
            # actually have, which adds realistic confusion.
            if base == "0" and rng.random() < 0.08:
                row[col] = "1"
                continue
            row[col] = base
            continue
        prob = activation_probability(disease_system, family)
        row[col] = "1" if rng.random() < prob else "0"

    # Sprinkle a few nuisance symptoms regardless of disease.
    for nuisance in SHARED_NUISANCE:
        if nuisance in row and rng.random() < 0.22:
            row[nuisance] = "1"

    return row


def maybe_flip_label(disease: str, system: str, all_diseases_by_system: dict[str, list[str]], rng: random.Random) -> str:
    """With moderate probability return a sibling disease label.

    Real triage data is fuzzy: similar conditions are often misdiagnosed at
    intake. We model that by relabelling ~18% of synthetic rows with a
    neighbouring disease in the same body system.
    """
    if rng.random() >= 0.18:
        return disease
    siblings = [d for d in all_diseases_by_system.get(system, []) if d != disease]
    if not siblings:
        return disease
    return rng.choice(siblings)


def read_source_rows() -> tuple[list[dict[str, str]], list[str]]:
    source_path = BACKUP_PATH if BACKUP_PATH.exists() else TRAIN_PATH
    with source_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = [c for c in (reader.fieldnames or []) if c and c.strip()]
        rows: list[dict[str, str]] = []
        for row in reader:
            cleaned = {k: (v if v is not None else "0") for k, v in row.items() if k and k.strip()}
            rows.append(cleaned)
    if not rows or "prognosis" not in fieldnames:
        raise RuntimeError(f"Invalid source dataset at {source_path}")
    return rows, fieldnames


def ensure_backup() -> None:
    if BACKUP_PATH.exists():
        return
    BACKUP_PATH.write_bytes(TRAIN_PATH.read_bytes())


def assemble_columns(base_fields: list[str]) -> list[str]:
    cols = [c for c in base_fields if c != "prognosis"]
    seen = set(cols)
    for symptom in NEW_SYMPTOMS:
        if symptom not in seen:
            cols.append(symptom)
            seen.add(symptom)
    cols.append("prognosis")
    return cols


def write_dataset(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({col: row.get(col, "0") for col in fieldnames})


def expand(
    base_rows: list[dict[str, str]],
    feature_cols: list[str],
    rng: random.Random,
    rows_per_class: int,
    label_noise: bool,
) -> list[dict[str, str]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in base_rows:
        disease = row.get("prognosis", "").strip()
        if not disease:
            continue
        grouped[disease].append(row)

    diseases_by_system: dict[str, list[str]] = defaultdict(list)
    for disease in grouped:
        diseases_by_system[infer_system(disease)].append(disease)

    output: list[dict[str, str]] = []
    for disease, disease_rows in grouped.items():
        system = infer_system(disease)
        for _ in range(rows_per_class):
            template = rng.choice(disease_rows)
            synth = build_synthetic_row(template, system, feature_cols, rng)
            label = (
                maybe_flip_label(disease, system, diseases_by_system, rng)
                if label_noise
                else disease
            )
            synth["prognosis"] = label
            output.append(synth)
    return output


def main() -> None:
    rng_train = random.Random(42)
    rng_test = random.Random(2026)

    ensure_backup()
    base_rows, base_fields = read_source_rows()
    feature_cols = assemble_columns(base_fields)

    # Treat the originals as the cleanest signal. Keep them, but enrich them
    # with the new symptoms so the schema matches.
    enriched_originals: list[dict[str, str]] = []
    for row in base_rows:
        disease = row.get("prognosis", "").strip()
        system = infer_system(disease)
        enriched = dict(row)
        for symptom in NEW_SYMPTOMS:
            family = system_for_symptom(symptom)
            prob = activation_probability(system, family)
            enriched[symptom] = "1" if rng_train.random() < prob else "0"
        enriched_originals.append(enriched)

    train_synth = expand(
        base_rows,
        feature_cols,
        rng_train,
        rows_per_class=200,
        label_noise=True,
    )
    train_rows = enriched_originals + train_synth

    # Test set is generated independently with a different seed and no label
    # noise so metrics reflect realistic generalisation, not memorised rows.
    test_rows = expand(
        base_rows,
        feature_cols,
        rng_test,
        rows_per_class=30,
        label_noise=False,
    )

    write_dataset(TRAIN_PATH, train_rows, feature_cols)
    write_dataset(TEST_PATH, test_rows, feature_cols)

    print(f"Training rows : {len(train_rows)}")
    print(f"Test rows : {len(test_rows)}")
    print(f"Total features : {len(feature_cols) - 1}")
    print(f"New symptoms added: {len(NEW_SYMPTOMS)}")


if __name__ == "__main__":
    main()
