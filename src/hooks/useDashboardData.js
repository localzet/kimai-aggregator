import { useState, useEffect, useCallback, useRef } from 'react'
import { KimaiApi, groupByWeek, calculateFinancials } from '../services/kimaiApi'
import { db } from '../services/db'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

function processData(timesheetsData, projectsData, activitiesData, ratePerMinute, projectSettings) {
  const projectsMap = {}
  projectsData.forEach(p => {
    projectsMap[p.id] = p
  })

  const activitiesMap = {}
  activitiesData.forEach(a => {
    activitiesMap[a.id] = a
  })

  const enrichedTimesheets = timesheetsData.map(entry => ({
    ...entry,
    project: projectsMap[entry.project],
    activity: activitiesMap[entry.activity],
  }))

  const groupedWeeks = groupByWeek(enrichedTimesheets)
  const weeksWithFinancials = calculateFinancials(
    groupedWeeks,
    ratePerMinute,
    projectSettings || {}
  )

  return weeksWithFinancials
}

export function useDashboardData(settings, syncStatusHook = null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weeks, setWeeks] = useState([])
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

  // Загрузка данных из БД
  const loadFromCache = useCallback(async () => {
    try {
      await db.init()
      const [cachedTimesheets, cachedProjects, cachedActivities] = await Promise.all([
        db.getTimesheets(null, null),
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
          currentSettings.projectSettings || {}
        )
        setWeeks(weeksData)
        return true
      }
      return false
    } catch (err) {
      console.error('Error loading from cache:', err)
      return false
    }
  }, [])

  // Обновление данных из API
  const syncFromAPI = useCallback(async (forceOnline = false) => {
    const currentSettings = settingsRef.current
    if (!currentSettings.apiUrl || !currentSettings.apiKey || !currentSettings.apiUrl.trim() || !currentSettings.apiKey.trim()) {
      return
    }

    const isOnline = navigator.onLine && !forceOnline
    if (!isOnline) {
      syncStatusRef.current?.setOffline?.()
      return
    }

    try {
      setSyncing(true)
      syncStatusRef.current?.setUpdating?.()

      await db.init()
      const endDate = dayjs()
      const startDate = endDate.subtract(2, 'year')

      const api = new KimaiApi(currentSettings.apiUrl.trim(), currentSettings.apiKey.trim(), currentSettings.useProxy)
      
      const [apiTimesheets, apiProjects, apiActivities] = await Promise.all([
        api.getTimesheets(startDate, endDate),
        api.getProjects(),
        api.getActivities(),
      ])

      // Сохраняем в кэш
      await Promise.all([
        db.saveTimesheets(apiTimesheets),
        db.saveProjects(apiProjects),
        db.saveActivities(apiActivities),
        db.saveMetadata('lastUpdate', new Date().toISOString()),
      ])

      // Обновляем данные
      const weeksData = processData(
        apiTimesheets,
        apiProjects,
        apiActivities,
        currentSettings.ratePerMinute,
        currentSettings.projectSettings || {}
      )
      setWeeks(weeksData)
      syncStatusRef.current?.setOnline?.()
    } catch (apiError) {
      console.warn('API request failed:', apiError)
      syncStatusRef.current?.setOffline?.()
      // Пытаемся загрузить из кэша, если API недоступен
      await loadFromCache()
    } finally {
      setSyncing(false)
    }
  }, [loadFromCache])

  // Основная функция загрузки: сначала из БД, потом из API
  const loadData = useCallback(async (forceOnline = false) => {
    const currentSettings = settingsRef.current
    if (!currentSettings.apiUrl || !currentSettings.apiKey || !currentSettings.apiUrl.trim() || !currentSettings.apiKey.trim()) {
      setError('Необходимо указать API URL и API Key в настройках')
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

      // Затем обновляем из API в фоне
      await syncFromAPI(forceOnline)
    } catch (err) {
      setError(err.message)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [loadFromCache, syncFromAPI])

  // Эффект для первоначальной загрузки и при изменении URL/Key
  useEffect(() => {
    const hasUrl = settings.apiUrl && settings.apiUrl.trim()
    const hasKey = settings.apiKey && settings.apiKey.trim()
    
    if (hasUrl && hasKey) {
      loadData()
    } else {
      setWeeks([])
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.apiUrl, settings.apiKey])

  // Отдельный эффект для пересчета финансовых данных при изменении ratePerMinute или projectSettings
  useEffect(() => {
    if (weeks.length > 0) {
      // Пересчитываем только финансовые данные из уже загруженных данных
      // Загружаем из кэша и пересчитываем
      loadFromCache()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.ratePerMinute, settings.projectSettings])

  return { 
    weeks, 
    loading, 
    error, 
    syncing,
    reload: () => loadData(true),
  }
}

