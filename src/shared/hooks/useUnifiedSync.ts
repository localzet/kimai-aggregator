import { useState, useCallback, useEffect, useRef } from "react";
import { useSettings } from "./useSettings";
import { useMixIdSync } from "./useMixIdSync";
import { syncCalendar } from "@/shared/api/calendarSync";
import { db } from "@/shared/api/db";
import { Timesheet } from "@/shared/api/kimaiApi";
import dayjs from "dayjs";

export type SyncStage = "idle" | "mixid" | "notion" | "complete" | "error";

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
  const { performSync: performMixIdSync } = useMixIdSync();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress>({
    stage: "idle",
    message: "",
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  const syncNotion = useCallback(
    async (
      entries: Timesheet[],
    ): Promise<{ created: number; updated: number; errors: number } | null> => {
      if (
        !settings.calendarSync?.enabled ||
        settings.calendarSync?.syncType !== "notion"
      ) {
        return null;
      }

      if (
        !settings.calendarSync.notionApiKey ||
        !settings.calendarSync.notionDatabaseId
      ) {
        return null;
      }

      try {
        setProgress({
          stage: "notion",
          message: "Синхронизация с Notion...",
        });

        const now = dayjs();
        const pastDays = settings.calendarSync.syncPastDays || 30;
        const futureDays = settings.calendarSync.syncFutureDays || 7;
        const startDate = now.subtract(pastDays, "day");
        const endDate = now.add(futureDays, "day");

        const filteredEntries = entries.filter((entry) => {
          if (!entry.begin) return false;
          const entryDate = dayjs(entry.begin);
          return entryDate.isAfter(startDate) && entryDate.isBefore(endDate);
        });

        const result = await syncCalendar(
          filteredEntries,
          settings.calendarSync,
        );
        return result;
      } catch (error) {
        console.error("Notion sync error:", error);
        throw error;
      }
    },
    [settings.calendarSync],
  );

  const performSync = useCallback(
    async (triggerSource: "manual" | "page-change" | "periodic" = "manual") => {
      if (syncing) {
        return;
      }

      // Проверяем минимальный интервал между синхронизациями
      const now = Date.now();
      const minInterval = MIN_SYNC_INTERVALS[triggerSource];
      const timeSinceLastSync = now - lastSyncTimeRef.current;

      if (minInterval > 0 && timeSinceLastSync < minInterval) {
        // Слишком рано для синхронизации, пропускаем
        return;
      }

      try {
        setSyncing(true);
        setProgress({
          stage: "mixid",
          message: "Синхронизация с Mix ID...",
        });

        // Этап 1: Синхронизация с Mix ID
        await performMixIdSync();

        // Этап 2: Синхронизация с Notion (если настроена)
        if (
          settings.calendarSync?.enabled &&
          settings.calendarSync?.syncType === "notion"
        ) {
          await db.init();
          const timesheets = await db.getTimesheets();
          await syncNotion(timesheets);
        }

        setProgress({
          stage: "complete",
          message: "Синхронизация завершена",
        });

        // Обновляем время последней синхронизации
        lastSyncTimeRef.current = Date.now();

        // Сбрасываем прогресс через 2 секунды
        setTimeout(() => {
          setProgress({
            stage: "idle",
            message: "",
          });
        }, 2000);
      } catch (error) {
        console.error("Sync error:", error);
        setProgress({
          stage: "error",
          message: "Ошибка синхронизации",
          error: error instanceof Error ? error.message : "Неизвестная ошибка",
        });

        // Сбрасываем ошибку через 5 секунд
        setTimeout(() => {
          setProgress({
            stage: "idle",
            message: "",
          });
        }, 5000);
      } finally {
        setSyncing(false);
      }
    },
    [syncing, performMixIdSync, settings.calendarSync, syncNotion],
  );

  // Периодическая синхронизация (раз в полчаса)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Запускаем периодическую синхронизацию только если включена автоматическая синхронизация
    if (settings.calendarSync?.autoSync) {
      intervalRef.current = setInterval(
        () => {
          performSync("periodic");
        },
        30 * 60 * 1000,
      ); // 30 минут
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.calendarSync?.autoSync, performSync]);

  return {
    performSync,
    syncing,
    progress,
  };
}
