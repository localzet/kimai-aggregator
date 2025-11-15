import { useState } from 'react'
import {
  Table,
  Paper,
  Title,
  Select,
  Stack,
  Text,
  Badge,
  Group,
  Card,
} from '@mantine/core'
import dayjs from 'dayjs'

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

  return (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>Финансы по неделям</Title>
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
                  Всего за неделю: <strong>{formatCurrency(selectedWeekData.totalAmount)}</strong>
                </Text>
              </Group>

              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Проект</Table.Th>
                    <Table.Th>Часы</Table.Th>
                    <Table.Th>Время</Table.Th>
                    <Table.Th>Сумма</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedWeekData.projectStats.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
                        Нет данных
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    selectedWeekData.projectStats.map((project, idx) => (
                      <Table.Tr key={project.id || idx}>
                        <Table.Td>{project.name}</Table.Td>
                        <Table.Td>{project.hours.toFixed(2)}</Table.Td>
                        <Table.Td>{formatDuration(project.minutes)}</Table.Td>
                        <Table.Td>{formatCurrency(project.amount)}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>

              {selectedWeekData.projectPeriodInfo && selectedWeekData.projectPeriodInfo.length > 0 && (
                <Stack gap="md" mt="md">
                  {selectedWeekData.projectPeriodInfo.map((projectInfo) => (
                    <Card key={projectInfo.projectId} withBorder>
                      <Title order={4} mb="sm">
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
          )}
        </Stack>
      </Paper>

      {Object.keys(projectPeriods).length > 0 && (
        <Paper p="xl" withBorder>
          <Title order={3} mb="md">Агрегация по периодам</Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Проект</Table.Th>
                <Table.Th>Период</Table.Th>
                <Table.Th>Недели</Table.Th>
                <Table.Th>Отработано</Table.Th>
                <Table.Th>Цель</Table.Th>
                <Table.Th>Сумма</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Object.values(projectPeriods)
                .sort((a, b) => {
                  if (a.projectName !== b.projectName) return a.projectName.localeCompare(b.projectName)
                  if (a.year !== b.year) return b.year - a.year
                  return b.periodNumber - a.periodNumber
                })
                .map((period) => (
                  <Table.Tr key={`${period.projectId}-${period.year}-${period.periodNumber}`}>
                    <Table.Td>{period.projectName}</Table.Td>
                    <Table.Td>Период {period.periodNumber + 1} ({period.year})</Table.Td>
                    <Table.Td>
                      {period.weeks.map(w => `Неделя ${w.week}`).join(', ')}
                    </Table.Td>
                    <Table.Td>{period.totalHours.toFixed(2)} ч</Table.Td>
                    <Table.Td>
                      {period.goalHours !== null ? (
                        <>
                          {period.goalHours} ч
                          {period.totalHours >= period.goalHours && (
                            <Badge color="green" ml="xs" size="sm">✓</Badge>
                          )}
                        </>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>{formatCurrency(period.totalAmount)}</Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  )
}

export default FinancialTable
