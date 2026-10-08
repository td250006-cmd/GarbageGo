from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.priority_service import calculate_priority, save_priority

router = APIRouter()


class PriorityRequest(BaseModel):
    bin_id: str
    bin_fill_level: float
    overflow_history: float
    last_collection_interval: float
    prediction: str


@router.post("/calculate-priority")
def calculate_priority_score(payload: PriorityRequest):
    try:
        result = calculate_priority(
            payload.bin_fill_level,
            payload.overflow_history,
            payload.last_collection_interval,
            payload.prediction,
        )
        saved = save_priority(payload.bin_id, result)
        return {**result, "bin_id": payload.bin_id, "supabase": saved}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
