import React, { useState, useMemo } from 'react'
import {
  Select,
  Text,
  Badge,
  Group,
} from '@mantine/core'
import { IconCurrencyDollar } from '@tabler/icons-react'
import { MantineReactTable, useMantineReactTable, MRT_ColumnDef } from 'mantine-react-table'
import dayjs from 'dayjs'
import { DataTableShared } from '../shared/ui/table'
import { WeekData } from '@/shared/api/kimaiApi'
import { Settings } from '@/shared/hooks/useSettings'

interface FinancialTableProps {
  weeks: WeekData[]
  settings: Settings
}

interface ProjectPeriod {
  projectId: number
  projectName: string
  periodNumber: number
  year: number
  weeks: WeekData[]
  totalHours: number
  totalAmount: number
  goalHours: number | null
  id: string
}

function FinancialTable({ weeks, settings }: FinancialTableProps) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)

  const weekOptions = weeks.map(week => ({
    value: week.weekKey,
    label: `Неделя ${week.week}, ${week.year} (${week.startDate.format('DD.MM')} - ${week.endDate.format('DD.MM')})`,
  }))

  const selectedWeekData = selectedWeek
    ? weeks.find(w => w.weekKey === selectedWeek)
    : weeks[0]

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

  // Агрегация периодов для всех проектов с настройками
  const projectPeriods = useMemo(() => {
    const periods: Record<string, ProjectPeriod> = {}

    weeks.forEach(week => {
      if (week.projectPeriodInfo) {
        week.projectPeriodInfo.forEach(projectInfo => {
          const { projectId, projectName, periodNumber } = projectInfo
          const periodKey = `${projectId}-${week.year}-period-${periodNumber}`

          if (!periods[periodKey]) {
            periods[periodKey] = {
              projectId,
              projectName,
              periodNumber,
              year: week.year,
              weeks: [],
              totalHours: 0,
              totalAmount: 0,
              goalHours: null,
              id: periodKey,
            }
          }

          periods[periodKey].weeks.push(week)
          periods[periodKey].totalHours += projectInfo.hours
          periods[periodKey].totalAmount += projectInfo.weeklyAmount
          if (projectInfo.goalHours !== null) {
            periods[periodKey].goalHours = (periods[periodKey].goalHours || 0) + projectInfo.goalHours
          }
        })
      }
    })

    return periods
  }, [weeks])

  // Колонки для таблицы финансов по неделям
  const weeklyColumns = useMemo<MRT_ColumnDef<typeof weeklyTableData[0]>[]>(() => [
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
      Cell: ({ cell }) => formatDuration(cell.getValue() as number),
    },
    {
      accessorKey: 'amount',
      header: 'Сумма',
      Cell: ({ cell }) => formatCurrency(cell.getValue() as number),
      sortingFn: 'basic',
    },
  ], [])

  const weeklyTableData = useMemo(() => {
    if (!selectedWeekData) return []
    return selectedWeekData.projectStats?.map((project, idx) => ({
      ...project,
      id: project.id?.toString() || idx.toString(),
    })) || []
  }, [selectedWeekData])

  const weeklyTable = useMantineReactTable({
    columns: weeklyColumns,
    data: weeklyTableData,
    getRowId: (row) => row.id?.toString() || Math.random().toString(),
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

  return (
    <DataTableShared.Container>
      <DataTableShared.Title
        icon={<IconCurrencyDollar size={24} />}
        title="Финансы по неделям"
        actions={
          <Group gap="md">
            {selectedWeekData && (
              <Text size="sm" c="dimmed">
                Всего за неделю: <strong>{formatCurrency(selectedWeekData.totalAmount || 0)}</strong>
              </Text>
            )}
            <Select
              placeholder="Выберите неделю"
              data={weekOptions}
              value={selectedWeek || weeks[0]?.weekKey || null}
              onChange={setSelectedWeek}
              style={{ width: 300 }}
            />
          </Group>
        }
      />
      <DataTableShared.Content>
        {selectedWeekData ? (
          <MantineReactTable table={weeklyTable} />
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            Выберите неделю для отображения данных
          </Text>
        )}
      </DataTableShared.Content>
    </DataTableShared.Container>
  )
}

export default FinancialTable

