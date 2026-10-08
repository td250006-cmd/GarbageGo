import { useState } from "react";
import ErrorBanner from "../components/ErrorBanner";
import StatusBadge from "../components/StatusBadge";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";

export default function Collections() {
  const { user } = useAuth();
  const { currentRoute, bins, collections, markCollected, notice } = useAppData();
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState(null);

  const routeBins = currentRoute?.ordered_bins || [];
  const completedCount = routeBins.filter((b) => {
    const liveBin = bins.find((row) => row.bin_id === b.bin_id);
    return liveBin?.collected || b.collected;
  }).length;
  const progressPercent = routeBins.length > 0 ? Math.round((completedCount / routeBins.length) * 100) : 0;

  const onCollect = async (binId) => {
    setError("");
    setSubmittingId(binId);
    try {
      const truckId = currentRoute?.truck_id || user?.truck_id || "TRK-01";
      await markCollected(binId, truckId);
    } catch (err) {
      setError(err.message || "Failed to mark bin as collected.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Collections Management</h1>
        <p className="text-sm text-slate-500">
          Field execution checklist. Confirming collection resets bin fill to baseline (8%), normalizes status, and persists the collection event to the database.
        </p>
      </div>

      <ErrorBanner message={error} />
      {notice && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-primary font-medium">
          {notice}
        </div>
      )}

      {currentRoute && routeBins.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Active Shift Progress (Vehicle: {currentRoute.truck_id})</p>
              <p className="text-lg font-bold text-ink">
                {completedCount} of {routeBins.length} Stops Completed ({progressPercent}%)
              </p>
            </div>
            <span className="rounded-xl bg-primary/10 px-3 py-1 font-semibold text-primary text-sm">
              {progressPercent === 100 ? "Route Completed" : "In Progress"}
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="mb-3 font-semibold text-ink">Assigned Route Stops</h2>
        {!routeBins.length ? (
          <div className="py-6 text-center text-slate-500">
            No route currently assigned. Go to{" "}
            <a href="/routes" className="text-primary font-semibold hover:underline">
              Route Optimization
            </a>{" "}
            to generate an optimal schedule.
          </div>
        ) : (
          <div className="space-y-2">
            {routeBins.map((item) => {
              const liveBin = bins.find((row) => row.bin_id === item.bin_id);
              const isCollected = liveBin?.collected || item.collected;

              return (
                <div
                  key={item.bin_id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 border transition ${
                    isCollected
                      ? "bg-slate-50/70 border-slate-200"
                      : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        isCollected
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.sequence}
                    </span>
                    <div>
                      <p className={`font-semibold ${isCollected ? "text-slate-500 line-through" : "text-ink"}`}>
                        {item.bin_id}
                      </p>
                      <p className="text-xs text-slate-500">
                        Current Fill: {liveBin?.bin_fill_level ?? "—"}% · Status: {liveBin?.status || item.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge value={liveBin?.status || item.status} />
                    {isCollected ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        ✓ Collected
                      </span>
                    ) : (
                      <button
                        onClick={() => onCollect(item.bin_id)}
                        disabled={submittingId === item.bin_id}
                        className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition"
                      >
                        {submittingId === item.bin_id ? "Saving..." : "Mark Collected"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-ink">Historical Collections Audit Log</h2>
          <p className="text-xs text-slate-500">Persistent database audit log of completed pick-ups</p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page text-slate-600">
            <tr>
              <th className="px-4 py-3">Bin ID</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Fill at Pickup</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No collections logged yet.
                </td>
              </tr>
            ) : (
              collections.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-ink">{item.bin_id}</td>
                  <td className="px-4 py-3 text-slate-600">{item.truck_id}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.collected_at ? item.collected_at.replace("T", " ").slice(0, 19) : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{item.fill_level_at_collection}%</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
