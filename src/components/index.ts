/**
 * Components Barrel Export
 * 
 * Централизованный экспорт всех компонентов для удобного импорта.
 * Компоненты постепенно перемещаются в features/ и widgets/.
 */

// Dashboard components
export { default as WeekProgress } from './WeekProgress'
export { default as DashboardMetrics } from './DashboardMetrics'

// Financial components
export { default as FinancialTable } from './FinancialTable'
export { FinancialMetrics } from './FinancialMetrics'
export { default as ReportGenerator } from './ReportGenerator'

// Timesheet components
export { default as TimesheetTable } from './TimesheetTable'

// Settings components
export { default as SettingsForm } from './SettingsForm'
export { default as ProjectSettingsForm } from './ProjectSettingsForm'
export { default as CalendarSyncSettings } from './CalendarSyncSettings'
export { default as SetupWizard } from './SetupWizard'

// Other components
export { default as MLInsights } from './MLInsights'
export { default as StatusIndicator } from './StatusIndicator'
export { default as loading-screen } from './loading-screen'

