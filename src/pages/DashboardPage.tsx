import WeekProgress from '../components/WeekProgress'
import StatusIndicator from '../components/StatusIndicator'
import { useSettings } from '../hooks/useSettings'
import { useDashboardData } from '../hooks/useDashboardData'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { Container, Loader, Alert, Stack, Button, Group } from '@mantine/core'
import { motion } from 'motion/react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

const MotionStack = motion(Stack)

function DashboardPage() {
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

  const currentWeek = weeks.find(w => {
    const now = dayjs()
    return w.year === now.year() && w.week === now.isoWeek()
  })

  return (
    <MotionStack
      gap="xl"
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
      {currentWeek && (
        <WeekProgress week={currentWeek} settings={settings} />
      )}
    </MotionStack>
  )
}

export default DashboardPage

