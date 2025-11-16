import { useState } from 'react'
import { AppShell, NavLink, Group, Title, Burger } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
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

const MotionNavLink = motion(NavLink)

function App() {
  const { settings, updateSettings } = useSettings()
  const { status, lastUpdate } = useSyncStatus(settings)
  const [activePage, setActivePage] = useState<string>('dashboard')
  const [opened, { toggle }] = useDisclosure()

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
                label={item.label}
                leftSection={<Icon size="1rem" />}
                active={activePage === item.id}
                onClick={() => setActivePage(item.id)}
                disabled={item.disabled}
                variants={itemVariants}
                mb="xs"
              />
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
  )
}

export default App

