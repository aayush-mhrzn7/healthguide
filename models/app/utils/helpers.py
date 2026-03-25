"""Input validation helpers shared across the app."""

from __future__ import annotations


def validate_symptom_payload(
    symptoms: dict[str, int | float],
    feature_names: list[str],
) -> tuple[list[str], list[str]]:
    """Return (missing_keys, extra_keys) relative to the expected feature set."""
    expected = set(feature_names)
    got = set(symptoms.keys())
    return sorted(expected - got), sorted(got - expected)


def clamp_binary(value: int | float) -> float:
    """Validate that a symptom value is 0 or 1."""
    v = float(value)
    if v < 0 or v > 1:
        raise ValueError(f"Symptom value must be 0 or 1, got {value}")
    return v


def symptoms_to_feature_vector(
    symptoms: dict[str, float],
    feature_names: list[str],
) -> list[float]:
    """Return values in the exact column order the model was trained on."""
    return [symptoms[name] for name in feature_names]
