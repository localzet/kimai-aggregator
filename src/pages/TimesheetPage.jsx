import TimesheetTable from '../components/TimesheetTable'
import StatusIndicator from '../components/StatusIndicator'
import { useSettings } from '../hooks/useSettings'
import { useDashboardData } from '../hooks/useDashboardData'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { Container, Loader, Alert, Button, Group, Stack } from '@mantine/core'

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
    <Stack gap="md">
      <Group justify="flex-end">
        <StatusIndicator status={currentStatus} lastUpdate={syncStatus.lastUpdate} />
        <Button onClick={reload} loading={loading || syncing}>
          Обновить данные
        </Button>
      </Group>
      <TimesheetTable weeks={weeks} />
    </Stack>
  )
}

export default TimesheetPage

