/** Компонент для отображения ML инсайтов */

import { useForecasting, useAnomalies, useRecommendations, useProductivity } from '@/shared/ai'
import { useSettings, useDashboardData, useSyncStatus } from '@/shared/hooks'
import {
  Card,
  Stack,
  Text,
  Badge,
  Alert,
  Loader,
  Group,
  Title,
  Progress,
  List,
  Paper,
  Tabs,
} from '@mantine/core'
import { IconTrendingUp, IconTrendingDown, IconAlertTriangle, IconBulb, IconChartBar } from '@tabler/icons-react'
// formatCurrency не используется в этом компоненте

export default function MLInsights() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const { weeks, loading: dataLoading } = useDashboardData(settings, syncStatus)

  const { forecast, loading: forecastLoading } = useForecasting(weeks, settings)
  const { anomalies, loading: anomaliesLoading } = useAnomalies(weeks, settings)
  const { recommendations, loading: recommendationsLoading } = useRecommendations(weeks, settings)
  const { productivity, loading: productivityLoading } = useProductivity(weeks, settings)

  if (dataLoading) {
    return (
      <Card withBorder p="md">
        <Loader size="sm" />
      </Card>
    )
  }

  if (weeks.length < 4) {
    return (
      <Alert color="blue" title="Недостаточно данных">
        Для работы ML функций необходимо минимум 4 недели данных
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      <Title order={3}>AI Инсайты</Title>

      <Tabs defaultValue="forecast">
        <Tabs.List>
          <Tabs.Tab value="forecast" leftSection={<IconTrendingUp size={16} />}>
            Прогноз
          </Tabs.Tab>
          <Tabs.Tab value="anomalies" leftSection={<IconAlertTriangle size={16} />}>
            Аномалии
          </Tabs.Tab>
          <Tabs.Tab value="recommendations" leftSection={<IconBulb size={16} />}>
            Рекомендации
          </Tabs.Tab>
          <Tabs.Tab value="productivity" leftSection={<IconChartBar size={16} />}>
            Продуктивность
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="forecast" pt="md">
          {forecastLoading ? (
            <Loader size="sm" />
          ) : forecast ? (
            <Stack gap="md">
              <Card withBorder p="md">
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>Прогноз на следующую неделю</Text>
                  <Badge color={forecast.trend === 'increasing' ? 'green' : forecast.trend === 'decreasing' ? 'red' : 'blue'}>
                    {forecast.trend === 'increasing' ? '↑ Рост' : forecast.trend === 'decreasing' ? '↓ Снижение' : '→ Стабильно'}
                  </Badge>
                </Group>
                <Text size="xl" fw={700} c="cyan">
                  {forecast.weeklyHours.toFixed(1)} часов
                </Text>
                <Text size="sm" c="dimmed" mt="xs">
                  Прогноз на месяц: {forecast.monthlyHours.toFixed(1)} часов
                </Text>
                <Stack gap="xs" mt="xs">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Уверенность</Text>
                    <Text size="xs" c="dimmed">{(forecast.confidence * 100).toFixed(0)}%</Text>
                  </Group>
                  <Progress value={forecast.confidence * 100} size="sm" />
                </Stack>
              </Card>

              {Object.keys(forecast.weeklyHoursByProject).length > 0 && (
                <Card withBorder p="md">
                  <Text fw={600} mb="xs">Прогноз по проектам</Text>
                  <Stack gap="xs">
                    {Object.entries(forecast.weeklyHoursByProject).map(([projectId, hours]) => (
                      <Group key={projectId} justify="space-between">
                        <Text size="sm">Проект {projectId}</Text>
                        <Text size="sm" fw={500}>{hours.toFixed(1)} ч</Text>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              )}
            </Stack>
          ) : (
            <Alert color="yellow">Недостаточно данных для прогнозирования</Alert>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="anomalies" pt="md">
          {anomaliesLoading ? (
            <Loader size="sm" />
          ) : anomalies && anomalies.length > 0 ? (
            <Stack gap="sm">
              {anomalies.map((anomaly) => (
                <Alert
                  key={anomaly.entryId}
                  color={anomaly.severity === 'high' ? 'red' : anomaly.severity === 'medium' ? 'yellow' : 'blue'}
                  title={`Аномалия #${anomaly.entryId}`}
                  icon={<IconAlertTriangle size={16} />}
                >
                  <Text size="sm" mb="xs">
                    <strong>Тип:</strong> {anomaly.type} | <strong>Серьезность:</strong> {anomaly.severity}
                  </Text>
                  <Text size="sm">{anomaly.reason}</Text>
                  <Progress value={anomaly.score * 100} size="xs" mt="xs" />
                </Alert>
              ))}
            </Stack>
          ) : (
            <Alert color="green">Аномалий не обнаружено</Alert>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="recommendations" pt="md">
          {recommendationsLoading ? (
            <Loader size="sm" />
          ) : recommendations && recommendations.length > 0 ? (
            <Stack gap="md">
              {recommendations.map((rec, idx) => (
                <Card key={idx} withBorder p="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{rec.title}</Text>
                    <Badge color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'yellow' : 'blue'}>
                      {rec.priority}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mb="md">
                    {rec.description}
                  </Text>
                  <Text size="sm" fw={500} mb="xs">Действия:</Text>
                  <List size="sm" spacing="xs">
                    {rec.actionItems.map((item, i) => (
                      <List.Item key={i}>{item}</List.Item>
                    ))}
                  </List>
                  <Text size="sm" c="cyan" mt="md">
                    Ожидаемый эффект: {rec.expectedImpact}
                  </Text>
                  <Stack gap="xs" mt="xs">
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Уверенность</Text>
                      <Text size="xs" c="dimmed">{(rec.confidence * 100).toFixed(0)}%</Text>
                    </Group>
                    <Progress value={rec.confidence * 100} size="xs" />
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Alert color="blue">Рекомендации будут доступны при наличии достаточного количества данных</Alert>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="productivity" pt="md">
          {productivityLoading ? (
            <Loader size="sm" />
          ) : productivity ? (
            <Stack gap="md">
              <Card withBorder p="md">
                <Text fw={600} mb="md">Оптимальные часы работы</Text>
                <Text size="sm" mb="xs">
                  <strong>Время:</strong> {productivity.optimalWorkHours.start}:00 - {productivity.optimalWorkHours.end}:00
                </Text>
                <Text size="sm">
                  <strong>Дни:</strong> {productivity.optimalWorkHours.days.map(d => ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d]).join(', ')}
                </Text>
              </Card>

              <Card withBorder p="md">
                <Text fw={600} mb="md">Эффективность по часам</Text>
                <Stack gap="xs">
                  {productivity.efficiencyByTime
                    .filter(e => e.efficiency > 0)
                    .sort((a, b) => b.efficiency - a.efficiency)
                    .slice(0, 5)
                    .map((e) => (
                      <Group key={e.hour} justify="space-between">
                        <Text size="sm">{e.hour}:00</Text>
                        <Group gap="xs" style={{ flex: 1, maxWidth: 200 }}>
                          <Progress value={e.efficiency * 100} size="sm" style={{ flex: 1 }} />
                          <Text size="xs" c="dimmed">{(e.efficiency * 100).toFixed(0)}%</Text>
                        </Group>
                      </Group>
                    ))}
                </Stack>
              </Card>

              <Card withBorder p="md">
                <Text fw={600} mb="md">Рекомендации по перерывам</Text>
                <Text size="sm">
                  Оптимальная длительность перерыва: <strong>{productivity.breakRecommendations.optimalBreakDuration} минут</strong>
                </Text>
                <Text size="sm" mt="xs">
                  Частота перерывов: каждые <strong>{productivity.breakRecommendations.breakFrequency} часа</strong>
                </Text>
              </Card>
            </Stack>
          ) : (
            <Alert color="blue">Анализ продуктивности будет доступен при наличии достаточного количества данных</Alert>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

