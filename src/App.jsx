import { useState } from 'react'
import { AppShell, NavLink, Group, Title, Burger } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconSettings, IconDashboard, IconTable, IconCurrencyDollar, IconHistory, IconChartBar } from '@tabler/icons-react'
import SettingsPage from './pages/SettingsPage'
import DashboardPage from './pages/DashboardPage'
import TimesheetPage from './pages/TimesheetPage'
import FinancialPage from './pages/FinancialPage'
import PaymentHistoryPage from './pages/PaymentHistoryPage'
import StatisticsPage from './pages/StatisticsPage'
import StatusIndicator from './components/StatusIndicator'
import { useSettings } from './hooks/useSettings'
import { useSyncStatus } from './hooks/useSyncStatus'

function App() {
  const { settings, updateSettings } = useSettings()
  const { status, lastUpdate } = useSyncStatus(settings)
  const [activePage, setActivePage] = useState('dashboard')
  const [opened, { toggle }] = useDisclosure()

  const canAccessData = settings.apiUrl && settings.apiKey

  return (
    <AppShell
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header hiddenFrom="sm">
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} size="sm" />
          <Title order={3}>Kimai Aggregator</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          label="Дашборд"
          leftSection={<IconDashboard size="1rem" />}
          active={activePage === 'dashboard'}
          onClick={() => setActivePage('dashboard')}
          disabled={!canAccessData}
        />
        <NavLink
          label="Таблица времени"
          leftSection={<IconTable size="1rem" />}
          active={activePage === 'timesheet'}
          onClick={() => setActivePage('timesheet')}
          disabled={!canAccessData}
        />
        <NavLink
          label="Финансы"
          leftSection={<IconCurrencyDollar size="1rem" />}
          active={activePage === 'financial'}
          onClick={() => setActivePage('financial')}
          disabled={!canAccessData}
        />
        <NavLink
          label="История оплат"
          leftSection={<IconHistory size="1rem" />}
          active={activePage === 'payment-history'}
          onClick={() => setActivePage('payment-history')}
          disabled={!canAccessData}
        />
        <NavLink
          label="Статистика"
          leftSection={<IconChartBar size="1rem" />}
          active={activePage === 'statistics'}
          onClick={() => setActivePage('statistics')}
          disabled={!canAccessData}
        />
        <NavLink
          label="Настройки"
          leftSection={<IconSettings size="1rem" />}
          active={activePage === 'settings'}
          onClick={() => setActivePage('settings')}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        {activePage === 'settings' && <SettingsPage settings={settings} onUpdate={updateSettings} />}
        {activePage === 'dashboard' && canAccessData && <DashboardPage />}
        {activePage === 'timesheet' && canAccessData && <TimesheetPage />}
        {activePage === 'financial' && canAccessData && <FinancialPage />}
        {activePage === 'payment-history' && canAccessData && <PaymentHistoryPage />}
        {activePage === 'statistics' && canAccessData && <StatisticsPage />}
        {!canAccessData && activePage !== 'settings' && (
          <div>Настройте API в разделе "Настройки"</div>
        )}
      </AppShell.Main>
    </AppShell>
  )
}

export default App
