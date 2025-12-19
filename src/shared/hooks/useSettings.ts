import { useState, useEffect, useCallback } from 'react'
import { ProjectSettings } from '@/shared/api/kimaiApi'
import { BackendApi } from '@/shared/api/backendApi'
import { mixIdApi } from '@localzet/data-connector/api'

export interface CalendarSyncSettings {
  enabled: boolean
  syncType: 'google' | 'notion' | null
  // Google Calendar settings
  googleCalendarId?: string
  googleClientId?: string
  googleClientSecret?: string
  googleAccessToken?: string
  googleRefreshToken?: string
  // Notion settings
  notionApiKey?: string
  notionDatabaseId?: string
  notionProjectTemplates?: Record<string, string> // Маппинг названий проектов на ID шаблонов Notion
  // Sync options
  syncPastDays?: number // Сколько дней назад синхронизировать
  syncFutureDays?: number // Сколько дней вперед синхронизировать
  autoSync?: boolean // Автоматическая синхронизация
}

export type AppMode = 'standalone' | 'normal'

export interface Settings {
  apiUrl: string
  apiKey: string
  ratePerMinute: number
  useProxy: boolean
  syncUrl?: string
  projectSettings: ProjectSettings
  excludedTags: string[]
  calendarSync?: CalendarSyncSettings
  appMode?: AppMode // 'standalone' | 'normal'
  backendUrl?: string // URL бэкенда для обычного режима
  backendToken?: string // JWT токен для бэкенда
}

const defaultBackendUrl = (import.meta.env.VITE_BACKEND_URL as string) || 'https://kimai-api.zorin.cloud'

const defaultSettings: Settings = {
  apiUrl: '',
  apiKey: '',
  ratePerMinute: 0,
  useProxy: false,
  syncUrl: '',
  projectSettings: {},
  excludedTags: [],
  calendarSync: {
    enabled: false,
    syncType: null,
    syncPastDays: 30,
    syncFutureDays: 7,
    autoSync: false,
  },
  appMode: 'normal', // По умолчанию обычный режим
  backendUrl: defaultBackendUrl,
  backendToken: '',
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    // Загружаем только минимальные настройки из localStorage (backendUrl, backendToken)
    const saved = localStorage.getItem('kimai-settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          ...defaultSettings,
          backendUrl: parsed.backendUrl || defaultSettings.backendUrl,
          backendToken: parsed.backendToken || defaultSettings.backendToken,
          appMode: parsed.appMode || defaultSettings.appMode,
        }
      } catch {
        return defaultSettings
      }
    }
    return defaultSettings
  })

  const [loading, setLoading] = useState(false)

  // Загрузка настроек с бэкенда
  const loadSettingsFromBackend = useCallback(async () => {
    if (!settings.backendUrl || !settings.backendToken) {
      return
    }

    try {
      setLoading(true)
      const backendApi = new BackendApi(settings.backendUrl, settings.backendToken)
      // Ответ бэкенда в snake_case, поэтому приводим через any и маппим вручную
      const backendSettings: any = await backendApi.getSettings()
      
      const convertedSettings: Settings = {
        apiUrl: backendSettings?.kimai_api_url || '',
        apiKey: backendSettings?.kimai_api_key || '',
        ratePerMinute: backendSettings?.rate_per_minute || 0,
        useProxy: false,
        projectSettings: backendSettings?.project_settings || {},
        excludedTags: backendSettings?.excluded_tags || [],
        calendarSync: backendSettings?.calendar_sync || defaultSettings.calendarSync,
        appMode: 'normal',
        backendUrl: settings.backendUrl,
        backendToken: settings.backendToken,
      }

      setSettings(convertedSettings)
    } catch (error) {
      console.warn('Could not load settings from backend:', error)
    } finally {
      setLoading(false)
    }
  }, [settings.backendUrl, settings.backendToken])

  // Загрузка настроек при монтировании, если есть токен
  useEffect(() => {
    if (settings.backendUrl && settings.backendToken) {
      loadSettingsFromBackend()
    }
  }, []) // Только при монтировании

  const updateSettings = useCallback(async (newSettings: Settings) => {
    // Сохраняем только минимальные настройки локально
    const localOnly = {
      backendUrl: newSettings.backendUrl || settings.backendUrl,
      backendToken: newSettings.backendToken || settings.backendToken,
      appMode: newSettings.appMode || settings.appMode || 'normal',
    }
    localStorage.setItem('kimai-settings', JSON.stringify(localOnly))
    setSettings(newSettings)

    // Если есть бэкенд и токен, синхронизируем настройки
    if (newSettings.backendUrl && newSettings.backendToken && 
        newSettings.apiUrl && newSettings.apiKey) {
      try {
        const backendApi = new BackendApi(newSettings.backendUrl, newSettings.backendToken)
        
        // Отправляем настройки в бэкенд (payload в snake_case)
        const payload: any = {
          kimai_api_url: newSettings.apiUrl,
          kimai_api_key: newSettings.apiKey,
          rate_per_minute: newSettings.ratePerMinute,
          project_settings: newSettings.projectSettings,
          excluded_tags: newSettings.excludedTags,
          calendar_sync: newSettings.calendarSync,
        }

        await backendApi.updateSettings(payload)

        // Отправляем настройки в MIX ID (только настройки, не данные!)
        try {
          const apiBase = import.meta.env.VITE_MIX_ID_API_BASE || 'https://data-center.zorin.cloud/api'
          const clientId = import.meta.env.VITE_MIX_ID_CLIENT_ID || ''
          const clientSecret = import.meta.env.VITE_MIX_ID_CLIENT_SECRET || ''

          if (clientId && clientSecret) {
            mixIdApi.setConfig({ apiBase, clientId, clientSecret })
            await mixIdApi.uploadSettings(newSettings)
          }
        } catch (e) {
          console.warn('Could not upload settings to MIX ID:', e)
        }
      } catch (error) {
        console.warn('Could not update settings on backend:', error)
      }
    }
  }, [settings])

  return { settings, updateSettings, loading, reload: loadSettingsFromBackend }
}
