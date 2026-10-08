import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";

const AuthContext = createContext(null);

const DEFAULT_USERS = [
  {
    email: "admin@cleanroute.ai",
    password: "admin123",
    role: "admin",
    name: "Priya Sharma",
    truck_id: null,
  },
  {
    email: "driver@cleanroute.ai",
    password: "driver123",
    role: "driver",
    name: "Amit Patil",
    truck_id: "TRK-01",
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("cleanroute_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;

    // Check existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSupabaseProfile(session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          syncSupabaseProfile(session.user);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          localStorage.removeItem("cleanroute_user");
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const syncSupabaseProfile = async (authUser) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      const role = profile?.role || authUser.user_metadata?.role || "admin";
      const nextUser = {
        id: authUser.id,
        email: authUser.email,
        name: profile?.name || authUser.user_metadata?.name || authUser.email,
        role: role,
        truck_id: profile?.truck_id || authUser.user_metadata?.truck_id || (role === "driver" ? "TRK-01" : null),
      };
      setUser(nextUser);
      localStorage.setItem("cleanroute_user", JSON.stringify(nextUser));
      return nextUser;
    } catch {
      const role = authUser.user_metadata?.role || "admin";
      const fallback = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email,
        role,
        truck_id: authUser.user_metadata?.truck_id || (role === "driver" ? "TRK-01" : null),
      };
      setUser(fallback);
      localStorage.setItem("cleanroute_user", JSON.stringify(fallback));
      return fallback;
    }
  };

  const login = async (email, password) => {
    setError("");
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (supabaseEnabled && supabase) {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (sbError) {
          // If Supabase auth fails, try local fallback
          const localMatch = DEFAULT_USERS.find(
            (item) => item.email === cleanEmail && item.password === password
          );
          if (localMatch) {
            const nextUser = {
              email: localMatch.email,
              name: localMatch.name,
              role: localMatch.role,
              truck_id: localMatch.truck_id,
              id: localMatch.email,
            };
            setUser(nextUser);
            localStorage.setItem("cleanroute_user", JSON.stringify(nextUser));
            return nextUser;
          }
          throw sbError;
        }
        return await syncSupabaseProfile(data.user);
      }

      // Local / Offline authentication
      const match = DEFAULT_USERS.find(
        (item) => item.email === cleanEmail && item.password === password
      );
      if (!match) {
        throw new Error("Authentication failed. Use the demo admin or driver account.");
      }
      const nextUser = {
        email: match.email,
        name: match.name,
        role: match.role,
        truck_id: match.truck_id,
        id: match.email,
      };
      setUser(nextUser);
      localStorage.setItem("cleanroute_user", JSON.stringify(nextUser));
      return nextUser;
    } catch (err) {
      setError(err.message || "Authentication failed.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (supabaseEnabled && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    setUser(null);
    localStorage.removeItem("cleanroute_user");
  };

  const value = useMemo(
    () => ({ user, error, loading, login, logout, supabaseEnabled }),
    [user, error, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
