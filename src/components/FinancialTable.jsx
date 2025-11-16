import { useState, useMemo } from 'react'
import {
  Select,
  Stack,
  Text,
  Badge,
  Group,
  Card,
  Title,
} from '@mantine/core'
import { IconCurrencyDollar } from '@tabler/icons-react'
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table'
import dayjs from 'dayjs'
import { DataTableShared } from '../shared/ui/table'

function FinancialTable({ weeks, settings }) {
  const [selectedWeek, setSelectedWeek] = useState(null)

  const weekOptions = weeks.map(week => ({
    value: week.weekKey,
    label: `Неделя ${week.week}, ${week.year} (${week.startDate.format('DD.MM')} - ${week.endDate.format('DD.MM')})`,
  }))

  const selectedWeekData = selectedWeek
    ? weeks.find(w => w.weekKey === selectedWeek)
    : weeks[0]

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

  // Агрегация периодов для всех проектов с настройками
  const projectPeriods = {}

  weeks.forEach(week => {
    if (week.projectPeriodInfo) {
      week.projectPeriodInfo.forEach(projectInfo => {
        const { projectId, projectName, periodNumber } = projectInfo
        const periodKey = `${projectId}-${week.year}-period-${periodNumber}`

        if (!projectPeriods[periodKey]) {
          projectPeriods[periodKey] = {
            projectId,
            projectName,
            periodNumber,
            year: week.year,
            weeks: [],
            totalHours: 0,
            totalAmount: 0,
            goalHours: null,
          }
        }

        projectPeriods[periodKey].weeks.push(week)
        projectPeriods[periodKey].totalHours += projectInfo.hours
        projectPeriods[periodKey].totalAmount += projectInfo.weeklyAmount
        if (projectInfo.goalHours !== null) {
          projectPeriods[periodKey].goalHours += projectInfo.goalHours
        }
      })
    }
  })

  // Колонки для таблицы финансов по неделям
  const weeklyColumns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Проект',
    },
    {
      accessorKey: 'hours',
      header: 'Часы',
      Cell: ({ cell }) => Number(cell.getValue()).toFixed(2),
      sortingFn: 'basic',
    },
    {
      accessorKey: 'minutes',
      id: 'duration',
      header: 'Время',
      Cell: ({ cell }) => formatDuration(cell.getValue()),
    },
    {
      accessorKey: 'amount',
      header: 'Сумма',
      Cell: ({ cell }) => formatCurrency(cell.getValue()),
      sortingFn: 'basic',
    },
  ], [])

  // Колонки для таблицы агрегации по периодам
  const periodsColumns = useMemo(() => [
    {
      accessorKey: 'projectName',
      header: 'Проект',
    },
    {
      accessorKey: 'periodNumber',
      id: 'period',
      header: 'Период',
      Cell: ({ row }) => {
        const period = row.original
        return `Период ${period.periodNumber + 1} (${period.year})`
      },
    },
    {
      accessorKey: 'weeks',
      id: 'weeksList',
      header: 'Недели',
      Cell: ({ row }) => {
        const weeks = row.original.weeks
        return weeks.map(w => `Неделя ${w.week}`).join(', ')
      },
    },
    {
      accessorKey: 'totalHours',
      header: 'Отработано',
      Cell: ({ cell }) => `${Number(cell.getValue()).toFixed(2)} ч`,
      sortingFn: 'basic',
    },
    {
      accessorKey: 'goalHours',
      header: 'Цель',
      Cell: ({ row }) => {
        const goalHours = row.original.goalHours
        const totalHours = row.original.totalHours
        if (goalHours !== null) {
          return (
            <Group gap="xs">
              <Text>{goalHours} ч</Text>
              {totalHours >= goalHours && (
                <Badge color="green" size="sm">✓</Badge>
              )}
            </Group>
          )
        }
        return <Text c="dimmed">—</Text>
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Сумма',
      Cell: ({ cell }) => formatCurrency(cell.getValue()),
      sortingFn: 'basic',
    },
  ], [])

  const weeklyTableData = useMemo(() => {
    if (!selectedWeekData) return []
    return selectedWeekData.projectStats.map((project, idx) => ({
      ...project,
      id: project.id || idx,
    }))
  }, [selectedWeekData])

  const periodsTableData = useMemo(() => {
    return Object.values(projectPeriods).map((period, idx) => ({
      ...period,
      id: `${period.projectId}-${period.year}-${period.periodNumber}`,
    }))
  }, [projectPeriods])

  const weeklyTable = useMantineReactTable({
    columns: weeklyColumns,
    data: weeklyTableData,
    getRowId: (row) => row.id?.toString() || Math.random().toString(),
    enableGlobalFilter: true,
    enableSorting: true,
    enablePagination: true,
    initialState: {
      pagination: { pageSize: 50 },
      density: 'xs',
    },
    mantinePaperProps: {
      withBorder: false,
      style: { boxShadow: 'none' },
    },
    mantineTableProps: {
      striped: true,
      highlightOnHover: true,
    },
  })

  const periodsTable = useMantineReactTable({
    columns: periodsColumns,
    data: periodsTableData,
    getRowId: (row) => row.id?.toString() || Math.random().toString(),
    enableGlobalFilter: true,
    enableSorting: true,
    enablePagination: true,
    initialState: {
      pagination: { pageSize: 50 },
      density: 'xs',
    },
    mantinePaperProps: {
      withBorder: false,
      style: { boxShadow: 'none' },
    },
    mantineTableProps: {
      striped: true,
      highlightOnHover: true,
    },
  })

  return (
    <>
      <DataTableShared.Container>
        <DataTableShared.Title
          icon={<IconCurrencyDollar size={24} />}
          title="Финансы по неделям"
          actions={
            <Group gap="md">
              {selectedWeekData && (
                <Text size="sm" c="dimmed">
                  Всего за неделю: <strong>{formatCurrency(selectedWeekData.totalAmount)}</strong>
                </Text>
              )}
              <Select
                placeholder="Выберите неделю"
                data={weekOptions}
                value={selectedWeek || weeks[0]?.weekKey}
                onChange={setSelectedWeek}
                style={{ width: 300 }}
              />
            </Group>
          }
        />
        
        <DataTableShared.Content>
          {selectedWeekData ? (
            <>
              <MantineReactTable table={weeklyTable} />
              {selectedWeekData.projectPeriodInfo && selectedWeekData.projectPeriodInfo.length > 0 && (
                <Stack gap="md" mt="xl">
                  <Title order={4}>Детали по периодам</Title>
                  {selectedWeekData.projectPeriodInfo.map((projectInfo) => (
                    <Card key={projectInfo.projectId} withBorder>
                      <Title order={5} mb="sm">
                        {projectInfo.projectName} - Неделя {projectInfo.weekInPeriod} периода {projectInfo.periodNumber + 1}
                      </Title>
                      <Stack gap="xs">
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
                            {projectInfo.remainingHours !== null && (
                              <Group justify="space-between">
                                <Text>Осталось отработать:</Text>
                                <Text fw={500} c={projectInfo.remainingHours > 0 ? 'red' : 'green'}>
                                  {projectInfo.remainingHours.toFixed(2)} ч
                                </Text>
                              </Group>
                            )}
                            {projectInfo.overGoal !== null && projectInfo.overGoal > 0 && (
                              <Group justify="space-between">
                                <Text>Перевыполнение:</Text>
                                <Badge color="green">{projectInfo.overGoal.toFixed(2)} ч</Badge>
                              </Group>
                            )}
                          </>
                        )}
                        <Group justify="space-between">
                          <Text>Сумма за неделю:</Text>
                          <Text fw={500}>{formatCurrency(projectInfo.weeklyAmount)}</Text>
                        </Group>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              Выберите неделю для отображения данных
            </Text>
          )}
        </DataTableShared.Content>

      </DataTableShared.Container>

      {periodsTableData.length > 0 && (
        <DataTableShared.Container>
          <DataTableShared.Title
            icon={<IconCurrencyDollar size={24} />}
            title="Агрегация по периодам"
          />
          <DataTableShared.Content>
            <MantineReactTable table={periodsTable} />
          </DataTableShared.Content>
        </DataTableShared.Container>
      )}
    </>
  )
}

export default FinancialTable
