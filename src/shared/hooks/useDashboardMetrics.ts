import { useState, useEffect, useCallback } from "react";
import { createBackendClient } from "@/shared/api/backendClient";
import { Settings } from "./useSettings";

interface DashboardMetrics {
  currentWeek: {
    duration: number;
    earnings: number;
    entries: number;
  };
  lastWeek: {
    duration: number;
    earnings: number;
    entries: number;
  };
  changes: {
    durationPercent: number;
    earningsPercent: number;
  };
}

export function useDashboardMetrics(settings: Settings) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const loadMetrics = useCallback(async () => {
    if (!settings.backendUrl || !settings.backendToken) {
      setError("Не настроен бэкенд. Пожалуйста, войдите в систему.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const backendApi = createBackendClient(settings.backendUrl);
      const response = await backendApi.getDashboardMetrics();

      setMetrics(response);
    } catch (error) {
      console.error("Error loading dashboard metrics:", error);
      setError(
        error instanceof Error ? error.message : "Ошибка загрузки метрик",
      );
    } finally {
      setLoading(false);
    }
  }, [settings.backendUrl, settings.backendToken]);

  useEffect(() => {
    // Only load if both URL and token are present to avoid infinite polling
    if (settings.backendUrl && settings.backendToken) {
      loadMetrics();
    }
  }, [settings.backendUrl, settings.backendToken, loadMetrics]);

  const reload = useCallback(async () => {
    await loadMetrics();
  }, [loadMetrics]);

  return {
    metrics,
    loading,
    error,
    reload,
  };
}
