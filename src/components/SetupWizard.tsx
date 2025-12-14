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
import { IconCheck, IconX, IconUpload, IconKey, IconServer, IconCloud, IconPlug, IconDeviceDesktop, IconCloudComputing } from '@tabler/icons-react'
import { KimaiApi, Project } from '@/shared/api/kimaiApi'
import { Settings, useSettings, AppMode } from '@/shared/hooks/useSettings'
import { mixIdApi } from '@localzet/data-connector/api'
import { BackendApi } from '@/shared/api/backendApi'

interface SetupWizardProps {
  onComplete: () => void
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const navigate = useNavigate()
  const { updateSettings } = useSettings()
  const [active, setActive] = useState(0)
  const [appMode, setAppMode] = useState<AppMode | null>(null)
  const [backendUrl, setBackendUrl] = useState('')
  const [setupMethod, setSetupMethod] = useState<'manual' | 'import' | 'sync' | null>(null)
  
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
  
  // Для синхронизации
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState(false)

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

  const handleComplete = async () => {
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
        appMode: appMode || 'normal',
        backendUrl: appMode === 'normal' ? backendUrl.trim() : '',
        backendToken: '',
      }
      updateSettings(newSettings)

      // Если обычный режим, авторизуемся в бэкенде через MIX ID
      if (appMode === 'normal' && backendUrl.trim()) {
        try {
          // Получаем токен MIX ID из localStorage или из mixIdApi
          let mixIdToken: string | null = null
          
          // Пытаемся получить токен из mixIdApi
          try {
            // Проверяем, есть ли токен в localStorage (mixIdApi хранит его там)
            const storedToken = localStorage.getItem('mixid_access_token') || 
                               localStorage.getItem('mixid_token') ||
                               (window as any).mixidToken
            mixIdToken = storedToken
          } catch (e) {
            console.warn('Could not get MIX ID token:', e)
          }
          
          // Если токена нет, пытаемся получить его из localStorage
          // (токен мог быть сохранен при предыдущей авторизации или при синхронизации)
          if (!mixIdToken) {
            try {
              const apiBase = import.meta.env.VITE_MIX_ID_API_BASE || 'https://data-center.zorin.cloud/api'
              const clientId = import.meta.env.VITE_MIX_ID_CLIENT_ID || ''
              const clientSecret = import.meta.env.VITE_MIX_ID_CLIENT_SECRET || ''
              
              if (clientId && clientSecret) {
                mixIdApi.setConfig({ apiBase, clientId, clientSecret })
                // Проверяем localStorage снова после настройки mixIdApi
                mixIdToken = localStorage.getItem('mixid_access_token') || 
                             localStorage.getItem('mixid_token')
              }
            } catch (e) {
              console.warn('Could not retrieve MIX ID token:', e)
            }
          }
          
          if (!mixIdToken) {
            notifications.show({
              title: 'Требуется авторизация MIX ID',
              message: 'Для работы в обычном режиме необходимо авторизоваться через MIX ID. Используйте синхронизацию MIX ID на шаге 2.',
              color: 'yellow',
            })
            // Не блокируем завершение, но предупреждаем
          } else {
            // Авторизуемся в бэкенде
            const backendApi = new BackendApi(backendUrl.trim())
            const authResponse = await backendApi.login(mixIdToken)
            
            // Сохраняем токен бэкенда
            newSettings.backendToken = authResponse.token
            updateSettings(newSettings)
            
            notifications.show({
              title: 'Авторизация успешна',
              message: 'Подключение к бэкенду установлено',
              color: 'green',
            })
          }
        } catch (error) {
          console.error('Backend auth error:', error)
          notifications.show({
            title: 'Ошибка авторизации в бэкенде',
            message: error instanceof Error ? error.message : 'Не удалось авторизоваться в бэкенде. Вы можете авторизоваться позже в настройках.',
            color: 'orange',
          })
          // Не блокируем завершение настройки, пользователь может авторизоваться позже
        }
      }
    } else if (setupMethod === 'sync' && syncSuccess) {
      // Settings already loaded from sync, но обновляем режим
      const currentSettings = JSON.parse(localStorage.getItem('kimai-settings') || '{}') as Settings
      updateSettings({
        ...currentSettings,
        appMode: appMode || 'normal',
        backendUrl: appMode === 'normal' ? backendUrl.trim() : currentSettings.backendUrl || '',
      })
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

  const canProceedFromStep0 = appMode !== null && (appMode === 'standalone' || (appMode === 'normal' && backendUrl.trim() !== ''))
  const canProceedFromStep1 = setupMethod !== null
  const canProceedFromStep2 = setupMethod === 'import' 
    ? true 
    : setupMethod === 'sync'
    ? syncSuccess
    : connectionStatus === 'success'

  return (
    <Paper p="xl" maw={800} mx="auto" mt="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} mb="xs">Добро пожаловать в Kimai Aggregator!</Title>
          <Text c="dimmed">Давайте настроим приложение для работы с вашим Kimai</Text>
        </div>

        <Stepper active={active} onStepClick={setActive}>
          <Stepper.Step 
            label="Режим работы" 
            description="Выберите режим работы приложения"
            icon={<IconDeviceDesktop size={18} />}
            allowStepSelect={active > 0}
          >
            <Stack gap="md" mt="xl">
              <Text>В каком режиме будет работать приложение?</Text>
              
              <Group grow>
                <Card
                  p="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => setAppMode('standalone')}
                  bg={appMode === 'standalone' ? 'var(--mantine-color-blue-9)' : undefined}
                >
                  <Stack align="center" gap="xs">
                    <IconDeviceDesktop size={48} />
                    <Text fw={500}>Автономный режим</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Данные хранятся локально. Опциональная синхронизация с MIX ID.
                    </Text>
                  </Stack>
                </Card>

                <Card
                  p="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => setAppMode('normal')}
                  bg={appMode === 'normal' ? 'var(--mantine-color-blue-9)' : undefined}
                >
                  <Stack align="center" gap="xs">
                    <IconCloudComputing size={48} />
                    <Text fw={500}>Обычный режим</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Данные синхронизируются с бэкендом. Требуется MIX ID и подключение к серверу.
                    </Text>
                  </Stack>
                </Card>
              </Group>

              {appMode === 'normal' && (
                <Stack gap="md" mt="md">
                  <TextInput
                    label="URL бэкенда"
                    placeholder="https://backend.example.com"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.currentTarget.value)}
                    description="Адрес сервера бэкенда для синхронизации данных"
                  />
                  <Alert color="blue">
                    <Text size="sm">
                      В обычном режиме требуется авторизация через MIX ID. 
                      Данные старше месяца будут автоматически удаляться с устройства для экономии места.
                    </Text>
                  </Alert>
                </Stack>
              )}

              {appMode === 'standalone' && (
                <Alert color="blue" mt="md">
                  <Text size="sm">
                    В автономном режиме все данные хранятся на вашем устройстве. 
                    Вы можете опционально подключить MIX ID для синхронизации между устройствами.
                  </Text>
                </Alert>
              )}
            </Stack>
          </Stepper.Step>

          <Stepper.Step 
            label="Способ настройки" 
            description="Выберите способ настройки"
            icon={<IconKey size={18} />}
            allowStepSelect={active > 1}
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

                <Card
                  p="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSetupMethod('sync')}
                  bg={setupMethod === 'sync' ? 'var(--mantine-color-blue-9)' : undefined}
                >
                  <Stack align="center" gap="xs">
                    <IconCloud size={48} />
                    <Text fw={500}>Синхронизация MIX ID</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Загрузите настройки из облака
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
            description={
              setupMethod === 'import' 
                ? 'Проверка импортированных данных' 
                : setupMethod === 'sync'
                ? 'Подключение к MIX ID'
                : 'Введите данные API'
            }
            icon={setupMethod === 'sync' ? <IconCloud size={18} /> : <IconServer size={18} />}
            allowStepSelect={active > 2}
          >
            <Stack gap="md" mt="xl">
              {setupMethod === 'sync' ? (
                <>
                  <Alert>
                    <Text size="sm">
                      Подключите MIX ID для синхронизации настроек из облака. Если у вас уже есть аккаунт MIX ID,
                      ваши настройки будут автоматически загружены.
                    </Text>
                  </Alert>
                  
                  <Button
                    onClick={async () => {
                      try {
                        setSyncing(true)
                        setSyncError(null)
                        
                        const apiBase = import.meta.env.VITE_MIX_ID_API_BASE || 'https://data-center.zorin.cloud/api'
                        const clientId = import.meta.env.VITE_MIX_ID_CLIENT_ID || ''
                        const clientSecret = import.meta.env.VITE_MIX_ID_CLIENT_SECRET || ''
                        
                        if (!clientId || !clientSecret) {
                          throw new Error('MIX ID не настроен. Обратитесь к администратору.')
                        }
                        
                        mixIdApi.setConfig({ apiBase, clientId, clientSecret })
                        
                        // Для Electron используем file:// или localhost в зависимости от режима
                        const isElectron = typeof window !== 'undefined' && (
                          window.electron?.isElectron || 
                          (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')) ||
                          window.location.protocol === 'file:'
                        )
                        
                        let redirectUri
                        if (isElectron && window.location.protocol === 'file:') {
                          // В production Electron используем file://
                          redirectUri = 'file:///mixid-callback'
                        } else if (isElectron) {
                          // В dev режиме используем localhost
                          redirectUri = window.location.origin + '/mixid-callback'
                        } else {
                          // В браузере используем текущий origin
                          redirectUri = window.location.origin + '/mixid-callback'
                        }
                        
                        console.log('MIX ID redirect URI:', redirectUri, 'isElectron:', isElectron, 'protocol:', window.location.protocol)
                        const { authorizationUrl, code } = await mixIdApi.initiateOAuth(redirectUri)
                        
                        const width = 600
                        const height = 700
                        const left = window.screenX + (window.outerWidth - width) / 2
                        const top = window.screenY + (window.outerHeight - height) / 2
                        
                        const oauthWindow = window.open(
                          authorizationUrl,
                          'MIX ID Authorization',
                          `width=${width},height=${height},left=${left},top=${top}`
                        )
                        
                        const handleMessage = async (event: MessageEvent) => {
                          if (event.origin !== window.location.origin) return
                          if (event.data.type === 'mixid-oauth-callback') {
                            window.removeEventListener('message', handleMessage)
                            oauthWindow?.close()
                            
                            try {
                              const { code: callbackCode } = event.data
                              const tokenResponse = await mixIdApi.exchangeCodeForToken(callbackCode || code, redirectUri)
                              
                              // Сохраняем токен для использования в бэкенде
                              if (tokenResponse?.access_token) {
                                localStorage.setItem('mixid_access_token', tokenResponse.access_token)
                              }
                              
                              // Dispatch event to trigger WebSocket connection and status update
                              window.dispatchEvent(new Event('mixid-config-changed'))
                              
                              // Download settings
                              const remoteSettings = await mixIdApi.downloadSettings()
                              if (remoteSettings.settings) {
                                updateSettings(remoteSettings.settings)
                                setSyncSuccess(true)
                                setProjects([]) // Will be loaded after settings are saved
                              }
                            } catch (error) {
                              setSyncError(error instanceof Error ? error.message : 'Ошибка синхронизации')
                            } finally {
                              setSyncing(false)
                            }
                          }
                        }
                        
                        window.addEventListener('message', handleMessage)
                        
                        const checkClosed = setInterval(() => {
                          if (oauthWindow?.closed) {
                            clearInterval(checkClosed)
                            window.removeEventListener('message', handleMessage)
                            if (!syncSuccess) {
                              setSyncing(false)
                            }
                          }
                        }, 1000)
                      } catch (error) {
                        setSyncError(error instanceof Error ? error.message : 'Ошибка подключения')
                        setSyncing(false)
                      }
                    }}
                    loading={syncing}
                    leftSection={<IconPlug size={16} />}
                    fullWidth
                  >
                    {syncing ? 'Подключение...' : 'Подключить MIX ID'}
                  </Button>
                  
                  {syncSuccess && (
                    <Alert color="green" title="Синхронизация успешна" icon={<IconCheck size={16} />}>
                      <Text>Настройки загружены из облака</Text>
                    </Alert>
                  )}
                  
                  {syncError && (
                    <Alert color="red" title="Ошибка синхронизации" icon={<IconX size={16} />}>
                      {syncError}
                    </Alert>
                  )}
                </>
              ) : setupMethod === 'manual' ? (
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
            allowStepSelect={active === 3}
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
          
          {active < 3 && (
            <Button
              onClick={() => setActive(active + 1)}
              disabled={
                (active === 0 && !canProceedFromStep0) ||
                (active === 1 && !canProceedFromStep1) ||
                (active === 2 && !canProceedFromStep2)
              }
            >
              Далее
            </Button>
          )}
          
          {active === 3 && (
            <Button onClick={handleComplete}>
              Завершить настройку
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  )
}

