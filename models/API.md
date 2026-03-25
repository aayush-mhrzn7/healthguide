# API Reference

Base URL (local): `http://127.0.0.1:8000`

---

## The Model

### What it is

A **Random Forest** classifier — an ensemble of 300 decision trees, each trained on a random subset of training rows and symptom features. Predictions are made by majority vote across all trees; confidence scores come from the fraction of trees that voted for each class.

### Why Random Forest for this problem

The dataset is a binary symptom table: each of the 132 input columns is either `0` (absent) or `1` (present). Tree-based models handle binary features natively — no scaling or encoding needed. Random Forest also gives calibrated `predict_proba` scores out of the box, making it natural to return ranked confidence values.

### Training data

- **File:** `data/raw/training_data.csv`
- **Rows:** 4 920 examples
- **Features:** 132 binary symptom columns
- **Target:** `prognosis` — one of **41 disease names**
- **Split:** 80% train / 20% held-out test (`random_state=101`)

### Test set metrics (current build)

| Metric | Value |
|---|---|
| Accuracy | 1.00 |
| Precision (macro) | 1.00 |
| Recall (macro) | 1.00 |
| F1 (macro) | 1.00 |

Perfect scores reflect a clean, curated dataset where each disease has a unique, non-overlapping symptom fingerprint. This **does not** imply clinical accuracy — real-world symptoms are messy and overlapping.

### Model artifacts

| File | What it contains |
|---|---|
| `models_saved/model.joblib` | Serialised `RandomForestClassifier` object |
| `models_saved/metadata.json` | Feature names, class list, metrics, hyperparameters |

The model is loaded **once at startup** via FastAPI's lifespan handler and held in `app.state.predictor`. It is never reloaded per-request.

### The 41 diseases the model can predict

```
(vertigo) Paroymsal Positional Vertigo  AIDS                    Acne
Alcoholic hepatitis                     Allergy                 Arthritis
Bronchial Asthma                        Cervical spondylosis    Chicken pox
Chronic cholestasis                     Common Cold             Dengue
Diabetes                                Dimorphic hemmorhoids   Drug Reaction
Fungal infection                        GERD                    Gastroenteritis
Heart attack                            Hepatitis A             Hepatitis B
Hepatitis C                             Hepatitis D             Hepatitis E
Hypertension                            Hyperthyroidism         Hypoglycemia
Hypothyroidism                          Impetigo                Jaundice
Malaria                                 Migraine                Osteoarthritis
Paralysis (brain hemorrhage)            Peptic ulcer disease    Pneumonia
Psoriasis                               Tuberculosis            Typhoid
Urinary tract infection                 Varicose veins
```

---

## Endpoints

### `GET /health`

Check whether the API is running and the model is loaded.

**No request body.**

**Response `200`**
```json
{
  "status": "ok",
  "model_loaded": true
}
```

`status` is `"degraded"` and `model_loaded` is `false` if the model file is missing. The API still starts but `/predict` will return `503`.

---

### `GET /api/v1/features`

Returns the **ordered list of 132 symptom keys** the model expects. Use this to build a valid `/predict` payload — every key in this list must be present in your request.

**No request body.**

**Response `200`**
```json
{
  "features": [
    "itching",
    "skin_rash",
    "nodal_skin_eruptions",
    "...",
    "yellow_crust_ooze"
  ],
  "count": 132
}
```

---

### `GET /api/v1/diseases`

Returns the **list of 41 disease labels** the model can output.

**No request body.**

**Response `200`**
```json
{
  "diseases": [
    "(vertigo) Paroymsal  Positional Vertigo",
    "AIDS",
    "Acne",
    "...",
    "hepatitis A"
  ],
  "count": 41
}
```

---

### `GET /api/v1/predict/sample`

Returns a **pre-filled, valid JSON body** for `POST /api/v1/predict` with all 132 symptoms set to `0`. Copy it, flip the symptoms you want to `1`, and send it to `/predict`.

**No request body.**

**Response `200`**
```json
{
  "symptoms": {
    "itching": 0,
    "skin_rash": 0,
    "nodal_skin_eruptions": 0,
    "...": 0,
    "yellow_crust_ooze": 0
  },
  "top_n": 3
}
```

---

### `POST /api/v1/predict`

The main prediction endpoint. Submit a binary symptom profile, get back the most likely disease and top-N candidates with confidence scores.

#### Request body

```json
{
  "symptoms": {
    "<symptom_key>": 0,
    "<symptom_key>": 1,
    "...": 0
  },
  "top_n": 3
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `symptoms` | object | Yes | All 132 symptom keys, each with value `0` (absent) or `1` (present). Every key from `GET /api/v1/features` must be included — no more, no less. |
| `top_n` | integer | No (default `3`) | How many top disease candidates to return. Min `1`, max `10`. |

#### Minimal working example — Fungal infection symptoms

```json
{
  "symptoms": {
    "itching": 1,
    "skin_rash": 1,
    "nodal_skin_eruptions": 1,
    "continuous_sneezing": 0,
    "shivering": 0,
    "chills": 0,
    "joint_pain": 0,
    "stomach_pain": 0,
    "acidity": 0,
    "ulcers_on_tongue": 0,
    "muscle_wasting": 0,
    "vomiting": 0,
    "burning_micturition": 0,
    "spotting_ urination": 0,
    "fatigue": 0,
    "weight_gain": 0,
    "anxiety": 0,
    "cold_hands_and_feets": 0,
    "mood_swings": 0,
    "weight_loss": 0,
    "restlessness": 0,
    "lethargy": 0,
    "patches_in_throat": 0,
    "irregular_sugar_level": 0,
    "cough": 0,
    "high_fever": 0,
    "sunken_eyes": 0,
    "breathlessness": 0,
    "sweating": 0,
    "dehydration": 0,
    "indigestion": 0,
    "headache": 0,
    "yellowish_skin": 0,
    "dark_urine": 0,
    "nausea": 0,
    "loss_of_appetite": 0,
    "pain_behind_the_eyes": 0,
    "back_pain": 0,
    "constipation": 0,
    "abdominal_pain": 0,
    "diarrhoea": 0,
    "mild_fever": 0,
    "yellow_urine": 0,
    "yellowing_of_eyes": 0,
    "acute_liver_failure": 0,
    "fluid_overload": 0,
    "swelling_of_stomach": 0,
    "swelled_lymph_nodes": 0,
    "malaise": 0,
    "blurred_and_distorted_vision": 0,
    "phlegm": 0,
    "throat_irritation": 0,
    "redness_of_eyes": 0,
    "sinus_pressure": 0,
    "runny_nose": 0,
    "congestion": 0,
    "chest_pain": 0,
    "weakness_in_limbs": 0,
    "fast_heart_rate": 0,
    "pain_during_bowel_movements": 0,
    "pain_in_anal_region": 0,
    "bloody_stool": 0,
    "irritation_in_anus": 0,
    "neck_pain": 0,
    "dizziness": 0,
    "cramps": 0,
    "bruising": 0,
    "obesity": 0,
    "swollen_legs": 0,
    "swollen_blood_vessels": 0,
    "puffy_face_and_eyes": 0,
    "enlarged_thyroid": 0,
    "brittle_nails": 0,
    "swollen_extremeties": 0,
    "excessive_hunger": 0,
    "extra_marital_contacts": 0,
    "drying_and_tingling_lips": 0,
    "slurred_speech": 0,
    "knee_pain": 0,
    "hip_joint_pain": 0,
    "muscle_weakness": 0,
    "stiff_neck": 0,
    "swelling_joints": 0,
    "movement_stiffness": 0,
    "spinning_movements": 0,
    "loss_of_balance": 0,
    "unsteadiness": 0,
    "weakness_of_one_body_side": 0,
    "loss_of_smell": 0,
    "bladder_discomfort": 0,
    "foul_smell_of urine": 0,
    "continuous_feel_of_urine": 0,
    "passage_of_gases": 0,
    "internal_itching": 0,
    "toxic_look_(typhos)": 0,
    "depression": 0,
    "irritability": 0,
    "muscle_pain": 0,
    "altered_sensorium": 0,
    "red_spots_over_body": 0,
    "belly_pain": 0,
    "abnormal_menstruation": 0,
    "dischromic _patches": 0,
    "watering_from_eyes": 0,
    "increased_appetite": 0,
    "polyuria": 0,
    "family_history": 0,
    "mucoid_sputum": 0,
    "rusty_sputum": 0,
    "lack_of_concentration": 0,
    "visual_disturbances": 0,
    "receiving_blood_transfusion": 0,
    "receiving_unsterile_injections": 0,
    "coma": 0,
    "stomach_bleeding": 0,
    "distention_of_abdomen": 0,
    "history_of_alcohol_consumption": 0,
    "fluid_overload.1": 0,
    "blood_in_sputum": 0,
    "prominent_veins_on_calf": 0,
    "palpitations": 0,
    "painful_walking": 0,
    "pus_filled_pimples": 0,
    "blackheads": 0,
    "scurring": 0,
    "skin_peeling": 0,
    "silver_like_dusting": 0,
    "small_dents_in_nails": 0,
    "inflammatory_nails": 0,
    "blister": 0,
    "red_sore_around_nose": 0,
    "yellow_crust_ooze": 0
  },
  "top_n": 3
}
```

> **Tip:** hit `GET /api/v1/predict/sample` to get this template at runtime with the exact keys the loaded model expects, so you never have a mismatch.

#### Response `200`

```json
{
  "predicted_disease": "Fungal infection",
  "confidence": 0.9733,
  "top_diseases": [
    { "disease": "Fungal infection", "confidence": 0.9733 },
    { "disease": "Drug Reaction",    "confidence": 0.0200 },
    { "disease": "Allergy",          "confidence": 0.0067 }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `predicted_disease` | string | The single most-likely disease. |
| `confidence` | float `[0, 1]` | Fraction of the 300 trees that voted for the top disease. |
| `top_diseases` | array | Ranked list of `top_n` candidates, each with `disease` and `confidence`. Always sorted highest → lowest. |

#### Error responses

**`422` — Missing symptom keys**
```json
{
  "detail": {
    "message": "Missing symptom keys.",
    "missing": ["abdominal_pain", "acidity", "..."],
    "hint": "GET /api/v1/features lists every required key."
  }
}
```

**`422` — Unknown symptom keys**
```json
{
  "detail": {
    "message": "Unknown symptom keys.",
    "unknown": ["fever_score", "pain_level"]
  }
}
```

**`422` — Value out of range**
```json
{
  "detail": "Symptom value must be 0 or 1, got 2"
}
```

**`503` — Model not loaded**
```json
{
  "detail": "Model not loaded. Run `python app/ml/train.py` then restart the server."
}
```

---

## curl examples

```bash
# Health check
curl http://127.0.0.1:8000/health

# Feature list
curl http://127.0.0.1:8000/api/v1/features

# Disease list
curl http://127.0.0.1:8000/api/v1/diseases

# Get a sample request body (save to file, edit, submit)
curl http://127.0.0.1:8000/api/v1/predict/sample -o body.json

# Submit prediction (after editing body.json)
curl -X POST http://127.0.0.1:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d @body.json
```

---

## How confidence scores work

Random Forest calls `predict_proba`, which returns the **fraction of trees in the ensemble that voted for each class**. With 300 trees and 41 classes:

- A confidence of `1.00` means all 300 trees agreed.
- A confidence of `0.50` means 150 trees voted for that disease.
- The `top_diseases` list sums to exactly `1.00` across all 41 classes (only the top `top_n` are shown).

High confidence on this dataset is expected because each disease in the training data has a distinct, non-overlapping symptom pattern. In a real clinical setting, confidence scores would be much lower and the model would need calibration.

---

## Interactive docs

FastAPI generates a full Swagger UI automatically:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`
