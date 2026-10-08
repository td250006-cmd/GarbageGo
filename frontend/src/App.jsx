import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import BinDetails from "./pages/BinDetails";
import Bins from "./pages/Bins";
import Collections from "./pages/Collections";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Prediction from "./pages/Prediction";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import RoutesPage from "./pages/Routes";

export default function App() {
  const { user } = useAuth();
  const home = user?.role === "driver" ? "/routes" : "/dashboard";

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<ProtectedRoute roles={["admin"]}><Dashboard /></ProtectedRoute>} />
        <Route path="/bins" element={<ProtectedRoute roles={["admin"]}><Bins /></ProtectedRoute>} />
        <Route path="/bins/:id" element={<ProtectedRoute roles={["admin"]}><BinDetails /></ProtectedRoute>} />
        <Route path="/prediction" element={<ProtectedRoute roles={["admin"]}><Prediction /></ProtectedRoute>} />
        <Route path="/routes" element={<ProtectedRoute roles={["admin", "driver"]}><RoutesPage /></ProtectedRoute>} />
        <Route path="/collections" element={<ProtectedRoute roles={["admin", "driver"]}><Collections /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={["admin"]}><Reports /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute roles={["admin", "driver"]}><Profile /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? home : "/login"} replace />} />
    </Routes>
  );
}
