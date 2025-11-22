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
  Text,
  Badge,
  Card,
  Grid,
  Progress,
  Tabs,
  Menu,
} from '@mantine/core'
import { LineChart, BarChart } from '@mantine/charts'
import { IconDownload, IconChartBar, IconListNumbers } from '@tabler/icons-react'
import { MantineReactTable, useMantineReactTable, MRT_ColumnDef } from 'mantine-react-table'
import { useSettings, useDashboardData, useSyncStatus } from '@/shared/hooks'
import { DataTableShared } from '@/shared/ui/table'
import dayjs from 'dayjs'

function StatisticsPage() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const { weeks, loading, error, reload, syncing } = useDashboardData(settings, syncStatus)

  // Общая статистика
  const totalStats = useMemo(() => {
    const totalMinutes = weeks.reduce((sum, week) => sum + week.totalMinutes, 0)
    const totalAmount = weeks.reduce((sum, week) => sum + (week.totalAmount || 0), 0)
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
    const stats: Record<number, {
      id: number | null
      name: string
      totalMinutes: number
      totalHours: number
      totalAmount: number
      weeksCount: number
    }> = {}
    
    weeks.forEach(week => {
      week.projectStats?.forEach(project => {
        if (project.id && !stats[project.id]) {
          stats[project.id] = {
            id: project.id,
            name: project.name,
            totalMinutes: 0,
            totalHours: 0,
            totalAmount: 0,
            weeksCount: 0,
          }
        }
        if (project.id) {
          stats[project.id].totalMinutes += project.minutes
          stats[project.id].totalHours += project.hours
          stats[project.id].totalAmount += project.amount
          stats[project.id].weeksCount += 1
        }
      })
    })

    return Object.values(stats).map(project => ({
      ...project,
      avgHoursPerWeek: project.weeksCount > 0 ? project.totalHours / project.weeksCount : 0,
    }))
  }, [weeks])

  // Статистика по периодам
  const periodStats = useMemo(() => {
    const stats: Record<string, {
      projectId: number
      projectName: string
      periodNumber: number
      year: number
      totalHours: number
      totalAmount: number
      goalHours: number | null
      weeksCount: number
    }> = {}
    
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
        hours: week.totalHours || 0,
        amount: week.totalAmount || 0,
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

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
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
      'Цель (ч)': p.goalHours && p.goalHours > 0 ? p.goalHours.toFixed(2) : '',
      'Выполнение (%)': p.goalHours && p.goalHours > 0
        ? ((p.totalHours / p.goalHours) * 100).toFixed(2)
        : '',
      'Сумма': p.totalAmount.toFixed(2),
    }))
    exportToCSV(data, `statistics-periods-${dayjs().format('YYYY-MM-DD')}.csv`)
  }

  // Определяем актуальный статус с учетом syncing
  const currentStatus = syncing ? 'updating' : syncStatus.status

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Таблица проектов
  interface ProjectStatsRow {
    id: number | null
    name: string
    weeksCount: number
    totalHours: number
    avgHoursPerWeek: number
    totalAmount: number
    percentageAmount: number
  }

  const projectTableData = useMemo<ProjectStatsRow[]>(() => {
    return projectStats.map(p => ({
      id: p.id,
      name: p.name,
      weeksCount: p.weeksCount,
      totalHours: p.totalHours,
      avgHoursPerWeek: p.avgHoursPerWeek,
      totalAmount: p.totalAmount,
      percentageAmount: totalStats.totalAmount > 0 ? (p.totalAmount / totalStats.totalAmount) * 100 : 0,
    }))
  }, [projectStats, totalStats.totalAmount])

  const projectColumns = useMemo<MRT_ColumnDef<ProjectStatsRow>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Проект',
    },
    {
      accessorKey: 'weeksCount',
      header: 'Недель',
      Cell: ({ cell }) => <Text>{String(cell.getValue())}</Text>,
    },
    {
      accessorKey: 'totalHours',
      header: 'Всего часов',
      Cell: ({ cell }) => `${(cell.getValue() as number).toFixed(2)} ч`,
    },
    {
      accessorKey: 'avgHoursPerWeek',
      header: 'Среднее в неделю',
      Cell: ({ cell }) => `${(cell.getValue() as number).toFixed(2)} ч`,
    },
    {
      accessorKey: 'totalAmount',
      header: 'Общая сумма',
      Cell: ({ cell }) => formatCurrency(cell.getValue() as number),
    },
    {
      accessorKey: 'percentageAmount',
      header: '% от общей суммы',
      Cell: ({ cell }) => {
        const percentage = cell.getValue() as number
        return (
          <Group gap="xs" wrap="nowrap">
            <Progress value={percentage} size="sm" style={{ flex: 1, minWidth: 100 }} />
            <Text size="sm" style={{ minWidth: 50 }}>
              {percentage.toFixed(1)}%
            </Text>
          </Group>
        )
      },
    },
  ], [])

  const projectTable = useMantineReactTable({
    columns: projectColumns,
    data: projectTableData,
    getRowId: (row) => (row.id ?? Math.random()).toString(),
    enableGlobalFilter: true,
    enableSorting: true,
    enableSortingRemoval: true,
    enablePagination: true,
    enableColumnResizing: true,
    enableFullScreenToggle: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 25 },
      density: 'xs',
    },
    mantinePaperProps: {
      style: { '--paper-radius': 'var(--mantine-radius-xs)' } as React.CSSProperties,
      withBorder: false,
    },
    mantineTableProps: {
      striped: true,
      highlightOnHover: true,
    },
  })

  // Таблица периодов
  interface PeriodStatsRow {
    id: string
    projectName: string
    periodLabel: string
    weeksCount: number
    totalHours: number
    goalHours: number | null
    completion: number | null
    totalAmount: number
  }

  const periodTableData = useMemo<PeriodStatsRow[]>(() => {
    return periodStats.map((p, idx) => ({
      id: `${p.projectId}-${p.year}-period-${p.periodNumber}`,
      projectName: p.projectName,
      periodLabel: `Период ${p.periodNumber + 1} (${p.year})`,
      weeksCount: p.weeksCount,
      totalHours: p.totalHours,
      goalHours: p.goalHours,
      completion: p.goalHours && p.goalHours > 0 ? (p.totalHours / p.goalHours) * 100 : null,
      totalAmount: p.totalAmount,
    }))
  }, [periodStats])

  const periodColumns = useMemo<MRT_ColumnDef<PeriodStatsRow>[]>(() => [
    {
      accessorKey: 'projectName',
      header: 'Проект',
    },
    {
      accessorKey: 'periodLabel',
      header: 'Период',
    },
    {
      accessorKey: 'weeksCount',
      header: 'Недель',
    },
    {
      accessorKey: 'totalHours',
      header: 'Отработано',
      Cell: ({ cell }) => `${(cell.getValue() as number).toFixed(2)} ч`,
    },
    {
      accessorKey: 'goalHours',
      header: 'Цель',
      Cell: ({ cell }) => {
        const goal = cell.getValue() as number | null
        return goal !== null ? `${goal.toFixed(2)} ч` : <Text c="dimmed">—</Text>
      },
    },
    {
      accessorKey: 'completion',
      header: 'Выполнение',
      Cell: ({ row }) => {
        const completion = row.original.completion
        if (completion === null) return <Text c="dimmed">—</Text>
        return (
          <Group gap="xs" wrap="nowrap">
            <Progress value={Math.min(100, completion)} size="sm" style={{ flex: 1, minWidth: 100 }} />
            <Text size="sm" style={{ minWidth: 50 }}>
              {completion.toFixed(0)}%
            </Text>
            {completion >= 100 && <Badge color="green" size="sm">✓</Badge>}
          </Group>
        )
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Сумма',
      Cell: ({ cell }) => formatCurrency(cell.getValue() as number),
    },
  ], [])

  const periodTable = useMantineReactTable({
    columns: periodColumns,
    data: periodTableData,
    getRowId: (row) => row.id,
    enableGlobalFilter: true,
    enableSorting: true,
    enableSortingRemoval: true,
    enablePagination: true,
    enableColumnResizing: true,
    enableFullScreenToggle: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 25 },
      density: 'xs',
    },
    mantinePaperProps: {
      style: { '--paper-radius': 'var(--mantine-radius-xs)' } as React.CSSProperties,
      withBorder: false,
    },
    mantineTableProps: {
      striped: true,
      highlightOnHover: true,
    },
  })

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
      <Group justify="space-between">
        <Title order={2}>Статистика</Title>
        <Group>
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
        </Group>
      </Group>

      {/* Общая статистика */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder p="md">
            <Text size="sm" c="dimmed" mb="xs">Всего часов</Text>
            <Text size="xl" fw={700}>{totalStats.totalHours.toFixed(2)}</Text>
            <Text size="sm" c="dimmed" mt="xs">
              {Math.floor(totalStats.totalMinutes / 60)}ч {Math.round(totalStats.totalMinutes % 60)}м
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
            <Text size="xl" fw={700}>{formatCurrency(settings.ratePerMinute * 60)}</Text>
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
                    { name: 'hours', label: 'Часы', color: 'cyan.6' },
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
                    { name: 'amount', label: 'Сумма (₽)', color: 'cyan.5' },
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
                    { name: 'hours', label: 'Часы', color: 'cyan.6' },
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
                    { name: 'amount', label: 'Сумма (₽)', color: 'cyan.5' },
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
      <DataTableShared.Container>
        <DataTableShared.Title
          icon={<IconChartBar size={24} />}
          title="Статистика по проектам"
          description={`Всего проектов: ${projectStats.length}`}
        />
        <DataTableShared.Content>
          <MantineReactTable table={projectTable} />
        </DataTableShared.Content>
      </DataTableShared.Container>

      {/* Статистика по периодам */}
      {periodStats.length > 0 && (
        <DataTableShared.Container>
          <DataTableShared.Title
            icon={<IconListNumbers size={24} />}
            title="Статистика по периодам"
            description={`Всего периодов: ${periodStats.length}`}
          />
          <DataTableShared.Content>
            <MantineReactTable table={periodTable} />
          </DataTableShared.Content>
        </DataTableShared.Container>
      )}
    </Stack>
  )
}

export default StatisticsPage

