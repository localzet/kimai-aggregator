/**
 * ErrorPage
 * 
 * Страница отображения ошибок приложения.
 * Используется в ErrorBoundary для обработки критических ошибок.
 */

import { useNavigate } from 'react-router-dom'
import { Button, Container, Group, Title, Text } from '@mantine/core'
import classesError from '@/error.module.css'

export function ErrorPage() {
  const navigate = useNavigate()

  const handleRefresh = () => {
    navigate(0)
  }

  return (
    <div className={classesError.root}>
      <Container>
        <div className={classesError.label}>500</div>
        <Title className={classesError.title}>Something bad just happened...</Title>
        <Text className={classesError.description} size="lg" ta="center">
          Try to refresh the page.
        </Text>
        <Group justify="center">
          <Button onClick={handleRefresh} size="md" variant="outline">
            Refresh the page
          </Button>
        </Group>
      </Container>
    </div>
  )
}

