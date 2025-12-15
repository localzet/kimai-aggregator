import { Center, Card, Stack, Title, Text } from '@mantine/core'
import { MixIdConnection } from '@localzet/data-connector/components'
import { notifications } from '@mantine/notifications'
import { useNavigate } from 'react-router-dom'
import { useMixIdStatus } from '@localzet/data-connector/hooks'
import { mixIdApi } from '@localzet/data-connector/api'
import { useSettings } from '@/shared/hooks/useSettings'
import { BackendApi } from '@/shared/api/backendApi'

function AuthPage() {
  const navigate = useNavigate()
  const mixIdStatus = useMixIdStatus()
  const { settings, updateSettings } = useSettings()

  const handleConnected = async () => {
    try {
      // Пытаемся получить токен MIX ID из localStorage (его сохраняет data-connector)
      let mixIdToken: string | null = null
      try {
        mixIdToken =
          localStorage.getItem('mixid_access_token') ||
          localStorage.getItem('mixid_token') ||
          // fallback для возможных кастомных интеграций
          (window as any).mixidToken
      } catch (e) {
        console.warn('Could not get MIX ID token on AuthPage:', e)
      }

      if (!mixIdToken) {
        // Если по какой‑то причине токена нет, просто идём дальше — MIX ID всё равно подключён
        navigate('/dashboard', { replace: true })
        return
      }

      // 1) Авторизуемся в бэкенде через MIX ID и получаем токен
      const defaultBackendUrl =
        (import.meta.env.VITE_BACKEND_URL as string) || 'https://kimai-api.zorin.cloud'
      const backendUrl = settings.backendUrl || defaultBackendUrl

      let backendToken: string | null = null
      let backendApi: BackendApi | null = null
      
      if (backendUrl) {
        try {
          backendApi = new BackendApi(backendUrl.trim())
          const authResponse = await backendApi.login(mixIdToken)
          backendToken = authResponse.token
          backendApi.setToken(backendToken)
        } catch (e) {
          console.warn('Backend auth via MIX ID failed on AuthPage:', e)
        }
      }

      // 2) Пытаемся получить настройки из MIX ID и синхронизировать с бэком
      if (backendApi && backendToken) {
        try {
          const apiBase = import.meta.env.VITE_MIX_ID_API_BASE || 'https://data-center.zorin.cloud/api'
          const clientId = import.meta.env.VITE_MIX_ID_CLIENT_ID || ''
          const clientSecret = import.meta.env.VITE_MIX_ID_CLIENT_SECRET || ''

          let remoteSettings: any | null = null
          if (clientId && clientSecret) {
            mixIdApi.setConfig({ apiBase, clientId, clientSecret })
            remoteSettings = await mixIdApi.downloadSettings()
          }

          const downloadedSettings = remoteSettings?.settings

          // Получаем текущие настройки с бэка
          let backendSettings: any = null
          try {
            backendSettings = await backendApi.getSettings()
          } catch (e) {
            console.warn('Could not get settings from backend:', e)
          }

          // Определяем актуальные настройки: приоритет у MIX ID, если их нет - используем бэкенд
          const effectiveSettings = downloadedSettings || backendSettings

          // Если есть настройки из MIX ID, отправляем их в бэкенд
          if (downloadedSettings && downloadedSettings.apiUrl && downloadedSettings.apiKey) {
            try {
              await backendApi.updateSettings({
                kimai_api_url: downloadedSettings.apiUrl,
                kimai_api_key: downloadedSettings.apiKey,
                rate_per_minute: downloadedSettings.ratePerMinute,
                project_settings: downloadedSettings.projectSettings,
                excluded_tags: downloadedSettings.excludedTags,
                calendar_sync: downloadedSettings.calendarSync,
              } as any)
            } catch (e) {
              console.warn('Could not push settings to backend on AuthPage:', e)
            }
          }

          // Если на бэке нет настроек, но есть локальные - отправляем их
          if (!backendSettings && settings.apiUrl && settings.apiKey) {
            try {
              await backendApi.updateSettings({
                kimai_api_url: settings.apiUrl,
                kimai_api_key: settings.apiKey,
                rate_per_minute: settings.ratePerMinute,
                project_settings: settings.projectSettings,
                excluded_tags: settings.excludedTags,
                calendar_sync: settings.calendarSync,
              } as any)
            } catch (e) {
              console.warn('Could not push local settings to backend on AuthPage:', e)
            }
          }

          // Триггерим начальный импорт из Kimai (если настройки есть)
          const finalSettings = effectiveSettings || backendSettings || settings
          if (finalSettings?.apiUrl && finalSettings?.apiKey) {
            await backendApi.triggerSync().catch((e) => {
              console.warn('Could not trigger initial Kimai sync:', e)
            })
          }
        } catch (e) {
          console.warn('Could not sync settings from MIX ID on AuthPage:', e)
        }
      }

      // 3) Локально сохраняем только токен бэкенда и URL (для работы приложения)
      // Сами настройки не храним локально, они всегда берутся с бэка
      const localSettings = {
        ...settings,
        appMode: 'normal' as const,
        backendUrl,
        backendToken: backendToken || settings.backendToken || '',
      }
      updateSettings(localSettings)

      notifications.show({
        title: 'MIX ID подключён',
        message: 'Бэкенд авторизован. Настройки синхронизированы с MIX ID и бэкендом.',
        color: 'green',
      })
    } catch (error) {
      console.error('Error during MIX ID connect flow on AuthPage:', error)
      notifications.show({
        title: 'Ошибка при инициализации',
        message:
          error instanceof Error
            ? error.message
            : 'Не удалось автоматически подтянуть настройки из MIX ID. Вы можете настроить позже.',
        color: 'orange',
      })
    } finally {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <Center h="100%">
      <Card shadow="md" padding="xl" radius="md" maw={480} w="100%">
        <Stack gap="md">
          <Title order={2}>Вход в Kimai Aggregator</Title>
          <Text c="dimmed" size="sm">
            Аутентификация и управление аккаунтом выполняются через MIX ID. Здесь вы можете
            войти, выйти, восстановить доступ и управлять сессиями.
          </Text>

          <MixIdConnection
            onConnected={handleConnected}
            onDisconnected={() => {
              navigate('/auth', { replace: true })
            }}
            showSyncSettings={false}
            showSyncData={false}
            notifications={notifications}
          />
        </Stack>
      </Card>
    </Center>
  )
}

export default AuthPage
