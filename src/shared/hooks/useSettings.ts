import { useState, useEffect, useCallback } from "react";
import { ProjectSettings } from "@/shared/api/kimaiApi";
import { createBackendClient } from "@/shared/api/backendClient";
import { setToken as setSessionToken } from "@entities/session-store";
import consola from 'consola/browser'

export interface CalendarSyncSettings {
  enabled: boolean;
  syncType: "google" | "notion" | null;
  // Google Calendar settings
  googleCalendarId?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  // Notion settings
  notionApiKey?: string;
  notionDatabaseId?: string;
  notionProjectTemplates?: Record<string, string>; // Маппинг названий проектов на ID шаблонов Notion
  // Sync options
  syncPastDays?: number; // Сколько дней назад синхронизировать
  syncFutureDays?: number; // Сколько дней вперед синхронизировать
  autoSync?: boolean; // Автоматическая синхронизация
}

export type AppMode = "standalone" | "normal";

export interface Settings {
  apiUrl: string;
  apiKey: string;
  ratePerMinute: number;
  useProxy: boolean;
  syncUrl?: string;
  projectSettings: ProjectSettings;
  excludedTags: string[];
  calendarSync?: CalendarSyncSettings;
  appMode?: AppMode; // 'standalone' | 'normal'
  backendUrl?: string; // URL бэкенда для обычного режима
  backendToken?: string; // JWT токен для бэкенда
}

const defaultBackendUrl =
  (import.meta.env.VITE_BACKEND_URL as string) ||
  "https://kimai-api.zorin.cloud";

const defaultSettings: Settings = {
  apiUrl: "",
  apiKey: "",
  ratePerMinute: 0,
  useProxy: false,
  syncUrl: "",
  projectSettings: {},
  excludedTags: [],
  calendarSync: {
    enabled: false,
    syncType: null,
    syncPastDays: 30,
    syncFutureDays: 7,
    autoSync: false,
  },
  appMode: "normal", // По умолчанию обычный режим
  backendUrl: defaultBackendUrl,
  backendToken: "",
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    // Загружаем только минимальные настройки из localStorage (backendUrl, backendToken)
    const saved = localStorage.getItem("kimai-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If a backend token was stored previously, migrate it into the session store
        // so axios has the Authorization header available on first load.
        if (parsed.backendToken) {
          try {
            setSessionToken({ accessToken: parsed.backendToken, refreshToken: parsed.backendRefreshToken });
          } catch (e) {
            // ignore
          }
        }
        return {
          ...defaultSettings,
          backendUrl: parsed.backendUrl || defaultSettings.backendUrl,
          backendToken: parsed.backendToken || defaultSettings.backendToken,
          appMode: parsed.appMode || defaultSettings.appMode,
        };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const [loading, setLoading] = useState(false);

  // Shared in-flight promise to avoid multiple components triggering
  // the settings load simultaneously (prevents request storms).
  // This lives at module scope so all hook instances share it.
  let _globalLoad: Promise<void> | null = (useSettings as any)._globalLoad || null;

  // Загрузка настроек с бэкенда
  const loadSettingsFromBackend = useCallback(async () => {
    if (!settings.backendUrl || !settings.backendToken) return;

    // reuse global promise if another hook instance already started loading
    if (_globalLoad) {
      try {
        await _globalLoad;
      } catch {
        // ignore errors from the other loader
      }
      return;
    }

    const loader = (async () => {
      try {
        setLoading(true);
        const backendApi = createBackendClient(settings.backendUrl || "")
        // Ответ бэкенда в snake_case, поэтому приводим через any и маппим вручную
        const backendSettings: any = await backendApi.getSettings();

        // Merge backend settings with local settings: do not overwrite local values with empty backend values
        const convertedSettings: Settings = {
          apiUrl: backendSettings?.kimai_api_url || settings.apiUrl || "",
          apiKey: backendSettings?.kimai_api_key || settings.apiKey || "",
          ratePerMinute: backendSettings?.rate_per_minute ?? settings.ratePerMinute ?? 0,
          useProxy: false,
          projectSettings: backendSettings?.project_settings || settings.projectSettings || {},
          excludedTags: backendSettings?.excluded_tags || settings.excludedTags || [],
          calendarSync:
            backendSettings?.calendar_sync || settings.calendarSync || defaultSettings.calendarSync,
          appMode: "normal",
          backendUrl: settings.backendUrl,
          backendToken: settings.backendToken,
        };

        setSettings(convertedSettings);
      } catch (error) {
        console.warn("Could not load settings from backend:", error);
      } finally {
        setLoading(false);
      }
    })();

    // store on function object so other hook instances can see it
    (useSettings as any)._globalLoad = loader;
    _globalLoad = loader;

    try {
      await loader;
    } finally {
      (useSettings as any)._globalLoad = null;
      _globalLoad = null;
    }
  }, [settings.backendUrl, settings.backendToken]);

  // Загрузка настроек при монтировании, если есть токен
  useEffect(() => {
    if (settings.backendUrl && settings.backendToken) {
      loadSettingsFromBackend();
    }
  }, [settings.backendUrl, settings.backendToken]);

  const updateSettings = useCallback(
    async (newSettings: Settings) => {
      // Сохраняем только минимальные настройки локально
      const localOnly = {
        backendUrl: newSettings.backendUrl || settings.backendUrl,
        backendToken: newSettings.backendToken || settings.backendToken,
        appMode: newSettings.appMode || settings.appMode || "normal",
      };
      localStorage.setItem("kimai-settings", JSON.stringify(localOnly));
      setSettings(newSettings);

      // Если есть бэкенд и токен, синхронизируем настройки
      if (
        newSettings.backendUrl &&
        newSettings.backendToken &&
        newSettings.apiUrl &&
        newSettings.apiKey
      ) {
        try {
          const backendApi = createBackendClient(newSettings.backendUrl || "")

          // Отправляем настройки в бэкенд (payload в snake_case)
          const payload: any = {
            kimai_api_url: newSettings.apiUrl,
            kimai_api_key: newSettings.apiKey,
            rate_per_minute: newSettings.ratePerMinute,
            project_settings: newSettings.projectSettings,
            excluded_tags: newSettings.excludedTags,
            calendar_sync: newSettings.calendarSync,
          };

          await backendApi.updateSettings(payload);

          // MIX ID integration removed — frontend no longer uploads settings to MIX ID
        } catch (error) {
          console.warn("Could not update settings on backend:", error);
        }
      }
    },
    [settings],
  );

  return { settings, updateSettings, loading, reload: loadSettingsFromBackend };
}
