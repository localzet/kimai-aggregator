import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Center, Loader, Text, Stack } from '@mantine/core'

export default function MixIdCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (code) {
      // Send message to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'mixid-oauth-callback',
            code,
            state,
          },
          window.location.origin
        )
        window.close()
      } else {
        // If no opener, redirect to settings
        navigate('/settings')
      }
    } else {
      navigate('/settings')
    }
  }, [searchParams, navigate])

  return (
    <Center h="100vh">
      <Stack align="center" gap="md">
        <Loader />
        <Text>Обработка авторизации MIX ID...</Text>
      </Stack>
    </Center>
  )
}

