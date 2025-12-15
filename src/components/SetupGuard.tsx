import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/shared/hooks/useSettings'

interface SetupGuardProps {
  children: React.ReactNode
}

export function SetupGuard({ children }: SetupGuardProps) {
  const { settings } = useSettings()
  const navigate = useNavigate()

  useEffect(() => {
    const appMode = settings.appMode ?? 'normal'

    // Требуем визард только в standalone‑режиме
    if (
      appMode === 'standalone' &&
      (!settings.apiUrl || !settings.apiKey)
    ) {
      navigate('/setup', { replace: true })
    }
  }, [settings, navigate])

  const appMode = settings.appMode ?? 'normal'

  // Блокируем контент только если standalone и нет настроек Kimai
  if (
    appMode === 'standalone' &&
    (!settings.apiUrl || !settings.apiKey)
  ) {
    return null
  }

  return <>{children}</>
}

