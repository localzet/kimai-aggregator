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

      // 1) Пытаемся подтянуть настройки из MIX ID
      let remoteSettings: any | null = null
      try {
        const apiBase = import.meta.env.VITE_MIX_ID_API_BASE || 'https://data-center.zorin.cloud/api'
        const clientId = import.meta.env.VITE_MIX_ID_CLIENT_ID || ''
        const clientSecret = import.meta.env.VITE_MIX_ID_CLIENT_SECRET || ''

        if (clientId && clientSecret) {
          mixIdApi.setConfig({ apiBase, clientId, clientSecret })
          remoteSettings = await mixIdApi.downloadSettings()
        }
      } catch (e) {
        console.warn('Could not download settings from MIX ID on AuthPage:', e)
      }

      const downloadedSettings = remoteSettings?.settings

      // 2) Авторизуемся в бэкенде через MIX ID и сохраняем токен
      const defaultBackendUrl =
        (import.meta.env.VITE_BACKEND_URL as string) || 'https://kimai-api.zorin.cloud'
      const backendUrl = settings.backendUrl || defaultBackendUrl

      let backendToken: string | null = null
      if (backendUrl) {
        try {
          const backendApi = new BackendApi(backendUrl.trim())
          const authResponse = await backendApi.login(mixIdToken)
          backendToken = authResponse.token

          // Сохраняем токен в экземпляр API
          backendApi.setToken(backendToken)

          // 3) Если есть настройки (из MIX ID или локальные) — отправляем их в бэкенд
          const effectiveSettings = downloadedSettings || settings
          if (effectiveSettings?.apiUrl && effectiveSettings?.apiKey) {
            try {
              await backendApi.updateSettings({
                // backend ожидает snake_case поля
                kimai_api_url: effectiveSettings.apiUrl,
                kimai_api_key: effectiveSettings.apiKey,
                rate_per_minute: effectiveSettings.ratePerMinute,
                project_settings: effectiveSettings.projectSettings,
                excluded_tags: effectiveSettings.excludedTags,
                calendar_sync: effectiveSettings.calendarSync,
              } as any)

              // 4) Триггерим начальный импорт из Kimai
              await backendApi.triggerSync().catch((e) => {
                console.warn('Could not trigger initial Kimai sync:', e)
              })
            } catch (e) {
              console.warn('Could not push settings to backend on AuthPage:', e)
            }
          }
        } catch (e) {
          console.warn('Backend auth via MIX ID failed on AuthPage:', e)
        }
      }

      // 5) Локально сохраняем самые свежие настройки и токен бэкенда
      const mergedLocalSettings = {
        ...settings,
        ...(downloadedSettings || {}),
        backendUrl,
        backendToken: backendToken || settings.backendToken || '',
      }
      updateSettings(mergedLocalSettings)

      notifications.show({
        title: 'MIX ID подключён',
        message: downloadedSettings
          ? 'Настройки загружены из MIX ID, бэкенд авторизован и синхронизация запущена.'
          : 'MIX ID подключён. Если есть сохранённые настройки, они будут синхронизированы.',
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
