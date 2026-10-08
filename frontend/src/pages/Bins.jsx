import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import { useAppData } from "../hooks/useAppData";

export default function Bins() {
  const { bins, loading } = useAppData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sortKey, setSortKey] = useState("bin_id");
  const [sortDir, setSortDir] = useState("asc");

  const filtered = useMemo(() => {
    const rows = bins.filter((bin) => {
      const zone = bin.zone || "";
      const landUse = bin.land_use_type || "";
      const haystack = `${bin.bin_id} ${zone} ${landUse}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = status === "All" || bin.status === status;
      return matchesQuery && matchesStatus;
    });

    return rows.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (left === right) return 0;
      const numA = Number(left);
      const numB = Number(right);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return sortDir === "asc" ? numA - numB : numB - numA;
      }
      return sortDir === "asc"
        ? String(left || "").localeCompare(String(right || ""))
        : String(right || "").localeCompare(String(left || ""));
    });
  }, [bins, query, status, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Bins</h1>
        <p className="text-sm text-slate-500">
          Directory of all city bins from authoritative dataset. Search, filter by status, and click column headers to sort.
        </p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by Bin ID, Zone, or Land Use..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 bg-white text-sm"
        >
          {["All", "Critical", "High", "Medium", "Normal"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
        {loading && bins.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Loading bin records from dataset...</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-slate-600">
              <tr>
                {[
                  ["bin_id", "Bin ID"],
                  ["zone", "Zone"],
                  ["latitude", "Latitude"],
                  ["longitude", "Longitude"],
                  ["bin_fill_level", "Fill Level"],
                  ["waste_hotspot_level", "Hotspot"],
                  ["priority_score", "Priority"],
                  ["traffic_density", "Traffic"],
                  ["status", "Status"],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    className="cursor-pointer px-4 py-3 select-none hover:text-primary"
                    onClick={() => toggleSort(key)}
                  >
                    {label} {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No bins matching your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((bin) => (
                  <tr key={bin.bin_id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-ink">{bin.bin_id}</td>
                    <td className="px-4 py-3 text-slate-600">{bin.zone || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{Number(bin.latitude).toFixed(4)}</td>
                    <td className="px-4 py-3 text-slate-500">{Number(bin.longitude).toFixed(4)}</td>
                    <td className="px-4 py-3 font-medium">{bin.bin_fill_level}%</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={bin.waste_hotspot_level} />
                    </td>
                    <td className="px-4 py-3 font-semibold">{bin.priority_score}</td>
                    <td className="px-4 py-3 text-slate-600">{bin.traffic_density}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={bin.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/bins/${bin.bin_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
