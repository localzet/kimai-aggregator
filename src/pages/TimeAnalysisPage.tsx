import { useMemo, useState, useEffect } from 'react'
import {
  Container,
  Loader,
  Alert,
  Group,
  Stack,
  Paper,
  Title,
  Text,
  Badge,
  Card,
  Grid,
  Tabs,
  SegmentedControl,
  Table,
  Select,
  Box,
} from '@mantine/core'
import { AreaChart, BarChart, LineChart } from '@mantine/charts'
import { IconClock, IconCalendar, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'
import { useSettings, useDashboardData, useSyncStatus } from '@/shared/hooks'
import { Timesheet } from '@/shared/api/kimaiApi'
import { formatDuration } from '@/shared/utils'
import { LoadingScreen } from '../shared/ui/loading-screen'
import { Page } from '../shared/ui/page'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekday from 'dayjs/plugin/weekday'

dayjs.extend(isoWeek)
dayjs.extend(weekday)

interface TimeSlot {
  start: dayjs.Dayjs
  end: dayjs.Dayjs
  duration: number // в минутах
  type: 'work' | 'free'
}

interface DayAnalysis {
  date: dayjs.Dayjs
  workingMinutes: number
  freeMinutes: number
  totalMinutes: number
  workStart?: dayjs.Dayjs
  workEnd?: dayjs.Dayjs
  breaks: Array<{ start: dayjs.Dayjs; end: dayjs.Dayjs; duration: number }>
  entries: Timesheet[]
}

function TimeAnalysisPage() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const { weeks, loading, error, syncing } = useDashboardData(settings, syncStatus)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week')
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  // Собираем все записи
  const allEntries = useMemo(() => {
    return weeks.flatMap(week => week.entries || [])
  }, [weeks])

  // Анализ по дням
  const dayAnalysis = useMemo(() => {
    const analysis: Record<string, DayAnalysis> = {}

    allEntries.forEach(entry => {
      if (!entry.begin) return
      const entryStart = dayjs(entry.begin)
      const entryEnd = entry.end ? dayjs(entry.end) : dayjs()
      const dateKey = entryStart.format('YYYY-MM-DD')

      if (!analysis[dateKey]) {
        analysis[dateKey] = {
          date: entryStart.startOf('day'),
          workingMinutes: 0,
          freeMinutes: 0,
          totalMinutes: 24 * 60, // полный день
          breaks: [],
          entries: [],
        }
      }

      const duration = entryEnd.diff(entryStart, 'minute')
      analysis[dateKey].workingMinutes += duration
      analysis[dateKey].entries.push(entry)
    })

    // Вычисляем свободное время и перерывы
    Object.values(analysis).forEach(day => {
      // Сортируем записи по времени начала
      day.entries.sort((a, b) => {
        const timeA = dayjs(a.begin)
        const timeB = dayjs(b.begin)
        return timeA.diff(timeB)
      })

      // Находим начало и конец рабочего дня
      if (day.entries.length > 0) {
        const firstEntry = day.entries[0]
        const lastEntry = day.entries[day.entries.length - 1]
        day.workStart = dayjs(firstEntry.begin)
        day.workEnd = lastEntry.end ? dayjs(lastEntry.end) : dayjs()

        // Вычисляем перерывы между задачами
        for (let i = 0; i < day.entries.length - 1; i++) {
          const current = day.entries[i]
          const next = day.entries[i + 1]
          const currentEnd = current.end ? dayjs(current.end) : dayjs()
          const nextStart = dayjs(next.begin)
          const gap = nextStart.diff(currentEnd, 'minute')

          if (gap > 5) { // Перерыв больше 5 минут
            day.breaks.push({
              start: currentEnd,
              end: nextStart,
              duration: gap,
            })
            day.freeMinutes += gap
          }
        }

        // Свободное время до начала работы
        const dayStart = day.date.startOf('day')
        const beforeWork = day.workStart.diff(dayStart, 'minute')
        if (beforeWork > 0) {
          day.freeMinutes += beforeWork
        }

        // Свободное время после работы
        const dayEnd = day.date.endOf('day')
        const afterWork = dayEnd.diff(day.workEnd, 'minute')
        if (afterWork > 0) {
          day.freeMinutes += afterWork
        }
      } else {
        // Если нет записей, весь день свободный
        day.freeMinutes = day.totalMinutes
      }
    })

    return Object.values(analysis).sort((a, b) => b.date.diff(a.date))
  }, [allEntries])

  // Анализ по неделям
  const weekAnalysis = useMemo(() => {
    const analysis: Record<string, {
      weekKey: string
      week: number
      year: number
      workingMinutes: number
      freeMinutes: number
      workDays: number
      avgWorkDayHours: number
      earliestStart?: dayjs.Dayjs
      latestEnd?: dayjs.Dayjs
    }> = {}

    dayAnalysis.forEach(day => {
      const weekKey = `${day.date.year()}-W${String(day.date.isoWeek()).padStart(2, '0')}`
      
      if (!analysis[weekKey]) {
        analysis[weekKey] = {
          weekKey,
          week: day.date.isoWeek(),
          year: day.date.year(),
          workingMinutes: 0,
          freeMinutes: 0,
          workDays: 0,
          avgWorkDayHours: 0,
        }
      }

      analysis[weekKey].workingMinutes += day.workingMinutes
      analysis[weekKey].freeMinutes += day.freeMinutes
      if (day.workingMinutes > 0) {
        analysis[weekKey].workDays += 1
        if (!analysis[weekKey].earliestStart || (day.workStart && day.workStart.isBefore(analysis[weekKey].earliestStart!))) {
          analysis[weekKey].earliestStart = day.workStart
        }
        if (!analysis[weekKey].latestEnd || (day.workEnd && day.workEnd.isAfter(analysis[weekKey].latestEnd!))) {
          analysis[weekKey].latestEnd = day.workEnd
        }
      }
    })

    // Вычисляем средние значения
    Object.values(analysis).forEach(week => {
      week.avgWorkDayHours = week.workDays > 0 ? (week.workingMinutes / 60) / week.workDays : 0
    })

    return Object.values(analysis).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.week - a.week
    })
  }, [dayAnalysis])

  // Общая статистика
  const overallStats = useMemo(() => {
    const totalWorking = dayAnalysis.reduce((sum, day) => sum + day.workingMinutes, 0)
    const totalFree = dayAnalysis.reduce((sum, day) => sum + day.freeMinutes, 0)
    const workDays = dayAnalysis.filter(day => day.workingMinutes > 0).length
    const avgWorkDayHours = workDays > 0 ? (totalWorking / 60) / workDays : 0

    // Среднее время начала и окончания работы
    const workStarts = dayAnalysis
      .filter(day => day.workStart)
      .map(day => day.workStart!.hour() * 60 + day.workStart!.minute())
    const avgStartMinutes = workStarts.length > 0
      ? workStarts.reduce((sum, min) => sum + min, 0) / workStarts.length
      : 0

    const workEnds = dayAnalysis
      .filter(day => day.workEnd)
      .map(day => day.workEnd!.hour() * 60 + day.workEnd!.minute())
    const avgEndMinutes = workEnds.length > 0
      ? workEnds.reduce((sum, min) => sum + min, 0) / workEnds.length
      : 0

    return {
      totalWorking,
      totalFree,
      workDays,
      avgWorkDayHours,
      avgStartTime: dayjs().startOf('day').add(Math.round(avgStartMinutes), 'minute'),
      avgEndTime: dayjs().startOf('day').add(Math.round(avgEndMinutes), 'minute'),
    }
  }, [dayAnalysis])

  // Опции для выбора недели/месяца
  const weekOptions = useMemo(() => {
    return weekAnalysis.map(week => ({
      value: week.weekKey,
      label: `Неделя ${week.week}, ${week.year} (${dayjs().year(week.year).isoWeek(week.week).startOf('isoWeek').format('DD.MM')} - ${dayjs().year(week.year).isoWeek(week.week).endOf('isoWeek').format('DD.MM')})`,
    }))
  }, [weekAnalysis])

  const monthOptions = useMemo(() => {
    const months: Record<string, { year: number; month: number }> = {}
    
    // Добавляем месяцы из данных
    dayAnalysis.forEach(day => {
      const key = `${day.date.year()}-${day.date.month()}`
      if (!months[key]) {
        months[key] = { year: day.date.year(), month: day.date.month() }
      }
    })
    
    // Добавляем текущий месяц, если его нет
    const now = dayjs()
    const currentMonthKey = `${now.year()}-${now.month()}`
    if (!months[currentMonthKey]) {
      months[currentMonthKey] = { year: now.year(), month: now.month() }
    }
    
    // Добавляем прошлый месяц, если его нет
    const lastMonth = now.subtract(1, 'month')
    const lastMonthKey = `${lastMonth.year()}-${lastMonth.month()}`
    if (!months[lastMonthKey]) {
      months[lastMonthKey] = { year: lastMonth.year(), month: lastMonth.month() }
    }
    
    return Object.entries(months)
      .sort(([a, aData], [b, bData]) => {
        // Сортируем по году, затем по месяцу (от новых к старым)
        if (aData.year !== bData.year) {
          return bData.year - aData.year
        }
        return bData.month - aData.month
      })
      .map(([key, { year, month }]) => ({
        value: key,
        label: dayjs().year(year).month(month).format('MMMM YYYY'),
      }))
  }, [dayAnalysis])

  // Инициализация выбранного периода
  useEffect(() => {
    if (periodType === 'week' && !selectedWeek && weekOptions.length > 0) {
      setSelectedWeek(weekOptions[0].value)
    }
  }, [periodType, weekOptions, selectedWeek])

  useEffect(() => {
    if (periodType === 'month' && !selectedMonth && monthOptions.length > 0) {
      // Пытаемся выбрать текущий месяц, если он есть в списке
      const now = dayjs()
      const currentMonthKey = `${now.year()}-${now.month()}`
      const currentMonthOption = monthOptions.find(opt => opt.value === currentMonthKey)
      setSelectedMonth(currentMonthOption ? currentMonthOption.value : monthOptions[0].value)
    }
  }, [periodType, monthOptions, selectedMonth])

  // Фильтрованные данные для графика по дням (месяц)
  const monthChartData = useMemo(() => {
    let filteredDays: DayAnalysis[] = []
    
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number)
      // month в dayjs начинается с 0, поэтому используем как есть
      const monthStart = dayjs().year(year).month(month).startOf('month')
      const monthEnd = dayjs().year(year).month(month).endOf('month')
      
      // Создаем мапу существующих дней для быстрого поиска
      const existingDaysMap = new Map<string, DayAnalysis>()
      dayAnalysis
        .filter(day => (day.date.isAfter(monthStart) || day.date.isSame(monthStart, 'day')) && 
                      (day.date.isBefore(monthEnd) || day.date.isSame(monthEnd, 'day')))
        .forEach(day => {
          existingDaysMap.set(day.date.format('YYYY-MM-DD'), day)
        })
      
      // Создаем полный список дней месяца, заполняя пропуски
      const allDaysInMonth: DayAnalysis[] = []
      const daysInMonth = monthEnd.date() // Количество дней в месяце
      
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = monthStart.clone().date(day).startOf('day')
        const dateKey = currentDate.format('YYYY-MM-DD')
        const existingDay = existingDaysMap.get(dateKey)
        
        if (existingDay) {
          allDaysInMonth.push(existingDay)
        } else {
          // Создаем день без данных
          allDaysInMonth.push({
            date: currentDate,
            workingMinutes: 0,
            freeMinutes: 24 * 60,
            totalMinutes: 24 * 60,
            breaks: [],
            entries: [],
          })
        }
      }
      
      filteredDays = allDaysInMonth.reverse()
    } else {
      // Если месяц не выбран, берем последние 30 дней
      filteredDays = dayAnalysis.slice(0, 30).reverse()
    }

    return filteredDays.map((day, index) => {
      const dayOfWeek = day.date.day() // 0 = воскресенье, 6 = суббота
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const weekNumber = day.date.isoWeek()
      const prevDay = index > 0 ? filteredDays[index - 1] : null
      const prevWeekNumber = prevDay ? prevDay.date.isoWeek() : null
      const isWeekStart = prevWeekNumber !== null && weekNumber !== prevWeekNumber
      const year = day.date.year()
      const prevYear = prevDay ? prevDay.date.year() : null
      // Учитываем смену года
      const isWeekStartWithYear = prevYear !== null && (year !== prevYear || weekNumber !== prevWeekNumber)

      return {
        date: day.date.format('DD.MM'),
        dateFull: day.date.format('YYYY-MM-DD'),
        'Рабочее время': Math.round(day.workingMinutes / 60 * 10) / 10,
        'Свободное время': Math.round(day.freeMinutes / 60 * 10) / 10,
        workingMinutes: day.workingMinutes,
        freeMinutes: day.freeMinutes,
        isWeekend,
        isWeekStart: isWeekStartWithYear,
        weekNumber,
        dayOfWeek,
      }
    })
  }, [dayAnalysis, selectedMonth])

  // Данные для графиков
  const chartData = useMemo(() => {
    if (viewMode === 'day') {
      return monthChartData
    } else {
      return weekAnalysis.slice(0, 12).reverse().map(week => ({
        week: `W${week.week}`,
        weekKey: week.weekKey,
        'Рабочее время': Math.round(week.workingMinutes / 60 * 10) / 10,
        'Свободное время': Math.round(week.freeMinutes / 60 * 10) / 10,
        'Средний рабочий день': Math.round(week.avgWorkDayHours * 10) / 10,
        workDays: week.workDays,
      }))
    }
  }, [monthChartData, weekAnalysis, viewMode])

  // Распределение по часам дня (для выбранной недели)
  const hourlyDistribution = useMemo(() => {
    const hours: Record<number, number> = {}
    for (let i = 0; i < 24; i++) {
      hours[i] = 0
    }

    let filteredEntries = allEntries

    // Фильтруем по выбранному периоду
    if (periodType === 'week' && selectedWeek) {
      const [year, week] = selectedWeek.split('-W').map((part, idx) => idx === 0 ? parseInt(part) : parseInt(part))
      const weekStart = dayjs().year(year).isoWeek(week).startOf('isoWeek')
      const weekEnd = dayjs().year(year).isoWeek(week).endOf('isoWeek')
      
      filteredEntries = allEntries.filter(entry => {
        if (!entry.begin) return false
        const entryDate = dayjs(entry.begin)
        return (entryDate.isAfter(weekStart) || entryDate.isSame(weekStart, 'day')) && 
               (entryDate.isBefore(weekEnd) || entryDate.isSame(weekEnd, 'day'))
      })
    } else if (periodType === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number)
      const monthStart = dayjs().year(year).month(month).startOf('month')
      const monthEnd = dayjs().year(year).month(month).endOf('month')
      
      filteredEntries = allEntries.filter(entry => {
        if (!entry.begin) return false
        const entryDate = dayjs(entry.begin)
        return (entryDate.isAfter(monthStart) || entryDate.isSame(monthStart, 'day')) && 
               (entryDate.isBefore(monthEnd) || entryDate.isSame(monthEnd, 'day'))
      })
    }

    filteredEntries.forEach(entry => {
      if (!entry.begin) return
      const start = dayjs(entry.begin)
      const end = entry.end ? dayjs(entry.end) : dayjs()
      
      let current = start.startOf('hour')
      while (current.isBefore(end)) {
        const hour = current.hour()
        const nextHour = current.add(1, 'hour')
        const segmentEnd = end.isBefore(nextHour) ? end : nextHour
        const minutes = segmentEnd.diff(current, 'minute')
        hours[hour] = (hours[hour] || 0) + minutes
        current = nextHour
      }
    })

    return Object.entries(hours).map(([hour, minutes]) => ({
      hour: parseInt(hour),
      hours: Math.round((minutes / 60) * 10) / 10,
      label: `${String(hour).padStart(2, '0')}:00`,
    }))
  }, [allEntries, periodType, selectedWeek, selectedMonth])

  if (loading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <Alert color="red" title="Ошибка">
        {error}
      </Alert>
    )
  }

  return (
    <Page title="Анализ времени">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Анализ рабочего и свободного времени</Title>
          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as 'day' | 'week')}
            data={[
              { label: 'По дням', value: 'day' },
              { label: 'По неделям', value: 'week' },
            ]}
          />
        </Group>

        {/* Общая статистика */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Всего рабочего времени</Text>
                  <IconClock size={20} />
                </Group>
                <Text size="xl" fw={700}>
                  {formatDuration(overallStats.totalWorking)}
                </Text>
                <Text size="xs" c="dimmed">
                  {overallStats.workDays} рабочих дней
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Средний рабочий день</Text>
                  <IconTrendingUp size={20} />
                </Group>
                <Text size="xl" fw={700}>
                  {formatDuration(overallStats.avgWorkDayHours * 60)}
                </Text>
                <Text size="xs" c="dimmed">
                  {Math.round(overallStats.avgWorkDayHours * 10) / 10} часов
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Среднее время начала</Text>
                  <IconCalendar size={20} />
                </Group>
                <Text size="xl" fw={700}>
                  {overallStats.avgStartTime.format('HH:mm')}
                </Text>
                <Text size="xs" c="dimmed">
                  Рабочего дня
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Среднее время окончания</Text>
                  <IconTrendingDown size={20} />
                </Group>
                <Text size="xl" fw={700}>
                  {overallStats.avgEndTime.format('HH:mm')}
                </Text>
                <Text size="xs" c="dimmed">
                  Рабочего дня
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* График распределения времени */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3}>
                Распределение рабочего и свободного времени (месяц)
              </Title>
              <Select
                placeholder="Выберите месяц"
                data={monthOptions}
                value={selectedMonth}
                onChange={setSelectedMonth}
                style={{ width: 200 }}
              />
            </Group>
            <Box style={{ position: 'relative' }}>
              <AreaChart
                h={300}
                data={monthChartData}
                dataKey="date"
                series={[
                  { 
                    name: 'Рабочее время', 
                    color: 'green.6', 
                    label: 'Рабочее время (ч)',
                  },
                  { 
                    name: 'Свободное время', 
                    color: 'gray.6', 
                    label: 'Свободное время (ч)',
                  },
                ]}
                curveType="natural"
                referenceLines={[
                  // Границы недель
                  ...monthChartData
                    .filter(item => item.isWeekStart)
                    .map((item) => ({
                      x: item.date,
                      color: 'blue.4',
                      label: `Н${item.weekNumber}`,
                    })),
                  // Границы выходных (начало и конец каждой группы выходных, исключая границы недель)
                  ...(() => {
                    const weekStartDates = new Set(
                      monthChartData
                        .filter(item => item.isWeekStart)
                        .map(item => item.date)
                    )
                    
                    const weekendBoundaries: string[] = []
                    let prevWasWeekend = false
                    
                    monthChartData.forEach((item, idx) => {
                      const isWeekend = item.isWeekend
                      // Начало группы выходных (только если это не начало недели)
                      if (isWeekend && !prevWasWeekend && !weekStartDates.has(item.date)) {
                        weekendBoundaries.push(item.date)
                      }
                      // Конец группы выходных (только если это не начало недели следующего дня)
                      if (!isWeekend && prevWasWeekend && idx > 0) {
                        const prevDate = monthChartData[idx - 1].date
                        if (!weekStartDates.has(prevDate)) {
                          weekendBoundaries.push(prevDate)
                        }
                      }
                      prevWasWeekend = isWeekend
                    })
                    
                    // Обрабатываем случай, когда выходные в конце
                    if (prevWasWeekend && monthChartData.length > 0) {
                      const lastDate = monthChartData[monthChartData.length - 1].date
                      if (!weekStartDates.has(lastDate)) {
                        weekendBoundaries.push(lastDate)
                      }
                    }
                    
                    return weekendBoundaries.map((date) => ({
                      x: date,
                      color: 'red.4',
                      label: '',
                    }))
                  })(),
                ]}
              />
            </Box>
            <Group gap="xs" mt="xs">
              <Badge size="sm" color="red" variant="light">Выходные (красная подсветка)</Badge>
              <Badge size="sm" color="blue" variant="light">Начало недели (вертикальная линия)</Badge>
            </Group>
          </Stack>
        </Paper>

        {/* Распределение по часам дня */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3}>Распределение работы по часам дня</Title>
              <Group>
                <SegmentedControl
                  value={periodType}
                  onChange={(value) => {
                    setPeriodType(value as 'week' | 'month')
                    if (value === 'week' && weekOptions.length > 0 && !selectedWeek) {
                      setSelectedWeek(weekOptions[0].value)
                    }
                    if (value === 'month' && monthOptions.length > 0 && !selectedMonth) {
                      setSelectedMonth(monthOptions[0].value)
                    }
                  }}
                  data={[
                    { label: 'Неделя', value: 'week' },
                    { label: 'Месяц', value: 'month' },
                  ]}
                />
                {periodType === 'week' ? (
                  <Select
                    placeholder="Выберите неделю"
                    data={weekOptions}
                    value={selectedWeek}
                    onChange={setSelectedWeek}
                    style={{ width: 250 }}
                  />
                ) : (
                  <Select
                    placeholder="Выберите месяц"
                    data={monthOptions}
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    style={{ width: 200 }}
                  />
                )}
              </Group>
            </Group>
            <BarChart
              h={300}
              data={hourlyDistribution}
              dataKey="label"
              series={[{ name: 'hours', color: 'blue.6', label: 'Часы работы' }]}
            />
            <Text size="xs" c="dimmed" ta="center">
              Период: {periodType === 'week' && selectedWeek 
                ? weekOptions.find(w => w.value === selectedWeek)?.label 
                : periodType === 'month' && selectedMonth
                ? monthOptions.find(m => m.value === selectedMonth)?.label
                : 'Не выбран'}
            </Text>
          </Stack>
        </Paper>

        {/* Таблица детального анализа */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Title order={3}>
              {viewMode === 'day' ? 'Детальный анализ по дням' : 'Детальный анализ по неделям'}
            </Title>
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    {viewMode === 'day' ? (
                      <>
                        <Table.Th>Дата</Table.Th>
                        <Table.Th>Рабочее время</Table.Th>
                        <Table.Th>Свободное время</Table.Th>
                        <Table.Th>Начало работы</Table.Th>
                        <Table.Th>Окончание работы</Table.Th>
                        <Table.Th>Перерывы</Table.Th>
                      </>
                    ) : (
                      <>
                        <Table.Th>Неделя</Table.Th>
                        <Table.Th>Рабочее время</Table.Th>
                        <Table.Th>Свободное время</Table.Th>
                        <Table.Th>Рабочих дней</Table.Th>
                        <Table.Th>Средний день</Table.Th>
                      </>
                    )}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {viewMode === 'day' 
                    ? dayAnalysis.slice(0, 30).map((item, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>
                            <Text fw={500}>
                              {item.date.format('DD.MM.YYYY')}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {item.date.format('dddd')}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="green" variant="light">
                              {formatDuration(item.workingMinutes)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="gray" variant="light">
                              {formatDuration(item.freeMinutes)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {item.workStart ? (
                              <Text>{item.workStart.format('HH:mm')}</Text>
                            ) : (
                              <Text c="dimmed">-</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {item.workEnd ? (
                              <Text>{item.workEnd.format('HH:mm')}</Text>
                            ) : (
                              <Text c="dimmed">-</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {item.breaks.length > 0 ? (
                              <Stack gap={4}>
                                {item.breaks.map((breakItem, idx) => (
                                  <Text key={idx} size="xs">
                                    {breakItem.start.format('HH:mm')} - {breakItem.end.format('HH:mm')} ({formatDuration(breakItem.duration)})
                                  </Text>
                                ))}
                              </Stack>
                            ) : (
                              <Text c="dimmed" size="xs">Нет перерывов</Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))
                    : weekAnalysis.slice(0, 30).map((item, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>
                            <Text fw={500}>
                              Неделя {item.week}, {item.year}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="green" variant="light">
                              {formatDuration(item.workingMinutes)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="gray" variant="light">
                              {formatDuration(item.freeMinutes)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light">
                              {item.workDays} дней
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text>{formatDuration(item.avgWorkDayHours * 60)}</Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        </Paper>
      </Stack>
    </Page>
  )
}

export default TimeAnalysisPage

