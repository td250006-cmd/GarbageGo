from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from preprocess import FEATURE_COLUMNS
from services.ml_service import predict
from services.priority_service import save_prediction

router = APIRouter()


class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bin_id: Optional[str] = None
    bin_fill_level: float
    traffic_density: float
    average_vehicle_speed: float
    road_congestion_index: float
    travel_time_to_bin: float
    road_closure_flag: int
    land_use_type: str
    last_collection_interval: float
    historical_fill_average: float
    overflow_history: float
    collection_frequency: float
    missed_collection_count: float
    hour_of_day: int
    day_of_week: int
    month: int
    weekend_flag: int
    holiday_flag: int


@router.post("/predict")
def predict_hotspot(payload: PredictRequest):
    features = payload.model_dump()
    missing = [col for col in FEATURE_COLUMNS if col not in features]
    if missing:
        raise HTTPException(status_code=400, detail="Invalid bin data. Missing ML features: " + ", ".join(missing))
    try:
        result = predict(features)
        if payload.bin_id:
            result["supabase"] = save_prediction(
                payload.bin_id,
                result["prediction"],
                result["confidence"],
            )
        else:
            result["supabase"] = {"saved": False, "reason": "No bin_id provided."}
        return result
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc
