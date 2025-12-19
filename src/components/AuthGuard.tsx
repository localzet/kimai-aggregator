import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMixIdStatus } from '@localzet/data-connector/hooks'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate()
  const mixIdStatus = useMixIdStatus()

  useEffect(() => {
    // Если пользователь не подключен к MIX ID, редиректим на страницу авторизации
    if (!mixIdStatus.isConnected) {
      navigate('/auth', { replace: true })
    }
  }, [mixIdStatus.isConnected, navigate])

  // Если не подключен, не показываем содержимое
  if (!mixIdStatus.isConnected) {
    return null
  }

  return <>{children}</>
}

