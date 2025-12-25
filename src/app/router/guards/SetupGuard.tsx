/**
 * SetupGuard
 *
 * Защищает маршруты, требующие настройки Kimai API.
 * В standalone режиме редиректит на страницу настройки, если API ключи отсутствуют.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/shared/hooks/useSettings";
import { useMixIdStatus } from "@localzet/data-connector/hooks";

interface SetupGuardProps {
  children: React.ReactNode;
}

export function SetupGuard({ children }: SetupGuardProps) {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const mixIdStatus = useMixIdStatus();

  useEffect(() => {
    const appMode = settings.appMode ?? "normal";

    if (appMode === "standalone") {
      // В standalone‑режиме требуем настройки Kimai
      if (!settings.apiUrl || !settings.apiKey) {
        navigate("/setup", { replace: true });
      }
    } else {
      // In normal mode, require backend login to access setup
      const hasBackendToken = !!(
        settings.backendToken && settings.backendToken.length > 0
      );
      if (!hasBackendToken) {
        navigate("/auth", { replace: true });
      }
    }
    // In normal mode we avoid redirect loops; depend only on specific settings fields.
  }, [
    settings.appMode,
    settings.apiUrl,
    settings.apiKey,
    settings.backendToken,
    navigate,
  ]);

  const appMode = settings.appMode ?? "normal";

  // Standalone: блокируем без настроек Kimai
  if (appMode === "standalone" && (!settings.apiUrl || !settings.apiKey)) {
    return null;
  }

  // Normal mode: block if not logged into backend
  if (
    appMode === "normal" &&
    (!settings.backendToken || settings.backendToken.length === 0)
  ) {
    return null;
  }

  return <>{children}</>;
}
