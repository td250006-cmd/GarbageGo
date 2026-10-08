import { ClipboardCheck, Gauge, Recycle, Route } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import StatCard from "../components/StatCard";
import { useAppData } from "../hooks/useAppData";
import { average } from "../lib/utils";

export default function Reports() {
  const { bins, collections, currentRoute } = useAppData();

  const hotspotData = ["Low", "Medium", "High"].map((name) => ({
    name,
    value: bins.filter((bin) => bin.waste_hotspot_level === name).length,
  }));

  const avgFill = average(bins.map((bin) => Number(bin.bin_fill_level)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Analytical Reports</h1>
        <p className="text-sm text-slate-500">
          Executive performance summary of city-wide waste distribution, machine learning risk classifications, and Google OR-Tools routing metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Recycle} label="Total Bins Monitored" value={bins.length} />
        <StatCard
          icon={Gauge}
          label="Critical Bins (90–100)"
          value={bins.filter((bin) => bin.status === "Critical").length}
          tone="danger"
        />
        <StatCard
          icon={Gauge}
          label="High Priority Bins (70–89)"
          value={bins.filter((bin) => bin.status === "High").length}
          tone="warning"
        />
        <StatCard icon={Gauge} label="Average City Fill Level" value={`${avgFill.toFixed(1)}%`} />
        <StatCard icon={ClipboardCheck} label="Completed Pick-ups" value={collections.length} />
        <StatCard
          icon={Route}
          label="Active Route Distance"
          value={currentRoute?.total_distance != null ? `${currentRoute.total_distance} km` : "No active route"}
        />
        <StatCard
          icon={Route}
          label="Estimated Shift Transit"
          value={currentRoute?.estimated_time != null ? `~${currentRoute.estimated_time} min` : "No active route"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-semibold text-ink">ML Waste Hotspot Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={hotspotData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label>
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

        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-semibold text-ink">Operational Priority Counts</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={["Normal", "Medium", "High", "Critical"].map((name) => ({
                  name,
                  value: bins.filter((bin) => bin.status === name).length,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0F6657" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
