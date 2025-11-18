import React, { useState, useMemo } from 'react'
import {
  Select,
  Text,
  Group,
  Switch,
} from '@mantine/core'
import { IconTable, IconAlertCircle } from '@tabler/icons-react'
import { MantineReactTable, useMantineReactTable, MRT_ColumnDef } from 'mantine-react-table'
import dayjs from 'dayjs'
import { DataTableShared } from '@/shared/ui/table'
import { WeekData, Timesheet } from '@/shared/api/kimaiApi'

interface TimesheetTableProps {
  weeks: WeekData[]
}

interface TimesheetRow extends Omit<Timesheet, 'id'> {
  id: string | number
}

export default function TimesheetTable({ weeks }: TimesheetTableProps) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [showExcluded, setShowExcluded] = useState<boolean>(true)

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
      size: 200,
      mantineTableBodyCellProps: {
        style: {
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        },
      },
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
      size: 300,
      mantineTableBodyCellProps: {
        style: {
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        },
      },
      Cell: ({ row }) => {
        const activity = typeof row.original.activity === 'object' ? row.original.activity : null
        const activityName = activity?.name
        return activityName ? <Text>{activityName}</Text> : <Text c="dimmed">Без задачи</Text>
      },
      columnDefType: 'data',
      enableHiding: true,
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
      size: 300,
      grow: true,
      mantineTableBodyCellProps: {
        style: {
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        },
      },
      Cell: ({ cell }) => {
        const desc = cell.getValue() as string | undefined
        return desc ? <Text>{desc}</Text> : <Text c="dimmed">—</Text>
      },
    },
    {
      accessorFn: (row) => row.tags?.join(', ') || '',
      id: 'tags',
      size: 250,
      header: 'Теги',
      Cell: ({ row }) => {
        const tags = row.original.tags
        return tags && tags.length > 0
          ? <Text>{tags.join(', ')}</Text>
          : <Text c="dimmed">—</Text>
    },
      },
      {
        id: 'status',
        header: 'Статус',
        size: 100,
        enableSorting: false,
        Cell: ({ row }) => {
          if (row.original.isExcluded) {
            return (
              <Group gap={4} wrap="nowrap">
                <IconAlertCircle size={16} color="var(--mantine-color-yellow-6)" />
                <Text size="sm" c="yellow">Не оплачено</Text>
              </Group>
            )
          }
          return <Text size="sm" c="green">Оплачено</Text>
        },
      },

  ], [])

  const tableData = useMemo<TimesheetRow[]>(() => {
    if (!selectedWeekData) return []
    const mapped = selectedWeekData.entries.map((entry, idx) => ({
      ...entry,
      id: entry.id || idx,
    })) as TimesheetRow[]
    if (showExcluded) return mapped
    return mapped.filter(r => !r.isExcluded)
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
      columnVisibility: {
        activity: false,
      },
      sorting: [
        { id: 'begin', desc: true },
      ],
    },
    mantinePaperProps: {
      style: { '--paper-radius': 'var(--mantine-radius-xs)' } as React.CSSProperties,
      withBorder: false,
    },
    mantineTableProps: {
      striped: true,
      highlightOnHover: true,
    },
    mantineTableBodyRowProps: ({ row }) => ({
      style: {
        backgroundColor: row.original.isExcluded
          ? 'rgba(250, 197, 28, 0.05)'
          : undefined,
      },
    }),
    mantineTableBodyCellProps: {
      style: {
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      },
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
            <Switch
              label="Показывать исключённые"
              checked={showExcluded}
              onChange={(e) => setShowExcluded(e.currentTarget.checked)}
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

