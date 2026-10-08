import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "ml"))
sys.path.append(str(Path(__file__).resolve().parent))

from routes.prediction import router as prediction_router
from routes.priority import router as priority_router
from routes.route import router as route_router
from routes.bins import router as bins_router

app = FastAPI(title="CleanRoute AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction_router, prefix="/api")
app.include_router(priority_router, prefix="/api")
app.include_router(route_router, prefix="/api")
app.include_router(bins_router, prefix="/api")


@app.get("/api/health")
def health():
    model_path = ROOT / "ml" / "model.pkl"
    return {
        "status": "ok",
        "model_ready": model_path.exists(),
        "message": "CleanRoute AI backend is running.",
    }
