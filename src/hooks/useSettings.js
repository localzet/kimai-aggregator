import { useState, useEffect } from 'react'

const defaultSettings = {
  apiUrl: '',
  apiKey: '',
  ratePerMinute: 0,
  useProxy: false, // Использовать прокси для обхода CORS (только в dev режиме)
  syncUrl: '', // URL для синхронизации настроек
  // Проекты хранятся по ID: { 
  //   [projectId]: { 
  //     enabled, 
  //     hasWeeklyGoal: boolean, // Есть ли цель по часам
  //     weeklyGoalHours: number, // Цель часов в неделю (если hasWeeklyGoal = true)
  //     hasPaymentPeriods: boolean, // Есть ли периоды оплаты
  //     paymentPeriodWeeks: number, // Количество недель в периоде (если hasPaymentPeriods = true)
  //     startWeekNumber: number, // Номер недели начала первого периода (ISO week)
  //     startYear: number, // Год начала первого периода
  //     hasStages: boolean, // Есть ли этапы
  //     stages: [{ name: string, plannedHours: number, startDate: string, endDate: string }] // Этапы проекта
  //   } 
  // }
  projectSettings: {},
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('kimai-settings')
    return saved ? JSON.parse(saved) : defaultSettings
  })

  useEffect(() => {
    localStorage.setItem('kimai-settings', JSON.stringify(settings))
  }, [settings])

  const updateSettings = (newSettings) => {
    setSettings(newSettings)
  }

  return { settings, updateSettings }
}

