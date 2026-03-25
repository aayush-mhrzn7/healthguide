"""Data loading and feature extraction for the symptom → disease CSV dataset."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

TARGET_COL = "prognosis"


def load_raw_training_csv(path: str | Path) -> pd.DataFrame:
    path = Path(path)
    df = pd.read_csv(path)
    df.columns = [str(c).strip() for c in df.columns]
    # The source CSV has a trailing comma that creates a spurious empty column
    df = df.drop(columns=[c for c in df.columns if c.startswith("Unnamed")], errors="ignore")
    return df


def get_feature_columns(df: pd.DataFrame) -> list[str]:
    if TARGET_COL not in df.columns:
        raise ValueError(f"Expected column '{TARGET_COL}' in dataset")
    return [c for c in df.columns if c != TARGET_COL]


def prepare_features_and_target(df: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
    features = get_feature_columns(df)
    X = df[features].apply(pd.to_numeric, errors="coerce").fillna(0.0)
    y = df[TARGET_COL].astype(str).values
    return X, y
