const STYLES = {
  Critical: "bg-red-100 text-danger",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-800",
  Normal: "bg-green-100 text-green-700",
  Low: "bg-emerald-100 text-emerald-700",
  Collected: "bg-slate-100 text-slate-700",
  Pending: "bg-sky-100 text-sky-700",
  Available: "bg-green-100 text-green-700",
  "On Route": "bg-teal-100 text-primary",
};

export default function StatusBadge({ value }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[value] || "bg-slate-100 text-slate-700"}`}>
      {value || "—"}
    </span>
  );
}
