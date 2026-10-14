import { useEffect, useState } from "react";
import StatusBadge from "../components/StatusBadge";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";

export default function Profile() {
  const { user, supabaseEnabled, updateProfile } = useAuth();
  const { currentRoute, trucks } = useAppData();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    truck_id: user?.truck_id || "TRK-01",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        truck_id: user.truck_id || "TRK-01",
      });
    }
  }, [user]);

  const truck = trucks.find((item) => item.truck_id === user?.truck_id);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        ...(user?.role === "driver" ? { truck_id: form.truck_id } : {}),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">User Profile</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-card">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-500">Full Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-ink outline-none ring-0 focus:border-primary"
              />
            </div>

            {user?.role === "driver" && (
              <div>
                <label className="mb-1 block text-sm text-slate-500">Assigned Vehicle</label>
                <select
                  value={form.truck_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, truck_id: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-ink outline-none focus:border-primary"
                >
                  {trucks.map((truckItem) => (
                    <option key={truckItem.truck_id} value={truckItem.truck_id}>
                      {truckItem.truck_id} · {truckItem.driver_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
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
