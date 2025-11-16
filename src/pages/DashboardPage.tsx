import WeekProgress from '../components/WeekProgress'
import DashboardMetrics from '../components/DashboardMetrics'
import StatusIndicator from '../components/StatusIndicator'
import { useSettings, useDashboardData, useSyncStatus } from '@/shared/hooks'
import { Container, Loader, Alert, Stack, Button, Group } from '@mantine/core'
import { motion } from 'motion/react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { LoadingScreen } from '../shared/ui/loading-screen'
import { Page } from '../shared/ui/page'

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

  const upcomingWeeks = weeks.slice(0, 3)

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

        {currentWeek ? (
          <WeekProgress week={currentWeek} settings={settings} />
        ) : weeks.length > 0 ? (
          <Alert color="blue" title="Текущие данные">
            Данные за текущую неделю пока отсутствуют. Отображаются последние недели.
          </Alert>
        ) : (
          <Alert color="yellow" title="Нет данных">
            Данные еще не загружены. Пожалуйста, убедитесь, что в Kimai есть записи о времени работы.
          </Alert>
        )}

        {weeks.length > 0 && (
          <>
            <DashboardMetrics weeks={weeks} ratePerMinute={settings.ratePerMinute} />
            
            <div>
              <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Последние недели</h3>
              <MotionStack gap="sm" initial="hidden" animate="visible" variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}>
                {upcomingWeeks.map(week => (
                  <WeekProgress key={week.weekKey} week={week} settings={settings} />
                ))}
              </MotionStack>
            </div>
          </>
        )}
      </MotionStack>
    </Page>
  )
}

export default DashboardPage

