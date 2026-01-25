import { useState, useEffect, useCallback } from "react";
import { createBackendClient } from "@/shared/api/backendClient";
import { Settings } from "./useSettings";
import { type UseSyncStatusReturn } from "./useSyncStatus";
import { WeekData } from "@/shared/api/kimaiApi";

export function useDashboardData(
  settings: Settings,
  syncStatusHook: UseSyncStatusReturn | null = null,
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    if (!settings.backendUrl || !settings.backendToken) {
      setError("Не настроен бэкенд. Пожалуйста, войдите в систему.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const backendApi = createBackendClient(settings.backendUrl);
      const response = await backendApi.getDashboardWeeks();

      // Transform backend data to match frontend WeekData interface
      const transformedWeeks: WeekData[] = response.weeks.map((week: any) => ({
        year: week.year,
        week: week.week,
        totalDuration: week.totalDuration,
        totalEarnings: week.totalEarnings,
        entries: week.entries,
        projects: week.projects,
        activities: week.activities,
      }));

      setWeeks(transformedWeeks);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError(
        error instanceof Error ? error.message : "Ошибка загрузки данных",
      );
    } finally {
      setLoading(false);
    }
  }, [settings.backendUrl, settings.backendToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reload = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    weeks,
    loading,
    error,
    reload,
    syncing,
  };
}
