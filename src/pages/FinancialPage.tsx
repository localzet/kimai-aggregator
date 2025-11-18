import { Stack } from '@mantine/core'
import { motion } from 'motion/react'
import FinancialTable from '../components/FinancialTable'
import { FinancialMetrics } from '../components/FinancialMetrics'
import ReportGenerator from '../components/ReportGenerator'
import StatusIndicator from '../components/StatusIndicator'
import { useSettings, useDashboardData, useSyncStatus } from '@/shared/hooks'
import { Container, Loader, Alert, Button, Group } from '@mantine/core'

const MotionStack = motion(Stack)

function FinancialPage() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const { weeks, loading, error, reload, syncing } = useDashboardData(settings, syncStatus)
  
  const currentStatus = syncing ? 'updating' : syncStatus.status

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

  return (
    <MotionStack
      gap="xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Group justify="flex-end">
        <ReportGenerator weeks={weeks} settings={settings} />
        <StatusIndicator 
          status={currentStatus} 
          lastUpdate={syncStatus.lastUpdate}
          onRefresh={reload}
          loading={syncing}
        />
      </Group>

      <FinancialMetrics weeks={weeks} isLoading={loading || syncing} />
      
      <FinancialTable weeks={weeks} settings={settings} />
    </MotionStack>
  )
}

export default FinancialPage
