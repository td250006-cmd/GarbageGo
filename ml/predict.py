from pathlib import Path

import joblib
import pandas as pd

from preprocess import FEATURE_COLUMNS

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "model.pkl"


def load_model(path=MODEL_PATH):
    if not path.exists():
        raise FileNotFoundError(
            f"Missing model. Train it first with python ml/train_model.py. Expected: {path}"
        )
    return joblib.load(path)


def predict_features(features: dict, model=None):
    missing = [col for col in FEATURE_COLUMNS if col not in features]
    if missing:
        raise ValueError("Invalid bin data. Missing ML features: " + ", ".join(missing))
    frame = pd.DataFrame([{col: features[col] for col in FEATURE_COLUMNS}])
    pipeline = model or load_model()
    prediction = pipeline.predict(frame)[0]
    probabilities = pipeline.predict_proba(frame)[0]
    classes = list(pipeline.classes_)
    confidence = float(max(probabilities))
    class_index = classes.index(prediction)
    confidence = float(probabilities[class_index])
    return {"prediction": str(prediction), "confidence": round(confidence, 4)}


if __name__ == "__main__":
    print("Load a trained model with load_model() and call predict_features(feature_dict).")
