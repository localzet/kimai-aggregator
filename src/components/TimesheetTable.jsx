import { useState, useMemo } from 'react'
import {
  Select,
  Text,
  Group,
} from '@mantine/core'
import { IconTable } from '@tabler/icons-react'
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table'
import dayjs from 'dayjs'
import { DataTableShared } from '../shared/ui/table'

function TimesheetTable({ weeks }) {
  const [selectedWeek, setSelectedWeek] = useState(null)

  const weekOptions = weeks.map(week => ({
    value: week.weekKey,
    label: `Неделя ${week.week}, ${week.year} (${week.startDate.format('DD.MM')} - ${week.endDate.format('DD.MM')})`,
  }))

  const selectedWeekData = selectedWeek
    ? weeks.find(w => w.weekKey === selectedWeek)
    : weeks[0]

  const formatDuration = (minutes) => {
    const roundedMinutes = Math.round(minutes)
    const hours = Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${hours}ч ${mins}м`
  }

  const columns = useMemo(() => [
    {
      accessorKey: 'begin',
      header: 'Дата',
      Cell: ({ cell }) => dayjs(cell.getValue()).format('DD.MM.YYYY'),
      sortingFn: 'datetime',
    },
    {
      accessorFn: (row) => row.project?.name || '',
      id: 'project',
      header: 'Проект',
      Cell: ({ row }) => {
        const projectName = row.original.project?.name
        return projectName ? <Text>{projectName}</Text> : <Text c="dimmed">Без проекта</Text>
      },
    },
    {
      accessorFn: (row) => row.activity?.name || '',
      id: 'activity',
      header: 'Задача',
      Cell: ({ row }) => {
        const activityName = row.original.activity?.name
        return activityName ? <Text>{activityName}</Text> : <Text c="dimmed">Без задачи</Text>
      },
    },
    {
      accessorKey: 'begin',
      id: 'startTime',
      header: 'Время начала',
      Cell: ({ cell }) => dayjs(cell.getValue()).format('HH:mm'),
    },
    {
      accessorKey: 'end',
      id: 'endTime',
      header: 'Время окончания',
      Cell: ({ cell }) => dayjs(cell.getValue()).format('HH:mm'),
    },
    {
      accessorKey: 'duration',
      header: 'Длительность',
      Cell: ({ cell }) => formatDuration(cell.getValue()),
      sortingFn: 'basic',
    },
    {
      accessorKey: 'description',
      header: 'Описание',
      Cell: ({ cell }) => {
        const desc = cell.getValue()
        return desc ? <Text>{desc}</Text> : <Text c="dimmed">—</Text>
      },
    },
  ], [])

  const tableData = useMemo(() => {
    if (!selectedWeekData) return []
    return selectedWeekData.entries.map((entry, idx) => ({
      ...entry,
      id: idx,
    }))
  }, [selectedWeekData])

  const table = useMantineReactTable({
    columns,
    data: tableData,
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
                  Всего часов: <strong>{selectedWeekData.totalHours.toFixed(2)}</strong>
                </Text>
              </>
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

export default TimesheetTable

