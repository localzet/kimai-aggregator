import { useState, useEffect } from 'react'
import SetupWizard from '@/components/SetupWizard'
import { useSettings } from '@/shared/hooks/useSettings'
import { useNavigate } from 'react-router-dom'

function SetupPage() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    // Если настройки уже заполнены, перенаправляем на dashboard
    if (settings.apiUrl && settings.apiKey && !completed) {
      navigate('/dashboard')
    }
  }, [settings, navigate, completed])

  const handleComplete = () => {
    setCompleted(true)
    // Небольшая задержка для обновления состояния
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  // Если настройки уже есть, не показываем визард
  if (settings.apiUrl && settings.apiKey) {
    return null
  }

  return <SetupWizard onComplete={handleComplete} />
}

export default SetupPage

