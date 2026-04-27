"""Tests for the symptom-payload utility helpers."""

from __future__ import annotations

import pytest

from app.utils.helpers import (
    clamp_binary,
    symptoms_to_feature_vector,
    validate_symptom_payload,
)


def test_clamp_binary_accepts_zero_and_one():
    assert clamp_binary(0) == 0.0
    assert clamp_binary(1) == 1.0
    assert clamp_binary(0.0) == 0.0
    assert clamp_binary(1.0) == 1.0


@pytest.mark.parametrize("bad_value", [-0.5, 1.5, 2, -1])
def test_clamp_binary_rejects_out_of_range(bad_value):
    with pytest.raises(ValueError):
        clamp_binary(bad_value)


def test_validate_symptom_payload_reports_diff():
    expected = ["a", "b", "c"]
    payload = {"a": 1, "z": 0}
    missing, extra = validate_symptom_payload(payload, expected)
    assert missing == ["b", "c"]
    assert extra == ["z"]


def test_validate_symptom_payload_clean():
    expected = ["a", "b"]
    payload = {"a": 0, "b": 1}
    missing, extra = validate_symptom_payload(payload, expected)
    assert missing == []
    assert extra == []


def test_symptoms_to_feature_vector_preserves_order():
    payload = {"x": 1, "y": 0, "z": 1}
    vector = symptoms_to_feature_vector(payload, ["y", "x", "z"])
    assert vector == [0, 1, 1]
