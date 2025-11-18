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
    // Если настройки не заполнены, перенаправляем на страницу настройки
    if (!settings.apiUrl || !settings.apiKey) {
      navigate('/setup', { replace: true })
    }
  }, [settings, navigate])

  // Если настройки не заполнены, не показываем содержимое
  if (!settings.apiUrl || !settings.apiKey) {
    return null
  }

  return <>{children}</>
}

