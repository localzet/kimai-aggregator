/**
 * App Entry Point
 * 
 * Главный компонент приложения.
 * Импортирует стили и инициализирует провайдеры и роутер.
 */

// Mantine styles
import '@mantine/charts/styles.css'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/nprogress/styles.css'

// Third-party styles
import 'mantine-react-table/styles.css'
import 'mantine-datatable/styles.layer.css'
import '@gfazioli/mantine-list-view-table/styles.css'
import '@gfazioli/mantine-split-pane/styles.css'

// Global styles
import './global.css'

import { AppProviders } from '@/app/providers'
import { Router } from '@/app/router'

function App() {
  return (
    <AppProviders>
      <Router />
    </AppProviders>
  )
}

export default App

// Export types for external use
export type { MenuItem } from '@/widgets/layout/types'

