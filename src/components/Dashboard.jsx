import { useState, useEffect, useCallback } from 'react'
import { Container, Loader, Alert, Stack, Button, Group } from '@mantine/core'
import { KimaiApi, groupByWeek, calculateFinancials } from '../services/kimaiApi'
import TimesheetTable from './TimesheetTable'
import FinancialTable from './FinancialTable'
import WeekProgress from './WeekProgress'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

function Dashboard({ settings }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weeks, setWeeks] = useState([])
  const [projects, setProjects] = useState([])
  const [activities, setActivities] = useState([])

  const loadData = useCallback(async () => {
    // Проверяем наличие обязательных данных перед загрузкой
    if (!settings.apiUrl || !settings.apiKey || !settings.apiUrl.trim() || !settings.apiKey.trim()) {
      setError('Необходимо указать API URL и API Key в настройках')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const api = new KimaiApi(settings.apiUrl.trim(), settings.apiKey.trim(), settings.useProxy)
      
      // Загружаем данные за последние 8 недель
      const endDate = dayjs()
      const startDate = endDate.subtract(8, 'weeks')
      
      const [timesheetsData, projectsData, activitiesData] = await Promise.all([
        api.getTimesheets(startDate, endDate),
        api.getProjects(),
        api.getActivities(),
      ])

      // Создаем маппинг для быстрого поиска
      const projectsMap = {}
      projectsData.forEach(p => {
        projectsMap[p.id] = p
      })

      const activitiesMap = {}
      activitiesData.forEach(a => {
        activitiesMap[a.id] = a
      })

      // Обогащаем timesheets данными о проектах и активностях
      const enrichedTimesheets = timesheetsData.map(entry => ({
        ...entry,
        project: projectsMap[entry.project],
        activity: activitiesMap[entry.activity],
      }))

      const groupedWeeks = groupByWeek(enrichedTimesheets)
      const weeksWithFinancials = calculateFinancials(
        groupedWeeks,
        settings.ratePerMinute,
        settings.projectSettings || {}
      )

      setWeeks(weeksWithFinancials)
      setProjects(projectsData)
      setActivities(activitiesData)
    } catch (err) {
      setError(err.message)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [settings.apiUrl, settings.apiKey, settings.ratePerMinute, settings.projectSettings, settings.useProxy])

  useEffect(() => {
    // Загружаем данные только если есть и URL и ключ
    const hasUrl = settings.apiUrl && settings.apiUrl.trim()
    const hasKey = settings.apiKey && settings.apiKey.trim()
    
    if (hasUrl && hasKey) {
      loadData()
    } else {
      setWeeks([])
      setProjects([])
      setActivities([])
      setLoading(false)
    }
  }, [settings.apiUrl, settings.apiKey, settings.useProxy, loadData])

  if (loading) {
    return (
      <Container>
        <Loader size="lg" />
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      </Container>
    )
  }

  const currentWeek = weeks.find(w => {
    const now = dayjs()
    return w.year === now.year() && w.week === now.isoWeek()
  })

  return (
    <Stack gap="xl">
      <Group justify="flex-end">
        <Button onClick={loadData} loading={loading}>
          Обновить данные
        </Button>
      </Group>

      {currentWeek && (
        <WeekProgress week={currentWeek} settings={settings} />
      )}

      <TimesheetTable weeks={weeks} />

      <FinancialTable weeks={weeks} settings={settings} />
    </Stack>
  )
}

export default Dashboard

