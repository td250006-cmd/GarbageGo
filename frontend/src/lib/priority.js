export function hotspotScore(prediction) {
  if (prediction === "High") return 100;
  if (prediction === "Medium") return 60;
  return 30;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function calculatePriorityScore(bin, prediction) {
  const fill = clamp(Number(bin.bin_fill_level) || 0, 0, 100);
  const overflow = clamp(((Number(bin.overflow_history) || 0) / 10) * 100, 0, 100);
  const interval = clamp(((Number(bin.last_collection_interval) || 0) / 14) * 100, 0, 100);
  const hotspot = hotspotScore(prediction);
  return Number((fill * 0.4 + hotspot * 0.3 + overflow * 0.15 + interval * 0.15).toFixed(2));
}

export function priorityStatusFromScore(score) {
  if (score >= 90) return "Critical";
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Normal";
}

export function statusColor(status) {
  if (status === "Critical") return "#EF5350";
  if (status === "High") return "#FBA808";
  if (status === "Medium") return "#EAB308";
  return "#16A34A";
}
