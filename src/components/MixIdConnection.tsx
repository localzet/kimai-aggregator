import { useState, useEffect } from 'react'
import {
  Paper,
  Group,
  Button,
  Text,
  Badge,
  Modal,
  Stack,
  Switch,
  Alert,
  Loader,
  Title,
} from '@mantine/core'
import { IconPlug, IconSettings, IconLogout, IconCheck, IconX } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'
import { mixIdApi, MixIdConfig } from '@/shared/api/mixIdApi'
import { Settings } from '@/shared/hooks/useSettings'

interface MixIdConnectionProps {
  settings: Settings
  onSettingsUpdate: (settings: Settings) => void
}

export default function MixIdConnection({ settings, onSettingsUpdate }: MixIdConnectionProps) {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<{
    syncSettings: boolean
    syncData: boolean
    lastSyncAt: string | null
  } | null>(null)
  const [settingsModalOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false)
  const [syncSettings, setSyncSettings] = useState(false)
  const [syncData, setSyncData] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const config = mixIdApi.getConfig()
      if (!config || !config.accessToken) {
        setConnected(false)
        return
      }

      const status = await mixIdApi.getSyncStatus()
      setSyncStatus(status)
      setSyncSettings(status.syncSettings)
      setSyncData(status.syncData)
      setConnected(true)
    } catch (error) {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      // Get config from settings or environment
      const apiBase = import.meta.env.VITE_MIX_ID_API_BASE || 'http://localhost:3000/api'
      const clientId = import.meta.env.VITE_MIX_ID_CLIENT_ID || ''
      const clientSecret = import.meta.env.VITE_MIX_ID_CLIENT_SECRET || ''

      if (!clientId || !clientSecret) {
        notifications.show({
          title: 'Ошибка',
          message: 'MIX ID не настроен. Укажите VITE_MIX_ID_CLIENT_ID и VITE_MIX_ID_CLIENT_SECRET',
          color: 'red',
        })
        return
      }

      mixIdApi.setConfig({ apiBase, clientId, clientSecret })

      // Initiate OAuth flow
      const redirectUri = window.location.origin + '/mixid-callback'
      const { authorizationUrl, code } = await mixIdApi.initiateOAuth(redirectUri)

      // Open OAuth window
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const oauthWindow = window.open(
        authorizationUrl,
        'MIX ID Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data.type === 'mixid-oauth-callback') {
          window.removeEventListener('message', handleMessage)
          oauthWindow?.close()

          try {
            const { code: callbackCode } = event.data
            await mixIdApi.exchangeCodeForToken(callbackCode || code, redirectUri)
            // Dispatch event to trigger WebSocket connection and status update
            window.dispatchEvent(new Event('mixid-config-changed'))
            await checkConnection()
            notifications.show({
              title: 'Успешно',
              message: 'MIX ID подключен',
              color: 'green',
            })
            openSettings()
          } catch (error) {
            notifications.show({
              title: 'Ошибка',
              message: error instanceof Error ? error.message : 'Не удалось подключить MIX ID',
              color: 'red',
            })
          }
        }
      }

      window.addEventListener('message', handleMessage)

      // Fallback: check if window was closed manually
      const checkClosed = setInterval(() => {
        if (oauthWindow?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
        }
      }, 1000)
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: error instanceof Error ? error.message : 'Не удалось инициировать подключение',
        color: 'red',
      })
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Вы уверены, что хотите отключить MIX ID?')) return

    mixIdApi.clearConfig()
    // Dispatch event to trigger WebSocket disconnection and status update
    window.dispatchEvent(new Event('mixid-config-changed'))
    setConnected(false)
    setSyncStatus(null)
    notifications.show({
      title: 'Успешно',
      message: 'MIX ID отключен',
      color: 'blue',
    })
  }

  const handleSaveSettings = async () => {
    try {
      await mixIdApi.updateSyncPreferences(syncSettings, syncData)
      notifications.show({
        title: 'Успешно',
        message: 'Настройки синхронизации сохранены',
        color: 'green',
      })
      closeSettings()
      await checkConnection()
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: error instanceof Error ? error.message : 'Не удалось сохранить настройки',
        color: 'red',
      })
    }
  }

  if (loading) {
    return (
      <Paper p="md" withBorder>
        <Loader size="sm" />
      </Paper>
    )
  }

  return (
    <>
      <Paper p="md" withBorder>
        <Group justify="space-between">
          <Group>
            <IconPlug size={24} />
            <div>
              <Text fw={500}>MIX ID</Text>
              <Text size="sm" c="dimmed">
                Синхронизация данных через Zorin Projects
              </Text>
            </div>
          </Group>
          {connected ? (
            <Group>
              {syncStatus && (
                <Group gap="xs">
                  <Badge color={syncStatus.syncSettings ? 'green' : 'gray'}>Настройки</Badge>
                  <Badge color={syncStatus.syncData ? 'green' : 'gray'}>Данные</Badge>
                </Group>
              )}
              <Button leftSection={<IconSettings size={16} />} variant="light" onClick={openSettings}>
                Параметры
              </Button>
              <Button leftSection={<IconLogout size={16} />} variant="subtle" onClick={handleDisconnect}>
                Выйти
              </Button>
            </Group>
          ) : (
            <Button leftSection={<IconPlug size={16} />} onClick={handleConnect}>
              Подключить
            </Button>
          )}
        </Group>
      </Paper>

      <Modal opened={settingsModalOpened} onClose={closeSettings} title="Параметры синхронизации MIX ID">
        <Stack gap="md">
          <Alert>
            <Text size="sm">
              MIX ID позволяет синхронизировать ваши настройки и данные между устройствами. Вы можете выбрать,
              что именно синхронизировать.
            </Text>
          </Alert>

          <Switch
            label="Синхронизировать настройки"
            description="Настройки приложения будут синхронизироваться с сервером"
            checked={syncSettings}
            onChange={(e) => {
              setSyncSettings(e.currentTarget.checked)
              if (!e.currentTarget.checked) {
                setSyncData(false)
              }
            }}
          />

          <Switch
            label="Синхронизировать данные"
            description="Данные приложения будут синхронизироваться с сервером"
            checked={syncData}
            onChange={(e) => setSyncData(e.currentTarget.checked)}
            disabled={!syncSettings}
          />

          {!syncSettings && (
            <Alert color="yellow" icon={<IconX size={16} />}>
              Для синхронизации данных необходимо включить синхронизацию настроек
            </Alert>
          )}

          {syncStatus?.lastSyncAt && (
            <Text size="sm" c="dimmed">
              Последняя синхронизация: {new Date(syncStatus.lastSyncAt).toLocaleString('ru-RU')}
            </Text>
          )}

          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeSettings}>
              Отмена
            </Button>
            <Button onClick={handleSaveSettings}>Сохранить</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

