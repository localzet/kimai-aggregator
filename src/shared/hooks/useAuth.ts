import { useCallback, useContext } from "react";
import createBackendClient from "@/shared/api/backendClient";
import { setToken, removeToken } from "@entities/session-store";
import { useSettings } from "@/shared/hooks/useSettings";
import { AuthContext } from "@/shared/hoks/auth-context";
import invariant from "tiny-invariant";

export function useAuth() {
  // Context provides authentication state for guards
  const ctx = useContext(AuthContext);
  invariant(ctx, "useAuth must be used within an AuthProvider");

  const { settings, updateSettings } = useSettings();

  const backendUrl = settings.backendUrl || (import.meta.env.VITE_BACKEND_URL as string) || "";

  const login = useCallback(
    async (email: string, password: string) => {
      const api = createBackendClient(backendUrl);
      const resp = await api.login(email, password);
      setToken({ accessToken: resp.token, refreshToken: resp.refresh_token });
      try {
        updateSettings({ ...settings, backendUrl, backendToken: resp.token });
      } catch {}
      // notify provider that we're authenticated
      try {
        ctx.setIsAuthenticated(true);
      } catch {}
      return resp;
    },
    [backendUrl, settings, updateSettings, ctx],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const api = createBackendClient(backendUrl);
      const resp = await api.register(email, password);
      setToken({ accessToken: resp.token, refreshToken: resp.refresh_token });
      try {
        updateSettings({ ...settings, backendUrl, backendToken: resp.token });
      } catch {}
      try {
        ctx.setIsAuthenticated(true);
      } catch {}
      return resp;
    },
    [backendUrl, settings, updateSettings, ctx],
  );

  const logout = useCallback(async () => {
    const api = createBackendClient(backendUrl);
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    removeToken();
    try {
      updateSettings({ ...settings, backendToken: "" });
    } catch {}
    try {
      ctx.setIsAuthenticated(false);
    } catch {}
  }, [backendUrl, settings, updateSettings, ctx]);

  return { ...ctx, login, register, logout };
}

export default useAuth;

