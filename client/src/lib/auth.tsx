import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

interface User {
  id: number;
  email: string;
  name: string;
  belt: string;
  stripes: number;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionExpiry: string | null;
  avatarInitials: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setUser(data.user);
    queryClient.clear();
  };

  const register = async (email: string, name: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { email, name, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setUser(data.user);
    queryClient.clear();
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout", {});
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
