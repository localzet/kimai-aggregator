import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/shared/hooks/useSettings'

export function InitialRedirect() {
  const { settings } = useSettings()
  const navigate = useNavigate()

  useEffect(() => {
    // Если настройки не заполнены, перенаправляем на страницу настройки
    if (!settings.apiUrl || !settings.apiKey) {
      navigate('/setup', { replace: true })
    } else {
      // Если настройки есть, перенаправляем на dashboard
      navigate('/dashboard', { replace: true })
    }
  }, [settings, navigate])

  return null
}

