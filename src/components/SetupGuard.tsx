import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/shared/hooks/useSettings'
import { useMixIdStatus } from '@localzet/data-connector/hooks'

interface SetupGuardProps {
  children: React.ReactNode
}

export function SetupGuard({ children }: SetupGuardProps) {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const mixIdStatus = useMixIdStatus()

  useEffect(() => {
    const appMode = settings.appMode ?? 'normal'

    if (appMode === 'standalone') {
      // В standalone‑режиме требуем настройки Kimai
      if (!settings.apiUrl || !settings.apiKey) {
        navigate('/setup', { replace: true })
      }
      return
    }

    // В обычном режиме требуем активную MIX ID‑сессию
    if (!mixIdStatus.isConnected) {
      navigate('/auth', { replace: true })
    }
  }, [settings, mixIdStatus.isConnected, navigate])

  const appMode = settings.appMode ?? 'normal'

  // Standalone: блокируем без настроек Kimai
  if (appMode === 'standalone' && (!settings.apiUrl || !settings.apiKey)) {
    return null
  }

  // Normal: блокируем без MIX ID‑сессии
  if (appMode === 'normal' && !mixIdStatus.isConnected) {
    return null
  }

  return <>{children}</>
}

