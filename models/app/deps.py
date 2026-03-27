
from __future__ import annotations

from fastapi import HTTPException, Request

from app.ml.predict import DiseasePredictor


def get_predictor(request: Request) -> DiseasePredictor:
    predictor = getattr(request.app.state, "predictor", None)
    if predictor is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Run `python app/ml/train.py` then restart the server.",
        )
    return predictor
