"""Tests for the trained DiseasePredictor."""

from __future__ import annotations

from app.ml.predict import DiseasePredictor


def test_predictor_returns_expected_class(predictor: DiseasePredictor, empty_symptoms):
    result = predictor.predict(empty_symptoms, top_n=5)
    assert result.predicted_disease in predictor.classes
    assert 0.0 <= result.confidence <= 1.0
    assert len(result.top_diseases) == 5


def test_top_predictions_are_sorted(predictor: DiseasePredictor, empty_symptoms):
    result = predictor.predict(empty_symptoms, top_n=10)
    confidences = [c for _, c in result.top_diseases]
    assert confidences == sorted(confidences, reverse=True)


def test_strong_signal_routes_to_relevant_class(
    predictor: DiseasePredictor,
    feature_names,
    classes,
):
    """If we activate every symptom that contains 'urinary' tokens the model
    should at least include a urinary-tract style class in the top-5."""
    symptoms = {name: 0.0 for name in feature_names}
    urinary_features = [
        name for name in feature_names
        if any(tok in name for tok in ("urin", "bladder", "kidney"))
    ]
    for name in urinary_features:
        symptoms[name] = 1.0

    result = predictor.predict(symptoms, top_n=5)
    top_names = " ".join(name for name, _ in result.top_diseases).lower()
    assert any(token in top_names for token in ("urinary", "uti")) or any(
        "kidney" in name.lower() for name, _ in result.top_diseases
    ), f"Expected a urinary-style class in top predictions, got {result.top_diseases}"


def test_top_n_capped_to_class_count(predictor: DiseasePredictor, empty_symptoms):
    very_large = len(predictor.classes) + 50
    result = predictor.predict(empty_symptoms, top_n=very_large)
    assert len(result.top_diseases) == len(predictor.classes)


def test_top_n_floor_is_one(predictor: DiseasePredictor, empty_symptoms):
    result = predictor.predict(empty_symptoms, top_n=0)
    assert len(result.top_diseases) == 1
