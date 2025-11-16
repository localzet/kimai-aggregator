import WeekProgress from '../dashboard/components/WeekProgress'
import StatusIndicator from '../dashboard/components/StatusIndicator'
import { useSettings, useDashboardData, useSyncStatus } from '@/shared/hooks'
import { Container, Alert, Stack, Button, Group } from '@mantine/core'
import { motion } from 'motion/react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { LoadingScreen } from '@/shared/ui/loading-screen'
import { Page } from '@/shared/ui/page'

dayjs.extend(isoWeek)

const MotionStack = motion(Stack)

function DashboardPage() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const { weeks, loading, error, reload, syncing } = useDashboardData(settings, syncStatus)

  const currentStatus = syncing ? 'updating' : syncStatus.status

  if (loading) {
    return (
      <LoadingScreen />
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
    <Page title={'Главная'}>
      <MotionStack animate="visible" gap="sm" initial="hidden" variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.15
          }
        }
      }}>
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
    </Page>
  )
}

export default DashboardPage
