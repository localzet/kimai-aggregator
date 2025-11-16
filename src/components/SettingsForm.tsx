import { useState, useEffect } from 'react'
import {
  Paper,
  TextInput,
  NumberInput,
  Button,
  Stack,
  Title,
  Divider,
  Switch,
  Group,
  Text,
  Loader,
  Alert,
  Accordion,
  FileButton,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useForm } from '@mantine/form'
import { KimaiApi, Project } from '../services/kimaiApi'
import { Settings } from '../hooks/useSettings'
import ProjectSettingsForm from './ProjectSettingsForm'

interface SettingsFormProps {
  settings: Settings
  onUpdate: (settings: Settings) => void
}

export default function SettingsForm({ settings, onUpdate }: SettingsFormProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [importingFromUrl, setImportingFromUrl] = useState(false)
  const [syncUrl, setSyncUrl] = useState(settings.syncUrl || '')

  const form = useForm({
    initialValues: {
      apiUrl: settings.apiUrl || '',
      apiKey: settings.apiKey || '',
      ratePerMinute: settings.ratePerMinute || 0,
      useProxy: settings.useProxy || false,
      syncUrl: settings.syncUrl || '',
    },
  })

  const loadProjects = async () => {
    // Проверяем наличие всех необходимых данных
    if (!form.values.apiUrl || !form.values.apiKey || !form.values.apiUrl.trim() || !form.values.apiKey.trim()) {
      setProjects([])
      return
    }

    try {
      setLoadingProjects(true)
      setError(null)
      const api = new KimaiApi(form.values.apiUrl.trim(), form.values.apiKey.trim(), form.values.useProxy)
      const projectsData = await api.getProjects()
      setProjects(projectsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки проектов')
      console.error('Error loading projects:', err)
      setProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  useEffect(() => {
    // Загружаем проекты только если есть и URL и ключ
    const hasUrl = form.values.apiUrl && form.values.apiUrl.trim()
    const hasKey = form.values.apiKey && form.values.apiKey.trim()
    
    if (hasUrl && hasKey) {
      // Небольшая задержка, чтобы пользователь успел ввести данные
      const timeoutId = setTimeout(() => {
        loadProjects()
      }, 500)
      
      return () => clearTimeout(timeoutId)
    } else {
      setProjects([])
    }
  }, [form.values.apiUrl, form.values.apiKey, form.values.useProxy])


  const getProjectSettings = (projectId: number) => {
    return settings.projectSettings?.[projectId] || {
      enabled: false,
      hasWeeklyGoal: false,
      weeklyGoalHours: 20,
      hasPaymentPeriods: false,
      paymentPeriodWeeks: 2,
      startWeekNumber: 1,
      startYear: new Date().getFullYear(),
      hasStages: false,
      stages: [],
    }
  }

  const updateProjectSetting = (projectId: number, field: string, value: unknown) => {
    const currentSettings = { ...settings }
    if (!currentSettings.projectSettings) {
      currentSettings.projectSettings = {}
    }
    if (!currentSettings.projectSettings[projectId]) {
      currentSettings.projectSettings[projectId] = getProjectSettings(projectId)
    }
    currentSettings.projectSettings[projectId] = {
      ...currentSettings.projectSettings[projectId],
      [field]: value,
    }
    onUpdate(currentSettings)
  }

  const handleSubmit = (values: typeof form.values) => {
    const newSettings: Settings = {
      ...settings,
      apiUrl: values.apiUrl,
      apiKey: values.apiKey,
      ratePerMinute: values.ratePerMinute,
      useProxy: values.useProxy || false,
      syncUrl: values.syncUrl || '',
    }
    onUpdate(newSettings)
    notifications.show({
      title: 'Настройки сохранены',
      message: 'Все изменения успешно сохранены',
      color: 'green',
    })
  }

  const handleImportFromUrl = async () => {
    if (!form.values.syncUrl) {
      setError('Укажите URL для импорта настроек')
      return
    }

    try {
      setImportingFromUrl(true)
      setError(null)
      const response = await fetch(form.values.syncUrl)
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`)
      }
      const imported = await response.json() as Settings
      onUpdate(imported)
      if (imported.apiUrl && imported.apiKey) {
        form.setFieldValue('apiUrl', imported.apiUrl)
        form.setFieldValue('apiKey', imported.apiKey)
      }
      notifications.show({
        title: 'Настройки импортированы',
        message: 'Настройки успешно загружены из URL',
        color: 'green',
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError('Ошибка при импорте из URL: ' + errorMessage)
      notifications.show({
        title: 'Ошибка импорта',
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setImportingFromUrl(false)
    }
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kimai-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    notifications.show({
      title: 'Настройки экспортированы',
      message: 'Файл настроек успешно скачан',
      color: 'blue',
    })
  }

  const handleImport = (file: File | null) => {
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as Settings
        onUpdate(imported)
        // Обновляем форму и перезагружаем проекты после импорта
        if (imported.apiUrl && imported.apiKey) {
          form.setFieldValue('apiUrl', imported.apiUrl)
          form.setFieldValue('apiKey', imported.apiKey)
          // Проекты загрузятся автоматически через useEffect
        }
        notifications.show({
          title: 'Настройки импортированы',
          message: 'Настройки успешно загружены из файла',
          color: 'green',
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
        setError('Ошибка при импорте файла: ' + errorMessage)
        notifications.show({
          title: 'Ошибка импорта',
          message: errorMessage,
          color: 'red',
        })
      }
    }
    reader.readAsText(file)
  }

  return (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Title order={3}>API Настройки</Title>
            
            <TextInput
              label="URL Kimai"
              placeholder="https://kimai.example.com"
              required
              {...form.getInputProps('apiUrl')}
            />
            
            <TextInput
              label="API Key"
              type="password"
              required
              {...form.getInputProps('apiKey')}
            />
            
            <NumberInput
              label="Ставка за минуту (руб)"
              min={0}
              step={0.01}
              precision={2}
              required
              {...form.getInputProps('ratePerMinute')}
            />

            {import.meta.env.DEV && (
              <Switch
                label="Использовать прокси для обхода CORS (только в dev режиме)"
                description="Включите, если возникают ошибки CORS. Прокси настроен на URL из переменной окружения VITE_KIMAI_URL"
                {...form.getInputProps('useProxy', { type: 'checkbox' })}
              />
            )}

            <TextInput
              label="URL для синхронизации настроек"
              placeholder="https://example.com/settings.json"
              description="URL для импорта настроек с другого устройства"
              {...form.getInputProps('syncUrl')}
            />

            <Button type="submit" mt="md">Сохранить настройки</Button>
          </Stack>
        </form>
      </Paper>

      <Paper p="xl" withBorder>
        <Stack gap="md">
          <Title order={3}>Синхронизация настроек</Title>
          <Group>
            <TextInput
              placeholder="https://example.com/settings.json"
              value={syncUrl}
              onChange={(e) => setSyncUrl(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleImportFromUrl}
              loading={importingFromUrl}
              disabled={!syncUrl}
            >
              Импорт из URL
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper p="xl" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>Настройки проектов</Title>
            <Group>
              <FileButton onChange={handleImport} accept="application/json">
                {(props) => <Button {...props} variant="light">Импорт настроек</Button>}
              </FileButton>
              <Button onClick={handleExport} variant="light">Экспорт настроек</Button>
            </Group>
          </Group>

          {error && (
            <Alert color="red" title="Ошибка">
              {error}
            </Alert>
          )}

          {loadingProjects ? (
            <Loader />
          ) : projects.length === 0 ? (
            <Text c="dimmed">
              {form.values.apiUrl && form.values.apiKey
                ? 'Проекты не найдены или произошла ошибка загрузки'
                : 'Заполните URL и API Key для загрузки проектов'}
            </Text>
          ) : (
            <Accordion>
              {projects.map((project) => {
                const projectSettings = getProjectSettings(project.id)
                return (
                  <Accordion.Item key={project.id} value={`project-${project.id}`}>
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text fw={500}>{project.name}</Text>
                        <Switch
                          checked={projectSettings.enabled}
                          onChange={(e) => {
                            e.stopPropagation()
                            updateProjectSetting(project.id, 'enabled', e.currentTarget.checked)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <ProjectSettingsForm
                        project={project}
                        settings={settings}
                        onUpdate={onUpdate}
                      />
                    </Accordion.Panel>
                  </Accordion.Item>
                )
              })}
            </Accordion>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}

