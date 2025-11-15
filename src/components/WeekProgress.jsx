import { Paper, Title, Stack, Text, Progress, Group, Badge, Card } from '@mantine/core'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

function WeekProgress({ week, settings }) {
  const formatDuration = (minutes) => {
    const roundedMinutes = Math.round(minutes)
    const hours = Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${hours}ч ${mins}м`
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const isCurrentWeek = () => {
    const now = dayjs()
    return week.year === now.year() && week.week === now.isoWeek()
  }

  if (!isCurrentWeek()) {
    return null
  }

  return (
    <Paper p="xl" withBorder>
      <Title order={3} mb="md">Прогресс текущей недели</Title>
      
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Неделя {week.week}, {week.year}
          </Text>
          <Text size="sm" c="dimmed">
            {week.startDate.format('DD.MM')} - {week.endDate.format('DD.MM')}
          </Text>
        </Group>

        <Card withBorder p="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Всего отработано:</Text>
              <Text fw={700} size="lg">{formatDuration(week.totalMinutes)}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Всего часов:</Text>
              <Text fw={700} size="lg">{week.totalHours.toFixed(2)} ч</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Сумма за неделю:</Text>
              <Text fw={700} size="lg" c="green">{formatCurrency(week.totalAmount)}</Text>
            </Group>
          </Stack>
        </Card>

        {week.projectPeriodInfo && week.projectPeriodInfo.length > 0 && (
          <Stack gap="md">
            {week.projectPeriodInfo.map((projectInfo) => {
              const progressPercent = projectInfo.goalHours !== null 
                ? Math.min(100, (projectInfo.hours / projectInfo.goalHours) * 100)
                : null
              return (
                <Card key={projectInfo.projectId} withBorder p="md">
                  <Title order={4} mb="md">{projectInfo.projectName}</Title>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text>Отработано:</Text>
                      <Text fw={500}>{projectInfo.hours.toFixed(2)} ч</Text>
                    </Group>
                    {projectInfo.goalHours !== null && (
                      <>
                        <Group justify="space-between">
                          <Text>Цель:</Text>
                          <Text fw={500}>{projectInfo.goalHours} ч</Text>
                        </Group>
                        
                        <Progress
                          value={progressPercent}
                          color={progressPercent >= 100 ? 'green' : progressPercent >= 75 ? 'yellow' : 'red'}
                          size="lg"
                          mt="sm"
                        />
                        
                        {projectInfo.remainingHours !== null && projectInfo.remainingHours > 0 ? (
                          <Group justify="space-between" mt="sm">
                            <Text c="red" fw={500}>Осталось отработать:</Text>
                            <Badge color="red" size="lg">
                              {formatDuration(Math.round(projectInfo.remainingHours * 60))}
                            </Badge>
                          </Group>
                        ) : projectInfo.overGoal !== null && projectInfo.overGoal > 0 ? (
                          <Group justify="space-between" mt="sm">
                            <Text c="green" fw={500}>Перевыполнение:</Text>
                            <Badge color="green" size="lg">
                              +{formatDuration(Math.round(projectInfo.overGoal * 60))}
                            </Badge>
                          </Group>
                        ) : null}
                      </>
                    )}
                    
                    <Group justify="space-between" mt="sm">
                      <Text>Сумма за неделю:</Text>
                      <Text fw={500} size="lg">{formatCurrency(projectInfo.weeklyAmount)}</Text>
                    </Group>
                  </Stack>
                </Card>
              )
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}

export default WeekProgress
