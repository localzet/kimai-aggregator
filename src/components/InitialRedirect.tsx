import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/shared/hooks/useSettings'
import { useMixIdStatus } from '@localzet/data-connector/hooks'

export function InitialRedirect() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const mixIdStatus = useMixIdStatus()

  useEffect(() => {
    const appMode = settings.appMode ?? 'normal'

    // Standalone: прежняя логика визарда
    if (appMode === 'standalone') {
      if (!settings.apiUrl || !settings.apiKey) {
        navigate('/setup', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
      return
    }

    // Normal (многопользовательский): проверяем MIX ID и настройки
    if (!mixIdStatus.isConnected) {
      navigate('/auth', { replace: true })
      return
    }

    // Если подключен к MIX ID, проверяем наличие настроек
    // Если настроек нет (нет apiUrl или apiKey), редиректим на страницу настроек
    if (!settings.apiUrl || !settings.apiKey) {
      navigate('/settings', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }, [settings, mixIdStatus.isConnected, navigate])

  return null
}

