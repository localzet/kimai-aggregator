/**
 * LogoutButton
 * 
 * Кнопка выхода из системы.
 * Очищает токены и перенаправляет на страницу авторизации.
 */

import { Button } from '@mantine/core'
import { TbLogout } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/shared/hooks/useSettings'
import { useMixIdStatus } from '@localzet/data-connector/hooks'
import { notifications } from '@mantine/notifications'

export function LogoutButton() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useSettings()
  const mixIdStatus = useMixIdStatus()

  const handleLogout = () => {
    // Очищаем токены
    const clearedSettings = {
      ...settings,
      backendToken: '',
    }
    updateSettings(clearedSettings)
    
    // Очищаем токены из localStorage
    try {
      localStorage.removeItem('mixid_access_token')
      localStorage.removeItem('mixid_token')
      const saved = localStorage.getItem('kimai-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        localStorage.setItem('kimai-settings', JSON.stringify({
          ...parsed,
          backendToken: '',
        }))
      }
    } catch (e) {
      console.warn('Error clearing tokens:', e)
    }

    notifications.show({
      title: 'Выход выполнен',
      message: 'Вы успешно вышли из системы',
      color: 'blue',
    })

    // Редиректим на страницу авторизации
    navigate('/auth', { replace: true })
  }

  if (!mixIdStatus.isConnected) {
    return null
  }

  return (
    <Button
      variant="subtle"
      color="red"
      leftSection={<TbLogout size="1rem" />}
      onClick={handleLogout}
      size="sm"
    >
      Выход
    </Button>
  )
}

