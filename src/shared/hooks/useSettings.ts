import { useState, useEffect } from 'react'
import { ProjectSettings } from '@/shared/api/kimaiApi'

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
  // Sync options
  syncPastDays?: number // Сколько дней назад синхронизировать
  syncFutureDays?: number // Сколько дней вперед синхронизировать
  autoSync?: boolean // Автоматическая синхронизация
}

export interface Settings {
  apiUrl: string
  apiKey: string
  ratePerMinute: number
  useProxy: boolean
  syncUrl?: string // Deprecated, kept for backward compatibility
  projectSettings: ProjectSettings
  excludedTags: string[]
  calendarSync?: CalendarSyncSettings
}

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
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('kimai-settings')
    return saved ? JSON.parse(saved) : defaultSettings
  })

  useEffect(() => {
    localStorage.setItem('kimai-settings', JSON.stringify(settings))
  }, [settings])

  const updateSettings = (newSettings: Settings) => {
    // Сначала обновляем localStorage, затем состояние
    localStorage.setItem('kimai-settings', JSON.stringify(newSettings))
    setSettings(newSettings)
  }

  return { settings, updateSettings }
}
