from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from preprocess import (
    CATEGORICAL_FEATURES,
    FEATURE_COLUMNS,
    NUMERIC_FEATURES,
    TARGET_COLUMN,
    validate_dataset_columns,
)

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "model.pkl"


def resolve_dataset_path():
    for name in ("dataset.csv", "urban_waste_hotspot_dataset.csv"):
        path = ROOT / name
        if path.exists():
            return path
    return ROOT / "dataset.csv"


DATASET_PATH = resolve_dataset_path()


def load_dataset(path=DATASET_PATH):
    if not path.exists():
        raise FileNotFoundError(f"Invalid dataset. File not found: {path}")
    df = pd.read_csv(path)
    validate_dataset_columns(df.columns)
    return df


def build_pipeline():
    numeric_pipeline = Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))])
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )
    return Pipeline(
        steps=[
            ("preprocess", preprocessor),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=200,
                    random_state=42,
                    class_weight="balanced",
                ),
            ),
        ]
    )


def main():
    df = load_dataset()
    X = df[FEATURE_COLUMNS]
    # Ensure classes strictly conform to Low, Medium, High
    y = df[TARGET_COLUMN].replace({"Normal": "Low"})
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("Precision:", precision_score(y_test, y_pred, average="weighted", zero_division=0))
    print("Recall:", recall_score(y_test, y_pred, average="weighted", zero_division=0))
    print("F1:", f1_score(y_test, y_pred, average="weighted", zero_division=0))
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    joblib.dump(pipeline, MODEL_PATH)
    print(f"\nSaved trained pipeline to {MODEL_PATH}")


if __name__ == "__main__":
    main()
