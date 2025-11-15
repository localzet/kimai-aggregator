import { Group, Badge, Text, Tooltip } from '@mantine/core'
import { IconWifi, IconWifiOff, IconRefresh } from '@tabler/icons-react'

function StatusIndicator({ status, lastUpdate }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: 'green',
          icon: <IconWifi size="1rem" />,
          label: 'Онлайн',
          description: 'Данные актуальны',
        }
      case 'updating':
        return {
          color: 'yellow',
          icon: <IconRefresh size="1rem" />,
          label: 'Обновление',
          description: 'Идет синхронизация данных',
        }
      case 'offline':
        return {
          color: 'red',
          icon: <IconWifiOff size="1rem" />,
          label: 'Оффлайн',
          description: lastUpdate 
            ? `Последнее обновление: ${new Date(lastUpdate).toLocaleString('ru-RU')}`
            : 'Нет подключения к интернету',
        }
      default:
        return {
          color: 'gray',
          icon: <IconWifi size="1rem" />,
          label: 'Неизвестно',
          description: '',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Tooltip label={config.description}>
      <Badge
        color={config.color}
        variant="light"
        leftSection={config.icon}
        size="lg"
      >
        {config.label}
      </Badge>
    </Tooltip>
  )
}

export default StatusIndicator

