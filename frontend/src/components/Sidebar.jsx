import {
  Binoculars,
  LayoutDashboard,
  MapPinned,
  Route,
  ClipboardCheck,
  BarChart3,
  UserRound,
  Recycle,
  BrainCircuit,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ADMIN_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bins", label: "Bins", icon: Recycle },
  { to: "/prediction", label: "Prediction", icon: BrainCircuit },
  { to: "/routes", label: "Routes", icon: Route },
  { to: "/collections", label: "Collections", icon: ClipboardCheck },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: UserRound },
];

const DRIVER_LINKS = [
  { to: "/routes", label: "Assigned Route", icon: MapPinned },
  { to: "/collections", label: "Collections", icon: ClipboardCheck },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const links = user?.role === "driver" ? DRIVER_LINKS : ADMIN_LINKS;

  return (
    <>
      {open && <button className="fixed inset-0 z-20 bg-ink/30 lg:hidden" onClick={onClose} aria-label="Close menu" />}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white px-4 py-6 shadow-card transition lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="rounded-xl bg-primary p-2 text-white">
            <Binoculars size={20} />
          </span>
          <div>
            <p className="font-semibold text-primary">CleanRoute AI</p>
            <p className="text-xs text-slate-500">Waste hotspot routing</p>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive ? "bg-primary text-white" : "text-slate-600 hover:bg-page"
                  }`
                }
              >
                <Icon size={18} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
