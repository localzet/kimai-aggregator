import { useState } from 'react'
import { Card, Stack, TextInput, PasswordInput, Button, Group, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { BackendApi } from '@/shared/api/backendApi'
import { useSettings } from '@/shared/hooks/useSettings'
import { useNavigate } from 'react-router-dom'

export default function LocalAuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { updateSettings, settings } = useSettings()
  const navigate = useNavigate()

  const backendUrl = settings.backendUrl || (import.meta.env.VITE_BACKEND_URL as string) || ''

  const submit = async () => {
    if (!backendUrl) {
      notifications.show({ title: 'Ошибка', message: 'URL бэкенда не задан', color: 'red' })
      return
    }
    setLoading(true)
    const api = new BackendApi(backendUrl)
    try {
      let resp
      if (mode === 'register') {
        resp = await api.registerLocal(email, password)
      } else {
        resp = await api.loginLocal(email, password)
      }

      api.setToken(resp.token)
      // Save token into settings and require setup
      updateSettings({ ...settings, backendUrl, backendToken: resp.token })

      notifications.show({ title: 'Успешно', message: mode === 'register' ? 'Регистрация завершена' : 'Вход выполнен', color: 'green' })

      // After registration force setup of keys/settings
      navigate('/setup', { replace: true })
    } catch (e) {
      notifications.show({ title: 'Ошибка', message: e instanceof Error ? e.message : 'Неизвестная ошибка', color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  return (
      <Stack>
        <Title order={2}>{mode === 'register' ? 'Регистрация' : 'Вход'} </Title>
        <TextInput label="Email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
        <PasswordInput label="Пароль" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="subtle" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Регистрация' : 'Вход'}</Button>
          <Button onClick={submit} loading={loading}>{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</Button>
        </div>
      </Stack>
  )
}
