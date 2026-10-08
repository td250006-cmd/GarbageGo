export const ML_FEATURE_NAMES = [
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
];

export const DATASET_COLUMNS = [
  "bin_id",
  "latitude",
  "longitude",
  ...ML_FEATURE_NAMES,
  "waste_hotspot_level",
];

export const FEATURE_LABELS = {
  bin_id: "Bin ID",
  latitude: "Latitude",
  longitude: "Longitude",
  bin_fill_level: "Fill Level (%)",
  traffic_density: "Traffic Density",
  average_vehicle_speed: "Average Vehicle Speed (km/h)",
  road_congestion_index: "Road Congestion Index",
  travel_time_to_bin: "Travel Time (min)",
  road_closure_flag: "Road Closure Flag",
  land_use_type: "Land Use Type",
  last_collection_interval: "Last Collection Interval (days)",
  historical_fill_average: "Historical Fill Average (%)",
  overflow_history: "Overflow History (count)",
  collection_frequency: "Collection Frequency (/wk)",
  missed_collection_count: "Missed Collection Count",
  hour_of_day: "Hour of Day",
  day_of_week: "Day of Week",
  month: "Month",
  weekend_flag: "Weekend Flag",
  holiday_flag: "Holiday Flag",
  waste_hotspot_level: "Waste Hotspot Level",
};

export function featuresFromBin(bin) {
  const features = {};
  ML_FEATURE_NAMES.forEach((name) => {
    features[name] = bin[name];
  });
  return features;
}
