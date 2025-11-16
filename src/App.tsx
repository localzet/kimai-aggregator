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

import { Suspense, useEffect, useState } from 'react'
import { AppShell, NavLink, Group, Title, Burger, MantineProvider, DirectionProvider, Center, Text, Progress, Stack } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { IconSettings, IconDashboard, IconTable, IconCurrencyDollar, IconHistory, IconChartBar } from '@tabler/icons-react'
import { motion } from 'motion/react'
import SettingsPage from './pages/SettingsPage'
import DashboardPage from './pages/DashboardPage'
import TimesheetPage from './pages/TimesheetPage'
import FinancialPage from './pages/FinancialPage'
import PaymentHistoryPage from './pages/PaymentHistoryPage'
import StatisticsPage from './pages/StatisticsPage'
import StatusIndicator from './components/StatusIndicator'
import { useSettings } from './hooks/useSettings'
import { useSyncStatus } from './hooks/useSyncStatus'
import classes from './app/AppShell.module.css'
import { theme } from './theme'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { NavigationProgress } from '@mantine/nprogress'

const MotionNavLink = motion.div

function App() {
  const mq = useMediaQuery('(min-width: 40em)')

  const { settings, updateSettings } = useSettings()
  const { status, lastUpdate } = useSyncStatus(settings)
  const [activePage, setActivePage] = useState<string>('dashboard')
  const [opened, { toggle }] = useDisclosure()

  const isMobile = useMediaQuery(`(max-width: 64rem)`, undefined, {
    getInitialValueInEffect: false
})

  const canAccessData = settings.apiUrl && settings.apiKey

  const navItems = [
    { id: 'dashboard', label: 'Дашборд', icon: IconDashboard, disabled: !canAccessData },
    { id: 'timesheet', label: 'Таблица времени', icon: IconTable, disabled: !canAccessData },
    { id: 'financial', label: 'Финансы', icon: IconCurrencyDollar, disabled: !canAccessData },
    { id: 'payment-history', label: 'История оплат', icon: IconHistory, disabled: !canAccessData },
    { id: 'statistics', label: 'Статистика', icon: IconChartBar, disabled: !canAccessData },
    { id: 'settings', label: 'Настройки', icon: IconSettings, disabled: false },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2 }
    }
  }

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

            <AppShell
              className={classes.appShellFadeIn}
              navbar={{
                width: 250,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
              }}
              padding={0}
            >
              <AppShell.Header className={classes.header} hiddenFrom="sm">
                <Group h="100%" px="md">
                  <Burger opened={opened} onClick={toggle} size="sm" />
                  <Title order={3}>Kimai Aggregator</Title>
                </Group>
              </AppShell.Header>

              <AppShell.Navbar className={classes.sidebarWrapper} p="md">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <MotionNavLink
                        key={item.id}
                        variants={itemVariants}
                        style={{ marginBottom: 'var(--mantine-spacing-xs)' }}
                      >
                        <NavLink
                          label={item.label}
                          leftSection={<Icon size="1rem" />}
                          active={activePage === item.id}
                          onClick={() => setActivePage(item.id)}
                          disabled={item.disabled}
                        />
                      </MotionNavLink>
                    )
                  })}
                </motion.div>
              </AppShell.Navbar>

              <AppShell.Main className={classes.main} p="md">
                <motion.div
                  key={activePage}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {activePage === 'settings' && <SettingsPage settings={settings} onUpdate={updateSettings} />}
                  {activePage === 'dashboard' && canAccessData && <DashboardPage />}
                  {activePage === 'timesheet' && canAccessData && <TimesheetPage />}
                  {activePage === 'financial' && canAccessData && <FinancialPage />}
                  {activePage === 'payment-history' && canAccessData && <PaymentHistoryPage />}
                  {activePage === 'statistics' && canAccessData && <StatisticsPage />}
                  {!canAccessData && activePage !== 'settings' && (
                    <div>Настройте API в разделе "Настройки"</div>
                  )}
                </motion.div>
              </AppShell.Main>
            </AppShell>

          </Suspense>
        </ModalsProvider>
      </MantineProvider>
    </DirectionProvider >
  )
}

export default App

