from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from services.route_service import optimize_route

router = APIRouter()


class Depot(BaseModel):
    latitude: float
    longitude: float


class RouteBin(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bin_id: str
    latitude: float
    longitude: float
    priority_score: Optional[float] = 0.0
    priority_status: Optional[str] = None
    status: Optional[str] = None
    traffic_density: Optional[float] = 0.0
    travel_time_to_bin: Optional[float] = 8.0
    road_closure_flag: Optional[int] = 0


class RouteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    truck_id: str
    depot: Depot
    bins: List[RouteBin]


@router.post("/optimize-route")
def optimize(payload: RouteRequest):
    try:
        return optimize_route(
            payload.truck_id,
            payload.depot.model_dump(),
            [item.model_dump() for item in payload.bins],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Route optimization failed: {exc}") from exc
