import { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useMixIdStatus } from "@localzet/data-connector/hooks";
import { useSettings } from "@/shared/hooks/useSettings";

export function AuthGuard() {
  const navigate = useNavigate();
  const mixIdStatus = useMixIdStatus();
  const { settings } = useSettings();

  const isAuth = !!(settings?.backendToken && settings.backendToken.length > 0);

  useEffect(() => {
    // If we have a backend token, consider user authenticated.
    if (!isAuth) {
      // Fallback to MIX ID connection state: if MIX ID is connected but no backend token,
      // still send user to /auth so they can finish backend login.
      if (!mixIdStatus.isConnected) {
        navigate("/auth", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    }
  }, [isAuth, mixIdStatus.isConnected, navigate]);

  if (!isAuth) {
    return <Navigate replace to="/auth" />;
  }

  return <Outlet />;
}
