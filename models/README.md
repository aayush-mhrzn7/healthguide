# Disease Prediction API

Production-style **FastAPI** service that predicts probable **diseases from binary / graded symptom answers**, trained on the same tabular dataset used in the original Jupyter workflow (`training_data.csv`).

## Quick start

```bash
cd disease-prediction-api
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # optional
python app/ml/train.py      # required: creates models_saved/model.joblib + metadata.json
uvicorn app.main:app --reload
```

- API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health: `GET /health`

## Main endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness and model load status |
| GET | `/api/v1/features` | Symptom column names the model expects |
| GET | `/api/v1/diseases` | Disease labels the model can output |
| GET | `/api/v1/predict/example-body` | Full JSON template for `POST /predict` (all zeros) |
| POST | `/api/v1/predict` | Quiz answers → prediction + top-N probabilities |

## Tests

```bash
pytest
```

## Documentation

See **[PROJECT.md](PROJECT.md)** for dataset provenance, metrics, training/retraining, tuning, Docker, and API examples.

## Disclaimer

This API is for **education and prototyping only**. It is **not** a medical device; always consult a qualified clinician.
