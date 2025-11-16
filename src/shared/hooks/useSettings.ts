import { useState, useEffect } from 'react'
import { ProjectSettings } from '@/shared/api/kimaiApi'

export interface Settings {
  apiUrl: string
  apiKey: string
  ratePerMinute: number
  useProxy: boolean
  syncUrl: string
  projectSettings: ProjectSettings
}

const defaultSettings: Settings = {
  apiUrl: '',
  apiKey: '',
  ratePerMinute: 0,
  useProxy: false,
  syncUrl: '',
  projectSettings: {},
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
    setSettings(newSettings)
  }

  return { settings, updateSettings }
}
