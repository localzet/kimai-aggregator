// Financial entity types and domain logic
export type { 
  WeekData, 
  ProjectStats, 
  ProjectPeriodInfo, 
  ProjectSettings 
} from '@/shared/api/kimaiApi'
export { calculateFinancials, groupByWeek } from '@/shared/api/kimaiApi'
