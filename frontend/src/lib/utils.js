export function formatNumber(value, digits = 1) {
  const number = Number(value);
  if (Number.isNaN(number)) return "—";
  return number.toFixed(digits);
}

export function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function todayDatePrefix() {
  return new Date().toISOString().slice(0, 10);
}
