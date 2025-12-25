/**
 * InitialRedirect
 *
 * Компонент для начального редиректа при загрузке приложения.
 * Определяет, куда направить пользователя в зависимости от его статуса и настроек.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/shared/hooks/useSettings";

export function InitialRedirect() {
  const { settings, loading } = useSettings();
  const navigate = useNavigate();

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

    // If we have a backend token, wait until backend settings load finishes
    if (hasBackendToken && loading) {
      return;
    }

    if (hasBackendToken) {
      // If logged into backend, send to settings or dashboard depending on presence of Kimai settings
      if (!settings.apiUrl || !settings.apiKey) {
        navigate("/settings", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
      return;
    }

    // No backend token: send to auth page
    navigate("/auth", { replace: true });
  }, [settings.appMode, settings.apiUrl, settings.apiKey, settings.backendToken, loading, navigate]);

  return null;
}
