import { useState, useCallback, useRef } from "react";
import { useSettings } from "./useSettings";
import { createBackendClient } from "@/shared/api/backendClient";

export type SyncStage = "idle" | "syncing" | "complete" | "error";

export interface SyncProgress {
  stage: SyncStage;
  message: string;
  error?: string;
}

// Минимальные интервалы между синхронизациями (в миллисекундах)
// Вынесено за пределы компонента для оптимизации
const MIN_SYNC_INTERVALS = {
  manual: 0, // Ручная синхронизация всегда разрешена
  "page-change": 2 * 60 * 1000, // 2 минуты для смены страниц
  periodic: 30 * 60 * 1000, // 30 минут для периодической
} as const;

export function useUnifiedSync() {
  const { settings } = useSettings();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress>({
    stage: "idle",
    message: "",
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  const performSync = useCallback(
    async (trigger: "manual" | "page-change" | "periodic" = "manual") => {
      // Проверяем минимальный интервал между синхронизациями
      const now = Date.now();
      const minInterval = MIN_SYNC_INTERVALS[trigger];
      if (now - lastSyncTimeRef.current < minInterval) {
        console.log(`Sync skipped: too soon since last sync (${trigger})`);
        return;
      }

      if (!settings.backendUrl || !settings.backendToken) {
        console.warn("Backend not configured, skipping sync");
        return;
      }

      if (syncing) {
        console.log("Sync already in progress, skipping");
        return;
      }

      setSyncing(true);
      setProgress({
        stage: "syncing",
        message: "Запуск синхронизации...",
      });

      try {
        const backendApi = createBackendClient(settings.backendUrl);
        await backendApi.triggerSync();

        setProgress({
          stage: "complete",
          message: "Синхронизация завершена",
        });

        lastSyncTimeRef.current = now;
      } catch (error) {
        console.error("Sync failed:", error);
        setProgress({
          stage: "error",
          message: "Ошибка синхронизации",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setSyncing(false);

        // Сбрасываем статус через 3 секунды
        setTimeout(() => {
          setProgress({
            stage: "idle",
            message: "",
          });
        }, 3000);
      }
    },
    [settings.backendUrl, settings.backendToken, syncing]
  );

  return {
    performSync,
    syncing,
    progress,
  };
}
