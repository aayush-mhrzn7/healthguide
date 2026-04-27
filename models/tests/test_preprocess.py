"""Tests for raw-data loading and feature preparation."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.ml.preprocess import (
    get_feature_columns,
    load_raw_training_csv,
    prepare_features_and_target,
)

ROOT = Path(__file__).resolve().parents[1]
TRAIN_CSV = ROOT / "data" / "raw" / "training_data.csv"
TEST_CSV = ROOT / "data" / "raw" / "test_data.csv"


def test_training_csv_loads_with_expected_target():
    df = load_raw_training_csv(TRAIN_CSV)
    assert "prognosis" in df.columns
    assert len(df) > 5_000, "Augmented training set should be sizeable"


def test_test_csv_shares_schema_with_training():
    train = load_raw_training_csv(TRAIN_CSV)
    test = load_raw_training_csv(TEST_CSV)
    assert list(train.columns) == list(test.columns), (
        "training and test data must share the exact column ordering"
    )


def test_feature_columns_exclude_target():
    df = load_raw_training_csv(TRAIN_CSV)
    features = get_feature_columns(df)
    assert "prognosis" not in features
    assert len(features) > 250, "Should have ample symptom dimensions"


def test_prepare_features_and_target_yields_numeric():
    df = load_raw_training_csv(TRAIN_CSV)
    X, y = prepare_features_and_target(df)
    assert X.shape[0] == len(df)
    assert pd.api.types.is_numeric_dtype(X.dtypes.iloc[0])
    assert all(value in {"0", "1", 0, 1} or isinstance(value, (int, float)) for value in X.iloc[0].tolist()[:10])
    assert len(y) == len(df)


def test_class_distribution_is_realistic():
    df = load_raw_training_csv(TRAIN_CSV)
    counts = df["prognosis"].value_counts()
    assert counts.min() >= 50, "Every class needs enough samples"
    assert counts.max() / counts.min() < 5, "Class imbalance should stay moderate"
