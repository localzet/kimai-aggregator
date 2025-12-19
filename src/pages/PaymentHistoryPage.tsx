import { useState, useMemo } from 'react'
import { formatCurrency } from '@/shared/utils'
import {
  Container,
  Loader,
  Alert,
  Button,
  Group,
  Stack,
  Title,
  Text,
  Badge,
  Tabs,
  Select,
  Menu,
} from '@mantine/core'
import { IconDownload, IconHistory, IconListNumbers } from '@tabler/icons-react'
import { MantineReactTable, useMantineReactTable, MRT_ColumnDef } from 'mantine-react-table'
import { useSettings, useDashboardData, useSyncStatus } from '@/shared/hooks'
import { DataTableShared } from '@/shared/ui/table'
import { WeekData } from '@/shared/api/kimaiApi'
import dayjs from 'dayjs'

function PaymentHistoryPage() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const { weeks, loading, error, reload, syncing } = useDashboardData(settings, syncStatus)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  
  const currentStatus = syncing ? 'updating' : syncStatus.status


  // Агрегация по неделям для всех проектов
  const weeklyPayments = useMemo(() => {
    return weeks.map(week => ({
      week,
      year: week.year,
      weekNumber: week.week,
      startDate: week.startDate,
      endDate: week.endDate,
      totalAmount: week.totalAmount || 0,
      totalHours: week.totalHours || 0,
      projects: week.projectStats || [],
    }))
  }, [weeks])

  // Агрегация по периодам для проектов с периодической оплатой
  const projectPeriods = useMemo(() => {
    const periods: Record<string, {
      projectId: number
      projectName: string
      periodNumber: number
      year: number
      weeks: Array<{
        week: number
        weekKey: string
        hours: number
        amount: number
      }>
      totalHours: number
      totalAmount: number
      goalHours: number | null
    }> = {}
    
    weeks.forEach(week => {
      if (week.projectPeriodInfo && week.projectPeriodInfo.length > 0) {
        week.projectPeriodInfo.forEach(info => {
          const projectSettings = settings.projectSettings?.[info.projectId]
          // Включаем все проекты с периодами, не только enabled
          if (projectSettings && projectSettings.hasPaymentPeriods) {
            const periodKey = `${info.projectId}-${week.year}-period-${info.periodNumber}`
            
            if (!periods[periodKey]) {
              periods[periodKey] = {
                projectId: info.projectId,
                projectName: info.projectName,
                periodNumber: info.periodNumber,
                year: week.year,
                weeks: [],
                totalHours: 0,
                totalAmount: 0,
                goalHours: null,
              }
            }
            
            periods[periodKey].weeks.push({
              week: week.week,
              weekKey: week.weekKey,
              hours: info.hours,
              amount: info.weeklyAmount,
            })
            periods[periodKey].totalHours += info.hours
            periods[periodKey].totalAmount += info.weeklyAmount
            
            if (info.goalHours !== null && periods[periodKey].goalHours === null) {
              periods[periodKey].goalHours = 0
            }
            if (info.goalHours !== null) {
              periods[periodKey].goalHours! += info.goalHours
            }
          }
        })
      }
    })
    
    return periods
  }, [weeks, settings.projectSettings])

  // Получаем уникальные проекты для фильтра
  const allProjects = useMemo(() => {
    const projectsMap = new Map<number, { id: number; name: string }>()
    weeks.forEach(w => {
      if (w.projectStats) {
        w.projectStats.forEach(p => {
          if (p.id && !projectsMap.has(p.id)) {
            projectsMap.set(p.id, { id: p.id, name: p.name })
          }
        })
      }
    })
    return Array.from(projectsMap.values())
  }, [weeks])

  const filteredWeeklyPayments = useMemo(() => {
    return selectedProject
      ? weeklyPayments.map(w => ({
          ...w,
          projects: w.projects.filter(p => p.id?.toString() === selectedProject),
          totalAmount: w.projects
            .filter(p => p.id?.toString() === selectedProject)
            .reduce((sum, p) => sum + p.amount, 0),
          totalHours: w.projects
            .filter(p => p.id?.toString() === selectedProject)
            .reduce((sum, p) => sum + p.hours, 0),
        }))
      : weeklyPayments
  }, [weeklyPayments, selectedProject])

  const filteredPeriods = useMemo(() => {
    return selectedProject
      ? Object.values(projectPeriods).filter(p => p.projectId?.toString() === selectedProject)
      : Object.values(projectPeriods)
  }, [projectPeriods, selectedProject])

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

  const handleExportWeekly = () => {
    const data = filteredWeeklyPayments.map(p => ({
      'Неделя': `Неделя ${p.weekNumber}, ${p.year}`,
      'Период': `${dayjs(p.startDate).format('DD.MM.YYYY')} - ${dayjs(p.endDate).format('DD.MM.YYYY')}`,
      'Часы': p.totalHours.toFixed(2),
      'Сумма': p.totalAmount.toFixed(2),
      'Проекты': p.projects.map(pr => `${pr.name} (${pr.hours.toFixed(2)}ч, ${pr.amount.toFixed(2)}₽)`).join('; '),
    }))
    exportToCSV(data, `history-weekly-${dayjs().format('YYYY-MM-DD')}.csv`)
  }

  const handleExportPeriods = () => {
    const data = filteredPeriods.map(p => ({
      'Проект': p.projectName,
      'Период': `Период ${p.periodNumber + 1} (${p.year})`,
      'Недели': p.weeks.map(w => `Неделя ${w.week}`).join(', '),
      'Отработано (ч)': p.totalHours.toFixed(2),
      'Цель (ч)': p.goalHours !== null ? p.goalHours.toFixed(2) : '',
      'Сумма': p.totalAmount.toFixed(2),
      'Статус': p.goalHours !== null 
        ? (p.totalHours >= p.goalHours ? 'Выполнено' : `${((p.totalHours / p.goalHours) * 100).toFixed(0)}%`)
        : 'Без цели',
    }))
    exportToCSV(data, `history-periods-${dayjs().format('YYYY-MM-DD')}.csv`)
  }

  // Таблица по неделям - интерфейсы и конфиги
  interface WeeklyPaymentRow {
    id: string
    weekNumber: number
    year: number
    period: string
    totalHours: number
    totalAmount: number
    projects: Array<{ id?: number | null; name: string; hours: number; amount: number }>
  }

  const weeklyTableData = useMemo<WeeklyPaymentRow[]>(() => {
    return filteredWeeklyPayments.map((p, idx) => ({
      id: p.week.weekKey,
      weekNumber: p.weekNumber,
      year: p.year,
      period: `${dayjs(p.startDate).format('DD.MM.YYYY')} - ${dayjs(p.endDate).format('DD.MM.YYYY')}`,
      totalHours: p.totalHours,
      totalAmount: p.totalAmount,
      projects: p.projects,
    }))
  }, [filteredWeeklyPayments])

  const weeklyColumns = useMemo<MRT_ColumnDef<WeeklyPaymentRow>[]>(() => [
    {
      accessorKey: 'weekNumber',
      header: 'Неделя',
      Cell: ({ row }) => {
        const data = row.original
        return (
          <div>
            <Text fw={500}>Неделя {data.weekNumber}, {data.year}</Text>
            <Text size="sm" c="dimmed">{data.period}</Text>
          </div>
        )
      },
    },
    {
      accessorKey: 'totalHours',
      header: 'Часы',
      Cell: ({ cell }) => `${(cell.getValue() as number).toFixed(2)} ч`,
    },
    {
      accessorKey: 'totalAmount',
      header: 'Сумма',
      Cell: ({ cell }) => formatCurrency(cell.getValue() as number),
    },
    {
      accessorKey: 'projects',
      id: 'projectsColumn',
      header: 'Проекты',
      Cell: ({ cell }) => {
        const projects = cell.getValue() as WeeklyPaymentRow['projects']
        return (
          <Stack gap="xs">
            {projects.map((project, idx) => (
              <Group key={idx} gap="xs">
                <Text size="sm">{project.name}:</Text>
                <Text size="sm" fw={500}>{formatCurrency(project.amount)}</Text>
                <Text size="sm" c="dimmed">({project.hours.toFixed(2)} ч)</Text>
              </Group>
            ))}
          </Stack>
        )
      },
      enableSorting: false,
    },
  ], [])

  const weeklyTable = useMantineReactTable({
    columns: weeklyColumns,
    data: weeklyTableData,
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

  // Таблица по периодам - интерфейсы и конфиги
  interface PeriodPaymentRow {
    id: string
    projectName: string
    periodLabel: string
    weeksList: string
    totalHours: number
    goalHours: number | null
    completion: number | null
    totalAmount: number
  }

  const periodTableData = useMemo<PeriodPaymentRow[]>(() => {
    return filteredPeriods.map((p) => ({
      id: `${p.projectId}-${p.year}-period-${p.periodNumber}`,
      projectName: p.projectName,
      periodLabel: `Период ${p.periodNumber + 1} (${p.year})`,
      weeksList: p.weeks.map(w => `Неделя ${w.week}`).join(', '),
      totalHours: p.totalHours,
      goalHours: p.goalHours,
      completion: p.goalHours && p.goalHours > 0 ? (p.totalHours / p.goalHours) * 100 : null,
      totalAmount: p.totalAmount,
    }))
  }, [filteredPeriods])

  const periodColumns = useMemo<MRT_ColumnDef<PeriodPaymentRow>[]>(() => [
    {
      accessorKey: 'projectName',
      header: 'Проект',
    },
    {
      accessorKey: 'periodLabel',
      header: 'Период',
    },
    {
      accessorKey: 'weeksList',
      header: 'Недели',
      size: 200,
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
      header: 'Статус',
      Cell: ({ row }) => {
        const data = row.original
        if (data.goalHours === null) {
          return <Badge color="blue">Без цели</Badge>
        }
        if (data.totalHours >= data.goalHours) {
          return <Badge color="green">Выполнено</Badge>
        }
        return <Badge color="yellow">{data.completion?.toFixed(0)}%</Badge>
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
        <Title order={2}>История оплат</Title>
        <Group>
          <Select
            placeholder="Все проекты"
            clearable
            data={allProjects.map(p => ({ value: p.id?.toString(), label: p.name }))}
            value={selectedProject}
            onChange={setSelectedProject}
            style={{ width: 250 }}
          />
          <Menu>
            <Menu.Target>
              <Button leftSection={<IconDownload size="1rem" />} variant="light">
                Экспорт
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={handleExportWeekly}>Экспорт по неделям (CSV)</Menu.Item>
              <Menu.Item onClick={handleExportPeriods}>Экспорт по периодам (CSV)</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <Tabs defaultValue="weekly">
        <Tabs.List>
          <Tabs.Tab value="weekly">По неделям</Tabs.Tab>
          <Tabs.Tab value="periods">По периодам</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="weekly" pt="md">
          <DataTableShared.Container>
            <DataTableShared.Title
              icon={<IconHistory size={24} />}
              title="История платежей по неделям"
            />
            <DataTableShared.Content>
              {weeklyTableData.length > 0 ? (
                <MantineReactTable table={weeklyTable} />
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  Нет данных для отображения
                </Text>
              )}
            </DataTableShared.Content>
          </DataTableShared.Container>
        </Tabs.Panel>

        <Tabs.Panel value="periods" pt="md">
          <DataTableShared.Container>
            <DataTableShared.Title
              icon={<IconListNumbers size={24} />}
              title="История платежей по периодам"
            />
            <DataTableShared.Content>
              {periodTableData.length > 0 ? (
                <MantineReactTable table={periodTable} />
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  Нет данных о периодах
                </Text>
              )}
            </DataTableShared.Content>
          </DataTableShared.Container>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

export default PaymentHistoryPage

