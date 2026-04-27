"""Quality gates for model metrics on the held-out test data."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models_saved"
TEST_CSV = ROOT / "data" / "raw" / "test_data.csv"


def test_train_metrics_within_target_band():
    metadata = json.loads((MODEL_DIR / "metadata.json").read_text(encoding="utf-8"))
    metrics = metadata["test_metrics"]
    assert 0.70 <= metrics["f1_macro"] <= 0.90, (
        f"Validation macro-F1 outside target band: {metrics['f1_macro']:.3f}"
    )
    assert metrics["accuracy"] >= 0.70, (
        f"Validation accuracy unexpectedly low: {metrics['accuracy']:.3f}"
    )


def test_held_out_metrics(predictor):
    df = pd.read_csv(TEST_CSV)
    df.columns = [c.strip() for c in df.columns]
    y = df["prognosis"].astype(str).values
    X = (
        df.reindex(columns=predictor.feature_names, fill_value=0)
        .fillna(0)
        .astype(float)
        .values
    )
    y_pred = predictor.model.predict(X)

    accuracy = accuracy_score(y, y_pred)
    _, _, f1_macro, _ = precision_recall_fscore_support(
        y, y_pred, average="macro", zero_division=0
    )
    _, _, f1_weighted, _ = precision_recall_fscore_support(
        y, y_pred, average="weighted", zero_division=0
    )

    assert accuracy >= 0.70, f"Held-out accuracy too low: {accuracy:.3f}"
    assert f1_macro >= 0.70, f"Held-out macro-F1 too low: {f1_macro:.3f}"
    assert f1_weighted >= 0.75, f"Held-out weighted-F1 too low: {f1_weighted:.3f}"
