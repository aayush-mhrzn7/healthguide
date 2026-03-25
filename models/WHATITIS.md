# What Is This Project?

A complete walkthrough of every file, every concept, and every decision in this codebase — written assuming you know Python but are new to machine learning APIs.

---

## The big picture

You type in your symptoms. You get back the most likely disease and how confident the model is.

That's it. The interesting part is *how* — a trained Random Forest model sitting behind a FastAPI server, loaded once at startup, answering prediction requests in milliseconds.

```
Your JSON symptoms
      ↓
POST /api/v1/predict
      ↓
FastAPI validates the payload
      ↓
132 symptom values fed into Random Forest
      ↓
300 decision trees each cast a vote
      ↓
Votes tallied → top 3 diseases + confidence scores
      ↓
JSON response back to you
```

---

## The dataset

**File:** `data/raw/training_data.csv`

This is a hand-curated table. Each row is one training example. Each column is one symptom (binary: 0 = absent, 1 = present). The last column, `prognosis`, is the disease name.

```
itching | skin_rash | fatigue | ... | yellow_crust_ooze | prognosis
   1    |     1     |    0    | ... |         0         | Fungal infection
   0    |     0     |    1    | ... |         0         | Malaria
```

- **4,920 rows** — training examples
- **132 symptom columns** — the features the model learns from
- **41 disease labels** — what the model can predict
- **Source:** originally from the [Columbia Disease-Symptom Knowledge Base](http://people.dbmi.columbia.edu/~friedma/Projects/DiseaseSymptomKB/index.html), cleaned and restructured into a binary matrix

One quirk: the CSV has a trailing comma at the end of every header line, which pandas reads as an extra empty column called `Unnamed: 133`. The preprocess code drops it automatically.

Another quirk: `fluid_overload` appears twice as a column name. Pandas resolves this by renaming the second one `fluid_overload.1`. Both column names are preserved in `metadata.json` so the API always stays in sync.

---

## The machine learning model

### What is a Decision Tree?

A decision tree is a flowchart of yes/no questions. For this dataset it looks like:

```
Is itching = 1?
  Yes → Is skin_rash = 1?
              Yes → Is nodal_skin_eruptions = 1?
                        Yes → Fungal infection (confidence: high)
                        No  → Drug Reaction
              No  → Allergy
  No  → ...
```

The tree is learned automatically from the training data — sklearn finds the questions that best separate the 41 diseases.

### What is a Random Forest?

A Random Forest is **300 decision trees**, each trained slightly differently:

1. Each tree sees a **random sample of the training rows** (with replacement — called "bagging")
2. Each tree only considers a **random subset of symptom columns** at each split

This randomness means each tree is slightly different and makes different mistakes. When you send a prediction request, **all 300 trees vote**. The disease with the most votes wins.

Why does this work better than one tree? Because individual trees overfit — they memorise the training data. When you average 300 slightly different trees, the noise cancels out and you get a more reliable answer.

### Why Random Forest for this specific problem?

- **Binary input features** — tree models handle 0/1 values perfectly with no preprocessing (no scaling, no encoding)
- **41 output classes** — Random Forest handles multi-class problems natively
- **Small dataset** — 4,920 rows is tiny by ML standards; neural networks need far more data to generalise
- **`predict_proba`** — Random Forest naturally produces probability estimates (fraction of trees that voted for each class), which maps directly to confidence scores

### What does "confidence" mean?

When you send symptoms, the model returns a number between 0 and 1 per disease — the **fraction of the 300 trees that voted for that disease**.

- `0.973` means 292 out of 300 trees voted for "Fungal infection"
- `0.020` means 6 trees voted for "Drug Reaction"
- `0.007` means 2 trees voted for "Allergy"

The total across all 41 diseases always sums to 1.0. The API shows you the top 3 by default.

### Why does accuracy show as 1.0?

The dataset is synthetic and curated — each disease has a unique, non-overlapping set of symptom combinations. The model essentially memorises the pattern table. This does **not** mean it would perform this well on real patient data, where symptoms overlap, are reported inconsistently, and diseases co-occur. Treat these metrics as a dataset property, not a clinical claim.

### Training configuration

```python
RandomForestClassifier(
    n_estimators=300,       # 300 trees in the ensemble
    random_state=101,       # fixed seed for reproducibility
    n_jobs=-1,              # use all CPU cores
    class_weight="balanced_subsample",  # upweight rare diseases per tree
)
```

`class_weight="balanced_subsample"` matters because some diseases appear more often in the training data. This setting tells each tree to treat rare diseases as if they had more examples, preventing the model from just always predicting common diseases.

---

## File by file

### `app/ml/preprocess.py`

Responsible for loading and cleaning the CSV before training.

```
load_raw_training_csv()       → reads CSV, strips whitespace from headers,
                                drops the spurious Unnamed column
prepare_features_and_target() → splits into X (132 symptom columns)
                                and y (prognosis string array)
get_feature_columns()         → returns column names minus "prognosis"
```

This file is only used during training. The API does not call it at runtime — the feature list is already baked into `metadata.json`.

---

### `app/ml/train.py`

The standalone training script. Run it once to produce the model files.

```bash
python app/ml/train.py
```

What it does, step by step:

1. Loads `data/raw/training_data.csv` via `preprocess.py`
2. Splits into 80% train / 20% test (`train_test_split`, `random_state=101`)
3. Fits `RandomForestClassifier` on the training split
4. Evaluates accuracy, precision, recall, F1 on the held-out test split
5. Saves the fitted model object to `models_saved/model.joblib`
6. Saves feature names, class list, and metrics to `models_saved/metadata.json`

The `metadata.json` is critical — the API reads it at startup to know which symptom keys to expect and which disease labels map to which output index.

---

### `models_saved/model.joblib`

The serialised Python object of the trained `RandomForestClassifier`. Produced by `joblib.dump()`, loaded back with `joblib.load()`. Contains all 300 trees, their split rules, and class mappings — everything needed to run `predict_proba()`.

---

### `models_saved/metadata.json`

A JSON file written alongside the model. Contains:

```json
{
  "model": "RandomForestClassifier",
  "feature_names": ["itching", "skin_rash", ...],   // 132 items, in exact column order
  "classes": ["AIDS", "Acne", ...],                  // 41 disease labels, alphabetical
  "test_metrics": { "accuracy": 1.0, "f1_macro": 1.0, ... },
  "n_estimators": 300,
  "n_samples": 4920,
  "n_features": 132
}
```

The `feature_names` order matters — it must exactly match the column order the model was trained on, so inference inputs are built in the same order.

---

### `app/ml/predict.py`

The inference engine. Loaded once at startup and reused for every request.

```
DiseasePredictor.load(model_dir)
  → reads model.joblib and metadata.json
  → exposes .feature_names and .classes

DiseasePredictor.predict(symptoms, top_n=3)
  → builds a 1×132 numpy array from the symptom dict
  → calls model.predict_proba() → array of 41 probabilities
  → sorts descending, returns top_n with 3-decimal confidence scores
```

The `round(..., 3)` on confidence scores means you see `0.973` instead of `0.9733333...`. It's a presentation choice — the underlying float is the raw tree vote fraction.

---

### `app/utils/helpers.py`

Three tiny pure functions used by the prediction router:

```
validate_symptom_payload(symptoms, feature_names)
  → returns (missing_keys, extra_keys)
  → used to give precise 422 error messages

clamp_binary(value)
  → raises ValueError if value is not in [0, 1]
  → called on every symptom value before prediction

symptoms_to_feature_vector(symptoms, feature_names)
  → dict → list, in the exact column order from metadata.json
  → this ordering is what makes the prediction correct
```

---

### `app/models/schemas.py`

Pydantic models — they define the exact shape of every request and response. FastAPI uses them to auto-validate inputs and auto-generate the Swagger docs at `/docs`.

```
PredictRequest     → what POST /api/v1/predict expects
PredictResponse    → what POST /api/v1/predict returns
DiseaseScore       → one disease + confidence (used inside PredictResponse)
HealthResponse     → what GET /health returns
FeatureListResponse → what GET /api/v1/features returns
DiseaseListResponse → what GET /api/v1/diseases returns
```

If a request doesn't match `PredictRequest`, FastAPI automatically returns a `422` before your code even runs.

---

### `app/deps.py`

One function: `get_predictor(request)`.

FastAPI uses dependency injection — instead of importing the predictor directly in the router, you declare it as a dependency. FastAPI calls `get_predictor` for you and passes the result into your route function. This makes the router testable (you can inject a fake predictor in tests) and keeps `app.state` access in one place.

If the model was never loaded (e.g. `model.joblib` doesn't exist), `get_predictor` raises a `503` so you get a clear error instead of a cryptic `AttributeError`.

---

### `app/routers/prediction.py`

Defines the four API routes. Each route is a plain Python function — FastAPI wraps the HTTP layer around it.

```
POST /api/v1/predict          → validates payload → calls predictor.predict()
GET  /api/v1/features         → returns feature_names from loaded predictor
GET  /api/v1/diseases         → returns classes from loaded predictor
GET  /api/v1/predict/sample   → returns a pre-filled payload template (all zeros)
```

The `/predict/sample` endpoint is a convenience — it asks the running predictor for its feature list and builds a zero-filled dict. This means it always reflects the model currently loaded, even if you retrain with different columns.

---

### `app/main.py`

The FastAPI application object and startup logic.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.predictor = DiseasePredictor.load(model_dir)
    yield
```

The `lifespan` context manager runs once when the server starts. It loads the model from disk and stores it in `app.state`. Every request after that reads from `app.state` — the model is never reloaded per-request.

`CORSMiddleware` is added so browser frontends (React, Vue, etc.) can call the API without being blocked by the browser's same-origin policy.

---

### `tests/`

```
conftest.py        → defines a _FakePredictor with hardcoded outputs
                     patches DiseasePredictor.load to return the fake
                     so tests never touch the real model.joblib
test_prediction.py → 8 tests covering all routes and all error cases
```

The tests run in ~0.03 seconds because no real model is loaded. The fake predictor always returns "Allergy" with 0.85 confidence — the tests verify the API contract, not the ML.

---

### `Dockerfile`

Builds a container image with:
- Python 3.11 slim base
- `libgomp1` system package (OpenMP, needed if you install XGBoost/LightGBM later)
- All Python dependencies from `requirements.txt`
- The entire project copied in
- Startup command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

The model artifact is **not** baked into the image by default. Mount `models_saved/` as a volume so you can retrain without rebuilding:

```bash
docker run -p 8000:8000 -v $(pwd)/models_saved:/app/models_saved disease-api
```

---

### `.env.example`

Template for environment variables:

```
MODEL_DIR        → where model.joblib and metadata.json live (default: models_saved)
TRAIN_DATA_PATH  → CSV used by train.py (default: data/raw/training_data.csv)
CORS_ORIGINS     → comma-separated allowed origins (default: * = all)
```

Copy to `.env` and the app reads it automatically via `python-dotenv`.

---

## Data flow: one full request

```
1. Client sends POST /api/v1/predict
   Body: { "symptoms": { "itching": 1, "skin_rash": 1, ... all 132 keys ... }, "top_n": 3 }

2. FastAPI deserialises into PredictRequest (Pydantic validates types)

3. predict_disease() in prediction.py runs:
   a. validate_symptom_payload() checks all 132 keys are present, no extras
   b. clamp_binary() checks every value is 0 or 1
   c. predictor.predict() is called

4. DiseasePredictor.predict():
   a. symptoms_to_feature_vector() orders values to match training column order
   b. np.asarray() builds a 1×132 float64 matrix
   c. model.predict_proba() runs all 300 trees → 41 probability scores
   d. argsort descending → top 3 indices → round to 3 decimals
   e. returns PredictionResult dataclass

5. Router builds PredictResponse from the dataclass

6. FastAPI serialises to JSON and returns:
   {
     "predicted_disease": "Fungal infection",
     "confidence": 0.973,
     "top_diseases": [
       { "disease": "Fungal infection", "confidence": 0.973 },
       { "disease": "Drug Reaction",    "confidence": 0.020 },
       { "disease": "Allergy",          "confidence": 0.007 }
     ]
   }
```

---

## Limitations

- **Synthetic data** — the training set is curated, not collected from real patients. Real symptoms are noisy, overlap between diseases, and change over time.
- **Binary only** — symptoms are present or absent. Real clinical data has severity, duration, demographics.
- **Static model** — the model doesn't update. If new diseases emerge, you retrain from scratch.
- **No calibration** — the raw `predict_proba` from a Random Forest is not perfectly calibrated (a score of 0.8 does not necessarily mean 80% probability). Calibration (e.g. Platt scaling) would be needed for clinical use.
- **Not a medical device** — this is a learning project. Do not use it to make health decisions.
