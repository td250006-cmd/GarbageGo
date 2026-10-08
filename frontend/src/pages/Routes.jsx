import { useMemo, useState } from "react";
import BinMap, { DEPOT } from "../components/BinMap";
import ErrorBanner from "../components/ErrorBanner";
import StatusBadge from "../components/StatusBadge";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import { optimizeRoute as apiOptimizeRoute } from "../services/api";

export default function RoutesPage() {
  const { user } = useAuth();
  const { bins, trucks, currentRoute, setOptimizedRoute } = useAppData();
  const [truckId, setTruckId] = useState(user?.truck_id || trucks[0]?.truck_id || "TRK-01");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const criticalBins = useMemo(
    () => bins.filter((bin) => bin.status === "Critical" && !bin.collected),
    [bins]
  );
  const highBins = useMemo(
    () => bins.filter((bin) => bin.status === "High" && !bin.collected),
    [bins]
  );
  const selectedCandidates = useMemo(
    () => [...criticalBins, ...highBins],
    [criticalBins, highBins]
  );

  const routeBins = currentRoute?.ordered_bins || [];

  const onGenerateRoute = async () => {
    setError("");
    setSuccessMsg("");

    if (selectedCandidates.length === 0) {
      setError("No uncollected Critical or High priority bins available for routing.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        truck_id: truckId,
        depot: {
          latitude: DEPOT.latitude,
          longitude: DEPOT.longitude,
        },
        bins: selectedCandidates.map((b) => ({
          bin_id: b.bin_id,
          latitude: Number(b.latitude),
          longitude: Number(b.longitude),
          priority_score: Number(b.priority_score) || 0,
          priority_status: b.status,
          status: b.status,
          traffic_density: Number(b.traffic_density) || 0,
          travel_time_to_bin: Number(b.travel_time_to_bin) || 8,
          road_closure_flag: Number(b.road_closure_flag) || 0,
        })),
      };

      const result = await apiOptimizeRoute(payload);

      setOptimizedRoute(result);
      setSuccessMsg(
        `OR-Tools successfully optimized route for ${truckId}! ${result.total_bins} bins scheduled (${result.total_distance} km, ~${result.estimated_time} min).`
      );
    } catch (err) {
      console.error("Route optimization failed:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to reach OR-Tools service.";
      setError(`OR-Tools Route Optimization Failed: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          {user?.role === "driver" ? "Assigned Collection Route" : "Route Optimization (OR-Tools)"}
        </h1>
        <p className="text-sm text-slate-500">
          Google OR-Tools Guided Local Search algorithm solving the constrained Vehicle Routing Problem for Critical and High bins.
        </p>
      </div>

      <ErrorBanner message={error} />
      {successMsg && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-primary font-medium">
          {successMsg}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-sm text-slate-500">Critical Bins to Collect</p>
          <p className="mt-1 text-2xl font-bold text-danger">{criticalBins.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-sm text-slate-500">High Priority Bins</p>
          <p className="mt-1 text-2xl font-bold text-warning">{highBins.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-sm text-slate-500">Available Fleet Trucks</p>
          <p className="mt-1 text-2xl font-bold text-ink">{trucks.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Critical Bins ({criticalBins.length})</h2>
            <span className="text-xs text-danger font-semibold">Priority 90–100</span>
          </div>
          <BinList bins={criticalBins} />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink">High Priority Bins ({highBins.length})</h2>
            <span className="text-xs text-orange-600 font-semibold">Priority 70–89</span>
          </div>
          <BinList bins={highBins} />
        </div>
      </div>

      {user?.role === "admin" && (
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-semibold text-ink">Dispatch Truck Selection</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {trucks.map((truck) => (
              <button
                key={truck.truck_id}
                onClick={() => setTruckId(truck.truck_id)}
                className={`rounded-xl border p-4 text-left transition ${
                  truckId === truck.truck_id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-ink">{truck.truck_id}</p>
                  <StatusBadge value={truck.status} />
                </div>
                <p className="mt-1 text-sm text-slate-600">Driver: {truck.driver_name}</p>
                <p className="text-xs text-slate-400">Capacity: {truck.capacity_kg} kg</p>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onGenerateRoute}
              disabled={loading || selectedCandidates.length === 0}
              className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {loading ? "Running Google OR-Tools..." : "Generate Optimized Route (OR-Tools)"}
            </button>
          </div>
        </div>
      )}

      {currentRoute && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-card space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-semibold text-ink">Optimal Stop Sequence</h2>
              <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
                Vehicle: {currentRoute.truck_id}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 text-center text-sm bg-page rounded-xl">
              <div>
                <p className="text-xs text-slate-500">Stops</p>
                <p className="font-bold text-ink">{currentRoute.total_bins}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Distance</p>
                <p className="font-bold text-primary">{currentRoute.total_distance} km</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Est. Time</p>
                <p className="font-bold text-ink">~{currentRoute.estimated_time} min</p>
              </div>
            </div>

            <ol className="mt-3 list-none space-y-2 max-h-96 overflow-y-auto pr-1">
              <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 text-sm border border-slate-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  D
                </span>
                <span className="font-semibold text-slate-700">Central Depot (Start)</span>
              </li>

              {routeBins.map((bin) => (
                <li
                  key={bin.bin_id}
                  className={`flex items-center justify-between rounded-xl p-2.5 text-sm border ${
                    bin.collected
                      ? "bg-green-50/50 border-green-200 text-slate-500 line-through"
                      : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {bin.sequence}
                    </span>
                    <span className="font-medium text-ink">{bin.bin_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={bin.priority_status} />
                    {bin.collected && <StatusBadge value="Collected" />}
                  </div>
                </li>
              ))}

              <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 text-sm border border-slate-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  D
                </span>
                <span className="font-semibold text-slate-700">Central Depot (Return)</span>
              </li>
            </ol>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="mb-3 font-semibold text-ink">Route Visualization & Stop Waypoints</h2>
            <BinMap bins={bins} routeBins={routeBins} height="h-[400px]" />
          </div>
        </div>
      )}
    </div>
  );
}

function BinList({ bins }) {
  if (!bins.length) return <p className="text-sm text-slate-400 py-2">No uncollected bins in this category.</p>;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {bins.map((bin) => (
        <div key={bin.bin_id} className="flex items-center justify-between rounded-xl bg-page px-3 py-2 text-sm">
          <div>
            <span className="font-medium text-ink">{bin.bin_id}</span>
            <span className="text-xs text-slate-500 ml-2">Fill: {bin.bin_fill_level}% · Score: {bin.priority_score}</span>
          </div>
          <StatusBadge value={bin.status} />
        </div>
      ))}
    </div>
  );
}
