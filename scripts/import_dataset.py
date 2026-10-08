import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "ml" / "urban_waste_hotspot_dataset.csv"
SEED_PATH = ROOT / "database" / "seed.sql"

HOTSPOT_MAP = {"High": 100, "Medium": 60, "Low": 30, "Normal": 30}


def clamp(val, low=0, high=100):
    return max(low, min(high, val))


def calc_priority(fill, overflow, interval, hotspot_label):
    f = clamp(float(fill))
    o = clamp((float(overflow) / 10.0) * 100.0)
    i = clamp((float(interval) / 14.0) * 100.0)
    h = HOTSPOT_MAP.get(hotspot_label, 30)
    score = round(f * 0.40 + h * 0.30 + o * 0.15 + i * 0.15, 2)
    if score >= 90:
        status = "Critical"
    elif score >= 70:
        status = "High"
    elif score >= 40:
        status = "Medium"
    else:
        status = "Normal"
    return score, status


def main():
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        # Import the first 100 real bins
        rows = [next(reader) for _ in range(100)]

    sql_values = []
    for r in rows:
        hotspot = "Low" if r["waste_hotspot_level"] == "Normal" else r["waste_hotspot_level"]
        score, status = calc_priority(
            r["bin_fill_level"],
            r["overflow_history"],
            r["last_collection_interval"],
            hotspot,
        )
        val = (
            f"('{r['bin_id']}', {float(r['latitude']):.6f}, {float(r['longitude']):.6f}, "
            f"{float(r['bin_fill_level']):.1f}, {float(r['historical_fill_average']):.1f}, "
            f"{float(r['last_collection_interval']):.1f}, {float(r['overflow_history']):.1f}, "
            f"{float(r['collection_frequency']):.1f}, {float(r['missed_collection_count']):.1f}, "
            f"{int(r['hour_of_day'])}, {int(r['day_of_week'])}, {int(r['month'])}, "
            f"{int(r['weekend_flag'])}, {int(r['holiday_flag'])}, '{r['land_use_type']}', "
            f"{float(r['traffic_density']):.1f}, {float(r['average_vehicle_speed']):.1f}, "
            f"{float(r['road_congestion_index']):.2f}, {float(r['travel_time_to_bin']):.1f}, "
            f"{int(r['road_closure_flag'])}, '{status}')"
        )
        sql_values.append(val)

    joined_vals = ",\n".join(sql_values)
    sql = f"""-- Seed bins from ml/urban_waste_hotspot_dataset.csv (authoritative dataset).
-- Run after schema.sql.

insert into public.bins (
  bin_id, latitude, longitude, bin_fill_level, historical_fill_average,
  last_collection_interval, overflow_history, collection_frequency,
  missed_collection_count, hour_of_day, day_of_week, month, weekend_flag,
  holiday_flag, land_use_type, traffic_density, average_vehicle_speed,
  road_congestion_index, travel_time_to_bin, road_closure_flag, status
) values
{joined_vals};

insert into public.trucks (truck_id, driver_name, capacity_kg, status) values
('TRK-01', 'Amit Patil', 2500, 'Available'),
('TRK-02', 'Sneha Kulkarni', 2200, 'Available'),
('TRK-03', 'Rahul Deshmukh', 1800, 'Available');
"""

    with open(SEED_PATH, "w", encoding="utf-8") as f:
        f.write(sql)

    print(f"Successfully generated {SEED_PATH} with {len(rows)} real bins from {CSV_PATH.name}")


if __name__ == "__main__":
    main()
