import { Center, Card, Stack, Title, Text } from '@mantine/core'
import { MixIdConnection } from '@localzet/data-connector/components'
import { notifications } from '@mantine/notifications'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMixIdStatus } from '@localzet/data-connector/hooks'

function AuthPage() {
  const navigate = useNavigate()
  const mixIdStatus = useMixIdStatus()

  useEffect(() => {
    if (mixIdStatus.isConnected) {
      navigate('/dashboard', { replace: true })
    }
  }, [mixIdStatus.isConnected, navigate])

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
            onConnected={() => {
              navigate('/dashboard', { replace: true })
            }}
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


