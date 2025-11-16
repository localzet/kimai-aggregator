import { Badge, Tooltip } from '@mantine/core'
import { IconWifi, IconWifiOff, IconRefresh } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { SyncStatus } from '../hooks/useSyncStatus'

interface StatusIndicatorProps {
  status: SyncStatus
  lastUpdate: string | null
}

function StatusIndicator({ status, lastUpdate }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: 'green' as const,
          icon: <IconWifi size="1rem" />,
          label: 'Онлайн',
          description: 'Данные актуальны',
        }
      case 'updating':
        return {
          color: 'yellow' as const,
          icon: <IconRefresh size="1rem" />,
          label: 'Обновление',
          description: 'Идет синхронизация данных',
        }
      case 'offline':
        return {
          color: 'red' as const,
          icon: <IconWifiOff size="1rem" />,
          label: 'Оффлайн',
          description: lastUpdate 
            ? `Последнее обновление: ${new Date(lastUpdate).toLocaleString('ru-RU')}`
            : 'Нет подключения к интернету',
        }
      default:
        return {
          color: 'gray' as const,
          icon: <IconWifi size="1rem" />,
          label: 'Неизвестно',
          description: '',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Tooltip label={config.description}>
        <Badge
          color={config.color}
          variant="light"
          leftSection={config.icon}
          size="lg"
        >
          {/* {config.label} */}
        </Badge>
      </Tooltip>
    </motion.div>
  )
}

export default StatusIndicator

