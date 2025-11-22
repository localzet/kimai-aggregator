// import '@mantine/carousel/styles.css'
import '@mantine/charts/styles.css'
// import '@mantine/code-highlight/styles.css'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
// import '@mantine/dropzone/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/nprogress/styles.css'
// import '@mantine/spotlight/styles.css'
import 'mantine-react-table/styles.css'
import 'mantine-datatable/styles.layer.css'
import '@gfazioli/mantine-list-view-table/styles.css'
import '@gfazioli/mantine-split-pane/styles.css'

import './global.css'

import { ElementType, Suspense, useEffect } from 'react'
import { MantineProvider, DirectionProvider, Center, Progress, Stack } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { theme } from './theme'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { NavigationProgress } from '@mantine/nprogress'
import { Router } from './router'
import { useMixIdSync } from './shared/hooks/useMixIdSync'

export interface MenuItem {
  header?: string
  id?: string
  section: {
    dropdownItems?: {
      href: string
      icon?: ElementType
      id: string
      name: string
    }[]
    href: string
    icon: ElementType
    id: string
    name: string
    newTab?: boolean
  }[]
}

function App() {
  const mq = useMediaQuery('(min-width: 40em)')
  
  // Initialize MIX ID sync
  useMixIdSync()

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
            <Router />
          </Suspense>
        </ModalsProvider>
      </MantineProvider>
    </DirectionProvider >
  )
}

export default App

