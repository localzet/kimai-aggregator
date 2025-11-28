import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Alert,
  SegmentedControl,
  Paper,
  Text,
  Badge,
  Group,
  Stack,
  Box,
  Button,
  ScrollArea,
  Tooltip,
  Grid,
  Card,
} from '@mantine/core'
import { IconChevronLeft, IconChevronRight, IconClock } from '@tabler/icons-react'
import { DatePicker } from '@mantine/dates'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useSettings, useDashboardData, useSyncStatus } from '@/shared/hooks'
import { Timesheet } from '@/shared/api/kimaiApi'
import { formatDuration } from '@/shared/utils'
import { LoadingScreen } from '../shared/ui/loading-screen'
import { Page } from '../shared/ui/page'

dayjs.extend(isoWeek)

type ViewType = 'month' | 'week' | 'day'

interface DaySegment {
  entry: Timesheet
  segmentStart: dayjs.Dayjs
  segmentEnd: dayjs.Dayjs
  durationMinutes: number
}

// Генерация цвета для проекта на основе его ID
function getProjectColor(projectId: number | null | undefined): string {
  if (projectId === null || projectId === undefined) {
    return 'gray'
  }

  const colors = [
    'blue', 'green', 'orange', 'red', 'violet', 'cyan', 'pink', 'yellow',
    'lime', 'teal', 'indigo', 'grape'
  ]
  const hash = projectId % colors.length
  return colors[Math.abs(hash)]
}

// Получение имени проекта
function getProjectName(entry: Timesheet): string {
  const project = typeof entry.project === 'object' ? entry.project : null
  return project?.name || 'Без проекта'
}

// Получение ID проекта
function getProjectId(entry: Timesheet): number | null {
  const project = typeof entry.project === 'object' ? entry.project : null
  return project?.id ?? null
}

// Получение активности
function getActivityName(entry: Timesheet): string {
  const activity = typeof entry.activity === 'object' ? entry.activity : null
  return activity?.name || 'Без задачи'
}

function CalendarPage() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const { weeks, loading, error, syncing } = useDashboardData(settings, syncStatus)
  const [view, setView] = useState<ViewType>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const weekScrollRef = useRef<HTMLDivElement>(null)
  const dayScrollRef = useRef<HTMLDivElement>(null)

  // Собираем все записи из всех недель
  const allEntries = useMemo(() => {
    return weeks.flatMap(week => week.entries || [])
  }, [weeks])

  // Группируем записи по датам
  const HOUR_HEIGHT = 80
  const MINUTE_HEIGHT = HOUR_HEIGHT / 60
  const MIN_EVENT_MINUTES = 15
  const EVENT_GAP = 3 // Отступ между событиями в пикселях

  function clampEventToDay(entry: Timesheet, day: dayjs.Dayjs) {
    if (!entry.begin) return null
    const entryStart = dayjs(entry.begin)
    const rawEnd = entry.end ? dayjs(entry.end) : dayjs()
    const entryEnd = rawEnd.isValid() ? rawEnd : entryStart.add(MIN_EVENT_MINUTES, 'minute')

    const dayStart = day.startOf('day')
    const dayEnd = day.endOf('day')

    if (entryEnd.isBefore(dayStart) || entryStart.isAfter(dayEnd)) {
      return null
    }

    const segmentStart = entryStart.isAfter(dayStart) ? entryStart : dayStart
    const segmentEnd = entryEnd.isBefore(dayEnd) ? entryEnd : dayEnd
    // Реальная длительность без минимального ограничения
    const durationMinutes = segmentEnd.diff(segmentStart, 'minute')

    return { segmentStart, segmentEnd, durationMinutes }
  }

  function getEventPosition(segmentStart: dayjs.Dayjs, durationMinutes: number) {
    const startMinutes = segmentStart.hour() * 60 + segmentStart.minute()
    const top = startMinutes * MINUTE_HEIGHT
    // Высота без уменьшения - отступы добавляются только между перекрывающимися событиями
    const height = Math.max(durationMinutes, MIN_EVENT_MINUTES) * MINUTE_HEIGHT
    return { top, height }
  }

  // Обрабатывает сегменты и добавляет отступы между перекрывающимися событиями
  function addGapsToSegments(segments: DaySegment[]): Array<DaySegment & { top: number; height: number }> {
    // Сортируем сегменты по времени начала
    const sortedSegments = [...segments].sort((a, b) => {
      return a.segmentStart.diff(b.segmentStart)
    })

    const processed: Array<{ top: number; bottom: number }> = []

    return sortedSegments.map((segment) => {
      const basePosition = getEventPosition(segment.segmentStart, segment.durationMinutes)
      let top = basePosition.top

      // Проверяем перекрытие с уже обработанными событиями
      for (const prev of processed) {
        // Если текущее событие начинается внутри предыдущего (перекрывается)
        if (top <= (prev.bottom + EVENT_GAP) && top >= prev.top) {
          // Сдвигаем вниз с отступом
          top = prev.bottom + EVENT_GAP
          break
        }
      }

      const height = basePosition.height
      const bottom = top + height

      // Сохраняем обработанную позицию
      processed.push({ top, bottom })

      return {
        ...segment,
        top,
        height,
      }
    })
  }

  const entriesByDate = useMemo(() => {
    const grouped: Record<string, Timesheet[]> = {}

    allEntries.forEach(entry => {
      if (!entry.begin) return
      const date = dayjs(entry.begin)
      if (!date.isValid()) return
      const dateKey = date.format('YYYY-MM-DD')

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(entry)
    })

    // Сортируем записи по времени начала
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        const timeA = dayjs(a.begin)
        const timeB = dayjs(b.begin)
        return timeA.diff(timeB)
      })
    })

    return grouped
  }, [allEntries])

  const getSegmentsForDay = (day: dayjs.Dayjs, entries: Timesheet[]): DaySegment[] => {
    return entries
      .map(entry => {
        const segment = clampEventToDay(entry, day)
        if (!segment) return null
        return { entry, ...segment }
      })
      .filter((segment): segment is DaySegment => segment !== null)
  }

  // Получаем записи для конкретной даты
  const getEntriesForDate = (date: Date): Timesheet[] => {
    const dateKey = dayjs(date).format('YYYY-MM-DD')
    return entriesByDate[dateKey] || []
  }

  // Получаем записи для недели
  const getEntriesForWeek = (startDate: Date): Timesheet[] => {
    const start = dayjs(startDate).startOf('week')
    const end = dayjs(startDate).endOf('week')

    return allEntries.filter(entry => {
      if (!entry.begin) return false
      const entryDate = dayjs(entry.begin)
      if (!entryDate.isValid()) return false
      return entryDate.isAfter(start.subtract(1, 'day')) && entryDate.isBefore(end.add(1, 'day'))
    })
  }

  // Навигация
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      if (view === 'week') {
        return dayjs(prev).add(direction === 'next' ? 7 : -7, 'days').toDate()
      } else if (view === 'day') {
        return dayjs(prev).add(direction === 'next' ? 1 : -1, 'day').toDate()
      } else {
        return dayjs(prev).add(direction === 'next' ? 1 : -1, 'month').toDate()
      }
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateChange = (value: Date | string | null) => {
    if (!value) {
      setCurrentDate(new Date())
      return
    }
    if (value instanceof Date) {
      setCurrentDate(value)
      return
    }
    const parsed = dayjs(value)
    setCurrentDate(parsed.isValid() ? parsed.toDate() : new Date())
  }

  // Обновляем текущее время каждую минуту
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date())
    updateTime()
    const interval = setInterval(updateTime, 60000) // Обновляем каждую минуту
    return () => clearInterval(interval)
  }, [])

  // Скроллим к текущему моменту при загрузке недельного/дневного вида
  useEffect(() => {
    if (view === 'week' || view === 'day') {
      const now = dayjs()
      const currentHour = now.hour()
      const currentMinute = now.minute()
      const HEADER_HEIGHT = view === 'week' ? 70 : 0 // Высота шапки колонки для недельного вида
      const scrollPosition = HEADER_HEIGHT + (currentHour * HOUR_HEIGHT) + (currentMinute * MINUTE_HEIGHT) - 200 // Отступ сверху 200px

      setTimeout(() => {
        if (view === 'week' && weekScrollRef.current) {
          const scrollArea = weekScrollRef.current.querySelector('.mantine-ScrollArea-viewport') as HTMLElement
          if (scrollArea) {
            scrollArea.scrollTop = Math.max(0, scrollPosition)
          }
        }
        if (view === 'day' && dayScrollRef.current) {
          const scrollArea = dayScrollRef.current.querySelector('.mantine-ScrollArea-viewport') as HTMLElement
          if (scrollArea) {
            scrollArea.scrollTop = Math.max(0, scrollPosition)
          }
        }
      }, 200)
    }
  }, [view, currentDate])

  const currentDateEntries = getEntriesForDate(currentDate)
  const currentDaySegments = useMemo(() => getSegmentsForDay(dayjs(currentDate), allEntries), [currentDate, allEntries])
  const weekStart = dayjs(currentDate).startOf('week')
  const weekEnd = dayjs(currentDate).endOf('week')
  const weekEntries = getEntriesForWeek(currentDate)
  const totalDuration = allEntries.reduce((sum, e) => sum + (e.duration || 0), 0)

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
    <Page title="Календарь">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="md">
            <SegmentedControl
              value={view}
              onChange={(value) => setView(value as ViewType)}
              data={[
                { label: 'Месяц', value: 'month' },
                { label: 'Неделя', value: 'week' },
                { label: 'День', value: 'day' },
              ]}
            />
            <Group gap="xs">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => navigateDate('prev')}
                leftSection={<IconChevronLeft size={16} />}
              >
                Назад
              </Button>
              <Button
                variant="subtle"
                size="sm"
                onClick={goToToday}
              >
                Сегодня
              </Button>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => navigateDate('next')}
                rightSection={<IconChevronRight size={16} />}
              >
                Вперед
              </Button>
            </Group>
          </Group>
          <Group gap="xs">
            {syncing && (
              <Badge color="blue" variant="light">
                Обновление...
              </Badge>
            )}
          </Group>
        </Group>

        {view === 'month' && (
          <Paper p="md" withBorder>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, lg: 8 }}>
                <Grid gutter="xs">
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                    <Grid.Col key={day} span={12 / 7}>
                      <Text ta="center" fw={600} size="sm" c="dimmed">
                        {day}
                      </Text>
                    </Grid.Col>
                  ))}

                  {(() => {
                    const monthStart = dayjs(currentDate).startOf('month')
                    const monthEnd = dayjs(currentDate).endOf('month')
                    const startDate = monthStart.startOf('week')
                    const endDate = monthEnd.endOf('week')
                    const days: Date[] = []
                    let current = startDate

                    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
                      days.push(current.toDate())
                      current = current.add(1, 'day')
                    }

                    return days.map((day, index) => {
                      const dayEntries = getEntriesForDate(day)
                      const dayTotal = dayEntries.reduce((sum, e) => sum + (e.duration || 0), 0)
                      const isToday = dayjs(day).isSame(dayjs(), 'day')
                      const isCurrentMonth = dayjs(day).month() === dayjs(currentDate).month()

                      return (
                        <Grid.Col key={index} span={12 / 7}>
                          <Paper
                            p="xs"
                            withBorder
                            style={{
                              minHeight: '110px',
                              backgroundColor: isToday
                                ? 'var(--mantine-color-cyan-9)'
                                : isCurrentMonth
                                  ? 'var(--mantine-color-dark-7)'
                                  : 'var(--mantine-color-dark-8)',
                              opacity: isCurrentMonth ? 1 : 0.6,
                              cursor: 'pointer',
                            }}
                            onClick={() => setCurrentDate(day)}
                          >
                            <Group justify="space-between" mb="xs">
                              <Text
                                size="sm"
                                fw={isToday ? 700 : 500}
                                c={isToday ? 'cyan' : isCurrentMonth ? undefined : 'dimmed'}
                              >
                                {dayjs(day).format('D')}
                              </Text>
                              {dayTotal > 0 && (
                                <Badge size="xs" color="green" variant="light">
                                  {formatDuration(dayTotal)}
                                </Badge>
                              )}
                            </Group>

                            <Stack gap={4}>
                              {dayEntries.slice(0, 3).map(entry => {
                                const color = getProjectColor(getProjectId(entry))
                                return (
                                  <Badge
                                    key={entry.id}
                                    color={color}
                                    variant="filled"
                                    size="xs"
                                    style={{ fontSize: '10px' }}
                                  >
                                    {dayjs(entry.begin).format('HH:mm')} {getProjectName(entry)}
                                  </Badge>
                                )
                              })}
                              {dayEntries.length > 3 && (
                                <Text size="xs" c="dimmed" ta="center">
                                  +{dayEntries.length - 3}
                                </Text>
                              )}
                            </Stack>
                          </Paper>
                        </Grid.Col>
                      )
                    })
                  })()}
                </Grid>
              </Grid.Col>
              <Grid.Col span={{ base: 12, lg: 4 }}>
                <Paper p="md" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={500}>
                        События на {dayjs(currentDate).format('DD.MM.YYYY')}
                      </Text>
                      <Button variant="light" size="xs" onClick={() => goToToday()}>
                        Сегодня
                      </Button>
                    </Group>
                    {currentDateEntries.length > 0 ? (
                      <Stack gap="xs">
                        {currentDateEntries.map(entry => {
                          const projectId = getProjectId(entry)
                          const projectName = getProjectName(entry)
                          const activityName = getActivityName(entry)
                          const color = getProjectColor(projectId)
                          const begin = dayjs(entry.begin)
                          const end = entry.end ? dayjs(entry.end) : dayjs()
                          const isRunning = !entry.end
                          const duration = entry.duration || 0

                          return (
                            <Tooltip
                              key={entry.id}
                              label={
                                <Stack gap={4}>
                                  <Text size="sm" fw={500}>{projectName}</Text>
                                  <Text size="xs">{activityName}</Text>
                                  <Text size="xs">Время: {begin.format('HH:mm')} - {isRunning ? '...' : end.format('HH:mm')}</Text>
                                  <Text size="xs">Длительность: {formatDuration(duration)}</Text>
                                  {entry.description && <Text size="xs" c="dimmed">{entry.description}</Text>}
                                </Stack>
                              }
                              withArrow
                            >
                              <Card
                                p="xs"
                                withBorder
                                style={{
                                  borderLeft: `4px solid var(--mantine-color-${color}-6)`,
                                  cursor: 'pointer',
                                }}
                              >
                                <Group gap="xs" justify="space-between">
                                  <Group gap="xs">
                                    <Badge color={color} variant="filled" size="sm">
                                      {projectName}
                                    </Badge>
                                    {isRunning && (
                                      <Badge color="red" variant="light" size="sm">
                                        В процессе
                                      </Badge>
                                    )}
                                  </Group>
                                  <Text size="sm" c="dimmed">
                                    {begin.format('HH:mm')} - {isRunning ? '...' : end.format('HH:mm')}
                                  </Text>
                                  <Text size="sm" fw={500}>
                                    {formatDuration(duration)}
                                  </Text>
                                </Group>
                              </Card>
                            </Tooltip>
                          )
                        })}
                      </Stack>
                    ) : (
                      <Text c="dimmed" size="sm">Нет событий на эту дату</Text>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Paper>
        )}

        {view === 'week' && (
          <Paper p="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={500} size="lg">
                Неделя {weekStart.format('DD.MM')} - {weekEnd.format('DD.MM.YYYY')}
              </Text>
              <Group gap="xs">
                <Badge color="blue" variant="light" size="lg">
                  {weekEntries.length} событий
                </Badge>
                <Badge color="green" variant="light" size="lg">
                  {formatDuration(weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0))}
                </Badge>
              </Group>
            </Group>

            <ScrollArea h={770} ref={weekScrollRef}>
              <Box style={{ display: 'flex', gap: '12px' }}>
                <Box style={{ width: '80px', flexShrink: 0, position: 'relative' }}>
                  {/* Отступ для выравнивания с шапками колонок */}
                  <Box style={{ height: '70px' }} />
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <Box
                      key={hour}
                      style={{
                        height: `${HOUR_HEIGHT}px`,
                        borderBottom: '1px solid var(--mantine-color-dark-4)',
                        padding: '4px',
                        position: 'relative',
                      }}
                    >
                      <Text size="xs" c="dimmed">
                        {String(hour).padStart(2, '0')}:00
                      </Text>
                      {/* Полоски для разделения получасов */}
                      <Box
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '1px',
                          borderTop: '1px dashed var(--mantine-color-dark-5)',
                        }}
                      />
                    </Box>
                  ))}
                  {/* Красная линия текущего момента */}
                  {(() => {
                    const now = dayjs(currentTime)
                    const isCurrentWeek = now.isAfter(weekStart.subtract(1, 'day')) && now.isBefore(weekEnd.add(1, 'day'))
                    if (!isCurrentWeek) return null
                    const currentHour = now.hour()
                    const currentMinute = now.minute()
                    const HEADER_HEIGHT = 70 // Высота шапки колонки
                    const top = HEADER_HEIGHT + (currentHour * HOUR_HEIGHT) + (currentMinute * MINUTE_HEIGHT)
                    return (
                      <Box
                        style={{
                          position: 'absolute',
                          top: `${top}px`,
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: 'var(--mantine-color-red-6)',
                          zIndex: 100,
                          pointerEvents: 'none',
                          boxShadow: '0 0 4px rgba(255, 0, 0, 0.5)',
                        }}
                      />
                    )
                  })()}
                </Box>
                <ScrollArea scrollbarSize={4} type="auto" style={{ width: '100%' }}>
                  <Box
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, minmax(160px, 1fr))',
                      gap: '12px',
                      minWidth: '900px',
                    }}
                  >
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const dayDate = weekStart.add(dayIndex, 'days')
                      const daySegments = getSegmentsForDay(dayDate, allEntries)
                      const dayTotalMinutes = daySegments.reduce((sum, segment) => sum + segment.durationMinutes, 0)
                      const isToday = dayDate.isSame(dayjs(), 'day')

                      return (
                        <Box
                          key={dayIndex}
                          style={{
                            position: 'relative',
                            minHeight: `${HOUR_HEIGHT * 24}px`,
                            border: '1px solid var(--mantine-color-dark-5)',
                            borderRadius: 'var(--mantine-radius-sm)',
                            backgroundColor: isToday ? 'var(--mantine-color-cyan-9)' : 'var(--mantine-color-dark-7)',
                            padding: '8px',
                          }}
                        >
                          <Stack gap="xs" mb="xs">
                            <Text size="sm" fw={600}>
                              {dayDate.format('dd, DD.MM')}
                            </Text>
                            <Badge size="xs" color={dayTotalMinutes > 0 ? "green" : "gray"} variant="light">
                              {formatDuration(dayTotalMinutes)}
                            </Badge>
                          </Stack>
                          <Box
                            style={{
                              position: 'relative',
                              minHeight: `${HOUR_HEIGHT * 24}px`,
                              borderTop: '1px solid var(--mantine-color-dark-4)',
                            }}
                          >
                            {/* Горизонтальные линии для разделения часов */}
                            {Array.from({ length: 24 }).map((_, hour) => (
                              <Box
                                key={hour}
                                style={{
                                  position: 'absolute',
                                  top: `${hour * HOUR_HEIGHT}px`,
                                  left: 0,
                                  right: 0,
                                  height: '1px',
                                  borderTop: '1px solid var(--mantine-color-dark-4)',
                                  zIndex: 1,
                                }}
                              />
                            ))}
                            {/* Полоски для разделения получасов */}
                            {Array.from({ length: 24 }).map((_, hour) => (
                              <Box
                                key={`half-${hour}`}
                                style={{
                                  position: 'absolute',
                                  top: `${(hour * HOUR_HEIGHT) + (HOUR_HEIGHT / 2)}px`,
                                  left: 0,
                                  right: 0,
                                  height: '1px',
                                  borderTop: '1px dashed var(--mantine-color-dark-5)',
                                  zIndex: 1,
                                }}
                              />
                            ))}
                            {/* Красная линия текущего момента для текущего дня */}
                            {(() => {
                              const now = dayjs(currentTime)
                              if (!isToday || !now.isSame(dayDate, 'day')) return null
                              const currentHour = now.hour()
                              const currentMinute = now.minute()
                              const top = (currentHour * HOUR_HEIGHT) + (currentMinute * MINUTE_HEIGHT)
                              return (
                                <Box
                                  style={{
                                    position: 'absolute',
                                    top: `${top}px`,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    backgroundColor: 'var(--mantine-color-red-6)',
                                    zIndex: 100,
                                    pointerEvents: 'none',
                                    boxShadow: '0 0 4px rgba(255, 0, 0, 0.5)',
                                  }}
                                />
                              )
                            })()}
                            {addGapsToSegments(daySegments).map(segment => {
                              const { entry, segmentStart, durationMinutes, top, height } = segment
                              const projectId = getProjectId(entry)
                              const projectName = getProjectName(entry)
                              const activityName = getActivityName(entry)
                              const color = getProjectColor(projectId)
                              const begin = segment.segmentStart
                              const end = segment.segmentEnd
                              const isRunning = !entry.end

                              return (
                                <Tooltip
                                  key={`${entry.id}-${segmentStart.toISOString()}`}
                                  label={
                                    <Stack gap={4}>
                                      <Text size="sm" fw={500}>{projectName}</Text>
                                      {entry.description && <Text size="xs" c="dimmed">{entry.description}</Text>}
                                      {/* <Text size="xs">{activityName}</Text> */}
                                      <Text size="xs">Время: {begin.format('HH:mm')} - {isRunning ? '...' : end.format('HH:mm')}</Text>
                                      <Text size="xs">Длительность: {formatDuration(durationMinutes)}</Text>
                                    </Stack>
                                  }
                                  withArrow
                                >
                                  <Box
                                    style={{
                                      position: 'absolute',
                                      top: `${top}px`,
                                      left: '4px',
                                      right: '4px',
                                      height: `${height}px`,
                                      backgroundColor: `var(--mantine-color-${color}-6)`,
                                      borderRadius: '6px',
                                      padding: '6px',
                                      boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
                                      borderLeft: isRunning ? '4px solid var(--mantine-color-red-5)' : undefined,
                                      color: 'white',
                                      overflow: 'hidden',
                                      zIndex: 10,
                                    }}
                                  >
                                    <Text size="xs" fw={600} lineClamp={1}>
                                      {begin.format('HH:mm')} · {projectName}
                                    </Text>
                                    {height > 48 && (
                                      <Text size="xs" lineClamp={1}>
                                        {entry.description ?? activityName}
                                      </Text>
                                    )}
                                  </Box>
                                </Tooltip>
                              )
                            })}
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
                </ScrollArea>
              </Box>
            </ScrollArea>
          </Paper>
        )}

        {view === 'day' && (
          <Paper p="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={500} size="lg">
                {dayjs(currentDate).format('dddd, DD.MM.YYYY')}
              </Text>
              <Group gap="xs">
                <Badge color="blue" variant="light" size="lg">
                  {currentDaySegments.length} событий
                </Badge>
                <Badge color="green" variant="light" size="lg">
                  {formatDuration(currentDaySegments.reduce((sum, segment) => sum + segment.durationMinutes, 0))}
                </Badge>
              </Group>
            </Group>

            <ScrollArea h={770} ref={dayScrollRef}>
              <Box style={{ position: 'relative', minHeight: '1440px' }}>
                {/* Временная шкала */}
                <Box
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '80px',
                    borderRight: '1px solid var(--mantine-color-dark-5)',
                    zIndex: 10,
                  }}
                >
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <Box
                      key={hour}
                      style={{
                        height: `${HOUR_HEIGHT}px`,
                        borderBottom: '1px solid var(--mantine-color-dark-4)',
                        padding: '4px',
                        position: 'relative',
                      }}
                    >
                      <Text size="xs" c="dimmed">
                        {String(hour).padStart(2, '0')}:00
                      </Text>
                      {/* Полоски для разделения получасов */}
                      <Box
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '1px',
                          borderTop: '1px dashed var(--mantine-color-dark-5)',
                        }}
                      />
                    </Box>
                  ))}
                  {/* Красная линия текущего момента */}
                  {(() => {
                    const now = dayjs(currentTime)
                    const isCurrentDay = now.isSame(dayjs(currentDate), 'day')
                    if (!isCurrentDay) return null
                    const currentHour = now.hour()
                    const currentMinute = now.minute()
                    const top = (currentHour * HOUR_HEIGHT) + (currentMinute * MINUTE_HEIGHT)
                    return (
                      <Box
                        style={{
                          position: 'absolute',
                          top: `${top}px`,
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: 'var(--mantine-color-red-6)',
                          zIndex: 100,
                          pointerEvents: 'none',
                          boxShadow: '0 0 4px rgba(255, 0, 0, 0.5)',
                        }}
                      />
                    )
                  })()}
                </Box>

                {/* События */}
                <Box
                  style={{
                    marginLeft: '80px',
                    position: 'relative',
                    minHeight: '1440px',
                  }}
                >
                  {/* Горизонтальные линии для разделения часов */}
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <Box
                      key={hour}
                      style={{
                        position: 'absolute',
                        top: `${hour * HOUR_HEIGHT}px`,
                        left: 0,
                        right: 0,
                        height: '1px',
                        borderTop: '1px solid var(--mantine-color-dark-4)',
                        zIndex: 1,
                      }}
                    />
                  ))}
                  {/* Полоски для разделения получасов */}
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <Box
                      key={`half-${hour}`}
                      style={{
                        position: 'absolute',
                        top: `${(hour * HOUR_HEIGHT) + (HOUR_HEIGHT / 2)}px`,
                        left: 0,
                        right: 0,
                        height: '1px',
                        borderTop: '1px dashed var(--mantine-color-dark-5)',
                        zIndex: 1,
                      }}
                    />
                  ))}
                  {/* Красная линия текущего момента */}
                  {(() => {
                    const now = dayjs(currentTime)
                    const isCurrentDay = now.isSame(dayjs(currentDate), 'day')
                    if (!isCurrentDay) return null
                    const currentHour = now.hour()
                    const currentMinute = now.minute()
                    const top = (currentHour * HOUR_HEIGHT) + (currentMinute * MINUTE_HEIGHT)
                    return (
                      <Box
                        style={{
                          position: 'absolute',
                          top: `${top}px`,
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: 'var(--mantine-color-red-6)',
                          zIndex: 100,
                          pointerEvents: 'none',
                          boxShadow: '0 0 4px rgba(255, 0, 0, 0.5)',
                        }}
                      />
                    )
                  })()}
                  {addGapsToSegments(currentDaySegments).map(segment => {
                    const { entry, segmentStart, segmentEnd, durationMinutes, top, height } = segment
                    const projectId = getProjectId(entry)
                    const projectName = getProjectName(entry)
                    const activityName = getActivityName(entry)
                    const color = getProjectColor(projectId)
                    const isRunning = !entry.end

                    return (
                      <Tooltip
                        key={`${entry.id}-${segmentStart.toISOString()}`}
                        label={
                          <Stack gap={4}>
                            <Text size="sm" fw={500}>{projectName}</Text>
                            {entry.description && <Text size="xs" c="dimmed">{entry.description}</Text>}
                            {/* <Text size="xs">{activityName}</Text> */}
                            <Text size="xs">Время: {segmentStart.format('HH:mm')} - {isRunning ? '...' : segmentEnd.format('HH:mm')}</Text>
                            <Text size="xs">Длительность: {formatDuration(durationMinutes)}</Text>
                          </Stack>
                        }
                        withArrow
                      >
                        <Card
                          p="md"
                          withBorder
                          style={{
                            position: 'absolute',
                            top: `${top}px`,
                            left: 0,
                            right: 0,
                            height: `${height}px`,
                            backgroundColor: `var(--mantine-color-${color}-6)`,
                            border: `1px solid var(--mantine-color-${color}-7)`,
                            borderLeft: isRunning ? '4px solid var(--mantine-color-red-6)' : `4px solid var(--mantine-color-${color}-7)`,
                            cursor: 'pointer',
                            opacity: isRunning ? 0.9 : 1,
                            zIndex: 10,
                          }}
                        >
                          <Stack gap={4}>
                            <Group gap="xs" justify="space-between">
                              <Badge color={color} variant="filled">
                                {projectName}
                              </Badge>
                              {isRunning && (
                                <Badge color="red" variant="light">
                                  В процессе
                                </Badge>
                              )}
                            </Group>
                            <Text size="sm" fw={500} c="white">
                              {entry.description ?? activityName}
                            </Text>
                            <Text size="sm" c="white" opacity={0.9}>
                              {segmentStart.format('HH:mm')} - {isRunning ? '...' : segmentEnd.format('HH:mm')}
                            </Text>
                            {/* {height > 80 && entry.description && (
                              <Text size="xs" c="white" opacity={0.8}>
                                {entry.description}
                              </Text>
                            )} */}
                            <Text size="lg" fw={700} c="white">
                              {formatDuration(durationMinutes)}
                            </Text>
                          </Stack>
                        </Card>
                      </Tooltip>
                    )
                  })}
                </Box>
              </Box>
            </ScrollArea>
          </Paper>
        )}

        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Group gap="sm" justify="space-between">
              <Text fw={600} size="sm">Быстрый переход по дате</Text>
              <Badge variant="light" color="cyan">
                {dayjs(currentDate).format('DD.MM.YYYY')}
              </Badge>
            </Group>
            <DatePicker
              value={currentDate}
              onChange={(value) => handleDateChange(value as Date | string | null)}
              locale="ru"
              numberOfColumns={3}
              withCellSpacing={false}
            />
          </Stack>
        </Paper>
      </Stack>
    </Page>
  )
}

export default CalendarPage
