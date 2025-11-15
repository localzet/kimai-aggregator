import { useState, useMemo, useEffect } from 'react'
import {
  Table,
  Paper,
  Title,
  Select,
  Stack,
  Text,
  Badge,
  Group,
  Pagination,
} from '@mantine/core'
import dayjs from 'dayjs'

const ITEMS_PER_PAGE = 50

function TimesheetTable({ weeks }) {
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [page, setPage] = useState(1)

  const weekOptions = weeks.map(week => ({
    value: week.weekKey,
    label: `Неделя ${week.week}, ${week.year} (${week.startDate.format('DD.MM')} - ${week.endDate.format('DD.MM')})`,
  }))

  const selectedWeekData = selectedWeek
    ? weeks.find(w => w.weekKey === selectedWeek)
    : weeks[0]

  // Сбрасываем страницу при смене недели
  useEffect(() => {
    setPage(1)
  }, [selectedWeek])

  const paginatedEntries = useMemo(() => {
    if (!selectedWeekData) return []
    const start = (page - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return selectedWeekData.entries.slice(start, end)
  }, [selectedWeekData, page])

  const totalPages = useMemo(() => {
    if (!selectedWeekData) return 0
    return Math.ceil(selectedWeekData.entries.length / ITEMS_PER_PAGE)
  }, [selectedWeekData])

  const formatDuration = (minutes) => {
    const roundedMinutes = Math.round(minutes)
    const hours = Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${hours}ч ${mins}м`
  }

  return (
    <Paper p="xl" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>Таблица времени</Title>
          <Select
            placeholder="Выберите неделю"
            data={weekOptions}
            value={selectedWeek || weeks[0]?.weekKey}
            onChange={setSelectedWeek}
            style={{ width: 300 }}
          />
        </Group>

        {selectedWeekData && (
          <>
            <Group>
              <Text size="sm" c="dimmed">
                Всего времени: <strong>{formatDuration(selectedWeekData.totalMinutes)}</strong>
              </Text>
              <Text size="sm" c="dimmed">
                Всего часов: <strong>{selectedWeekData.totalHours.toFixed(2)}</strong>
              </Text>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th>Проект</Table.Th>
                  <Table.Th>Задача</Table.Th>
                  <Table.Th>Время начала</Table.Th>
                  <Table.Th>Время окончания</Table.Th>
                  <Table.Th>Длительность</Table.Th>
                  <Table.Th>Описание</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedEntries.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7} style={{ textAlign: 'center' }}>
                      Нет записей за эту неделю
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  paginatedEntries.map((entry, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>{dayjs(entry.begin).format('DD.MM.YYYY')}</Table.Td>
                      <Table.Td>
                        {entry.project?.name || <Text c="dimmed">Без проекта</Text>}
                      </Table.Td>
                      <Table.Td>
                        {entry.activity?.name || <Text c="dimmed">Без задачи</Text>}
                      </Table.Td>
                      <Table.Td>{dayjs(entry.begin).format('HH:mm')}</Table.Td>
                      <Table.Td>{dayjs(entry.end).format('HH:mm')}</Table.Td>
                      <Table.Td>{formatDuration(entry.duration)}</Table.Td>
                      <Table.Td>
                        {entry.description || <Text c="dimmed">—</Text>}
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={totalPages}
                  size="sm"
                />
                <Text size="sm" c="dimmed">
                  Показано {paginatedEntries.length} из {selectedWeekData.entries.length} записей
                </Text>
              </Group>
            )}
          </>
        )}
      </Stack>
    </Paper>
  )
}

export default TimesheetTable

