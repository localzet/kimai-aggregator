import { useMemo } from 'react'
import {
  Container,
  Loader,
  Alert,
  Button,
  Group,
  Stack,
  Paper,
  Title,
  Table,
  Text,
  Badge,
  Card,
  Grid,
  Progress,
  Tabs,
  Menu,
} from '@mantine/core'
import { LineChart, BarChart } from '@mantine/charts'
import { IconDownload } from '@tabler/icons-react'
import { useSettings } from '../hooks/useSettings'
import { useDashboardData } from '../hooks/useDashboardData'
import { useSyncStatus } from '../hooks/useSyncStatus'
import StatusIndicator from '../components/StatusIndicator'
import dayjs from 'dayjs'

function StatisticsPage() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const { weeks, loading, error, reload, syncing } = useDashboardData(settings, syncStatus)

  // Все хуки должны быть вызваны до условных return
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDuration = (minutes) => {
    const roundedMinutes = Math.round(minutes)
    const hours = Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${hours}ч ${mins}м`
  }

  // Общая статистика
  const totalStats = useMemo(() => {
    const totalMinutes = weeks.reduce((sum, week) => sum + week.totalMinutes, 0)
    const totalAmount = weeks.reduce((sum, week) => sum + week.totalAmount, 0)
    const weeksCount = weeks.length
    const avgHoursPerWeek = weeksCount > 0 ? (totalMinutes / 60) / weeksCount : 0
    const avgAmountPerWeek = weeksCount > 0 ? totalAmount / weeksCount : 0
    const effectiveRatePerHour = totalMinutes > 0 ? totalAmount / (totalMinutes / 60) : 0

    return {
      totalMinutes,
      totalHours: totalMinutes / 60,
      totalAmount,
      weeksCount,
      avgHoursPerWeek,
      avgAmountPerWeek,
      effectiveRatePerHour,
    }
  }, [weeks])

  // Статистика по проектам
  const projectStats = useMemo(() => {
    const stats = {}
    weeks.forEach(week => {
      week.projectStats.forEach(project => {
        if (!stats[project.id]) {
          stats[project.id] = {
            id: project.id,
            name: project.name,
            totalMinutes: 0,
            totalHours: 0,
            totalAmount: 0,
            weeksCount: 0,
          }
        }
        stats[project.id].totalMinutes += project.minutes
        stats[project.id].totalHours += project.hours
        stats[project.id].totalAmount += project.amount
        stats[project.id].weeksCount += 1
      })
    })

    return Object.values(stats).map(project => ({
      ...project,
      avgHoursPerWeek: project.weeksCount > 0 ? project.totalHours / project.weeksCount : 0,
    }))
  }, [weeks])

  // Статистика по периодам
  const periodStats = useMemo(() => {
    const stats = {}
    weeks.forEach(week => {
      if (week.projectPeriodInfo) {
        week.projectPeriodInfo.forEach(info => {
          const key = `${info.projectId}-${week.year}-period-${info.periodNumber}`
          if (!stats[key]) {
            stats[key] = {
              projectId: info.projectId,
              projectName: info.projectName,
              periodNumber: info.periodNumber,
              year: week.year,
              totalHours: 0,
              totalAmount: 0,
              goalHours: null,
              weeksCount: 0,
            }
          }
          stats[key].totalHours += info.hours
          stats[key].totalAmount += info.weeklyAmount
          if (info.goalHours !== null) {
            if (stats[key].goalHours === null) {
              stats[key].goalHours = 0
            }
            stats[key].goalHours += info.goalHours
          }
          stats[key].weeksCount += 1
        })
      }
    })

    return Object.values(stats)
  }, [weeks, settings.projectSettings])

  // Данные для графиков
  const chartData = useMemo(() => {
    return weeks
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.week - b.week
      })
      .map(week => ({
        week: `Неделя ${week.week}`,
        weekKey: `${week.year}-W${week.week}`,
        weekLabel: `Неделя ${week.week}, ${week.year}`,
        hours: week.totalHours,
        amount: week.totalAmount,
        date: week.startDate ? dayjs(week.startDate).format('DD.MM') : '',
      }))
  }, [weeks])

  // Данные по проектам для графика
  const projectChartData = useMemo(() => {
    return projectStats.slice(0, 10).map(project => ({
      name: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name,
      hours: project.totalHours,
      amount: project.totalAmount,
    }))
  }, [projectStats])

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleExportProjects = () => {
    const data = projectStats.map(p => ({
      'Проект': p.name,
      'Недель': p.weeksCount,
      'Всего часов': p.totalHours.toFixed(2),
      'Среднее в неделю': p.avgHoursPerWeek.toFixed(2),
      'Общая сумма': p.totalAmount.toFixed(2),
      '% от общей суммы': totalStats.totalAmount > 0
        ? ((p.totalAmount / totalStats.totalAmount) * 100).toFixed(2)
        : '0',
    }))
    exportToCSV(data, `statistics-projects-${dayjs().format('YYYY-MM-DD')}.csv`)
  }

  const handleExportPeriods = () => {
    const data = periodStats.map(p => ({
      'Проект': p.projectName,
      'Период': `Период ${p.periodNumber + 1} (${p.year})`,
      'Недель': p.weeksCount,
      'Отработано (ч)': p.totalHours.toFixed(2),
      'Цель (ч)': p.goalHours > 0 ? p.goalHours.toFixed(2) : '',
      'Выполнение (%)': p.goalHours > 0
        ? ((p.totalHours / p.goalHours) * 100).toFixed(2)
        : '',
      'Сумма': p.totalAmount.toFixed(2),
    }))
    exportToCSV(data, `statistics-periods-${dayjs().format('YYYY-MM-DD')}.csv`)
  }

  // Определяем актуальный статус с учетом syncing
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
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2}>Статистика</Title>
        <Group>
          <StatusIndicator status={currentStatus} lastUpdate={syncStatus.lastUpdate} />
          <Menu>
            <Menu.Target>
              <Button leftSection={<IconDownload size="1rem" />} variant="light">
                Экспорт
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={handleExportProjects}>Экспорт по проектам (CSV)</Menu.Item>
              <Menu.Item onClick={handleExportPeriods}>Экспорт по периодам (CSV)</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button onClick={reload} loading={loading || syncing}>
            Обновить
          </Button>
        </Group>
      </Group>

      {/* Общая статистика */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder p="md">
            <Text size="sm" c="dimmed" mb="xs">Всего часов</Text>
            <Text size="xl" fw={700}>{totalStats.totalHours.toFixed(2)}</Text>
            <Text size="sm" c="dimmed" mt="xs">
              {formatDuration(totalStats.totalMinutes)}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder p="md">
            <Text size="sm" c="dimmed" mb="xs">Общая сумма</Text>
            <Text size="xl" fw={700} c="green">
              {formatCurrency(totalStats.totalAmount)}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder p="md">
            <Text size="sm" c="dimmed" mb="xs">Среднее в неделю</Text>
            <Text size="xl" fw={700}>{totalStats.avgHoursPerWeek.toFixed(2)} ч</Text>
            <Text size="sm" c="dimmed" mt="xs">
              {formatCurrency(totalStats.avgAmountPerWeek)}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder p="md">
            <Text size="sm" c="dimmed" mb="xs">Ставка за час</Text>
            <Text size="xl" fw={700}>{formatCurrency(totalStats.avgAmountPerHour)}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder p="md">
            <Text size="sm" c="dimmed" mb="xs">Период анализа</Text>
            <Text size="xl" fw={700}>{totalStats.weeksCount} недель</Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Графики */}
      <Tabs defaultValue="trends">
        <Tabs.List>
          <Tabs.Tab value="trends">Тренды</Tabs.Tab>
          <Tabs.Tab value="projects">Проекты</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="trends" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder>
                <Title order={4} mb="md">Часы по неделям</Title>
                <LineChart
                  h={300}
                  data={chartData}
                  dataKey="weekKey"
                  series={[
                    { name: 'hours', label: 'Часы', color: 'blue.6' },
                  ]}
                  curveType="natural"
                  tickLine="xy"
                  gridAxis="xy"
                />
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder>
                <Title order={4} mb="md">Сумма по неделям</Title>
                <LineChart
                  h={300}
                  data={chartData}
                  dataKey="weekKey"
                  series={[
                    { name: 'amount', label: 'Сумма (₽)', color: 'green.6' },
                  ]}
                  curveType="natural"
                  tickLine="xy"
                  gridAxis="xy"
                  valueFormatter={(value) => formatCurrency(value)}
                />
              </Paper>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="projects" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder>
                <Title order={4} mb="md">Топ проектов по часам</Title>
                <BarChart
                  h={300}
                  data={projectChartData}
                  dataKey="name"
                  series={[
                    { name: 'hours', label: 'Часы', color: 'blue.6' },
                  ]}
                  tickLine="y"
                  gridAxis="y"
                />
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder>
                <Title order={4} mb="md">Топ проектов по сумме</Title>
                <BarChart
                  h={300}
                  data={projectChartData}
                  dataKey="name"
                  series={[
                    { name: 'amount', label: 'Сумма (₽)', color: 'green.6' },
                  ]}
                  tickLine="y"
                  gridAxis="y"
                  valueFormatter={(value) => formatCurrency(value)}
                />
              </Paper>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>

      {/* Статистика по проектам */}
      <Paper p="xl" withBorder>
        <Title order={3} mb="md">Статистика по проектам</Title>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Проект</Table.Th>
              <Table.Th>Недель</Table.Th>
              <Table.Th>Всего часов</Table.Th>
              <Table.Th>Среднее в неделю</Table.Th>
              <Table.Th>Общая сумма</Table.Th>
              <Table.Th>% от общей суммы</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {projectStats.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6} style={{ textAlign: 'center' }}>
                  Нет данных
                </Table.Td>
              </Table.Tr>
            ) : (
              projectStats.map((project) => {
                const percentage = totalStats.totalAmount > 0
                  ? (project.totalAmount / totalStats.totalAmount) * 100
                  : 0
                return (
                  <Table.Tr key={project.id}>
                    <Table.Td>
                      <Text fw={500}>{project.name}</Text>
                    </Table.Td>
                    <Table.Td>{project.weeksCount}</Table.Td>
                    <Table.Td>{project.totalHours.toFixed(2)} ч</Table.Td>
                    <Table.Td>{project.avgHoursPerWeek.toFixed(2)} ч</Table.Td>
                    <Table.Td>
                      <Text fw={500}>{formatCurrency(project.totalAmount)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Progress value={percentage} size="sm" style={{ flex: 1 }} />
                        <Text size="sm" style={{ minWidth: 50 }}>
                          {percentage.toFixed(1)}%
                        </Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )
              })
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Статистика по периодам */}
      {periodStats.length > 0 && (
        <Paper p="xl" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>Статистика по периодам</Title>
            <Text size="sm" c="dimmed">
              Всего периодов: {periodStats.length}
            </Text>
          </Group>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Проект</Table.Th>
                <Table.Th>Период</Table.Th>
                <Table.Th>Недель</Table.Th>
                <Table.Th>Отработано</Table.Th>
                <Table.Th>Цель</Table.Th>
                <Table.Th>Выполнение</Table.Th>
                <Table.Th>Сумма</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {periodStats
                .sort((a, b) => {
                  if (a.year !== b.year) return b.year - a.year
                  if (a.periodNumber !== b.periodNumber) return b.periodNumber - a.periodNumber
                  return a.projectName.localeCompare(b.projectName)
                })
                .map((period, idx) => {
                  const completion = period.goalHours > 0
                    ? (period.totalHours / period.goalHours) * 100
                    : null
                  return (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Text fw={500}>{period.projectName}</Text>
                      </Table.Td>
                      <Table.Td>
                        Период {period.periodNumber + 1} ({period.year})
                      </Table.Td>
                      <Table.Td>{period.weeksCount}</Table.Td>
                      <Table.Td>{period.totalHours.toFixed(2)} ч</Table.Td>
                      <Table.Td>
                        {period.goalHours > 0 ? (
                          `${period.goalHours.toFixed(2)} ч`
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {completion !== null ? (
                          <Group gap="xs">
                            <Progress value={Math.min(100, completion)} size="sm" style={{ flex: 1 }} />
                            <Text size="sm" style={{ minWidth: 50 }}>
                              {completion.toFixed(0)}%
                            </Text>
                            {completion >= 100 && (
                              <Badge color="green" size="sm">✓</Badge>
                            )}
                          </Group>
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{formatCurrency(period.totalAmount)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  )
}

export default StatisticsPage

