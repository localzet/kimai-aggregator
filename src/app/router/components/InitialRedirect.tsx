/**
 * InitialRedirect
 *
 * Компонент для начального редиректа при загрузке приложения.
 * Определяет, куда направить пользователя в зависимости от его статуса и настроек.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/shared/hooks/useSettings";
import { useMixIdStatus } from "@localzet/data-connector/hooks";

export function InitialRedirect() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const mixIdStatus = useMixIdStatus();

  useEffect(() => {
    const appMode = settings.appMode ?? "normal";

    // Standalone: прежняя логика визарда
    if (appMode === "standalone") {
      if (!settings.apiUrl || !settings.apiKey) {
        navigate("/setup", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
      return;
    }

    // Normal (многопользовательский): prefer backend token as auth indicator
    const hasBackendToken = !!(
      settings.backendToken && settings.backendToken.length > 0
    );

    if (hasBackendToken) {
      // If logged into backend, send to settings or dashboard depending on presence of Kimai settings
      if (!settings.apiUrl || !settings.apiKey) {
        navigate("/settings", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
      return;
    }

    // No backend token: fall back to MIX ID connection state
    if (!mixIdStatus.isConnected) {
      navigate("/auth", { replace: true });
      return;
    }

    // If connected to MIX ID but no backend token yet, send user to /auth to complete backend login
    navigate("/auth", { replace: true });
  }, [settings, mixIdStatus.isConnected, navigate]);

  return null;
}
