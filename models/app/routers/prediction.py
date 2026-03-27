
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_predictor
from app.ml.predict import DiseasePredictor
from app.models.schemas import (
    DiseaseListResponse,
    DiseaseScore,
    FeatureListResponse,
    PredictRequest,
    PredictResponse,
)
from app.utils.helpers import clamp_binary, validate_symptom_payload

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
def predict_disease(
    body: PredictRequest,
    predictor: DiseasePredictor = Depends(get_predictor),
) -> PredictResponse:
    missing, extra = validate_symptom_payload(body.symptoms, predictor.feature_names)
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Missing symptom keys.",
                "missing": missing,
                "hint": "GET /api/v1/features lists every required key.",
            },
        )
    if extra:
        raise HTTPException(
            status_code=422,
            detail={"message": "Unknown symptom keys.", "unknown": extra},
        )
    try:
        normalized = {k: clamp_binary(body.symptoms[k]) for k in predictor.feature_names}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    result = predictor.predict(normalized, top_n=body.top_n)
    return PredictResponse(
        predicted_disease=result.predicted_disease,
        confidence=result.confidence,
        top_diseases=[DiseaseScore(disease=d, confidence=c) for d, c in result.top_diseases],
    )


@router.get("/features", response_model=FeatureListResponse)
def list_features(predictor: DiseasePredictor = Depends(get_predictor)) -> FeatureListResponse:
    return FeatureListResponse(features=predictor.feature_names, count=len(predictor.feature_names))


@router.get("/diseases", response_model=DiseaseListResponse)
def list_diseases(predictor: DiseasePredictor = Depends(get_predictor)) -> DiseaseListResponse:
    return DiseaseListResponse(diseases=predictor.classes, count=len(predictor.classes))


@router.get("/predict/sample")
def predict_sample(predictor: DiseasePredictor = Depends(get_predictor)) -> dict:
    return {"symptoms": {k: 0 for k in predictor.feature_names}, "top_n": 3}
