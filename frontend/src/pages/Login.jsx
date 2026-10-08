import { Recycle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorBanner from "../components/ErrorBanner";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@cleanroute.ai");
  const [password, setPassword] = useState("admin123");
  const [localError, setLocalError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");
    try {
      const user = await login(email, password);
      navigate(user.role === "driver" ? "/routes" : "/dashboard");
    } catch (err) {
      setLocalError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-xl bg-primary p-3 text-white">
            <Recycle size={24} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-primary">CleanRoute AI</h1>
            <p className="text-sm text-slate-500">AI-Based Smart Garbage Collection System</p>
          </div>
        </div>
        <ErrorBanner message={localError || error} />
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              required
            />
          </label>
          <label className="block text-sm text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-2.5 font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-60 transition"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <div className="mt-5 rounded-xl bg-page p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700 mb-1">Standard Demonstration Credentials:</p>
          <p>• Administrator: <code className="text-primary font-mono">admin@cleanroute.ai</code> / <code className="font-mono">admin123</code></p>
          <p>• Fleet Driver: <code className="text-primary font-mono">driver@cleanroute.ai</code> / <code className="font-mono">driver123</code></p>
        </div>
      </div>
    </div>
  );
}
