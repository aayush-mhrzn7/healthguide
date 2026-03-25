"""Pydantic request / response models."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DiseaseScore(BaseModel):
    disease: str
    confidence: float = Field(ge=0.0, le=1.0)


class PredictRequest(BaseModel):
    symptoms: dict[str, int | float]
    top_n: int = Field(default=3, ge=1, le=10)


class PredictResponse(BaseModel):
    predicted_disease: str
    confidence: float = Field(ge=0.0, le=1.0)
    top_diseases: list[DiseaseScore]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


class FeatureListResponse(BaseModel):
    features: list[str]
    count: int


class DiseaseListResponse(BaseModel):
    diseases: list[str]
    count: int
