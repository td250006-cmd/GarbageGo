import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { statusColor } from "../lib/status";

export const DEPOT = {
  name: "Central Depot",
  latitude: 11.075,
  longitude: 76.975,
};

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapBoundsUpdater({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const valid = points.filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (valid.length === 1) {
      map.setView(valid[0], 14);
    } else if (valid.length > 1) {
      map.fitBounds(valid, { padding: [35, 35], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

export default function BinMap({ bins = [], routeBins = [], height = "h-80" }) {
  const routePositions = useMemo(() => {
    return routeBins
      .map((stop) => {
        const match = bins.find((bin) => bin.bin_id === stop.bin_id);
        const latitude = Number(stop.latitude ?? match?.latitude);
        const longitude = Number(stop.longitude ?? match?.longitude);
        return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
      })
      .filter(Boolean);
  }, [routeBins, bins]);

  const allPoints = useMemo(() => {
    const pts = bins
      .map((b) => [Number(b.latitude), Number(b.longitude)])
      .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

    if (routePositions.length > 0) {
      pts.push([DEPOT.latitude, DEPOT.longitude]);
    }
    return pts;
  }, [bins, routePositions]);

  const initialCenter = useMemo(() => {
    if (bins.length > 0 && Number.isFinite(bins[0].latitude) && Number.isFinite(bins[0].longitude)) {
      return [Number(bins[0].latitude), Number(bins[0].longitude)];
    }
    return [DEPOT.latitude, DEPOT.longitude];
  }, [bins]);

  const line = useMemo(() => {
    if (routePositions.length === 0) return [];
    return [[DEPOT.latitude, DEPOT.longitude], ...routePositions, [DEPOT.latitude, DEPOT.longitude]];
  }, [routePositions]);

  return (
    <div className={`overflow-hidden rounded-2xl ${height} shadow-sm border border-slate-100`}>
      <MapContainer center={initialCenter} zoom={12} scrollWheelZoom style={{ width: "100%", height: "100%" }}>
        <MapResize />
        <MapBoundsUpdater points={allPoints} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={[DEPOT.latitude, DEPOT.longitude]}
          radius={11}
          pathOptions={{ color: "#0F6657", fillColor: "#0F6657", fillOpacity: 1 }}
        >
          <Popup>
            <div className="font-semibold text-primary">{DEPOT.name}</div>
            <div className="text-xs text-slate-600">Start & End Depot for Collection Routes</div>
            <div className="text-[10px] text-slate-400 mt-1">Lat: {DEPOT.latitude}, Lon: {DEPOT.longitude}</div>
          </Popup>
        </CircleMarker>

        {bins.map((bin) => {
          const lat = Number(bin.latitude);
          const lon = Number(bin.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

          const routeMatch = routeBins.find((s) => s.bin_id === bin.bin_id);
          const color = statusColor(bin.status);

          return (
            <CircleMarker
              key={bin.bin_id}
              center={[lat, lon]}
              radius={routeMatch ? 10 : 8}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.9,
                weight: routeMatch ? 3 : 1.5,
              }}
            >
              {routeMatch && (
                <Tooltip permanent direction="top" offset={[0, -10]} className="text-xs font-bold text-primary">
                  #{routeMatch.sequence}
                </Tooltip>
              )}
              <Popup>
                <div className="min-w-48 text-sm">
                  <div className="flex items-center justify-between border-b pb-1 mb-1">
                    <p className="font-bold text-ink">{bin.bin_id}</p>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold text-white" style={{ backgroundColor: color }}>
                      {bin.status}
                    </span>
                  </div>
                  <p><strong>Fill Level:</strong> {bin.bin_fill_level}%</p>
                  <p><strong>Hotspot Level:</strong> {bin.waste_hotspot_level}</p>
                  <p><strong>Priority Score:</strong> {bin.priority_score}</p>
                  <p><strong>Collection Interval:</strong> {bin.last_collection_interval} days</p>
                  <p><strong>Overflow History:</strong> {bin.overflow_history}</p>
                  <p><strong>Traffic Density:</strong> {bin.traffic_density}</p>
                  <p><strong>Road Congestion:</strong> {bin.road_congestion_index}</p>
                  {routeMatch && (
                    <p className="mt-1 font-semibold text-primary">
                      Route Sequence: Stop #{routeMatch.sequence} {routeMatch.collected ? "(Collected)" : ""}
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {line.length > 0 && (
          <Polyline positions={line} pathOptions={{ color: "#0F6657", weight: 4, dashArray: "6, 6" }} />
        )}
      </MapContainer>
    </div>
  );
}
