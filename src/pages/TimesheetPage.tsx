import TimesheetTable from '../components/TimesheetTable'
import StatusIndicator from '../components/StatusIndicator'
import { useSettings, useDashboardData, useSyncStatus } from '@/shared/hooks'
import { Container, Loader, Alert, Button, Group, Stack } from '@mantine/core'
import { motion } from 'motion/react'

const MotionStack = motion(Stack)

function TimesheetPage() {
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
      gap="md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Group justify="flex-end">
        <StatusIndicator status={currentStatus} lastUpdate={syncStatus.lastUpdate} />
        <Button onClick={reload} loading={loading || syncing}>
          Обновить данные
        </Button>
      </Group>
      <TimesheetTable weeks={weeks} />
    </MotionStack>
  )
}

export default TimesheetPage

