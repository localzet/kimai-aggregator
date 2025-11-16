import { useMemo } from 'react'
import { Paper, Grid, Card, Text, Progress, Group, Badge, Stack, Title, RingProgress, Center, ThemeIcon } from '@mantine/core'
import { IconTrendingUp, IconClock, IconMoneybag, IconTarget } from '@tabler/icons-react'
import { LineChart, BarChart } from '@mantine/charts'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { WeekData } from '../services/kimaiApi'

dayjs.extend(isoWeek)

interface DashboardMetricsProps {
  weeks: WeekData[]
  ratePerMinute: number
}

function DashboardMetrics({ weeks, ratePerMinute }: DashboardMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDuration = (minutes: number) => {
    const roundedMinutes = Math.round(minutes)
    const hours = Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${hours}ч ${mins}м`
  }

  // Общая статистика
  const stats = useMemo(() => {
    const totalMinutes = weeks.reduce((sum, week) => sum + week.totalMinutes, 0)
    const totalAmount = weeks.reduce((sum, week) => sum + (week.totalAmount || 0), 0)
    const weeksCount = weeks.length
    const avgHoursPerWeek = weeksCount > 0 ? (totalMinutes / 60) / weeksCount : 0
    const avgAmountPerWeek = weeksCount > 0 ? totalAmount / weeksCount : 0
    
    // Статистика текущей недели
    const now = dayjs()
    const currentWeek = weeks.find(w => w.year === now.year() && w.week === now.isoWeek())
    const currentWeekAmount = currentWeek?.totalAmount || 0
    const currentWeekHours = currentWeek?.totalHours || 0

    return {
      totalMinutes,
      totalHours: totalMinutes / 60,
      totalAmount,
      weeksCount,
      avgHoursPerWeek,
      avgAmountPerWeek,
      currentWeekAmount,
      currentWeekHours,
    }
  }, [weeks])

  // Данные для графика тренда доходов
  const revenueChartData = useMemo(() => {
    return weeks
      .slice(-12)
      .map(week => ({
        name: `W${week.week}`,
        'Доход (руб)': week.totalAmount || 0,
        'Часы': Math.round(week.totalHours || 0),
      }))
      .reverse()
  }, [weeks])

  // Данные для графика по проектам
  const projectChartData = useMemo(() => {
    const projectsMap = new Map<string, { name: string; minutes: number; amount: number }>()
    
    weeks.forEach(week => {
      week.projectStats?.forEach(stat => {
        const key = stat.name
        const existing = projectsMap.get(key)
        if (existing) {
          existing.minutes += stat.minutes
          existing.amount += stat.amount
        } else {
          projectsMap.set(key, {
            name: stat.name,
            minutes: stat.minutes,
            amount: stat.amount,
          })
        }
      })
    })

    return Array.from(projectsMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map(item => ({
        name: item.name,
        'Доход (руб)': item.amount,
        'Часы': Math.round(item.minutes / 60),
      }))
  }, [weeks])

  // Прогноз дохода (экстраполяция на месяц/год)
  const forecast = useMemo(() => {
    if (weeks.length === 0) return { monthlyForecast: 0, yearlyForecast: 0 }
    
    const avgAmountPerWeek = stats.avgAmountPerWeek
    return {
      monthlyForecast: avgAmountPerWeek * 4.33,
      yearlyForecast: avgAmountPerWeek * 52,
    }
  }, [stats])

  return (
    <Stack gap="md">
      {/* Основные метрики */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg" radius="md">
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500} c="dimmed">Текущая неделя</Text>
              <ThemeIcon size="lg" color="blue" radius="md" variant="light">
                <IconClock style={{ width: '70%', height: '70%' }} />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="lg">{stats.currentWeekHours.toFixed(1)} ч</Text>
            <Text size="sm" c="dimmed">{formatCurrency(stats.currentWeekAmount)}</Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg" radius="md">
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500} c="dimmed">Среднее в неделю</Text>
              <ThemeIcon size="lg" color="violet" radius="md" variant="light">
                <IconTrendingUp style={{ width: '70%', height: '70%' }} />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="lg">{stats.avgHoursPerWeek.toFixed(1)} ч</Text>
            <Text size="sm" c="dimmed">{formatCurrency(stats.avgAmountPerWeek)}</Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg" radius="md">
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500} c="dimmed">Всего за период</Text>
              <ThemeIcon size="lg" color="green" radius="md" variant="light">
                <IconMoneybag style={{ width: '70%', height: '70%' }} />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="lg">{formatCurrency(stats.totalAmount)}</Text>
            <Text size="sm" c="dimmed">{stats.totalHours.toFixed(0)} часов</Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg" radius="md">
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500} c="dimmed">Месячный прогноз</Text>
              <ThemeIcon size="lg" color="cyan" radius="md" variant="light">
                <IconTarget style={{ width: '70%', height: '70%' }} />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="lg">{formatCurrency(forecast.monthlyForecast)}</Text>
            <Text size="sm" c="dimmed">На основе среднего</Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Графики */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder>
            <Title order={4} mb="md">Тренд доходов (последние 12 недель)</Title>
            {revenueChartData.length > 0 ? (
              <LineChart
                h={300}
                data={revenueChartData}
                dataKey="name"
                series={[
                  { name: 'Доход (руб)', color: 'green' },
                  { name: 'Часы', color: 'blue' },
                ]}
                yAxisProps={{ yAxisId: 'left' }}
                withDots={false}
              />
            ) : (
              <Text c="dimmed" ta="center" py="lg">Недостаточно данных для графика</Text>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder>
            <Title order={4} mb="md">Топ проектов (по доходу)</Title>
            {projectChartData.length > 0 ? (
              <BarChart
                h={300}
                data={projectChartData}
                dataKey="name"
                series={[
                  { name: 'Доход (руб)', color: 'green' },
                ]}
              />
            ) : (
              <Text c="dimmed" ta="center" py="lg">Недостаточно данных для графика</Text>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Дополнительная информация */}
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Прогнозы на основе текущего темпа</Title>
          <Badge color="cyan">Расчётное значение</Badge>
        </Group>
        
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm">Годовой прогноз дохода</Text>
              <Text fw={700} size="sm">{formatCurrency(forecast.yearlyForecast)}</Text>
            </Group>
            <Text size="xs" c="dimmed">
              При сохранении текущего среднего заработка {formatCurrency(stats.avgAmountPerWeek)} в неделю
            </Text>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm">Дополнительная статистика</Text>
              <Text fw={700} size="sm">{stats.weeksCount} недель данных</Text>
            </Group>
            <Text size="xs" c="dimmed">
              Средний доход за час: {formatCurrency((stats.totalAmount / (stats.totalHours || 1)))}/ч
            </Text>
          </Grid.Col>
        </Grid>
      </Paper>
    </Stack>
  )
}

export default DashboardMetrics
