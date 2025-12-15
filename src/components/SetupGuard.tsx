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
    }
    // В normal‑режиме здесь НЕ редиректим, чтобы избежать петель;
    // вход/выход через MIX ID обрабатывается InitialRedirect и AuthPage.
  }, [settings, navigate])

  const appMode = settings.appMode ?? 'normal'

  // Standalone: блокируем без настроек Kimai
  if (appMode === 'standalone' && (!settings.apiUrl || !settings.apiKey)) {
    return null
  }

  return <>{children}</>
}

