# Building an Adaptive Symptom Quiz

How to turn the flat "send all 132 symptoms at once" API into a conversational, question-by-question quiz that narrows down to a diagnosis — just like a doctor would.

---

## The core idea

Instead of asking the user all 132 questions upfront (overwhelming and mostly irrelevant), you:

1. Ask a small set of **broad opening questions** (do you have a fever? any skin issues? stomach problems?)
2. Based on yes answers, **narrow to the symptoms most likely to separate the remaining diseases**
3. Keep asking until you're confident enough to predict, or you've asked enough questions
4. Send the final answers to `POST /api/v1/predict`

This is called an **adaptive quiz** or **decision tree interview**. The model already knows which symptom combinations map to which diseases — the quiz is just a smarter way to collect the input.

---

## Step 1 — Group symptoms into categories

The 132 symptom keys map naturally into body-system buckets. Start by asking one question per bucket.

### Symptom groups

| Category | Symptom keys |
|---|---|
| **Skin** | `itching`, `skin_rash`, `nodal_skin_eruptions`, `yellowish_skin`, `blister`, `red_sore_around_nose`, `yellow_crust_ooze`, `pus_filled_pimples`, `blackheads`, `scurring`, `skin_peeling`, `silver_like_dusting`, `small_dents_in_nails`, `inflammatory_nails`, `dischromic _patches`, `red_spots_over_body` |
| **Digestive** | `stomach_pain`, `acidity`, `ulcers_on_tongue`, `vomiting`, `indigestion`, `nausea`, `loss_of_appetite`, `constipation`, `abdominal_pain`, `diarrhoea`, `belly_pain`, `passage_of_gases`, `stomach_bleeding`, `distention_of_abdomen`, `internal_itching` |
| **Fever & Infection** | `shivering`, `chills`, `high_fever`, `mild_fever`, `sweating`, `dehydration`, `malaise`, `toxic_look_(typhos)` |
| **Respiratory** | `continuous_sneezing`, `cough`, `breathlessness`, `phlegm`, `throat_irritation`, `redness_of_eyes`, `sinus_pressure`, `runny_nose`, `congestion`, `chest_pain`, `mucoid_sputum`, `rusty_sputum`, `blood_in_sputum` |
| **Head & Neurological** | `headache`, `dizziness`, `neck_pain`, `stiff_neck`, `spinning_movements`, `loss_of_balance`, `unsteadiness`, `weakness_of_one_body_side`, `slurred_speech`, `altered_sensorium`, `coma`, `loss_of_smell`, `visual_disturbances`, `blurred_and_distorted_vision`, `lack_of_concentration` |
| **Muscles & Joints** | `joint_pain`, `muscle_wasting`, `back_pain`, `knee_pain`, `hip_joint_pain`, `muscle_weakness`, `swelling_joints`, `movement_stiffness`, `cramps`, `muscle_pain`, `painful_walking` |
| **Urinary** | `burning_micturition`, `spotting_ urination`, `bladder_discomfort`, `foul_smell_of urine`, `continuous_feel_of_urine`, `yellow_urine`, `polyuria` |
| **Eyes & Liver** | `yellowing_of_eyes`, `dark_urine`, `acute_liver_failure`, `fluid_overload`, `swelling_of_stomach`, `swelled_lymph_nodes` |
| **Heart & Circulation** | `fast_heart_rate`, `palpitations`, `prominent_veins_on_calf`, `swollen_legs`, `swollen_blood_vessels`, `chest_pain`, `bruising`, `watering_from_eyes` |
| **Weight & Metabolism** | `weight_gain`, `weight_loss`, `fatigue`, `lethargy`, `restlessness`, `anxiety`, `mood_swings`, `cold_hands_and_feets`, `excessive_hunger`, `increased_appetite`, `irregular_sugar_level` |
| **Thyroid & Hormonal** | `enlarged_thyroid`, `brittle_nails`, `swollen_extremeties`, `puffy_face_and_eyes`, `obesity`, `drying_and_tingling_lips`, `abnormal_menstruation` |
| **History & Exposure** | `family_history`, `receiving_blood_transfusion`, `receiving_unsterile_injections`, `history_of_alcohol_consumption`, `extra_marital_contacts` |

---

## Step 2 — The quiz flow

### Phase 1: Broad screening (always asked, ~6 questions)

Ask one yes/no question per major category. These are the "chief complaint" questions a doctor starts with.

```
Q1: Do you have any skin problems? (rash, itching, spots)
    → yes: flag the Skin group for follow-up
    → no:  all Skin symptoms = 0, skip

Q2: Any digestive issues? (stomach pain, nausea, vomiting)
    → yes: flag Digestive group
    → no:  all Digestive symptoms = 0, skip

Q3: Do you have a fever or chills?
    → yes: flag Fever & Infection group
    → no:  all Fever symptoms = 0, skip

Q4: Any breathing or chest issues? (cough, congestion, chest pain)
    → yes: flag Respiratory group
    → no:  all Respiratory symptoms = 0, skip

Q5: Any muscle, joint, or back pain?
    → yes: flag Muscles & Joints group
    → no:  all Muscles & Joints symptoms = 0, skip

Q6: Any issues with urination?
    → yes: flag Urinary group
    → no:  all Urinary symptoms = 0, skip
```

Every symptom not flagged for follow-up is set to `0` immediately.

---

### Phase 2: Drill-down into flagged groups

For each group the user said yes to, ask each symptom in that group individually.

```
[Skin group flagged]

Q: Do you have itching?           → yes = 1 / no = 0
Q: Do you have a skin rash?       → yes = 1 / no = 0
Q: Any nodal skin eruptions?      → yes = 1 / no = 0
... (rest of Skin group)
```

At the end of Phase 2, you have values for every symptom in every flagged group. All skipped groups are `0`.

---

### Phase 3: Confidence check

After Phase 2, you can **optionally send a partial prediction** to the API to see how confident the model already is.

```
POST /api/v1/predict
{
  "symptoms": { ... all 132 keys, most = 0, flagged groups filled in ... },
  "top_n": 3
}
```

If the top result comes back with `confidence >= 0.85`, you can stop and show the result.

If it's below that threshold (the top 3 candidates are close together), move to Phase 3 and ask about the remaining groups to separate them.

---

## Step 3 — Display names for symptoms

The symptom keys are raw database column names. You need a human-readable label for each one. Map them like this (implement as a lookup dictionary):

```python
SYMPTOM_LABELS = {
    "itching":                      "Do you have itching?",
    "skin_rash":                    "Do you have a skin rash?",
    "nodal_skin_eruptions":         "Do you have bumps or eruptions on your skin?",
    "continuous_sneezing":          "Are you sneezing continuously?",
    "shivering":                    "Are you shivering?",
    "chills":                       "Do you have chills?",
    "joint_pain":                   "Do you have joint pain?",
    "stomach_pain":                 "Do you have stomach pain?",
    "acidity":                      "Do you have acidity or heartburn?",
    "ulcers_on_tongue":             "Do you have ulcers on your tongue?",
    "muscle_wasting":               "Have you noticed muscle wasting?",
    "vomiting":                     "Are you vomiting?",
    "burning_micturition":          "Do you have a burning sensation when urinating?",
    "spotting_ urination":          "Have you noticed spotting during urination?",
    "fatigue":                      "Are you feeling fatigued?",
    "weight_gain":                  "Have you gained weight recently?",
    "anxiety":                      "Are you experiencing anxiety?",
    "cold_hands_and_feets":         "Do your hands and feet feel cold?",
    "mood_swings":                  "Are you having mood swings?",
    "weight_loss":                  "Have you lost weight recently?",
    "restlessness":                 "Are you feeling restless?",
    "lethargy":                     "Are you feeling lethargic or low energy?",
    "patches_in_throat":            "Do you have patches in your throat?",
    "irregular_sugar_level":        "Do you have irregular blood sugar levels?",
    "cough":                        "Do you have a cough?",
    "high_fever":                   "Do you have a high fever?",
    "sunken_eyes":                  "Do you have sunken eyes?",
    "breathlessness":               "Are you experiencing breathlessness?",
    "sweating":                     "Are you sweating excessively?",
    "dehydration":                  "Are you dehydrated?",
    "indigestion":                  "Do you have indigestion?",
    "headache":                     "Do you have a headache?",
    "yellowish_skin":               "Is your skin turning yellowish?",
    "dark_urine":                   "Is your urine dark in color?",
    "nausea":                       "Do you feel nauseous?",
    "loss_of_appetite":             "Have you lost your appetite?",
    "pain_behind_the_eyes":         "Do you have pain behind your eyes?",
    "back_pain":                    "Do you have back pain?",
    "constipation":                 "Are you constipated?",
    "abdominal_pain":               "Do you have abdominal pain?",
    "diarrhoea":                    "Do you have diarrhoea?",
    "mild_fever":                   "Do you have a mild fever?",
    "yellow_urine":                 "Is your urine yellow or dark yellow?",
    "yellowing_of_eyes":            "Are your eyes turning yellow?",
    "acute_liver_failure":          "Have you been told you have liver failure?",
    "fluid_overload":               "Do you have swelling due to fluid retention?",
    "swelling_of_stomach":          "Is your stomach swollen?",
    "swelled_lymph_nodes":          "Do you have swollen lymph nodes?",
    "malaise":                      "Do you have a general feeling of discomfort?",
    "blurred_and_distorted_vision": "Is your vision blurred or distorted?",
    "phlegm":                       "Do you have phlegm or mucus?",
    "throat_irritation":            "Do you have throat irritation?",
    "redness_of_eyes":              "Are your eyes red?",
    "sinus_pressure":               "Do you have sinus pressure?",
    "runny_nose":                   "Do you have a runny nose?",
    "congestion":                   "Do you have nasal congestion?",
    "chest_pain":                   "Do you have chest pain?",
    "weakness_in_limbs":            "Do you have weakness in your arms or legs?",
    "fast_heart_rate":              "Is your heart beating faster than normal?",
    "pain_during_bowel_movements":  "Do you have pain during bowel movements?",
    "pain_in_anal_region":          "Do you have pain in the anal region?",
    "bloody_stool":                 "Have you seen blood in your stool?",
    "irritation_in_anus":           "Do you have irritation in the anal region?",
    "neck_pain":                    "Do you have neck pain?",
    "dizziness":                    "Are you feeling dizzy?",
    "cramps":                       "Do you have cramps?",
    "bruising":                     "Do you bruise easily?",
    "obesity":                      "Are you overweight or obese?",
    "swollen_legs":                 "Do you have swollen legs?",
    "swollen_blood_vessels":        "Do you have visibly swollen blood vessels?",
    "puffy_face_and_eyes":          "Is your face or eyes puffy?",
    "enlarged_thyroid":             "Do you have an enlarged thyroid (neck swelling)?",
    "brittle_nails":                "Are your nails brittle?",
    "swollen_extremeties":          "Do you have swollen hands or feet?",
    "excessive_hunger":             "Are you excessively hungry?",
    "extra_marital_contacts":       "Have you had unprotected sexual contact recently?",
    "drying_and_tingling_lips":     "Do your lips feel dry and tingly?",
    "slurred_speech":               "Is your speech slurred?",
    "knee_pain":                    "Do you have knee pain?",
    "hip_joint_pain":               "Do you have hip joint pain?",
    "muscle_weakness":              "Do you have muscle weakness?",
    "stiff_neck":                   "Is your neck stiff?",
    "swelling_joints":              "Do you have swollen joints?",
    "movement_stiffness":           "Do you feel stiff when moving?",
    "spinning_movements":           "Do you feel like everything is spinning?",
    "loss_of_balance":              "Do you have difficulty keeping your balance?",
    "unsteadiness":                 "Do you feel unsteady on your feet?",
    "weakness_of_one_body_side":    "Do you have weakness on one side of your body?",
    "loss_of_smell":                "Have you lost your sense of smell?",
    "bladder_discomfort":           "Do you have bladder discomfort?",
    "foul_smell_of urine":          "Does your urine have a foul smell?",
    "continuous_feel_of_urine":     "Do you constantly feel the urge to urinate?",
    "passage_of_gases":             "Do you have excessive gas?",
    "internal_itching":             "Do you have internal itching?",
    "toxic_look_(typhos)":          "Do you look or feel seriously ill (toxic appearance)?",
    "depression":                   "Are you experiencing depression?",
    "irritability":                 "Are you feeling irritable?",
    "muscle_pain":                  "Do you have muscle pain?",
    "altered_sensorium":            "Are you experiencing confusion or altered awareness?",
    "red_spots_over_body":          "Do you have red spots over your body?",
    "belly_pain":                   "Do you have belly pain?",
    "abnormal_menstruation":        "Do you have abnormal menstruation?",
    "dischromic _patches":          "Do you have discolored patches on your skin?",
    "watering_from_eyes":           "Do your eyes water excessively?",
    "increased_appetite":           "Has your appetite increased significantly?",
    "polyuria":                     "Are you urinating much more than usual?",
    "family_history":               "Does your family have a history of this type of illness?",
    "mucoid_sputum":                "Is your cough producing thick, mucus-like sputum?",
    "rusty_sputum":                 "Is your cough producing rusty-colored sputum?",
    "lack_of_concentration":        "Are you having trouble concentrating?",
    "visual_disturbances":          "Are you experiencing visual disturbances?",
    "receiving_blood_transfusion":  "Have you recently received a blood transfusion?",
    "receiving_unsterile_injections":"Have you received any injections with unsterile equipment?",
    "coma":                         "Are you or someone you know unresponsive/in a coma?",
    "stomach_bleeding":             "Do you have stomach bleeding?",
    "distention_of_abdomen":        "Is your abdomen distended or bloated?",
    "history_of_alcohol_consumption":"Do you have a history of heavy alcohol consumption?",
    "fluid_overload.1":             "Is fluid retention causing swelling in your body?",
    "blood_in_sputum":              "Is there blood in your sputum when you cough?",
    "prominent_veins_on_calf":      "Do you have prominent or bulging veins on your calf?",
    "palpitations":                 "Do you have heart palpitations?",
    "painful_walking":              "Is walking painful for you?",
    "pus_filled_pimples":           "Do you have pus-filled pimples?",
    "blackheads":                   "Do you have blackheads?",
    "scurring":                     "Do you have scurring on your skin?",
    "skin_peeling":                 "Is your skin peeling?",
    "silver_like_dusting":          "Do you have a silver-like dusting on your skin?",
    "small_dents_in_nails":         "Do you have small dents in your nails?",
    "inflammatory_nails":           "Are your nails inflamed?",
    "blister":                      "Do you have blisters?",
    "red_sore_around_nose":         "Do you have red sores around your nose?",
    "yellow_crust_ooze":            "Do you have yellow crust or ooze on your skin?",
}
```

---

## Step 4 — Putting it together (implementation guide)

### Data structure to maintain during the quiz

```python
quiz_state = {
    "answers": {symptom: 0 for symptom in ALL_132_SYMPTOMS},  # start all at 0
    "flagged_groups": [],          # categories the user said yes to
    "current_phase": 1,            # 1 = broad screening, 2 = drill-down
    "current_group_index": 0,      # which group we're drilling into
    "current_symptom_index": 0,    # which symptom within the group
    "done": False,
}
```

### Quiz logic (pseudocode)

```python
def next_question(state):
    if state["current_phase"] == 1:
        # Ask broad category questions one at a time
        category = CATEGORIES[state["current_category_index"]]
        return {
            "question": category["broad_question"],
            "type": "yes_no",
            "category": category["name"],
        }

    if state["current_phase"] == 2:
        # Drill into each flagged group
        group = state["flagged_groups"][state["current_group_index"]]
        symptom = group["symptoms"][state["current_symptom_index"]]
        return {
            "question": SYMPTOM_LABELS[symptom],
            "type": "yes_no",
            "symptom_key": symptom,
        }

def submit_answer(state, answer):
    if state["current_phase"] == 1:
        if answer == "yes":
            state["flagged_groups"].append(current_category)
        else:
            # Zero out all symptoms in this category
            for s in current_category["symptoms"]:
                state["answers"][s] = 0
        advance_to_next_category(state)

    elif state["current_phase"] == 2:
        state["answers"][current_symptom] = 1 if answer == "yes" else 0
        advance_to_next_symptom(state)

def get_prediction(state):
    # Call POST /api/v1/predict with state["answers"]
    return api.predict(state["answers"], top_n=3)
```

---

## Step 5 — Three ways to build the frontend

### Option A — Simple web page (HTML + JavaScript)

No framework needed. One page, one question at a time, a progress bar, a submit button.

```
┌─────────────────────────────────────────┐
│  Symptom Checker              Step 3/8  │
│  ━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░   │
│                                         │
│  Do you have any skin problems?         │
│  (rash, itching, spots, discoloration)  │
│                                         │
│         [ Yes ]      [ No ]             │
└─────────────────────────────────────────┘
```

The JS maintains the quiz state in memory and calls your FastAPI at the end.

### Option B — React / Vue / Svelte

Same logic, cleaner component model. Each question is a component. State lives in a store (Zustand, Pinia, etc.). Animate the transitions between questions.

### Option C — Terminal / CLI (for testing)

```python
# quiz_cli.py
import requests

ALL_SYMPTOMS = [...]  # fetch from GET /api/v1/features
answers = {s: 0 for s in ALL_SYMPTOMS}

print("Answer yes/no to each question.\n")
for symptom, question in SYMPTOM_LABELS.items():
    resp = input(f"{question} (y/n): ").strip().lower()
    answers[symptom] = 1 if resp == "y" else 0

result = requests.post(
    "http://127.0.0.1:8000/api/v1/predict",
    json={"symptoms": answers, "top_n": 3}
).json()

print(f"\nPredicted: {result['predicted_disease']} ({result['confidence']*100:.1f}%)")
for d in result["top_diseases"]:
    print(f"  {d['disease']}: {d['confidence']*100:.1f}%")
```

---

## Step 6 — Smarter quiz: ask the most informative questions first

The basic approach asks every symptom in flagged groups. A smarter version **ranks which unanswered symptoms will most separate the remaining candidate diseases**.

The idea:

1. After each answer, call `POST /api/v1/predict` with the current partial answers
2. Look at the top 3 candidate diseases and their confidences
3. Find which symptom, if answered, would most likely push one disease clearly above the others
4. Ask that symptom next

This is essentially what the Random Forest's **feature importances** tell you — which symptoms were the most decisive splits across the 300 trees.

```python
# Get feature importances from the trained model
importances = model.feature_importances_  # array of 132 floats, sums to 1.0
```

The symptoms with the highest importance scores are the most diagnostic. You can hard-code the top 20 most important symptoms and always ask those first regardless of what group they belong to, then fill in the rest.

The top most important symptoms in this dataset tend to be things like:
- `yellowish_skin`, `dark_urine`, `yellowing_of_eyes` → liver diseases
- `skin_rash`, `itching`, `nodal_skin_eruptions` → skin diseases
- `high_fever`, `sweating`, `chills` → infectious diseases
- `chest_pain`, `breathlessness` → cardiac/respiratory

---

## End-to-end example

```
User opens quiz

PHASE 1 — BROAD SCREENING
─────────────────────────
Q: Any skin problems?                → YES  ✓ (flags Skin group)
Q: Any digestive issues?             → NO   (zeroes all digestive symptoms)
Q: Fever or chills?                  → YES  ✓ (flags Fever group)
Q: Breathing or chest issues?        → NO   (zeroes all respiratory symptoms)
Q: Muscle or joint pain?             → NO   (zeroes all joint symptoms)
Q: Urination issues?                 → NO   (zeroes all urinary symptoms)

PHASE 2 — SKIN DRILL-DOWN
──────────────────────────
Q: Do you have itching?              → YES  → answers["itching"] = 1
Q: Do you have a skin rash?          → YES  → answers["skin_rash"] = 1
Q: Bumps or eruptions on skin?       → NO   → answers["nodal_skin_eruptions"] = 0
Q: Discoloured patches?              → NO   → ...
... (rest of skin symptoms)

PHASE 2 — FEVER DRILL-DOWN
───────────────────────────
Q: Do you have a high fever?         → NO
Q: Do you have a mild fever?         → NO
Q: Are you shivering?                → NO
Q: Do you have chills?               → NO
... (user realised they just had mild warmth, all = 0)

FINAL PAYLOAD → POST /api/v1/predict
─────────────────────────────────────
{ "symptoms": { "itching": 1, "skin_rash": 1, ...all others: 0 }, "top_n": 3 }

RESULT
──────
Predicted : Fungal infection  (97.3%)
Runner-up : Drug Reaction      (2.0%)
Runner-up : Allergy             (0.7%)
```

---

## Key things to keep in mind

- **All 132 keys must be in the final payload.** Symptoms the user skipped (by saying no to a category) are sent as `0`, not omitted.
- **The quiz does not change the model.** It just collects the input more intelligently. The exact same `POST /api/v1/predict` call is made at the end.
- **`GET /api/v1/predict/sample`** gives you the zero-filled template — use it to initialise quiz state so your key list always matches the loaded model.
- **The symptom keys have quirks** — two keys have embedded spaces (`"spotting_ urination"` and `"foul_smell_of urine"`) and one has a suffix (`"fluid_overload.1"`). Handle these in your display name mapping, not in the key itself.
