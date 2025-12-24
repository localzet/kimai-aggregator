import { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useMixIdStatus } from "@localzet/data-connector/hooks";

export function AuthGuard() {
  const navigate = useNavigate();
  const mixIdStatus = useMixIdStatus();

  useEffect(() => {
    if (!mixIdStatus.isConnected) {
      navigate("/auth", { replace: true });
    }
  }, [mixIdStatus.isConnected, navigate]);

  if (!mixIdStatus.isConnected) {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}
