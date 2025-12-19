/**
 * NotificationsButton
 * 
 * Виджет кнопки уведомлений в хедере.
 * Отображает количество непрочитанных уведомлений и позволяет их просматривать.
 */

import { useState } from 'react'
import { ActionIcon, Badge, Menu, ScrollArea, Text, Group, Stack, Paper, Button } from '@mantine/core'
import { IconBell, IconCheck } from '@tabler/icons-react'
import { useNotifications } from '@/shared/hooks/useNotifications'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ru'

dayjs.extend(relativeTime)
dayjs.locale('ru')

export function NotificationsButton() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [opened, setOpened] = useState(false)

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  return (
    <Menu
      shadow="md"
      width={400}
      position="bottom-end"
      opened={opened}
      onChange={setOpened}
    >
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" pos="relative">
          <IconBell size={20} />
          {unreadCount > 0 && (
            <Badge
              size="xs"
              circle
              pos="absolute"
              top={4}
              right={4}
              variant="filled"
              color="red"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Group justify="space-between">
            <Text fw={600}>Уведомления</Text>
            {unreadCount > 0 && (
              <Button
                size="xs"
                variant="subtle"
                onClick={(e) => {
                  e.stopPropagation()
                  markAllAsRead()
                }}
              >
                Отметить все как прочитанные
              </Button>
            )}
          </Group>
        </Menu.Label>

        <ScrollArea h={400}>
          {notifications.length === 0 ? (
            <Paper p="md" ta="center">
              <Text c="dimmed" size="sm">
                Нет уведомлений
              </Text>
            </Paper>
          ) : (
            <Stack gap="xs" p="xs">
              {unreadNotifications.length > 0 && (
                <>
                  {unreadNotifications.map((notification) => (
                    <Paper
                      key={notification.id}
                      p="sm"
                      withBorder
                      style={{ cursor: 'pointer' }}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Group justify="space-between" align="flex-start" gap="xs">
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Text fw={500} size="sm">
                            {notification.title}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {notification.message}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {dayjs(notification.createdAt).fromNow()}
                          </Text>
                        </Stack>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                      </Group>
                    </Paper>
                  ))}
                </>
              )}

              {readNotifications.length > 0 && (
                <>
                  {unreadNotifications.length > 0 && (
                    <Text size="xs" c="dimmed" fw={500} px="xs" pt="xs">
                      Прочитанные
                    </Text>
                  )}
                  {readNotifications.map((notification) => (
                    <Paper
                      key={notification.id}
                      p="sm"
                      withBorder
                      style={{ opacity: 0.7 }}
                    >
                      <Stack gap={4}>
                        <Text fw={500} size="sm">
                          {notification.title}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {notification.message}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {dayjs(notification.createdAt).fromNow()}
                        </Text>
                      </Stack>
                    </Paper>
                  ))}
                </>
              )}
            </Stack>
          )}
        </ScrollArea>
      </Menu.Dropdown>
    </Menu>
  )
}

