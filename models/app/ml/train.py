
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import joblib
import numpy as np
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.model_selection import train_test_split

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.ml.preprocess import load_raw_training_csv, prepare_features_and_target  # noqa: E402


def _metrics_dict(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    prec, rec, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    prec_w, rec_w, f1_w, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(prec),
        "recall_macro": float(rec),
        "f1_macro": float(f1),
        "precision_weighted": float(prec_w),
        "recall_weighted": float(rec_w),
        "f1_weighted": float(f1_w),
    }


def train_and_save(
    raw_csv: Path,
    model_dir: Path,
    test_size: float = 0.2,
    random_state: int = 101,
    n_estimators: int = 300,
) -> dict:
    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)

    df = load_raw_training_csv(raw_csv)
    X_df, y = prepare_features_and_target(df)
    feature_names = list(X_df.columns)

    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X_df.values, y, test_size=test_size, random_state=random_state, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X_df.values, y, test_size=test_size, random_state=random_state
        )

    model = RandomForestClassifier(
        n_estimators=n_estimators,
        random_state=random_state,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    metrics = _metrics_dict(y_test, y_pred)

    joblib.dump(model, model_dir / "model.joblib")

    metadata = {
        "model": "RandomForestClassifier",
        "feature_names": feature_names,
        "target_column": "prognosis",
        "classes": list(model.classes_),
        "test_metrics": metrics,
        "n_estimators": n_estimators,
        "test_size": test_size,
        "random_state": random_state,
        "n_samples": int(len(df)),
        "n_features": len(feature_names),
    }
    with open(model_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Model : RandomForestClassifier ({n_estimators} trees)")
    print(f"Accuracy : {metrics['accuracy']:.4f}")
    print(f"F1 (macro): {metrics['f1_macro']:.4f}")
    print(f"Artifacts : {model_dir.resolve()}")
    return metadata


def main() -> None:
    load_dotenv()
    raw = Path(os.getenv("TRAIN_DATA_PATH", _ROOT / "data/raw/training_data.csv"))
    out = Path(os.getenv("MODEL_DIR", _ROOT / "models_saved"))
    train_and_save(raw, out)


if __name__ == "__main__":
    main()
