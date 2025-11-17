import dayjs, { Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear'

dayjs.extend(isoWeek)
dayjs.extend(weekOfYear)
dayjs.extend(isoWeeksInYear)

export interface Timesheet {
  id: number
  begin: string
  end: string
  project?: number | Project
  activity?: number | Activity
  description?: string
  duration?: number
  date?: Dayjs
  tags?: string[]
  metaFields?: Record<string, unknown>
}

export interface Project {
  id: number
  name: string
  [key: string]: unknown
}

export interface Activity {
  id: number
  name: string
  [key: string]: unknown
}

export interface WeekData {
  weekKey: string
  year: number
  week: number
  startDate: Dayjs
  endDate: Dayjs
  entries: Timesheet[]
  totalMinutes: number
  totalHours?: number
  totalAmount?: number
  projectStats?: ProjectStats[]
  projectPeriodInfo?: ProjectPeriodInfo[]
}

export interface ProjectStats {
  id: number | null
  name: string
  minutes: number
  hours: number
  amount: number
}

export interface ProjectPeriodInfo {
  projectId: number
  projectName: string
  periodNumber: number
  weekInPeriod: number
  minutes: number
  hours: number
  goalHours: number | null
  weeklyAmount: number
  remainingHours?: number | null
  overGoal?: number | null
}

export interface ProjectSettings {
  [projectId: number]: {
    enabled: boolean
    hasWeeklyGoal?: boolean
    weeklyGoalHours?: number
    hasPaymentPeriods?: boolean
    paymentPeriodWeeks?: number
    startWeekNumber?: number
    startYear?: number
    hasStages?: boolean
    stages?: Array<{
      name: string
      plannedHours: number
      startDate: string
      endDate: string
    }>
  }
}

export class KimaiApi {
  private apiUrl: string
  private apiKey: string
  private useProxy: boolean

  constructor(apiUrl: string, apiKey: string, useProxy = false) {
    this.apiUrl = apiUrl.replace(/\/$/, '') // убираем trailing slash
    this.apiKey = apiKey
    this.useProxy = useProxy

    // Проверяем наличие обязательных данных
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('API URL и API Key обязательны для работы с Kimai API')
    }
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    // Проверяем наличие обязательных данных перед запросом
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('API URL и API Key обязательны для работы с Kimai API')
    }

    // В dev режиме используем прокси через Vite для обхода CORS
    let url: string
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.useProxy && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      // Используем прокси только в dev режиме
      // Прокси настроен на конкретный URL в vite.config.ts
      // endpoint уже содержит /api, поэтому просто добавляем /api/proxy
      url = `/api/proxy${endpoint}`
      console.log('Using proxy, URL:', url, 'Endpoint:', endpoint)
    } else {
      url = `${this.apiUrl}${endpoint}`
      console.log('Direct request, URL:', url)
    }

    const response = await fetch(url, {
      ...options,
      headers,
      redirect: 'follow', // Следуем редиректам автоматически
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Неверный API ключ. Проверьте правильность ключа в настройках.')
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getTimesheets(startDate: Dayjs | string, endDate: Dayjs | string): Promise<Timesheet[]> {
    // API требует формат HTML5 datetime-local: YYYY-MM-DDThh:mm:ss
    const start = dayjs(startDate).format('YYYY-MM-DDTHH:mm:ss')
    const end = dayjs(endDate).format('YYYY-MM-DDTHH:mm:ss')

    const allTimesheets: Timesheet[] = []
    let page = 1
    const size = 50 // Размер страницы по умолчанию в Kimai

    while (true) {
      const endpoint = `/api/timesheets?begin=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&size=${size}&page=${page}`
      const data = await this.request(endpoint) as Timesheet[]

      if (!data || data.length === 0) {
        break
      }

      allTimesheets.push(...data)

      // Если получили меньше записей, чем размер страницы, значит это последняя страница
      if (data.length < size) {
        break
      }

      page++
    }

    return allTimesheets
  }

  async getProjects(): Promise<Project[]> {
    const allProjects: Project[] = []
    let page = 1
    const size = 50

    while (true) {
      const endpoint = `/api/projects?size=${size}&page=${page}`
      const data = await this.request(endpoint) as Project[]

      if (!data || data.length === 0) {
        break
      }

      allProjects.push(...data)

      if (data.length < size) {
        break
      }

      page++
    }

    return allProjects
  }

  async getActivities(): Promise<Activity[]> {
    const allActivities: Activity[] = []
    let page = 1
    const size = 50

    while (true) {
      const endpoint = `/api/activities?size=${size}&page=${page}`
      const data = await this.request(endpoint) as Activity[]

      if (!data || data.length === 0) {
        break
      }

      allActivities.push(...data)

      if (data.length < size) {
        break
      }

      page++
    }

    return allActivities
  }

  async getCurrentUser(): Promise<unknown> {
    return this.request('/api/users/me')
  }

  async getTags(): Promise<unknown> {
    return this.request('/api/tags')
  }
}

export function groupByWeek(timesheets: Timesheet[]): WeekData[] {
  const grouped: Record<string, WeekData> = {}

  timesheets.forEach(entry => {
    const date = dayjs(entry.begin)
    const weekKey = `${date.year()}-W${String(date.isoWeek()).padStart(2, '0')}`

    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        weekKey,
        year: date.year(),
        week: date.isoWeek(),
        startDate: date.startOf('isoWeek'),
        endDate: date.endOf('isoWeek'),
        entries: [],
        totalMinutes: 0,
      }
    }

    const begin = dayjs(entry.begin)
    const end = dayjs(entry.end)
    const duration = end.diff(begin, 'minute')

    grouped[weekKey].entries.push({
      ...entry,
      duration,
      date: begin,
    })

    grouped[weekKey].totalMinutes += duration
  })

  return Object.values(grouped).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.week - a.week
  })
}

export function calculateFinancials(
  weeks: WeekData[],
  ratePerMinute: number,
  projectSettings: ProjectSettings,
  excludedTags: string[] = []
): WeekData[] {
  return weeks.map(week => {
    const projectStats: Record<string, ProjectStats> = {}
    const projectPeriodInfo: Record<number, ProjectPeriodInfo> = {}

    week.entries.forEach(entry => {
      if (!entry.tags?.some(tag => excludedTags.includes(tag.toLowerCase()))) {
        const project = typeof entry.project === 'object' ? entry.project : null
        const projectId = project?.id
        const projectName = project?.name || 'Без проекта'
        const projectKey = projectId ? `project-${projectId}` : 'no-project'

        if (!projectStats[projectKey]) {
          projectStats[projectKey] = {
            id: projectId ?? null,
            name: projectName,
            minutes: 0,
            hours: 0,
            amount: 0,
          }
        }

        projectStats[projectKey].minutes += entry.duration || 0
        projectStats[projectKey].hours = projectStats[projectKey].minutes / 60
        projectStats[projectKey].amount = projectStats[projectKey].minutes * ratePerMinute

        // Расчет периодов для проектов с настройками
        if (projectId && projectSettings[projectId]) {
          const settings = projectSettings[projectId]
          if (settings.enabled && settings.hasPaymentPeriods && settings.paymentPeriodWeeks) {
            const weekNumber = week.week
            const weekYear = week.year

            // Итеративный расчет периода от начальной недели
            const startWeekNumber = settings.startWeekNumber || 1
            const startYear = settings.startYear || weekYear

            // Вычисляем количество недель от начала первого периода
            let weeksSinceStart = 0
            if (weekYear === startYear) {
              weeksSinceStart = weekNumber - startWeekNumber
            } else if (weekYear > startYear) {
              // Вычисляем количество недель в году начала
              const startYearWeeks = dayjs(`${startYear}-12-31`).isoWeeksInYear()
              // Недели от начала периода до конца года начала
              const weeksInStartYear = startYearWeeks - startWeekNumber + 1
              // Недели в полных годах между
              let weeksInBetweenYears = 0
              for (let y = startYear + 1; y < weekYear; y++) {
                weeksInBetweenYears += dayjs(`${y}-12-31`).isoWeeksInYear()
              }
              // Недели в текущем году до текущей недели
              weeksSinceStart = weeksInStartYear + weeksInBetweenYears + weekNumber
            } else {
              // Неделя раньше начала периода
              weeksSinceStart = weekNumber - startWeekNumber
            }

            if (weeksSinceStart >= 0) {
              const periodNumber = Math.floor(weeksSinceStart / settings.paymentPeriodWeeks)
              const weekInPeriod = weeksSinceStart % settings.paymentPeriodWeeks

              if (!projectPeriodInfo[projectId]) {
                projectPeriodInfo[projectId] = {
                  projectId,
                  projectName,
                  periodNumber,
                  weekInPeriod: weekInPeriod + 1,
                  minutes: 0,
                  hours: 0,
                  goalHours: settings.hasWeeklyGoal ? (settings.weeklyGoalHours || 0) : null,
                  weeklyAmount: 0,
                }
              }

              projectPeriodInfo[projectId].minutes += entry.duration || 0
              projectPeriodInfo[projectId].hours = projectPeriodInfo[projectId].minutes / 60
              projectPeriodInfo[projectId].weeklyAmount = projectPeriodInfo[projectId].minutes * ratePerMinute
            }
          }
        }
      }
    })

    // Вычисляем remainingHours и overGoal для каждого проекта с периодами
    Object.keys(projectPeriodInfo).forEach(projectIdStr => {
      const projectId = Number(projectIdStr)
      const info = projectPeriodInfo[projectId]
      if (info.goalHours !== null) {
        info.remainingHours = Math.max(0, info.goalHours - info.hours)
        info.overGoal = Math.max(0, info.hours - info.goalHours)
      } else {
        info.remainingHours = null
        info.overGoal = null
      }
    })

    return {
      ...week,
      totalHours: week.totalMinutes / 60,
      totalAmount: week.totalMinutes * ratePerMinute,
      projectStats: Object.values(projectStats),
      projectPeriodInfo: Object.values(projectPeriodInfo),
    }
  })
}
