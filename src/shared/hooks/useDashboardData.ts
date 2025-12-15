import { useState, useEffect, useCallback, useRef } from 'react'
import { groupByWeek, calculateFinancials, WeekData, Timesheet, Project, Activity } from '@/shared/api/kimaiApi'
import { BackendApi } from '@/shared/api/backendApi'
import { WebSocketClient } from '@/shared/api/websocket'
import { db } from '@/shared/api/db'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Settings } from './useSettings'
import { type UseSyncStatusReturn } from './useSyncStatus'

dayjs.extend(isoWeek)

function processData(
  timesheetsData: Timesheet[],
  projectsData: Project[],
  activitiesData: Activity[],
  ratePerMinute: number,
  projectSettings: Settings['projectSettings'],
  excludedTags: string[] = []
): WeekData[] {
  const projectsMap: Record<string, Project> = {}
  projectsData.forEach(p => {
    projectsMap[p.id.toString()] = p
  })

  const activitiesMap: Record<string, Activity> = {}
  activitiesData.forEach(a => {
    activitiesMap[a.id.toString()] = a
  })

  // Фильтруем тайм-шиты, исключая те, которые содержат исключённые теги
  // const filteredTimesheets = timesheetsData.filter(entry => {
  //   if (!excludedTags || excludedTags.length === 0) {
  //     return true
  //   }
  //   if (!entry.tags || entry.tags.length === 0) {
  //     return true
  //   }
  //   // Проверяем, есть ли пересечение с исключёнными тегами
  //   return !entry.tags.some(tag => excludedTags.includes(tag.toLowerCase()))
  // })

  const enrichedTimesheets = timesheetsData.map(entry => {
    const projectId = typeof entry.project === 'number' ? entry.project.toString() : (entry.project as Project)?.id?.toString()
    const activityId = typeof entry.activity === 'number' ? entry.activity.toString() : (entry.activity as Activity)?.id?.toString()
    return {
      ...entry,
      project: projectId ? projectsMap[projectId] : (typeof entry.project === 'object' ? entry.project : undefined),
      activity: activityId ? activitiesMap[activityId] : (typeof entry.activity === 'object' ? entry.activity : undefined),
    }
  })

  const groupedWeeks = groupByWeek(enrichedTimesheets, excludedTags)
  const weeksWithFinancials = calculateFinancials(
    groupedWeeks,
    ratePerMinute,
    projectSettings || {},
    excludedTags
  )

  return weeksWithFinancials
}

export function useDashboardData(
  settings: Settings,
  syncStatusHook: UseSyncStatusReturn | null = null
) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [syncing, setSyncing] = useState(false)
  
  // Используем ref для хранения функций синхронизации, чтобы избежать пересоздания
  const syncStatusRef = useRef(syncStatusHook)
  useEffect(() => {
    syncStatusRef.current = syncStatusHook
  }, [syncStatusHook])

  // Используем ref для хранения актуальных настроек, чтобы избежать пересоздания функций
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // WebSocket client ref
  const wsClientRef = useRef<WebSocketClient | null>(null)

  // Загрузка данных из БД
  const loadFromCache = useCallback(async (useProcessedCache = true) => {
    try {
      await db.init()
      
      // Сначала пытаемся загрузить кэшированные обработанные недели
      if (useProcessedCache) {
        try {
          const cachedWeeks = await db.getProcessedWeeks() as WeekData[]
          if (cachedWeeks && cachedWeeks.length > 0) {
            // Сортируем данные так же, как из API (от новых к старым)
            const sortedWeeks = [...cachedWeeks].sort((a, b) => {
              if (a.year !== b.year) return b.year - a.year
              return b.week - a.week
            })
            setWeeks(sortedWeeks)
            return true
          }
        } catch (err) {
          console.warn('Error loading processed weeks cache:', err)
          // Продолжаем загрузку из сырых данных
        }
      }

      // Если кэша обработанных недель нет, загружаем сырые данные и обрабатываем
      const [cachedTimesheets, cachedProjects, cachedActivities] = await Promise.all([
        db.getTimesheets(),
        db.getProjects(),
        db.getActivities(),
      ])

      if (cachedTimesheets.length > 0 || cachedProjects.length > 0) {
        const currentSettings = settingsRef.current
        const weeksData = processData(
          cachedTimesheets || [],
          cachedProjects || [],
          cachedActivities || [],
          currentSettings.ratePerMinute,
          currentSettings.projectSettings || {},
          currentSettings.excludedTags || []
        )
        // Убеждаемся, что данные отсортированы (processData уже сортирует, но на всякий случай)
        const sortedWeeks = [...weeksData].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year
          return b.week - a.week
        })
        setWeeks(sortedWeeks)
        // Сохраняем обработанные недели в кэш
        try {
          await db.saveProcessedWeeks(sortedWeeks)
        } catch (err) {
          console.warn('Error saving processed weeks cache:', err)
        }
        return true
      }
      return false
    } catch (err) {
      console.error('Error loading from cache:', err)
      return false
    }
  }, [])

  // Обновление данных из бэкенда
  const syncFromBackend = useCallback(async (isFirstLoad = false) => {
    const currentSettings = settingsRef.current
    
    if (!currentSettings.backendUrl || !currentSettings.backendToken) {
      setError('Не настроен бэкенд')
      return
    }

    // Если forceOnline = true, игнорируем navigator.onLine и пытаемся обновить
    const isOnline = navigator.onLine
    if (!isOnline) {
      syncStatusRef.current?.setOffline?.()
      await loadFromCache()
      return
    }

    try {
      setSyncing(true)
      syncStatusRef.current?.setUpdating?.()

      await db.init()

      const backendApi = new BackendApi(currentSettings.backendUrl, currentSettings.backendToken)
      
      // Определяем период загрузки
      const endDate = dayjs()
      const startDate = isFirstLoad 
        ? endDate.subtract(3, 'year') // Первый вход: 3 года назад
        : endDate.subtract(1, 'month')  // Обычная загрузка: 1 месяц назад
      const fetchEndDate = isFirstLoad
        ? endDate.add(1, 'month')      // Первый вход: 1 месяц вперед
        : endDate.add(1, 'week')       // Обычная загрузка: 1 неделя вперед
      
      const response = await backendApi.getTimesheets(
        startDate.toISOString(),
        fetchEndDate.toISOString(),
        10000, // limit
        0 // offset
      )

      // Сохраняем данные в кэш
      await db.saveTimesheets(response.timesheets)

      // Загружаем проекты и активности из кэша (они не удаляются)
      const [cachedProjects, cachedActivities] = await Promise.all([
        db.getProjects(),
        db.getActivities(),
      ])

      // Обновляем данные
      const weeksData = processData(
        response.timesheets,
        cachedProjects || [],
        cachedActivities || [],
        currentSettings.ratePerMinute,
        currentSettings.projectSettings || {},
        currentSettings.excludedTags || []
      )
      
      const sortedWeeks = [...weeksData].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.week - a.week
      })
      setWeeks(sortedWeeks)
      
      // Сохраняем обработанные недели в кэш
      try {
        await db.saveProcessedWeeks(sortedWeeks)
      } catch (err) {
        console.warn('Error saving processed weeks cache:', err)
      }
      
      syncStatusRef.current?.setOnline?.()
    } catch (apiError) {
      console.warn('Backend request failed:', apiError)
      syncStatusRef.current?.setOffline?.()
      // Пытаемся загрузить из кэша, если API недоступен
      await loadFromCache()
    } finally {
      setSyncing(false)
    }
  }, [loadFromCache])

  // Основная функция загрузки: сначала из БД, потом из бэкенда
  const loadData = useCallback(async (isFirstLoad = false) => {
    const currentSettings = settingsRef.current
    
    if (!currentSettings.backendUrl || !currentSettings.backendToken) {
      setError('Не настроен бэкенд. Пожалуйста, войдите через MIX ID.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Сначала загружаем из кэша (быстро)
      const hasCache = await loadFromCache()
      
      // Если кэша нет, показываем загрузку
      if (!hasCache) {
        setLoading(true)
      } else {
        // Если есть кэш, показываем данные сразу
        setLoading(false)
      }

      // Затем обновляем из бэкенда в фоне
      await syncFromBackend(isFirstLoad)
    } catch (err) {
      setError((err as Error).message)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [loadFromCache, syncFromBackend])

  // Инициализация WebSocket соединения
  useEffect(() => {
    if (!settings.backendUrl || !settings.backendToken) {
      return
    }

    // Создаем и подключаем WebSocket клиент
    const wsClient = new WebSocketClient(settings.backendUrl, settings.backendToken)
    wsClientRef.current = wsClient

    wsClient.connect().then(() => {
      // Подписываемся на обновления timesheets
      wsClient.onTimesheetsUpdate(async (timesheets: Timesheet[]) => {
        // Обновляем данные при получении обновлений через WebSocket
        const currentSettings = settingsRef.current
        try {
          const [cachedProjects, cachedActivities] = await Promise.all([
            db.getProjects(),
            db.getActivities(),
          ])

          const weeksData = processData(
            timesheets,
            cachedProjects || [],
            cachedActivities || [],
            currentSettings.ratePerMinute,
            currentSettings.projectSettings || {},
            currentSettings.excludedTags || []
          )
          
          const sortedWeeks = [...weeksData].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year
            return b.week - a.week
          })
          setWeeks(sortedWeeks)
          
          // Сохраняем в кэш
          db.saveProcessedWeeks(sortedWeeks).catch(console.warn)
          db.saveTimesheets(timesheets).catch(console.warn)
        } catch (error) {
          console.error('Error processing WebSocket update:', error)
        }
      })
    }).catch((error) => {
      console.warn('WebSocket connection failed:', error)
    })

    return () => {
      wsClient.disconnect()
      wsClientRef.current = null
    }
  }, [settings.backendUrl, settings.backendToken])

  // Эффект для первоначальной загрузки и при изменении настроек
  useEffect(() => {
    const shouldLoad = !!(settings.backendUrl && settings.backendToken)
    
    if (shouldLoad) {
      // Проверяем, первый ли это вход (нет данных в кэше)
      db.init().then(async () => {
        const cached = await db.getTimesheets().catch(() => [])
        const isFirstLoad = cached.length === 0
        loadData(isFirstLoad)
      }).catch(() => {
        loadData(true) // Если ошибка, считаем первым входом
      })
    } else {
      setWeeks([])
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.backendUrl, settings.backendToken])

  // Отдельный эффект для пересчета финансовых данных при изменении ratePerMinute или projectSettings
  // Используем ref для хранения предыдущих значений, чтобы избежать лишних пересчетов
  const prevSettingsRef = useRef<{
    ratePerMinute: number
    projectSettings: Settings['projectSettings']
    excludedTags: string[]
  } | null>(null)
  
  useEffect(() => {
    const currentRate = settings.ratePerMinute
    const currentProjectSettings = settings.projectSettings || {}
    const currentExcludedTags = settings.excludedTags || []
    
    const prevSettings = prevSettingsRef.current
    
    // Проверяем, действительно ли изменились настройки
    const rateChanged = prevSettings === null || prevSettings.ratePerMinute !== currentRate
    const projectSettingsChanged = prevSettings === null || 
      JSON.stringify(prevSettings.projectSettings) !== JSON.stringify(currentProjectSettings)
    const excludedTagsChanged = prevSettings === null ||
      JSON.stringify(prevSettings.excludedTags?.sort()) !== JSON.stringify(currentExcludedTags?.sort())
    
    if (weeks.length > 0 && (rateChanged || projectSettingsChanged || excludedTagsChanged)) {
      // Обновляем ref перед пересчетом
      prevSettingsRef.current = {
        ratePerMinute: currentRate,
        projectSettings: currentProjectSettings,
        excludedTags: currentExcludedTags,
      }
      
      // Пересчитываем только финансовые данные из уже загруженных данных
      // Загружаем из кэша и пересчитываем (не используем кэш обработанных недель, так как настройки изменились)
      loadFromCache(false)
    } else if (prevSettings === null) {
      // Инициализируем ref при первой загрузке
      prevSettingsRef.current = {
        ratePerMinute: currentRate,
        projectSettings: currentProjectSettings,
        excludedTags: currentExcludedTags,
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.ratePerMinute, settings.projectSettings, settings.excludedTags, weeks.length])

  return { 
    weeks, 
    loading, 
    error, 
    syncing,
    reload: () => loadData(false), // При ручной перезагрузке не используем первый вход
  }
}
