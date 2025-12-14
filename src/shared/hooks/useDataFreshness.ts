import { useState, useEffect } from 'react'
import { Settings, AppMode } from './useSettings'
import { db } from '@/shared/api/db'
import dayjs from 'dayjs'

export interface DataFreshnessInfo {
  lastSync: Date | null
  isStale: boolean
  stalenessHours: number
  status: 'fresh' | 'stale' | 'very_stale' | 'unknown'
  message: string
}

export function useDataFreshness(settings: Settings): DataFreshnessInfo {
  const [freshness, setFreshness] = useState<DataFreshnessInfo>({
    lastSync: null,
    isStale: false,
    stalenessHours: 0,
    status: 'unknown',
    message: 'Проверка актуальности данных...',
  })

  useEffect(() => {
    const checkFreshness = async () => {
      try {
        await db.init()
        const lastUpdate = await db.getMetadata('lastUpdate') as string | null
        
        if (!lastUpdate) {
          setFreshness({
            lastSync: null,
            isStale: true,
            stalenessHours: Infinity,
            status: 'unknown',
            message: 'Данные не синхронизированы',
          })
          return
        }

        const lastSyncDate = new Date(lastUpdate)
        const now = new Date()
        const diffHours = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60)
        
        const appMode: AppMode = settings.appMode || 'normal'
        const staleThreshold = appMode === 'normal' ? 24 : 168 // 1 день для обычного режима, 7 дней для автономного
        
        const isStale = diffHours > staleThreshold
        let status: DataFreshnessInfo['status'] = 'fresh'
        let message = ''

        if (diffHours < 1) {
          status = 'fresh'
          message = 'Данные актуальны'
        } else if (diffHours < staleThreshold) {
          status = 'fresh'
          message = `Обновлено ${Math.round(diffHours)} ${getHoursWord(Math.round(diffHours))} назад`
        } else if (diffHours < staleThreshold * 2) {
          status = 'stale'
          message = `Данные устарели: ${Math.round(diffHours)} ${getHoursWord(Math.round(diffHours))} назад`
        } else {
          status = 'very_stale'
          message = `Данные сильно устарели: ${Math.round(diffHours / 24)} ${getDaysWord(Math.round(diffHours / 24))} назад`
        }

        setFreshness({
          lastSync: lastSyncDate,
          isStale,
          stalenessHours: diffHours,
          status,
          message,
        })
      } catch (error) {
        console.error('Error checking data freshness:', error)
        setFreshness({
          lastSync: null,
          isStale: true,
          stalenessHours: Infinity,
          status: 'unknown',
          message: 'Ошибка проверки актуальности',
        })
      }
    }

    checkFreshness()
    const interval = setInterval(checkFreshness, 60000) // Проверяем каждую минуту

    return () => clearInterval(interval)
  }, [settings.appMode])

  return freshness
}

function getHoursWord(hours: number): string {
  if (hours === 1) return 'час'
  if (hours >= 2 && hours <= 4) return 'часа'
  return 'часов'
}

function getDaysWord(days: number): string {
  if (days === 1) return 'день'
  if (days >= 2 && days <= 4) return 'дня'
  return 'дней'
}

