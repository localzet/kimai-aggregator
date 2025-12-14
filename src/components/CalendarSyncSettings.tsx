import { useState } from 'react'
import {
  Paper,
  Stack,
  Title,
  Switch,
  Select,
  TextInput,
  NumberInput,
  Button,
  Group,
  Text,
  Alert,
  Divider,
  Badge,
  ActionIcon,
  Table,
} from '@mantine/core'
import { IconRefresh, IconCheck, IconX, IconTrash, IconPlus } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { CalendarSyncSettings } from '@/shared/hooks/useSettings'
import { GoogleCalendarSync } from '@/shared/api/calendarSync'
import { useCalendarSync } from '@/shared/hooks'
import { useSettings } from '@/shared/hooks/useSettings'

interface CalendarSyncSettingsProps {
  settings: CalendarSyncSettings
  onUpdate: (settings: CalendarSyncSettings) => void
}

export default function CalendarSyncSettingsComponent({
  settings,
  onUpdate,
}: CalendarSyncSettingsProps) {
  const [authorizing, setAuthorizing] = useState(false)
  const { settings: allSettings } = useSettings()
  const { sync: syncCalendar, syncing: syncingCalendar } = useCalendarSync()

  const handleAuthorizeGoogle = async () => {
    if (!settings.googleClientId) {
      notifications.show({
        title: 'Ошибка',
        message: 'Сначала укажите Google Client ID',
        color: 'red',
      })
      return
    }

    try {
      setAuthorizing(true)
      const sync = new GoogleCalendarSync(settings)
      const tokens = await sync.authorize()
      onUpdate({
        ...settings,
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: tokens.refreshToken,
      })
      notifications.show({
        title: 'Успешно',
        message: 'Авторизация Google Calendar выполнена',
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        title: 'Ошибка авторизации',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        color: 'red',
      })
    } finally {
      setAuthorizing(false)
    }
  }

  return (
    <Paper p="xl" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>Синхронизация календаря</Title>
          <Switch
            label="Включить синхронизацию"
            checked={settings.enabled}
            onChange={(e) =>
              onUpdate({
                ...settings,
                enabled: e.currentTarget.checked,
              })
            }
          />
        </Group>

        {settings.enabled && (
          <>
            <Select
              label="Тип календаря"
              description="Выберите календарь для синхронизации"
              data={[
                { value: 'google', label: 'Google Calendar' },
                { value: 'notion', label: 'Notion Calendar' },
              ]}
              value={settings.syncType || null}
              onChange={(value) =>
                onUpdate({
                  ...settings,
                  syncType: (value as 'google' | 'notion') || null,
                })
              }
            />

            {settings.syncType === 'google' && (
              <Stack gap="md">
                <Divider label="Настройки Google Calendar" labelPosition="left" />
                <Alert color="blue" title="Инструкция">
                  <Text size="sm" mb="xs">
                    1. Создайте проект в Google Cloud Console
                  </Text>
                  <Text size="sm" mb="xs">
                    2. Включите Google Calendar API
                  </Text>
                  <Text size="sm" mb="xs">
                    3. Создайте OAuth 2.0 credentials (Client ID и Client Secret)
                  </Text>
                  <Text size="sm" mb="xs">
                    4. Добавьте redirect URI: {window.location.origin}/oauth/callback
                  </Text>
                  <Text size="sm">
                    5. Введите Client ID и Client Secret ниже, затем нажмите "Авторизовать"
                  </Text>
                </Alert>

                <TextInput
                  label="Google Client ID"
                  placeholder="xxxxx.apps.googleusercontent.com"
                  value={settings.googleClientId || ''}
                  onChange={(e) =>
                    onUpdate({
                      ...settings,
                      googleClientId: e.currentTarget.value,
                    })
                  }
                />

                <TextInput
                  label="Google Client Secret"
                  type="password"
                  placeholder="GOCSPX-xxxxx"
                  value={settings.googleClientSecret || ''}
                  onChange={(e) =>
                    onUpdate({
                      ...settings,
                      googleClientSecret: e.currentTarget.value,
                    })
                  }
                />

                <TextInput
                  label="Calendar ID"
                  description="ID календаря (оставьте пустым для основного календаря)"
                  placeholder="primary"
                  value={settings.googleCalendarId || ''}
                  onChange={(e) =>
                    onUpdate({
                      ...settings,
                      googleCalendarId: e.currentTarget.value || 'primary',
                    })
                  }
                />

                {settings.googleAccessToken ? (
                  <Alert color="green" title="Авторизовано">
                    Google Calendar подключен успешно
                  </Alert>
                ) : (
                  <Button
                    onClick={handleAuthorizeGoogle}
                    loading={authorizing}
                    disabled={!settings.googleClientId}
                  >
                    Авторизовать Google Calendar
                  </Button>
                )}
              </Stack>
            )}

            {settings.syncType === 'notion' && (
              <Stack gap="md">
                <Divider label="Настройки Notion" labelPosition="left" />
                {(() => {
                  const isElectron = typeof window !== 'undefined' && (
                    window.electron?.isElectron || 
                    (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron'))
                  )
                  return !isElectron ? (
                    <Alert color="orange" title="Важно">
                      <Text size="sm" fw={500} mb="xs">
                        Синхронизация с Notion работает только в Electron приложении из-за ограничений CORS браузера.
                      </Text>
                      <Text size="sm">
                        Если вы используете собранное Electron приложение, убедитесь, что preload.js загружается правильно.
                        Откройте DevTools (Ctrl+Shift+I) и проверьте консоль на наличие ошибок.
                      </Text>
                    </Alert>
                  ) : (
                    <Alert color="green" title="Electron обнаружен">
                      <Text size="sm">
                        Electron окружение обнаружено. Синхронизация с Notion должна работать.
                      </Text>
                    </Alert>
                  )
                })()}
                <Alert color="blue" title="Инструкция">
                  <Text size="sm" mb="xs">
                    1. Создайте интеграцию в Notion (Settings & Members → Integrations → New integration)
                  </Text>
                  <Text size="sm" mb="xs">
                    2. Скопируйте Internal Integration Token
                  </Text>
                  <Text size="sm" mb="xs">
                    3. Создайте базу данных в Notion с полями:
                  </Text>
                  <Text size="sm" ml="md" mb="xs">
                    - Name (Title)
                  </Text>
                  <Text size="sm" ml="md" mb="xs">
                    - Date (Date)
                  </Text>
                  <Text size="sm" ml="md" mb="xs">
                    - Duration (Number)
                  </Text>
                  <Text size="sm" ml="md" mb="xs">
                    - Project (Text)
                  </Text>
                  <Text size="sm" ml="md" mb="xs">
                    - Activity (Text)
                  </Text>
                  <Text size="sm" ml="md" mb="xs">
                    - Kimai ID (Number)
                  </Text>
                  <Text size="sm" mb="xs">
                    4. Предоставьте доступ интеграции к базе данных
                  </Text>
                  <Text size="sm">
                    5. Скопируйте Database ID из URL страницы базы данных
                  </Text>
                </Alert>

                <TextInput
                  label="Notion API Key"
                  type="password"
                  placeholder="secret_xxxxx"
                  value={settings.notionApiKey || ''}
                  onChange={(e) =>
                    onUpdate({
                      ...settings,
                      notionApiKey: e.currentTarget.value,
                    })
                  }
                />

                <TextInput
                  label="Notion Database ID"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={settings.notionDatabaseId || ''}
                  onChange={(e) =>
                    onUpdate({
                      ...settings,
                      notionDatabaseId: e.currentTarget.value,
                    })
                  }
                />

                <Divider label="Шаблоны страниц для проектов" labelPosition="left" />
                <Alert color="blue" title="Информация">
                  <Text size="sm" mb="xs">
                    Вы можете настроить шаблоны страниц Notion для каждого проекта. 
                    При создании записи в Notion будет использоваться соответствующий шаблон.
                  </Text>
                  <Text size="sm">
                    Чтобы получить ID шаблона, создайте страницу в Notion с нужным шаблоном, 
                    затем скопируйте ID из URL страницы (последняя часть после последнего дефиса).
                  </Text>
                </Alert>

                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Название проекта</Table.Th>
                      <Table.Th>ID шаблона Notion</Table.Th>
                      <Table.Th style={{ width: '50px' }}></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {Object.entries(settings.notionProjectTemplates || {}).map(([projectName, templateId]) => (
                      <Table.Tr key={projectName}>
                        <Table.Td>{projectName}</Table.Td>
                        <Table.Td>
                          <TextInput
                            size="xs"
                            value={templateId}
                            onChange={(e) => {
                              const newTemplates = { ...(settings.notionProjectTemplates || {}) }
                              newTemplates[projectName] = e.currentTarget.value
                              onUpdate({
                                ...settings,
                                notionProjectTemplates: newTemplates,
                              })
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => {
                              const newTemplates = { ...(settings.notionProjectTemplates || {}) }
                              delete newTemplates[projectName]
                              onUpdate({
                                ...settings,
                                notionProjectTemplates: newTemplates,
                              })
                            }}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {(!settings.notionProjectTemplates || Object.keys(settings.notionProjectTemplates).length === 0) && (
                      <Table.Tr>
                        <Table.Td colSpan={3}>
                          <Text size="sm" c="dimmed" ta="center">
                            Нет настроенных шаблонов
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>

                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    const projectName = prompt('Введите название проекта:')
                    if (projectName && projectName.trim()) {
                      const newTemplates = { ...(settings.notionProjectTemplates || {}) }
                      newTemplates[projectName.trim()] = ''
                      onUpdate({
                        ...settings,
                        notionProjectTemplates: newTemplates,
                      })
                    }
                  }}
                >
                  Добавить шаблон проекта
                </Button>

                {settings.notionApiKey && settings.notionDatabaseId ? (
                  <Alert color="green" title="Готово к синхронизации">
                    <Text size="sm">
                      Все необходимые данные заполнены. Синхронизация будет выполняться автоматически.
                    </Text>
                  </Alert>
                ) : (
                  <Alert color="yellow" title="Требуется настройка">
                    <Text size="sm">
                      Заполните API Key и Database ID для начала синхронизации.
                    </Text>
                  </Alert>
                )}
              </Stack>
            )}

            <Divider />

            <Stack gap="md">
              <Title order={4}>Параметры синхронизации</Title>

              <NumberInput
                label="Синхронизировать прошлые дни"
                description="Сколько дней назад синхронизировать записи"
                min={1}
                max={365}
                value={settings.syncPastDays || 30}
                onChange={(value) =>
                  onUpdate({
                    ...settings,
                    syncPastDays: Number(value) || 30,
                  })
                }
              />

              <NumberInput
                label="Синхронизировать будущие дни"
                description="Сколько дней вперед синхронизировать записи"
                min={0}
                max={365}
                value={settings.syncFutureDays || 7}
                onChange={(value) =>
                  onUpdate({
                    ...settings,
                    syncFutureDays: Number(value) || 7,
                  })
                }
              />

              <Switch
                label="Автоматическая синхронизация"
                description="Автоматически синхронизировать при изменении данных"
                checked={settings.autoSync || false}
                onChange={(e) =>
                  onUpdate({
                    ...settings,
                    autoSync: e.currentTarget.checked,
                  })
                }
              />
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  )
}

