import StatusBadge from "../components/StatusBadge";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";

export default function Profile() {
  const { user, supabaseEnabled } = useAuth();
  const { currentRoute, trucks } = useAppData();
  const truck = trucks.find((item) => item.truck_id === user?.truck_id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink">User Profile</h1>
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <p className="text-sm text-slate-500">Full Name</p>
        <p className="mb-4 text-lg font-semibold text-ink">{user?.name}</p>
        <p className="text-sm text-slate-500">Email Address</p>
        <p className="mb-4 font-medium text-ink">{user?.email}</p>
        <p className="text-sm text-slate-500">System Role</p>
        <div className="mb-4 mt-1 flex items-center gap-2">
          <span className="font-semibold capitalize text-slate-700">{user?.role}</span>
          <StatusBadge value={user?.role === "admin" ? "On Route" : "Available"} />
        </div>
        {user?.role === "driver" && (
          <div className="border-t pt-3 mt-3">
            <p className="text-sm text-slate-500">Assigned Vehicle</p>
            <p className="mb-2 font-bold text-primary">{user.truck_id || "TRK-01"}</p>
            {truck && <StatusBadge value={truck.status} />}
          </div>
        )}
      </div>
      <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-card space-y-2">
        <p>
          <strong className="text-ink">Authentication Provider:</strong>{" "}
          {supabaseEnabled ? "Supabase Cloud Auth (Active)" : "CleanRoute Secure Session"}
        </p>
        <p>
          <strong className="text-ink">Active Dispatch Route:</strong>{" "}
          {currentRoute
            ? `${currentRoute.truck_id} · ${currentRoute.total_bins} bins scheduled (${currentRoute.total_distance} km)`
            : "No active route currently assigned"}
        </p>
      </div>
    </div>
  );
}
