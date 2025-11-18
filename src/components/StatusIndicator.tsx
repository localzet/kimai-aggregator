import { Badge, Tooltip } from '@mantine/core'
import { IconWifi, IconWifiOff, IconRefresh } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { SyncStatus } from '@/shared/hooks/useSyncStatus'

interface StatusIndicatorProps {
  status: SyncStatus
  lastUpdate: string | null
  onRefresh?: () => void
  loading?: boolean
}

function StatusIndicator({ status, lastUpdate, onRefresh, loading = false }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: 'green' as const,
          icon: <IconWifi size="1rem" />,
          label: 'Онлайн',
          description: 'Данные актуальны. Нажмите для обновления',
        }
      case 'updating':
        return {
          color: 'yellow' as const,
          icon: <IconRefresh size="1rem" style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />,
          label: 'Обновление',
          description: 'Идет синхронизация данных',
        }
      case 'offline':
        return {
          color: 'red' as const,
          icon: <IconWifiOff size="1rem" />,
          label: 'Оффлайн',
          description: lastUpdate 
            ? `Последнее обновление: ${new Date(lastUpdate).toLocaleString('ru-RU')}. Нажмите для попытки обновления`
            : 'Нет подключения к интернету. Нажмите для попытки обновления',
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
  const isClickable = onRefresh && status !== 'updating'

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
          style={{
            cursor: isClickable ? 'pointer' : 'default',
            userSelect: 'none',
          }}
          onClick={isClickable ? onRefresh : undefined}
          onMouseDown={(e) => {
            if (isClickable) {
              e.currentTarget.style.transform = 'scale(0.95)'
            }
          }}
          onMouseUp={(e) => {
            if (isClickable) {
              e.currentTarget.style.transform = 'scale(1)'
            }
          }}
          onMouseLeave={(e) => {
            if (isClickable) {
              e.currentTarget.style.transform = 'scale(1)'
            }
          }}
        >
          {/* {config.label} */}
        </Badge>
      </Tooltip>
    </motion.div>
  )
}

export default StatusIndicator

