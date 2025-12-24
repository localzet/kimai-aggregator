/** Типы данных для ML модуля */

export interface TimesheetEntry {
  id: number;
  begin: string;
  end: string | null;
  duration: number; // минуты
  project_id: number | null;
  project_name: string;
  activity_id: number | null;
  activity_name: string;
  description?: string;
  tags?: string[];
  day_of_week: number;
  hour_of_day: number;
  week_of_year: number;
  month: number;
  year: number;
}

export interface Project {
  id: number;
  name: string;
  total_hours: number;
  avg_hours_per_week: number;
  weeks_count: number;
}

export interface ProjectStats {
  project_id: number;
  minutes: number;
  hours: number;
}

export interface WeekData {
  year: number;
  week: number;
  total_minutes: number;
  total_hours: number;
  total_amount: number;
  project_stats: ProjectStats[];
}

export interface MLInputData {
  timesheets: TimesheetEntry[];
  projects: Project[];
  weeks: WeekData[];
  settings: {
    rate_per_minute: number;
    project_settings?: Record<
      number,
      {
        enabled: boolean;
        weekly_goal_hours?: number;
        payment_period_weeks?: number;
      }
    >;
  };
  context?: {
    target_week?: number;
    target_year?: number;
    target_project_id?: number;
  };
}

export interface ForecastingOutput {
  weekly_hours: number;
  weekly_hours_by_project: Record<number, number>;
  monthly_hours: number;
  confidence: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface AnomalyOutput {
  entry_id: number;
  type: "duration" | "time" | "pattern" | "project";
  severity: "low" | "medium" | "high";
  reason: string;
  score: number;
}

export interface RecommendationOutput {
  type: "time_allocation" | "project_priority" | "schedule_optimization";
  priority: "low" | "medium" | "high";
  title: string;
  description: string;
  action_items: string[];
  expected_impact: string;
  confidence: number;
}

export interface OptimalWorkHours {
  start: number;
  end: number;
  days: number[];
}

export interface BreakRecommendations {
  optimal_break_duration: number;
  break_frequency: number;
}

export interface ProductivityOutput {
  optimal_work_hours: OptimalWorkHours;
  efficiency_by_time: Array<{
    hour: number;
    efficiency: number;
  }>;
  break_recommendations: BreakRecommendations;
}

export interface MLOutputData {
  forecasting?: ForecastingOutput;
  anomalies?: AnomalyOutput[];
  recommendations?: RecommendationOutput[];
  productivity?: ProductivityOutput;
}
