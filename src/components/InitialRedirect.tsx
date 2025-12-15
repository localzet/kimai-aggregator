import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/shared/hooks/useSettings'

export function InitialRedirect() {
  const { settings } = useSettings()
  const navigate = useNavigate()

  useEffect(() => {
    const appMode = settings.appMode ?? 'normal'

    // Для standalone‑режима по-прежнему требуем прямые креды Kimai
    if (appMode === 'standalone') {
      if (!settings.apiUrl || !settings.apiKey) {
        navigate('/setup', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
      return
    }

    // Для обычного (многопользовательского) режима идём сразу на dashboard
    navigate('/dashboard', { replace: true })
  }, [settings, navigate])

  return null
}

