/** Клиент для ML API */

import { MLInputData, MLOutputData } from './types'
import { WeekData } from '@/shared/api/kimaiApi'
import { Settings } from '@/shared/hooks/useSettings'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

const ML_API_URL = (import.meta.env.VITE_ML_API_URL as string) || 'https://kimai-ml.zorin.cloud'

class MLService {
  constructor(private baseUrl: string) {}

  private async request<T>(endpoint: string, data: MLInputData): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ML API error: ${error}`)
    }

    return response.json()
  }

  async predict(data: MLInputData): Promise<MLOutputData> {
    return this.request<MLOutputData>('/api/predict', data)
  }

  async detectAnomalies(data: MLInputData): Promise<MLOutputData> {
    return this.request<MLOutputData>('/api/detect-anomalies', data)
  }

  async getRecommendations(data: MLInputData): Promise<MLOutputData> {
    return this.request<MLOutputData>('/api/recommendations', data)
  }

  async analyzeProductivity(data: MLInputData): Promise<MLOutputData> {
    return this.request<MLOutputData>('/api/productivity', data)
  }
}

export class MLClient {
  private service: MLService | null = null

  constructor() {
    this.service = new MLService(ML_API_URL)
  }

  /**
   * Преобразование данных из формата приложения в формат ML
   */
  preprocessData(weeks: WeekData[], settings: Settings): MLInputData {
    const timesheets: MLInputData['timesheets'] = []
    const projectsMap = new Map<number, MLInputData['projects'][0]>()

    // Извлечение данных из weeks
    for (const week of weeks) {
      for (const entry of week.entries || []) {
        const begin = dayjs(entry.begin)
        const project = typeof entry.project === 'object' ? entry.project : null
        const activity = typeof entry.activity === 'object' ? entry.activity : null

        timesheets.push({
          id: entry.id,
          begin: entry.begin,
          end: entry.end || null,
          duration: entry.duration || 0,
          project_id: project?.id || null,
          project_name: project?.name || 'Unknown',
          activity_id: activity?.id || null,
          activity_name: activity?.name || 'Unknown',
          description: entry.description,
          tags: entry.tags || [],
          day_of_week: begin.day(),
          hour_of_day: begin.hour(),
          week_of_year: begin.isoWeek(),
          month: begin.month() + 1,
          year: begin.year(),
        })

        // Собираем проекты
        if (project && !projectsMap.has(project.id)) {
          const stats = week.projectStats?.find((p) => p.id === project.id)
          projectsMap.set(project.id, {
            id: project.id,
            name: project.name,
            total_hours: stats?.hours || 0,
            avg_hours_per_week: stats?.hours || 0,
            weeks_count: 1,
          })
        }
      }
    }

    // Агрегируем статистику по проектам
    const projects: any[] = []
    for (const week of weeks) {
      for (const stat of week.projectStats || []) {
        const existing = projects.find((p) => p.id === stat.id)
        if (existing) {
          existing.total_hours += stat.hours
          existing.weeks_count += 1
        } else if (stat.id) {
          projects.push({
            id: stat.id,
            name: stat.name,
            total_hours: stat.hours,
            avg_hours_per_week: stat.hours,
            weeks_count: 1,
          })
        }
      }
    }

    // Вычисляем средние значения
    for (const project of projects) {
      project.avg_hours_per_week = project.total_hours / project.weeks_count
    }

    return {
      timesheets,
      projects,
      weeks: weeks.map((w) => ({
        year: w.year,
        week: w.week,
        total_minutes: w.totalMinutes,
        total_hours: w.totalHours || 0,
        total_amount: w.totalAmount || 0,
        project_stats: (w.projectStats || []).map((p) => ({
          project_id: p.id || 0,
          minutes: p.minutes,
          hours: p.hours,
        })),
      })),
      settings: {
        rate_per_minute: settings.ratePerMinute,
        project_settings: Object.entries(settings.projectSettings || {}).reduce((acc, [key, value]) => {
          acc[parseInt(key)] = {
            enabled: value.enabled,
            weekly_goal_hours: value.weeklyGoalHours,
            payment_period_weeks: value.paymentPeriodWeeks,
          }
          return acc
        }, {} as Record<number, any>),
      },
    }
  }

  async predict(weeks: WeekData[], settings: Settings): Promise<MLOutputData['forecasting']> {
    const input = this.preprocessData(weeks, settings)
    const output = await this.service!.predict(input)
    return output.forecasting
  }

  async detectAnomalies(weeks: WeekData[], settings: Settings): Promise<MLOutputData['anomalies']> {
    const input = this.preprocessData(weeks, settings)
    const output = await this.service!.detectAnomalies(input)
    return output.anomalies
  }

  async getRecommendations(weeks: WeekData[], settings: Settings): Promise<MLOutputData['recommendations']> {
    const input = this.preprocessData(weeks, settings)
    const output = await this.service!.getRecommendations(input)
    return output.recommendations
  }

  async analyzeProductivity(weeks: WeekData[], settings: Settings): Promise<MLOutputData['productivity']> {
    const input = this.preprocessData(weeks, settings)
    const output = await this.service!.analyzeProductivity(input)
    return output.productivity
  }
}

// Singleton instance
let mlClientInstance: MLClient | null = null

export function getMLClient(): MLClient {
  if (!mlClientInstance) {
    mlClientInstance = new MLClient()
  }
  return mlClientInstance
}

