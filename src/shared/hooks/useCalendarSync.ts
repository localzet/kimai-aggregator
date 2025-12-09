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

    try {
      setSyncing(true)

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

      const result = await syncCalendar(filteredEntries, settings)

      notifications.show({
        title: 'Синхронизация завершена',
        message: `Создано: ${result.created}, Обновлено: ${result.updated}, Ошибок: ${result.errors}`,
        color: result.errors === 0 ? 'green' : 'yellow',
      })

      return result
    } catch (error) {
      notifications.show({
        title: 'Ошибка синхронизации',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        color: 'red',
      })
      return null
    } finally {
      setSyncing(false)
    }
  }

  return { sync, syncing }
}

