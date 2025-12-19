/**
 * AppProviders
 * 
 * Главный компонент провайдеров приложения.
 * Объединяет все необходимые провайдеры (Mantine, Router, Notifications и т.д.)
 */

import { Suspense, useEffect } from 'react'
import { MantineProvider, DirectionProvider, Center, Progress, Stack } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { NavigationProgress } from '@mantine/nprogress'
import { theme } from '@/theme'
import { useMixIdSync } from '@/shared/hooks/useMixIdSync'
import { useMixIdSession } from '@localzet/data-connector/hooks'
import { notifications } from '@mantine/notifications'

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const mq = useMediaQuery('(min-width: 40em)')
  
  // Initialize MIX ID sync
  useMixIdSync()
  
  // Session management with mutual deletion
  useMixIdSession({
    onSessionDeleted: () => {
      notifications.show({
        title: 'Сессия удалена',
        message: 'Ваша сессия была удалена в личном кабинете. Приложение отключено.',
        color: 'red',
      })
    },
    onSessionExpired: () => {
      notifications.show({
        title: 'Сессия истекла',
        message: 'Ваша сессия истекла. Пожалуйста, войдите снова.',
        color: 'orange',
      })
    },
  })

  useEffect(() => {
    const root = document.getElementById('root')
    if (root) {
      const bottomBar = document.createElement('div')
      bottomBar.className = 'safe-area-bottom'
      root.appendChild(bottomBar)
    }
  }, [])

  return (
    <DirectionProvider>
      <MantineProvider defaultColorScheme="dark" theme={theme}>
        <ModalsProvider>
          <Notifications position={mq ? 'top-right' : 'bottom-right'} />
          <NavigationProgress />

          <Suspense
            fallback={
              <Center h="100%">
                <Center style={{ height: `calc(60vh - var(--app-shell-header-height) - 20px)` }}>
                  <Stack align="center" gap="xs" w="100%">
                    <Progress
                      animated
                      color="cyan"
                      maw="32rem"
                      radius="xs"
                      striped
                      value={100}
                      w="80%"
                    />
                  </Stack>
                </Center>
              </Center>
            }
          >
            {children}
          </Suspense>
        </ModalsProvider>
      </MantineProvider>
    </DirectionProvider>
  )
}

