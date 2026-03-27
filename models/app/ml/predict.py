
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np

from app.utils.helpers import symptoms_to_feature_vector


@dataclass
class PredictionResult:
    predicted_disease: str
    confidence: float
    top_diseases: list[tuple[str, float]]


class DiseasePredictor:
    def __init__(self, model_dir: str | Path):
        model_dir = Path(model_dir)
        self.model = joblib.load(model_dir / "model.joblib")
        with open(model_dir / "metadata.json", encoding="utf-8") as f:
            meta = json.load(f)
        self.feature_names: list[str] = meta["feature_names"]
        self.classes: list[str] = list(meta["classes"])

    @classmethod
    def load(cls, model_dir: str | Path) -> "DiseasePredictor":
        return cls(model_dir)

    def predict(self, symptoms: dict[str, float], top_n: int = 3) -> PredictionResult:
        x = np.asarray(
            [symptoms_to_feature_vector(symptoms, self.feature_names)],
            dtype=np.float64,
        )
        proba = self.model.predict_proba(x)[0]
        top_n = min(max(top_n, 1), len(self.classes))
        top_indices = np.argsort(proba)[::-1][:top_n]
        best_idx = int(top_indices[0])
        return PredictionResult(
            predicted_disease=self.classes[best_idx],
            confidence=round(float(proba[best_idx]), 3),
            top_diseases=[(self.classes[i], round(float(proba[i]), 3)) for i in top_indices],
        )
