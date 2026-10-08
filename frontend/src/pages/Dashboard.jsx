import {
  AlertTriangle,
  ClipboardCheck,
  Gauge,
  Recycle,
  Route as RouteIcon,
  TriangleAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BinMap from "../components/BinMap";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { useAppData } from "../hooks/useAppData";
import { average } from "../lib/utils";

export default function Dashboard() {
  const { bins, collections, currentRoute, notice } = useAppData();
  const critical = bins.filter((bin) => bin.status === "Critical");
  const high = bins.filter((bin) => bin.status === "High");
  const medium = bins.filter((bin) => bin.status === "Medium");
  const avgFill = average(bins.map((bin) => Number(bin.bin_fill_level)));
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayCollections = collections.filter((item) => item.collected_at?.startsWith(todayPrefix));

  const hotspotData = ["Low", "Medium", "High"].map((name) => ({
    name,
    value: bins.filter((bin) => bin.waste_hotspot_level === name).length,
  }));

  const priorityData = ["Normal", "Medium", "High", "Critical"].map((name) => ({
    name,
    value: bins.filter((bin) => bin.status === name).length,
  }));

  // Top 20 bins with highest fill levels for clean, readable bar chart
  const fillChart = [...bins]
    .sort((a, b) => Number(b.bin_fill_level) - Number(a.bin_fill_level))
    .slice(0, 20)
    .map((bin) => ({
      bin_id: bin.bin_id,
      bin_fill_level: Number(bin.bin_fill_level),
    }));

  const alerts = [...critical, ...high].slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Live urban waste intelligence driven by authoritative dataset. `waste_hotspot_level` is the ML predicted hotspot; `status` is collection priority.
        </p>
      </div>
      {notice && <div className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-primary">{notice}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Recycle} label="Total Bins" value={bins.length} />
        <StatCard icon={TriangleAlert} label="Critical Bins" value={critical.length} tone="danger" />
        <StatCard icon={AlertTriangle} label="High Priority" value={high.length} tone="warning" />
        <StatCard icon={Gauge} label="Medium Priority" value={medium.length} tone="secondary" />
        <StatCard icon={Gauge} label="Average Fill Level" value={`${avgFill.toFixed(1)}%`} />
        <StatCard icon={ClipboardCheck} label="Today's Collections" value={todayCollections.length || collections.length} />
        <StatCard icon={RouteIcon} label="Active Routes" value={currentRoute ? 1 : 0} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-card xl:col-span-2">
          <h2 className="mb-3 font-semibold">Interactive Map</h2>
          <BinMap bins={bins} routeBins={currentRoute?.ordered_bins || []} height="h-[420px]" />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-semibold">Hotspot Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={hotspotData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {hotspotData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.name === "High" ? "#EF5350" : entry.name === "Medium" ? "#FBA808" : "#00AD8F"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-semibold">Top Fill-Level Bins</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={fillChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bin_id" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis unit="%" />
                <Tooltip />
                <Bar dataKey="bin_fill_level" fill="#0F6657" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-semibold">Priority Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#00AD8F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-semibold">Recent Alerts</h2>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500 py-3">No Critical or High alerts at this time.</p>
            ) : (
              alerts.map((bin) => (
                <div key={bin.bin_id} className="flex items-center justify-between rounded-xl bg-page px-3 py-2">
                  <div>
                    <p className="font-medium">{bin.bin_id}</p>
                    <p className="text-xs text-slate-500">
                      Fill {bin.bin_fill_level}% · Hotspot {bin.waste_hotspot_level} · Score {bin.priority_score}
                    </p>
                  </div>
                  <StatusBadge value={bin.status} />
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-semibold">Recent Collections</h2>
          <div className="space-y-2">
            {collections.length === 0 ? (
              <p className="text-sm text-slate-500 py-3">No recorded collections yet today.</p>
            ) : (
              collections.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-page px-3 py-2">
                  <div>
                    <p className="font-medium">{item.bin_id}</p>
                    <p className="text-xs text-slate-500">
                      {item.truck_id} · {item.collected_at ? item.collected_at.replace("T", " ").slice(0, 16) : "Just now"}
                    </p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
