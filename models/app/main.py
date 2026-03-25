"""FastAPI application entry point."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import HealthResponse
from app.routers import prediction

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.ml.predict import DiseasePredictor

    model_dir = Path(os.getenv("MODEL_DIR", "models_saved")).resolve()
    app.state.predictor = DiseasePredictor.load(model_dir)
    yield


app = FastAPI(
    title="Disease Prediction API",
    description="Predicts diseases from binary symptom answers using a Random Forest classifier.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction.router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health(request: Request) -> HealthResponse:
    loaded = getattr(request.app.state, "predictor", None) is not None
    return HealthResponse(status="ok" if loaded else "degraded", model_loaded=loaded)
