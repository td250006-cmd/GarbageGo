export function statusColor(status) {
  if (status === "Critical") return "#EF5350";
  if (status === "High") return "#F97316";
  if (status === "Medium") return "#EAB308";
  return "#16A34A";
}
