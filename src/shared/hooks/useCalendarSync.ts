import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import { syncCalendar } from '@/shared/api/calendarSync'
import { Timesheet } from '@/shared/api/kimaiApi'
import { CalendarSyncSettings } from './useSettings'
import dayjs from 'dayjs'

export function useCalendarSync() {
  const [syncing, setSyncing] = useState(false)

  const sync = async (
    entries: Timesheet[],
    settings: CalendarSyncSettings
  ): Promise<{ created: number; updated: number; errors: number } | null> => {
    if (!settings.enabled || !settings.syncType) {
      notifications.show({
        title: 'Ошибка',
        message: 'Синхронизация календаря не настроена',
        color: 'red',
      })
      return null
    }

    // Проверяем наличие необходимых данных
    if (settings.syncType === 'google') {
      if (!settings.googleAccessToken && !settings.googleRefreshToken) {
        notifications.show({
          title: 'Ошибка',
          message: 'Google Calendar не авторизован. Перейдите в Настройки и авторизуйте календарь.',
          color: 'red',
        })
        return null
      }
    } else if (settings.syncType === 'notion') {
      if (!settings.notionApiKey || !settings.notionDatabaseId) {
        notifications.show({
          title: 'Ошибка',
          message: 'Notion API Key или Database ID не заполнены. Проверьте настройки.',
          color: 'red',
        })
        return null
      }
      
      // Проверка доступности Electron (не блокируем, просто предупреждаем)
      const isElectron = typeof window !== 'undefined' && (
        window.electron?.isElectron || 
        (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron'))
      )
      
      if (!isElectron) {
        console.warn('Notion sync: Electron not detected, CORS may fail')
        // Не блокируем синхронизацию, просто предупреждаем
        // В Electron приложении это должно работать через IPC
        notifications.show({
          title: 'Предупреждение',
          message: 'Синхронизация с Notion может не работать в браузере из-за CORS. Убедитесь, что используете Electron версию.',
          color: 'yellow',
          autoClose: 5000,
        })
      }
    }

    try {
      setSyncing(true)

      notifications.show({
        title: 'Синхронизация начата',
        message: `Синхронизация с ${settings.syncType === 'notion' ? 'Notion' : 'Google Calendar'}...`,
        color: 'blue',
        loading: true,
        autoClose: false,
        id: 'calendar-sync',
      })

      // Фильтруем записи по диапазону дат
      const now = dayjs()
      const pastDays = settings.syncPastDays || 30
      const futureDays = settings.syncFutureDays || 7
      const startDate = now.subtract(pastDays, 'day')
      const endDate = now.add(futureDays, 'day')

      const filteredEntries = entries.filter((entry) => {
        if (!entry.begin) return false
        const entryDate = dayjs(entry.begin)
        return entryDate.isAfter(startDate) && entryDate.isBefore(endDate)
      })

      console.log(`Синхронизация ${filteredEntries.length} записей с ${settings.syncType}`)

      const result = await syncCalendar(filteredEntries, settings)

      notifications.update({
        id: 'calendar-sync',
        title: 'Синхронизация завершена',
        message: `Создано: ${result.created}, Обновлено: ${result.updated}, Ошибок: ${result.errors}`,
        color: result.errors === 0 ? 'green' : 'yellow',
        loading: false,
        autoClose: 5000,
      })

      return result
    } catch (error) {
      notifications.update({
        id: 'calendar-sync',
        title: 'Ошибка синхронизации',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        color: 'red',
        loading: false,
        autoClose: 5000,
      })
      return null
    } finally {
      setSyncing(false)
    }
  }

  return { sync, syncing }
}

