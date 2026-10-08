import sys
from pathlib import Path

from dotenv import load_dotenv
import os

ROOT = Path(__file__).resolve().parents[2]
ML_DIR = ROOT / "ml"
if str(ML_DIR) not in sys.path:
    sys.path.append(str(ML_DIR))

from predict import load_model, predict_features  # noqa: E402
from preprocess import FEATURE_COLUMNS  # noqa: E402

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

_model = None


def get_model():
    global _model
    if _model is None:
        model_env = os.getenv("MODEL_PATH")
        if model_env:
            p = Path(model_env)
            model_path = p if p.is_absolute() else (Path(__file__).resolve().parents[1] / p).resolve()
            if not model_path.exists():
                model_path = ML_DIR / "model.pkl"
        else:
            model_path = ML_DIR / "model.pkl"

        if not model_path.exists():
            raise FileNotFoundError(
                f"Missing model at {model_path}. Run python ml/train_model.py before calling /api/predict."
            )
        _model = load_model(model_path)
    return _model


def predict(features: dict):
    missing = [col for col in FEATURE_COLUMNS if col not in features]
    if missing:
        raise ValueError("Invalid bin data. Missing ML features: " + ", ".join(missing))
    return predict_features(features, model=get_model())
