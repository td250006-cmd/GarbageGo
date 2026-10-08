import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ErrorBanner from "../components/ErrorBanner";
import StatusBadge from "../components/StatusBadge";
import { useAppData } from "../hooks/useAppData";
import { FEATURE_LABELS, featuresFromBin, ML_FEATURE_NAMES } from "../lib/mlFeatures";
import { calculatePriorityScore, predictHotspot } from "../services/api";

export default function Prediction() {
  const { bins, updateBinPrediction } = useAppData();
  const [params] = useSearchParams();
  const [binId, setBinId] = useState(params.get("bin_id") || bins[0]?.bin_id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const bin = useMemo(() => {
    return bins.find((item) => item.bin_id === binId) || bins[0] || null;
  }, [bins, binId]);

  const features = useMemo(() => (bin ? featuresFromBin(bin) : null), [bin]);

  const onPredict = async () => {
    if (!bin || !features) {
      setError("Invalid bin data. Please select a bin from the dataset.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // 1. Call real Random Forest model via FastAPI
      const predRes = await predictHotspot(features);

      // 2. Call priority calculation
      const priorityRes = await calculatePriorityScore({
        bin_id: bin.bin_id,
        bin_fill_level: Number(bin.bin_fill_level),
        overflow_history: Number(bin.overflow_history),
        last_collection_interval: Number(bin.last_collection_interval),
        prediction: predRes.prediction,
      });

      const outcome = {
        prediction: predRes.prediction,
        confidence: predRes.confidence,
        priority_score: priorityRes.priority_score,
        priority_status: priorityRes.priority_status,
      };

      setResult(outcome);

      // Update state in app data context
      updateBinPrediction(
        bin.bin_id,
        predRes.prediction,
        predRes.confidence,
        priorityRes.priority_score,
        priorityRes.priority_status
      );
    } catch (err) {
      console.error("Prediction error:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to connect to backend.";
      setError(`Model Prediction Failed: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Waste Hotspot Prediction</h1>
        <p className="text-sm text-slate-500">
          Real-time machine learning inference using trained Random Forest Classifier on authoritative dataset.
        </p>
      </div>

      <ErrorBanner message={error || (!bin ? "No bins available to predict." : "")} />

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <label className="text-sm font-medium text-slate-700">
          Select Bin from Dataset
          <select
            value={bin?.bin_id || ""}
            onChange={(event) => {
              setBinId(event.target.value);
              setResult(null);
              setError("");
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 md:max-w-xs block bg-white"
          >
            {bins.map((item) => (
              <option key={item.bin_id} value={item.bin_id}>
                {item.bin_id} ({item.land_use_type} - {item.bin_fill_level}%)
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={onPredict}
          disabled={loading || !bin}
          className="mt-4 rounded-xl bg-primary px-5 py-2.5 font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {loading ? "Running Random Forest Model..." : "Predict Waste Hotspot"}
        </button>
      </div>

      {features && (
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-semibold text-ink">Loaded Dataset ML Inputs (17 Features)</h2>
          <div className="mb-3 rounded-xl bg-page px-3 py-2 text-sm">
            <p className="text-xs text-slate-500">Selected Target Bin</p>
            <p className="font-semibold text-primary">{bin.bin_id} · {bin.land_use_type}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ML_FEATURE_NAMES.map((name) => (
              <div key={name} className="rounded-xl bg-page px-3 py-2 text-sm">
                <p className="text-xs text-slate-500">{FEATURE_LABELS[name] || name}</p>
                <p className="font-medium text-ink">{String(features[name] ?? "—")}</p>
                <p className="text-[10px] text-slate-400">{name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Model Output & Operational Score</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 shadow-card border-l-4 border-primary">
              <p className="text-sm text-slate-500">Predicted Hotspot Level</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge value={result.prediction} />
                <span className="text-xs text-slate-400">Class Label</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Model: Random Forest Classifier</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-card border-l-4 border-secondary">
              <p className="text-sm text-slate-500">Model Confidence</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {(result.confidence * 100).toFixed(1)}%
              </p>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-secondary h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, result.confidence * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">Posterior Probability</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-card border-l-4 border-warning">
              <p className="text-sm text-slate-500">Calculated Priority Score</p>
              <p className="mt-1 text-2xl font-bold text-ink">{result.priority_score}</p>
              <p className="mt-2 text-xs text-slate-400">Formula: 40% Fill + 30% Hotspot + 30% Factors</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-card border-l-4 border-danger">
              <p className="text-sm text-slate-500">Collection Priority Status</p>
              <div className="mt-2">
                <StatusBadge value={result.priority_status} />
              </div>
              <p className="mt-2 text-xs text-slate-400">Operational Dispatch Tier</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
