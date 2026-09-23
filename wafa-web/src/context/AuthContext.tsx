import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { SessionUser } from '../types';
import { authService } from '../services/auth.service';
import { authToken } from '../services/apiClient';

const SESSION_KEY = 'wafaa_his_session_v4';

interface AuthValue {
  user: SessionUser | null;
  login: (username: string, password: string) => Promise<SessionUser | null>;
  logout: () => void;
  refreshSession: () => Promise<SessionUser | null>;
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    try {
      const value = sessionStorage.getItem(SESSION_KEY);
      const parsed = value ? JSON.parse(value) as SessionUser : null;
      return parsed?.permissions ? parsed : null;
    } catch { return null; }
  });

  // Always re-read the current session from Laravel when the app opens/refetches.
  // Without this, a browser refresh reuses the old sessionStorage permissions, so
  // permission edits saved by Eng. Mohammed/Ahmed appear in the admin screen but
  // the target account keeps seeing the previous menu until a full logout/login.
  useEffect(() => {
    if (!authToken.get()) return;
    let cancelled = false;
    authService.me()
      .then(session => {
        if (cancelled) return;
        setUser(session);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      })
      .catch(() => {
        if (cancelled) return;
        authToken.clear();
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
      });
    return () => { cancelled = true; };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const session = await authService.login(username, password);
      setUser(session);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    } catch {
      authToken.clear();
      return null;
    }
  };

  const logout = () => {
    void authService.logout();
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const refreshSession = async () => {
    try {
      const session = await authService.me();
      setUser(session);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    } catch {
      return null;
    }
  };

  const can = (permission: string) => user?.permissions.includes(permission) ?? false;
  const canAny = (...permissions: string[]) => permissions.some(can);

  return <AuthContext.Provider value={useMemo(() => ({ user, login, logout, refreshSession, can, canAny }), [user])}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
