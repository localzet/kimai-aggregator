import { useState, useMemo } from 'react'
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
  Tabs,
  Select,
  Menu,
} from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'
import StatusIndicator from '../components/StatusIndicator'
import { useSettings } from '../hooks/useSettings'
import { useDashboardData } from '../hooks/useDashboardData'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { WeekData } from '../services/kimaiApi'
import dayjs from 'dayjs'

function PaymentHistoryPage() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const { weeks, loading, error, reload, syncing } = useDashboardData(settings, syncStatus)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  
  const currentStatus = syncing ? 'updating' : syncStatus.status

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount)
  }

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
              periods[periodKey].goalHours += info.goalHours
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

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>История оплат</Title>
        <Group>
          <StatusIndicator status={currentStatus} lastUpdate={syncStatus.lastUpdate} />
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
          <Button onClick={reload} loading={loading || syncing}>
            Обновить
          </Button>
        </Group>
      </Group>

      <Tabs defaultValue="weekly">
        <Tabs.List>
          <Tabs.Tab value="weekly">По неделям</Tabs.Tab>
          <Tabs.Tab value="periods">По периодам</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="weekly" pt="md">
          <Paper p="xl" withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Неделя</Table.Th>
                  <Table.Th>Период</Table.Th>
                  <Table.Th>Часы</Table.Th>
                  <Table.Th>Сумма</Table.Th>
                  <Table.Th>Проекты</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredWeeklyPayments.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                      Нет данных
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filteredWeeklyPayments.map((payment) => (
                    <Table.Tr key={payment.week.weekKey}>
                      <Table.Td>
                        <Text fw={500}>
                          Неделя {payment.weekNumber}, {payment.year}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {dayjs(payment.startDate).format('DD.MM')} - {dayjs(payment.endDate).format('DD.MM')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {payment.week.projectPeriodInfo?.map(info => {
                          const projectSettings = settings.projectSettings?.[info.projectId]
                          if (projectSettings?.hasPaymentPeriods) {
                            return (
                              <Badge key={info.projectId} variant="light" size="sm" mr="xs">
                                {info.projectName}: Период {info.periodNumber + 1}, неделя {info.weekInPeriod}
                              </Badge>
                            )
                          }
                          return null
                        })}
                      </Table.Td>
                      <Table.Td>{payment.totalHours.toFixed(2)} ч</Table.Td>
                      <Table.Td>
                        <Text fw={500}>{formatCurrency(payment.totalAmount)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap="xs">
                          {payment.projects.map((project, idx) => (
                            <Group key={idx} gap="xs">
                              <Text size="sm">{project.name}:</Text>
                              <Text size="sm" fw={500}>
                                {formatCurrency(project.amount)}
                              </Text>
                              <Text size="sm" c="dimmed">
                                ({project.hours.toFixed(2)} ч)
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="periods" pt="md">
          <Paper p="xl" withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Проект</Table.Th>
                  <Table.Th>Период</Table.Th>
                  <Table.Th>Недели</Table.Th>
                  <Table.Th>Отработано</Table.Th>
                  <Table.Th>Цель</Table.Th>
                  <Table.Th>Сумма</Table.Th>
                  <Table.Th>Статус</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredPeriods.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7} style={{ textAlign: 'center' }}>
                      Нет данных о периодах
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filteredPeriods
                    .sort((a, b) => {
                      if (a.year !== b.year) return b.year - a.year
                      if (a.periodNumber !== b.periodNumber) return b.periodNumber - a.periodNumber
                      return a.projectName.localeCompare(b.projectName)
                    })
                    .map((period) => (
                      <Table.Tr key={`${period.year}-${period.projectId}-${period.periodNumber}`}>
                        <Table.Td>
                          <Text fw={500}>{period.projectName}</Text>
                        </Table.Td>
                        <Table.Td>
                          Период {period.periodNumber + 1} ({period.year})
                        </Table.Td>
                        <Table.Td>
                          {period.weeks.map(w => `Неделя ${w.week}`).join(', ')}
                        </Table.Td>
                        <Table.Td>{period.totalHours.toFixed(2)} ч</Table.Td>
                        <Table.Td>
                          {period.goalHours !== null ? (
                            <>
                              {period.goalHours.toFixed(2)} ч
                              {period.totalHours >= period.goalHours && (
                                <Badge color="green" ml="xs" size="sm">✓</Badge>
                              )}
                            </>
                          ) : (
                            <Text c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{formatCurrency(period.totalAmount)}</Text>
                        </Table.Td>
                        <Table.Td>
                          {period.goalHours !== null ? (
                            period.totalHours >= period.goalHours ? (
                              <Badge color="green">Выполнено</Badge>
                            ) : (
                              <Badge color="yellow">
                                {((period.totalHours / period.goalHours) * 100).toFixed(0)}%
                              </Badge>
                            )
                          ) : (
                            <Badge color="blue">Без цели</Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

export default PaymentHistoryPage

