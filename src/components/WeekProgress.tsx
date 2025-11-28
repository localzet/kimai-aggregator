import { Paper, Title, Stack, Text, Progress, Group, Badge, Card } from '@mantine/core'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { motion } from 'motion/react'
import { WeekData } from '@/shared/api/kimaiApi'
import { Settings } from '@/shared/hooks/useSettings'

dayjs.extend(isoWeek)

interface WeekProgressProps {
  week: WeekData
  settings: Settings
}

const MotionCard = motion.div
const MotionPaper = motion.div

function WeekProgress({ week, settings }: WeekProgressProps) {
  const formatDuration = (minutes: number) => {
    // Обработка NaN и невалидных значений
    if (!isFinite(minutes) || isNaN(minutes) || minutes < 0) {
      return '0ч 0м'
    }
    const roundedMinutes = Math.round(minutes)
    const hours = Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${hours}ч ${mins}м`
  }

  const formatCurrency = (amount: number) => {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <MotionPaper
      style={{ 
        padding: 'var(--mantine-spacing-xl)',
        opacity: isCurrentWeek() ? 1 : 0.7
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Paper p="xl" withBorder>
      <Title order={3} mb="md">
        Прогресс {isCurrentWeek() ? 'текущей' : 'последней'} недели
      </Title>
      
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Неделя {week.week}, {week.year}
          </Text>
          <Text size="sm" c="dimmed">
            {(dayjs.isDayjs(week.startDate) ? week.startDate : dayjs(week.startDate)).format('DD.MM')} - {(dayjs.isDayjs(week.endDate) ? week.endDate : dayjs(week.endDate)).format('DD.MM')}
          </Text>
        </Group>

        <MotionCard variants={cardVariants}>
          <Card withBorder p="md">
            <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Всего отработано (включая исключённые):</Text>
              <Text fw={700} size="lg">{formatDuration(week.rawTotalMinutes ?? week.totalMinutes)}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Оплачиваемые часы:</Text>
              <Text fw={700} size="lg">{week.totalHours?.toFixed(2)} ч</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Сумма за неделю:</Text>
              <Text fw={700} size="lg" c="green">{formatCurrency(week.totalAmount || 0)}</Text>
            </Group>
            {(() => {
              const excludedCount = week.entries ? week.entries.filter(e => e.isExcluded).length : 0
              if (excludedCount > 0) {
                return (
                  <Group justify="space-between">
                    <Text c="dimmed">Исключено из расчёта: {excludedCount} записей</Text>
                    <Text c="dimmed">(они видны в таблице, но не учитываются для финсов и прогресса)</Text>
                  </Group>
                )
              }
              return null
            })()}
                  </Stack>
                  </Card>
                </MotionCard>

        {week.projectPeriodInfo && week.projectPeriodInfo.length > 0 && (
          <Stack gap="md">
            {week.projectPeriodInfo.map((projectInfo, index) => {
              const progressPercent = projectInfo.goalHours !== null 
                ? Math.min(100, (projectInfo.hours / projectInfo.goalHours) * 100)
                : null
              return (
                <MotionCard
                  key={projectInfo.projectId}
                  variants={cardVariants}
                  custom={index}
                >
                  <Card withBorder p="md">
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
                          value={progressPercent || 0}
                          color={progressPercent && progressPercent >= 100 ? 'green' : progressPercent && progressPercent >= 75 ? 'yellow' : 'red'}
                          size="lg"
                          mt="sm"
                        />
                        
                        {projectInfo.remainingHours !== null && projectInfo.remainingHours !== undefined && projectInfo.remainingHours > 0 ? (
                          <Group justify="space-between" mt="sm">
                            <Text c="red" fw={500}>Осталось отработать:</Text>
                            <Badge color="red" size="lg">
                              {formatDuration(Math.round(projectInfo.remainingHours * 60))}
                            </Badge>
                          </Group>
                        ) : projectInfo.overGoal !== null && projectInfo.overGoal !== undefined && projectInfo.overGoal > 0 ? (
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
              </MotionCard>
              )
            })}
          </Stack>
        )}
      </Stack>
      </Paper>
    </MotionPaper>
  )
}

export default WeekProgress

