import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const LAND_USE = ["Residential", "Commercial", "Industrial", "Mixed", "Market"];
const COLUMNS = [
  "bin_id",
  "latitude",
  "longitude",
  "bin_fill_level",
  "historical_fill_average",
  "last_collection_interval",
  "overflow_history",
  "collection_frequency",
  "missed_collection_count",
  "hour_of_day",
  "day_of_week",
  "month",
  "weekend_flag",
  "holiday_flag",
  "land_use_type",
  "traffic_density",
  "average_vehicle_speed",
  "road_congestion_index",
  "travel_time_to_bin",
  "road_closure_flag",
  "nearest_road_distance",
  "road_connectivity_index",
  "junction_count",
  "waste_hotspot_level",
];

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function round(value, digits = 2) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hotspotFromFeatures(row) {
  let score = 0;
  score += row.bin_fill_level * 0.42;
  score += row.historical_fill_average * 0.12;
  score += Math.min(row.last_collection_interval, 21) * 2.2;
  score += row.overflow_history * 4.5;
  score += row.missed_collection_count * 3.5;
  score -= row.collection_frequency * 1.8;
  score += row.traffic_density * 0.08;
  score += row.road_congestion_index * 8;
  if (row.land_use_type === "Market" || row.land_use_type === "Commercial") score += 12;
  if (row.land_use_type === "Industrial") score += 6;
  if (row.weekend_flag === 1) score += 4;
  if (row.holiday_flag === 1) score += 6;
  if (row.road_closure_flag === 1) score += 5;
  if (score >= 72) return "High";
  if (score >= 48) return "Medium";
  return "Low";
}

function hotspotToScore(level) {
  if (level === "High") return 100;
  if (level === "Medium") return 60;
  return 30;
}

function priorityFrom(row, prediction) {
  const fill = clamp(row.bin_fill_level, 0, 100);
  const overflow = clamp((row.overflow_history / 10) * 100, 0, 100);
  const interval = clamp((row.last_collection_interval / 14) * 100, 0, 100);
  const hotspot = hotspotToScore(prediction);
  return round(fill * 0.4 + hotspot * 0.3 + overflow * 0.15 + interval * 0.15, 2);
}

function priorityStatus(score) {
  if (score >= 90) return "Critical";
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Normal";
}

function zoneFrom(lat, lng) {
  const lat0 = 18.5204;
  const lng0 = 73.8567;
  if (lat >= lat0 && lng < lng0) return "North-West";
  if (lat >= lat0 && lng >= lng0) return "North-East";
  if (lat < lat0 && lng < lng0) return "South-West";
  return "South-East";
}

const rand = mulberry32(20261008);
const rows = [];
const uniqueBins = 80;

for (let i = 1; i <= uniqueBins; i += 1) {
  const binId = `BIN-${String(i).padStart(3, "0")}`;
  const lat = round(18.46 + rand() * 0.14, 6);
  const lng = round(73.78 + rand() * 0.16, 6);
  const landUse = LAND_USE[randInt(rand, 0, LAND_USE.length - 1)];
  const snapshots = 3;

  for (let s = 0; s < snapshots; s += 1) {
    const fillBias =
      landUse === "Market" || landUse === "Commercial" ? 18 : landUse === "Industrial" ? 10 : 0;
    const bin_fill_level = clamp(round(rand() * 85 + fillBias, 1), 5, 100);
    const historical_fill_average = clamp(round(bin_fill_level - 8 + rand() * 16, 1), 5, 98);
    const last_collection_interval = randInt(rand, 1, 18);
    const overflow_history = randInt(rand, 0, bin_fill_level > 80 ? 12 : 6);
    const collection_frequency = randInt(rand, 2, 8);
    const missed_collection_count = randInt(rand, 0, 5);
    const hour_of_day = randInt(rand, 6, 20);
    const day_of_week = randInt(rand, 0, 6);
    const month = randInt(rand, 1, 12);
    const weekend_flag = day_of_week === 0 || day_of_week === 6 ? 1 : 0;
    const holiday_flag = rand() < 0.08 ? 1 : 0;
    const traffic_density = randInt(rand, 20, 98);
    const average_vehicle_speed = clamp(round(42 - traffic_density * 0.22 + rand() * 6, 1), 8, 50);
    const road_congestion_index = round(traffic_density / 100, 2);
    const travel_time_to_bin = clamp(round(6 + rand() * 28 + road_congestion_index * 10, 1), 5, 55);
    const road_closure_flag = rand() < 0.06 ? 1 : 0;
    const nearest_road_distance = round(8 + rand() * 90, 1);
    const road_connectivity_index = round(0.35 + rand() * 0.6, 2);
    const junction_count = randInt(rand, 1, 9);

    const row = {
      bin_id: binId,
      latitude: lat,
      longitude: lng,
      bin_fill_level,
      historical_fill_average,
      last_collection_interval,
      overflow_history,
      collection_frequency,
      missed_collection_count,
      hour_of_day,
      day_of_week,
      month,
      weekend_flag,
      holiday_flag,
      land_use_type: landUse,
      traffic_density,
      average_vehicle_speed,
      road_congestion_index,
      travel_time_to_bin,
      road_closure_flag,
      nearest_road_distance,
      road_connectivity_index,
      junction_count,
    };

    let waste_hotspot_level = hotspotFromFeatures(row);
    if (rand() < 0.08) {
      const options = ["Low", "Medium", "High"].filter((x) => x !== waste_hotspot_level);
      waste_hotspot_level = options[randInt(rand, 0, options.length - 1)];
    }
    row.waste_hotspot_level = waste_hotspot_level;
    rows.push(row);
  }
}

const csv = [
  COLUMNS.join(","),
  ...rows.map((row) => COLUMNS.map((col) => row[col]).join(",")),
].join("\n");

fs.mkdirSync(path.join(root, "ml"), { recursive: true });
fs.writeFileSync(path.join(root, "ml", "dataset.csv"), `${csv}\n`);

const latestByBin = new Map();
for (const row of rows) latestByBin.set(row.bin_id, row);
const bins = [...latestByBin.values()].sort((a, b) => a.bin_id.localeCompare(b.bin_id));

const demoBins = bins.map((row, index) => {
  const prediction = row.waste_hotspot_level;
  const priority_score = priorityFrom(row, prediction);
  return {
    id: index + 1,
    ...row,
    status: "Pending",
    zone: zoneFrom(row.latitude, row.longitude),
    prediction,
    confidence: null,
    priority_score,
    priority_status: priorityStatus(priority_score),
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-08T08:00:00Z",
  };
});

const trucks = [
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
];

const collections = demoBins
  .filter((bin) => bin.priority_status === "Normal")
  .slice(0, 6)
  .map((bin, index) => ({
    id: index + 1,
    bin_id: bin.bin_id,
    truck_id: index % 2 === 0 ? "TRK-01" : "TRK-02",
    collected_at: `2026-10-08T0${7 + index}:15:00Z`,
    fill_level_at_collection: bin.bin_fill_level,
    status: "Collected",
  }));

const js = `export const DEPOT = {
  name: "Central Depot",
  latitude: 18.5204,
  longitude: 73.8567,
};

export const trucks = ${JSON.stringify(trucks, null, 2)};

export const collections = ${JSON.stringify(collections, null, 2)};

export const tempBins = ${JSON.stringify(demoBins, null, 2)};
`;

fs.mkdirSync(path.join(root, "frontend", "src", "data"), { recursive: true });
fs.writeFileSync(path.join(root, "frontend", "src", "data", "tempData.js"), js);

const seedValues = demoBins
  .map(
    (bin) =>
      `('${bin.bin_id}', ${bin.latitude}, ${bin.longitude}, ${bin.bin_fill_level}, ${bin.historical_fill_average}, ${bin.last_collection_interval}, ${bin.overflow_history}, ${bin.collection_frequency}, ${bin.missed_collection_count}, ${bin.hour_of_day}, ${bin.day_of_week}, ${bin.month}, ${bin.weekend_flag}, ${bin.holiday_flag}, '${bin.land_use_type}', ${bin.traffic_density}, ${bin.average_vehicle_speed}, ${bin.road_congestion_index}, ${bin.travel_time_to_bin}, ${bin.road_closure_flag}, ${bin.nearest_road_distance}, ${bin.road_connectivity_index}, ${bin.junction_count}, '${bin.status}')`,
  )
  .join(",\n");

const seedSql = `-- Seed bins from ml/dataset.csv (latest observation per bin_id).
-- Run after schema.sql. Do not invent extra ML fields.

insert into public.bins (
  bin_id, latitude, longitude, bin_fill_level, historical_fill_average,
  last_collection_interval, overflow_history, collection_frequency,
  missed_collection_count, hour_of_day, day_of_week, month, weekend_flag,
  holiday_flag, land_use_type, traffic_density, average_vehicle_speed,
  road_congestion_index, travel_time_to_bin, road_closure_flag,
  nearest_road_distance, road_connectivity_index, junction_count, status
) values
${seedValues};

insert into public.trucks (truck_id, driver_name, capacity_kg, status) values
('TRK-01', 'Amit Patil', 2500, 'Available'),
('TRK-02', 'Sneha Kulkarni', 2200, 'Available'),
('TRK-03', 'Rahul Deshmukh', 1800, 'Available');
`;

fs.mkdirSync(path.join(root, "database"), { recursive: true });
fs.writeFileSync(path.join(root, "database", "seed.sql"), seedSql);

console.log(`Wrote ${rows.length} ML rows and ${demoBins.length} demo bins.`);
