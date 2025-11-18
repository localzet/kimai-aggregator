import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stepper,
  Button,
  Group,
  Paper,
  Stack,
  Title,
  Text,
  TextInput,
  FileButton,
  Loader,
  Alert,
  Card,
  Badge,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX, IconUpload, IconKey, IconServer } from '@tabler/icons-react'
import { KimaiApi, Project } from '@/shared/api/kimaiApi'
import { Settings, useSettings } from '@/shared/hooks/useSettings'

interface SetupWizardProps {
  onComplete: () => void
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const navigate = useNavigate()
  const { updateSettings } = useSettings()
  const [active, setActive] = useState(0)
  const [setupMethod, setSetupMethod] = useState<'manual' | 'import' | null>(null)
  
  // Для ручного ввода
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [useProxy, setUseProxy] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  
  // Для импорта
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const testConnection = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      setConnectionError('Заполните все поля')
      setConnectionStatus('error')
      return
    }

    try {
      setTestingConnection(true)
      setConnectionError(null)
      setConnectionStatus('idle')

      const api = new KimaiApi(apiUrl.trim(), apiKey.trim(), useProxy)
      const projectsData = await api.getProjects()
      
      setProjects(projectsData)
      setConnectionStatus('success')
      notifications.show({
        title: 'Подключение успешно',
        message: `Найдено проектов: ${projectsData.length}`,
        color: 'green',
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setConnectionError(errorMessage)
      setConnectionStatus('error')
      notifications.show({
        title: 'Ошибка подключения',
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleImport = async (file: File | null) => {
    if (!file) return

    setImporting(true)
    setImportError(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as Settings
        
        if (!imported.apiUrl || !imported.apiKey) {
          throw new Error('В файле отсутствуют обязательные поля: apiUrl или apiKey')
        }

        // Проверяем подключение
        try {
          const api = new KimaiApi(imported.apiUrl.trim(), imported.apiKey.trim(), imported.useProxy || false)
          const projectsData = await api.getProjects()
          
          setProjects(projectsData)
          
          // Сохраняем настройки
          updateSettings(imported)
          
          notifications.show({
            title: 'Импорт успешен',
            message: `Настройки импортированы. Найдено проектов: ${projectsData.length}`,
            color: 'green',
          })
          
          // Переходим к завершению
          setTimeout(() => {
            setActive(2)
          }, 500)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
          throw new Error(`Ошибка подключения к API: ${errorMessage}`)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
        setImportError(errorMessage)
        notifications.show({
          title: 'Ошибка импорта',
          message: errorMessage,
          color: 'red',
        })
      } finally {
        setImporting(false)
      }
    }
    reader.readAsText(file)
  }

  const handleComplete = () => {
    if (setupMethod === 'manual' && connectionStatus === 'success') {
      // Сохраняем настройки
      const newSettings: Settings = {
        apiUrl: apiUrl.trim(),
        apiKey: apiKey.trim(),
        ratePerMinute: 0,
        useProxy: useProxy,
        syncUrl: '',
        projectSettings: {},
        excludedTags: [],
      }
      updateSettings(newSettings)
    }

    notifications.show({
      title: 'Настройка завершена',
      message: 'Добро пожаловать! Перенаправление на главную страницу...',
      color: 'green',
    })

    // Используем window.location для полной перезагрузки, чтобы меню обновилось
    setTimeout(() => {
      onComplete()
      window.location.href = '/dashboard'
    }, 1000)
  }

  const canProceedFromStep0 = setupMethod !== null
  const canProceedFromStep1 = setupMethod === 'import' 
    ? true 
    : connectionStatus === 'success'

  return (
    <Paper p="xl" maw={800} mx="auto" mt="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} mb="xs">Добро пожаловать в Kimai Aggregator!</Title>
          <Text c="dimmed">Давайте настроим приложение для работы с вашим Kimai</Text>
        </div>

        <Stepper active={active} onStepClick={setActive} breakpoint="sm">
          <Stepper.Step 
            label="Способ настройки" 
            description="Выберите способ настройки"
            icon={<IconKey size={18} />}
            allowStepSelect={active > 0}
          >
            <Stack gap="md" mt="xl">
              <Text>Как вы хотите настроить приложение?</Text>
              
              <Group grow>
                <Card
                  p="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSetupMethod('manual')}
                  bg={setupMethod === 'manual' ? 'var(--mantine-color-blue-9)' : undefined}
                >
                  <Stack align="center" gap="xs">
                    <IconServer size={48} />
                    <Text fw={500}>Вручную</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Введите URL и API ключ вручную
                    </Text>
                  </Stack>
                </Card>

                <Card
                  p="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSetupMethod('import')}
                  bg={setupMethod === 'import' ? 'var(--mantine-color-blue-9)' : undefined}
                >
                  <Stack align="center" gap="xs">
                    <IconUpload size={48} />
                    <Text fw={500}>Импорт из файла</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Загрузите файл с настройками
                    </Text>
                  </Stack>
                </Card>
              </Group>

              {setupMethod === 'import' && (
                <Stack gap="md" mt="md">
                  <FileButton onChange={handleImport} accept="application/json">
                    {(props) => (
                      <Button 
                        {...props} 
                        leftSection={<IconUpload size={16} />}
                        loading={importing}
                        fullWidth
                      >
                        {importing ? 'Импорт...' : 'Выбрать файл настроек'}
                      </Button>
                    )}
                  </FileButton>
                  
                  {importError && (
                    <Alert color="red" title="Ошибка импорта">
                      {importError}
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label="Подключение"
            description={setupMethod === 'import' ? 'Проверка импортированных данных' : 'Введите данные API'}
            icon={<IconServer size={18} />}
            allowStepSelect={active > 1}
          >
            <Stack gap="md" mt="xl">
              {setupMethod === 'manual' ? (
                <>
                  <TextInput
                    label="URL Kimai"
                    placeholder="https://kimai.example.com"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.currentTarget.value)}
                    required
                    disabled={testingConnection}
                  />

                  <TextInput
                    label="API Key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.currentTarget.value)}
                    required
                    disabled={testingConnection}
                  />

                  {import.meta.env.DEV && (
                    <Button
                      variant="light"
                      onClick={() => setUseProxy(!useProxy)}
                      disabled={testingConnection}
                    >
                      {useProxy ? '✓' : ''} Использовать прокси (dev режим)
                    </Button>
                  )}

                  <Button
                    onClick={testConnection}
                    loading={testingConnection}
                    disabled={!apiUrl.trim() || !apiKey.trim()}
                    fullWidth
                    mt="md"
                  >
                    Проверить подключение
                  </Button>

                  {connectionStatus === 'success' && (
                    <Alert color="green" title="Подключение успешно" icon={<IconCheck size={16} />}>
                      <Text>Найдено проектов: <strong>{projects.length}</strong></Text>
                    </Alert>
                  )}

                  {connectionStatus === 'error' && connectionError && (
                    <Alert color="red" title="Ошибка подключения" icon={<IconX size={16} />}>
                      {connectionError}
                    </Alert>
                  )}
                </>
              ) : (
                <Stack gap="md">
                  {importing ? (
                    <Loader size="lg" />
                  ) : projects.length > 0 ? (
                    <Alert color="green" title="Импорт успешен" icon={<IconCheck size={16} />}>
                      <Text>Найдено проектов: <strong>{projects.length}</strong></Text>
                    </Alert>
                  ) : (
                    <Alert color="blue" title="Ожидание">
                      Загрузите файл настроек на предыдущем шаге
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label="Завершение"
            description="Готово к работе"
            icon={<IconCheck size={18} />}
            allowStepSelect={false}
          >
            <Stack gap="md" mt="xl">
              <Alert color="green" title="Настройка завершена!">
                <Text mb="md">
                  Приложение готово к работе. Вы можете настроить проекты и другие параметры в разделе настроек.
                </Text>
                {projects.length > 0 && (
                  <Badge color="blue" size="lg">
                    Найдено проектов: {projects.length}
                  </Badge>
                )}
              </Alert>
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            <Stack gap="md" mt="xl">
              <Alert color="green" title="Добро пожаловать!">
                Настройка завершена. Перенаправление на главную страницу...
              </Alert>
            </Stack>
          </Stepper.Completed>
        </Stepper>

        <Group justify="flex-end" mt="xl">
          {active > 0 && (
            <Button variant="default" onClick={() => setActive(active - 1)}>
              Назад
            </Button>
          )}
          
          {active < 2 && (
            <Button
              onClick={() => setActive(active + 1)}
              disabled={
                (active === 0 && !canProceedFromStep0) ||
                (active === 1 && !canProceedFromStep1)
              }
            >
              Далее
            </Button>
          )}
          
          {active === 2 && (
            <Button onClick={handleComplete}>
              Завершить настройку
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  )
}

