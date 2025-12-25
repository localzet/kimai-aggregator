import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { LoadingScreen } from "@/shared/ui";

export function AuthGuard() {
  const location = useLocation()
  const { isAuthenticated, isInitialized } = useAuth()

  if (!isInitialized) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    if (location.pathname.includes('/auth')) {
      return <Outlet />
    }
    return <Navigate replace to={'/auth'} />
  }

  if (isAuthenticated) {
    if (location.pathname.includes('/dashboard')) {
      return <Outlet />
    }
    return <Navigate replace to={'/dashboard'} />
  }

  return <Outlet />
}
