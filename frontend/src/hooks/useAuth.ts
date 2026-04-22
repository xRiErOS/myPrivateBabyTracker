/** Auth context + hook — provides current user, login/logout, auth state. */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createElement } from "react";
import type { AuthUser, AuthStatus } from "../api/auth";
import {
  login as apiLogin,
  logout as apiLogout,
  getAuthStatus,
} from "../api/auth";

interface AuthState {
  user: AuthUser | null;
  authMode: string;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<string>("disabled");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const status: AuthStatus = await getAuthStatus();
      setAuthMode(status.auth_mode);
      setUser(status.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (username: string, password: string) => {
      const u = await apiLogin(username, password);
      setUser(u);
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return createElement(
    AuthContext.Provider,
    { value: { user, authMode, loading, login, logout, refresh } },
    children,
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
