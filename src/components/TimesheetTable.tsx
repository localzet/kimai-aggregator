import React, { useState, useMemo } from 'react'
import {
  Select,
  Text,
  Group,
} from '@mantine/core'
import { IconTable } from '@tabler/icons-react'
import { MantineReactTable, useMantineReactTable, MRT_ColumnDef } from 'mantine-react-table'
import dayjs from 'dayjs'
import { DataTableShared } from '../shared/ui/table'
import { WeekData, Timesheet } from '../services/kimaiApi'

interface TimesheetTableProps {
  weeks: WeekData[]
}

interface TimesheetRow extends Timesheet {
  id: string | number
}

export default function TimesheetTable({ weeks }: TimesheetTableProps) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)

  const weekOptions = weeks.map(week => ({
    value: week.weekKey,
    label: `Неделя ${week.week}, ${week.year} (${week.startDate.format('DD.MM')} - ${week.endDate.format('DD.MM')})`,
  }))

  const selectedWeekData = selectedWeek
    ? weeks.find(w => w.weekKey === selectedWeek)
    : weeks[0]

  const formatDuration = (minutes: number) => {
    const roundedMinutes = Math.round(minutes)
    const hours = Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${hours}ч ${mins}м`
  }

  const columns = useMemo<MRT_ColumnDef<TimesheetRow>[]>(() => [
    {
      accessorKey: 'begin',
      header: 'Дата',
      Cell: ({ cell }) => dayjs(cell.getValue() as string).format('DD.MM.YYYY'),
      sortingFn: 'datetime',
    },
    {
      accessorFn: (row) => {
        const project = typeof row.project === 'object' ? row.project : null
        return project?.name || ''
      },
      id: 'project',
      header: 'Проект',
      Cell: ({ row }) => {
        const project = typeof row.original.project === 'object' ? row.original.project : null
        const projectName = project?.name
        return projectName ? <Text>{projectName}</Text> : <Text c="dimmed">Без проекта</Text>
      },
    },
    {
      accessorFn: (row) => {
        const activity = typeof row.activity === 'object' ? row.activity : null
        return activity?.name || ''
      },
      id: 'activity',
      header: 'Задача',
      Cell: ({ row }) => {
        const activity = typeof row.original.activity === 'object' ? row.original.activity : null
        const activityName = activity?.name
        return activityName ? <Text>{activityName}</Text> : <Text c="dimmed">Без задачи</Text>
      },
    },
    {
      accessorKey: 'begin',
      id: 'startTime',
      header: 'Время начала',
      Cell: ({ cell }) => dayjs(cell.getValue() as string).format('HH:mm'),
    },
    {
      accessorKey: 'end',
      id: 'endTime',
      header: 'Время окончания',
      Cell: ({ cell }) => dayjs(cell.getValue() as string).format('HH:mm'),
    },
    {
      accessorKey: 'duration',
      header: 'Длительность',
      Cell: ({ cell }) => formatDuration(cell.getValue() as number),
      sortingFn: 'basic',
    },
    {
      accessorKey: 'description',
      header: 'Описание',
      Cell: ({ cell }) => {
        const desc = cell.getValue() as string | undefined
        return desc ? <Text>{desc}</Text> : <Text c="dimmed">—</Text>
      },
    },
  ], [])

  const tableData = useMemo<TimesheetRow[]>(() => {
    if (!selectedWeekData) return []
    return selectedWeekData.entries.map((entry, idx) => ({
      ...entry,
      id: entry.id || idx,
    }))
  }, [selectedWeekData])

  const table = useMantineReactTable({
    columns,
    data: tableData,
    getRowId: (row) => row.id?.toString() || Math.random().toString(),
    enableGlobalFilter: true,
    enableSorting: true,
    enableSortingRemoval: true,
    enablePagination: true,
    enableColumnResizing: true,
    enableFullScreenToggle: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 50 },
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
        icon={<IconTable size={24} />}
        title="Таблица времени"
        actions={
          <Group gap="md">
            {selectedWeekData && (
              <>
                <Text size="sm" c="dimmed">
                  Всего времени: <strong>{formatDuration(selectedWeekData.totalMinutes)}</strong>
                </Text>
                <Text size="sm" c="dimmed">
                  Всего часов: <strong>{selectedWeekData.totalHours?.toFixed(2) || '0.00'}</strong>
                </Text>
              </>
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
          <MantineReactTable table={table} />
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            Выберите неделю для отображения данных
          </Text>
        )}
      </DataTableShared.Content>
    </DataTableShared.Container>
  )
}

