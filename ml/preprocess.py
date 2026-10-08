REQUIRED_COLUMNS = [
    "bin_id",
    "latitude",
    "longitude",
    "bin_fill_level",
    "traffic_density",
    "average_vehicle_speed",
    "road_congestion_index",
    "travel_time_to_bin",
    "road_closure_flag",
    "land_use_type",
    "last_collection_interval",
    "historical_fill_average",
    "overflow_history",
    "collection_frequency",
    "missed_collection_count",
    "hour_of_day",
    "day_of_week",
    "month",
    "weekend_flag",
    "holiday_flag",
    "waste_hotspot_level",
]

FEATURE_COLUMNS = [
    "bin_fill_level",
    "traffic_density",
    "average_vehicle_speed",
    "road_congestion_index",
    "travel_time_to_bin",
    "road_closure_flag",
    "land_use_type",
    "last_collection_interval",
    "historical_fill_average",
    "overflow_history",
    "collection_frequency",
    "missed_collection_count",
    "hour_of_day",
    "day_of_week",
    "month",
    "weekend_flag",
    "holiday_flag",
]

TARGET_COLUMN = "waste_hotspot_level"
CATEGORICAL_FEATURES = ["land_use_type"]
NUMERIC_FEATURES = [col for col in FEATURE_COLUMNS if col not in CATEGORICAL_FEATURES]
UNUSED_FOR_ML = ["bin_id", "latitude", "longitude"]


def validate_dataset_columns(columns):
    missing = [col for col in REQUIRED_COLUMNS if col not in columns]
    if missing:
        raise ValueError(
            "Invalid dataset. Missing required columns: " + ", ".join(missing)
        )
    return True
