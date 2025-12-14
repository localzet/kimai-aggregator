/** Типы данных для ML модуля */

export interface TimesheetEntry {
  id: number
  begin: string
  end: string | null
  duration: number // минуты
  projectId: number | null
  projectName: string
  activityId: number | null
  activityName: string
  description?: string
  tags?: string[]
  dayOfWeek: number
  hourOfDay: number
  weekOfYear: number
  month: number
  year: number
}

export interface Project {
  id: number
  name: string
  totalHours: number
  avgHoursPerWeek: number
  weeksCount: number
}

export interface ProjectStats {
  projectId: number
  minutes: number
  hours: number
}

export interface WeekData {
  year: number
  week: number
  totalMinutes: number
  totalHours: number
  totalAmount: number
  projectStats: ProjectStats[]
}

export interface MLInputData {
  timesheets: TimesheetEntry[]
  projects: Project[]
  weeks: WeekData[]
  settings: {
    ratePerMinute: number
    projectSettings?: Record<number, {
      enabled: boolean
      weeklyGoalHours?: number
      paymentPeriodWeeks?: number
    }>
  }
  context?: {
    targetWeek?: number
    targetYear?: number
    targetProjectId?: number
  }
}

export interface ForecastingOutput {
  weeklyHours: number
  weeklyHoursByProject: Record<number, number>
  monthlyHours: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface AnomalyOutput {
  entryId: number
  type: 'duration' | 'time' | 'pattern' | 'project'
  severity: 'low' | 'medium' | 'high'
  reason: string
  score: number
}

export interface RecommendationOutput {
  type: 'time_allocation' | 'project_priority' | 'schedule_optimization'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  actionItems: string[]
  expectedImpact: string
  confidence: number
}

export interface OptimalWorkHours {
  start: number
  end: number
  days: number[]
}

export interface BreakRecommendations {
  optimalBreakDuration: number
  breakFrequency: number
}

export interface ProductivityOutput {
  optimalWorkHours: OptimalWorkHours
  efficiencyByTime: Array<{
    hour: number
    efficiency: number
  }>
  breakRecommendations: BreakRecommendations
}

export interface MLOutputData {
  forecasting?: ForecastingOutput
  anomalies?: AnomalyOutput[]
  recommendations?: RecommendationOutput[]
  productivity?: ProductivityOutput
}

