import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchBins,
  fetchCollections,
  fetchTrucks,
  recordCollection as apiRecordCollection,
} from "../services/api";
import { supabase, supabaseEnabled } from "../lib/supabase";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [bins, setBins] = useState([]);
  const [trucks, setTrucks] = useState([
    {
      truck_id: "TRK-01",
      driver_name: "Amit Patil",
      capacity_kg: 2500,
      status: "Available",
      assigned_route_id: null,
    },
    {
      truck_id: "TRK-02",
      driver_name: "Sneha Kulkarni",
      capacity_kg: 2200,
      status: "Available",
      assigned_route_id: null,
    },
    {
      truck_id: "TRK-03",
      driver_name: "Rahul Deshmukh",
      capacity_kg: 1800,
      status: "Available",
      assigned_route_id: null,
    },
  ]);
  const [collections, setCollections] = useState([]);
  const [binHistory, setBinHistory] = useState([]);
  const [currentRoute, setCurrentRoute] = useState(() => {
    const saved = localStorage.getItem("cleanroute_active_route");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      if (supabaseEnabled && supabase) {
        // Fetch from Supabase tables
        const [sbBins, sbTrucks, sbCollections, sbHistory] = await Promise.all([
          supabase.from("bins").select("*").order("bin_id", { ascending: true }),
          supabase.from("trucks").select("*"),
          supabase.from("collections").select("*").order("collected_at", { ascending: false }),
          supabase.from("bin_history").select("*").order("recorded_at", { ascending: true }),
        ]);

        if (sbBins.data && sbBins.data.length > 0) {
          setBins(sbBins.data);
          if (sbTrucks.data?.length) setTrucks(sbTrucks.data);
          if (sbCollections.data) setCollections(sbCollections.data);
          if (sbHistory.data) setBinHistory(sbHistory.data);
          setLoading(false);
          return;
        }
      }

      // Fetch from FastAPI backend
      const [backendBins, backendTrucks, backendCollections] = await Promise.all([
        fetchBins(),
        fetchTrucks().catch(() => []),
        fetchCollections().catch(() => []),
      ]);

      if (backendBins && backendBins.length > 0) {
        setBins(backendBins);
      }
      if (backendTrucks && backendTrucks.length > 0) {
        setTrucks(backendTrucks);
      }
      if (backendCollections && backendCollections.length > 0) {
        setCollections(backendCollections);
      }
    } catch (err) {
      console.error("Failed to load live data:", err);
      setError("Could not reach backend API. Ensure FastAPI backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const setOptimizedRoute = (routeData) => {
    setCurrentRoute(routeData);
    if (routeData) {
      localStorage.setItem("cleanroute_active_route", JSON.stringify(routeData));
    } else {
      localStorage.removeItem("cleanroute_active_route");
    }
  };

  const markCollected = async (binId, truckId = "TRK-01") => {
    const bin = bins.find((item) => item.bin_id === binId);
    if (!bin) throw new Error(`Bin ${binId} not found.`);

    const now = new Date().toISOString();
    const effectiveTruckId = currentRoute?.truck_id || truckId || "TRK-01";

    let record = {
      id: Date.now(),
      bin_id: binId,
      truck_id: effectiveTruckId,
      collected_at: now,
      fill_level_at_collection: bin.bin_fill_level,
      status: "Collected",
    };

    // 1. Supabase persistence if enabled
    if (supabaseEnabled && supabase) {
      try {
        const { data: colData } = await supabase.from("collections").insert([
          {
            bin_id: binId,
            truck_id: effectiveTruckId,
            collected_at: now,
            fill_level_at_collection: bin.bin_fill_level,
            status: "Collected",
          },
        ]).select().single();

        if (colData) record = colData;

        await supabase.from("bins").update({
          bin_fill_level: 8.0,
          last_collection_interval: 0.0,
          status: "Normal",
          updated_at: now,
        }).eq("bin_id", binId);

        await supabase.from("bin_history").insert([
          {
            bin_id: binId,
            bin_fill_level: 8.0,
            recorded_at: now,
          },
        ]);
      } catch (sbErr) {
        console.warn("Supabase collection update failed:", sbErr);
      }
    }

    // 2. Call backend API for persistence
    try {
      await apiRecordCollection({ bin_id: binId, truck_id: effectiveTruckId });
    } catch {
      // Backend handles in-memory update
    }

    // 3. Update React state
    setCollections((prev) => [record, ...prev]);

    setBins((prev) =>
      prev.map((item) =>
        item.bin_id === binId
          ? {
              ...item,
              collected: true,
              bin_fill_level: 8.0,
              last_collection_interval: 0.0,
              status: "Normal",
              updated_at: now,
            }
          : item
      )
    );

    setBinHistory((prev) => [
      ...prev,
      {
        id: Date.now(),
        bin_id: binId,
        bin_fill_level: 8.0,
        recorded_at: now,
      },
    ]);

    if (currentRoute) {
      setCurrentRoute((prev) => {
        if (!prev) return prev;
        const ordered_bins = prev.ordered_bins.map((item) =>
          item.bin_id === binId ? { ...item, collected: true } : item
        );
        const collectedCount = ordered_bins.filter((item) => item.collected).length;
        const updated = {
          ...prev,
          ordered_bins,
          collected_count: collectedCount,
          progress: Math.round((collectedCount / ordered_bins.length) * 100),
        };
        localStorage.setItem("cleanroute_active_route", JSON.stringify(updated));
        return updated;
      });
    }

    setNotice(`Bin ${binId} successfully collected and reset to 8% fill.`);
    return record;
  };

  const updateBinPrediction = (binId, prediction, confidence, priorityScore, priorityStatus) => {
    setBins((prev) =>
      prev.map((item) =>
        item.bin_id === binId
          ? {
              ...item,
              waste_hotspot_level: prediction,
              prediction_confidence: confidence,
              priority_score: priorityScore,
              status: priorityStatus,
            }
          : item
      )
    );
  };

  const value = useMemo(
    () => ({
      bins,
      trucks,
      collections,
      binHistory,
      currentRoute,
      loading,
      error,
      notice,
      setNotice,
      loadData,
      setOptimizedRoute,
      markCollected,
      updateBinPrediction,
    }),
    [bins, trucks, collections, binHistory, currentRoute, loading, error, notice]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
