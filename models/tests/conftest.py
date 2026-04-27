"""Shared pytest fixtures for the ML test suite."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from app.ml.predict import DiseasePredictor

MODEL_DIR = ROOT / "models_saved"


@pytest.fixture(scope="session")
def predictor() -> DiseasePredictor:
    if not (MODEL_DIR / "model.joblib").exists():
        pytest.skip("Trained model artefacts not available; run train.py first.")
    return DiseasePredictor.load(MODEL_DIR)


@pytest.fixture(scope="session")
def feature_names(predictor: DiseasePredictor) -> list[str]:
    return list(predictor.feature_names)


@pytest.fixture(scope="session")
def classes(predictor: DiseasePredictor) -> list[str]:
    return list(predictor.classes)


@pytest.fixture()
def empty_symptoms(feature_names: list[str]) -> dict[str, float]:
    return {name: 0.0 for name in feature_names}
