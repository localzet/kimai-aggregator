import { Group, Badge, Tooltip } from '@mantine/core'
import { IconWifi, IconWifiOff, IconRefresh, IconCloud, IconCloudOff, IconPlugConnected, IconPlugConnectedX, IconCalendar, IconCheck, IconX } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useSettings, useSyncStatus } from '@/shared/hooks'
import { useMixIdStatus } from '@localzet/data-connector/hooks'
import { useDashboardData } from '@/shared/hooks/useDashboardData'
import { useUnifiedSync } from '@/shared/hooks/useUnifiedSync'

export function HeaderStatusIndicator() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const mixIdStatus = useMixIdStatus()
  const { syncing, reload } = useDashboardData(settings, syncStatus)
  const { syncing: unifiedSyncing, progress: unifiedProgress, performSync } = useUnifiedSync()

  const currentDataStatus = syncing ? 'updating' : syncStatus.status

  // Мемоизируем конфигурации для оптимизации производительности
  const dataConfig = useMemo(() => {
    switch (currentDataStatus) {
      case 'online':
        return {
          color: 'green' as const,
          icon: <IconWifi size="1rem" />,
          label: 'Данные онлайн',
          description: 'Данные актуальны. Нажмите для обновления',
        }
      case 'updating':
        return {
          color: 'yellow' as const,
          icon: <IconRefresh size="1rem" style={{ animation: 'spin 1s linear infinite' }} />,
          label: 'Обновление данных',
          description: 'Идет синхронизация данных',
        }
      case 'offline':
        return {
          color: 'red' as const,
          icon: <IconWifiOff size="1rem" />,
          label: 'Данные оффлайн',
          description: syncStatus.lastUpdate 
            ? `Последнее обновление: ${new Date(syncStatus.lastUpdate).toLocaleString('ru-RU')}. Нажмите для попытки обновления`
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
  }, [currentDataStatus, syncStatus.lastUpdate])

  const mixIdConfig = useMemo(() => {
    if (!mixIdStatus.hasConfig) {
      return null
    }

    switch (mixIdStatus.syncStatus) {
      case 'connected-ws':
        return {
          color: 'green' as const,
          icon: <IconPlugConnected size="1rem" />,
          label: 'MIX ID (WebSocket)',
          description: 'Синхронизация через WebSocket активна',
        }
      case 'connected-rest':
        return {
          color: 'blue' as const,
          icon: <IconCloud size="1rem" />,
          label: 'MIX ID (REST)',
          description: 'Синхронизация через REST API (WebSocket недоступен)',
        }
      case 'disconnected':
        return {
          color: 'orange' as const,
          icon: <IconPlugConnectedX size="1rem" />,
          label: 'MIX ID отключен',
          description: 'MIX ID настроен, но соединение недоступно',
        }
      case 'checking':
        return {
          color: 'gray' as const,
          icon: <IconCloudOff size="1rem" />,
          label: 'Проверка MIX ID',
          description: 'Проверка состояния подключения...',
        }
      default:
        return null
    }
  }, [mixIdStatus.hasConfig, mixIdStatus.syncStatus])

  const unifiedSyncConfig = useMemo(() => {
    if (!unifiedSyncing && unifiedProgress.stage === 'idle') {
      return null
    }

    switch (unifiedProgress.stage) {
      case 'mixid':
        return {
          color: 'blue' as const,
          icon: <IconCloud size="1rem" style={{ animation: 'spin 1s linear infinite' }} />,
          label: 'Mix ID',
          description: unifiedProgress.message,
        }
      case 'notion':
        return {
          color: 'violet' as const,
          icon: <IconCalendar size="1rem" style={{ animation: 'spin 1s linear infinite' }} />,
          label: 'Notion',
          description: unifiedProgress.message,
        }
      case 'complete':
        return {
          color: 'green' as const,
          icon: <IconCheck size="1rem" />,
          label: 'Готово',
          description: unifiedProgress.message,
        }
      case 'error':
        return {
          color: 'red' as const,
          icon: <IconX size="1rem" />,
          label: 'Ошибка',
          description: unifiedProgress.error || unifiedProgress.message,
        }
      default:
        return null
    }
  }, [unifiedSyncing, unifiedProgress.stage, unifiedProgress.message, unifiedProgress.error])
  const isDataClickable = !!reload && currentDataStatus !== 'updating' && !unifiedSyncing
  const isUnifiedSyncClickable = !unifiedSyncing && unifiedProgress.stage === 'idle'

  return (
    <Group gap="xs">
      {/* Data status indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Tooltip label={dataConfig.description}>
          <Badge
            color={dataConfig.color}
            variant="light"
            leftSection={dataConfig.icon}
            size="lg"
            style={{
              cursor: isDataClickable ? 'pointer' : 'default',
              userSelect: 'none',
            }}
            onClick={isDataClickable ? reload : undefined}
            onMouseDown={(e) => {
              if (isDataClickable) {
                e.currentTarget.style.transform = 'scale(0.95)'
              }
            }}
            onMouseUp={(e) => {
              if (isDataClickable) {
                e.currentTarget.style.transform = 'scale(1)'
              }
            }}
            onMouseLeave={(e) => {
              if (isDataClickable) {
                e.currentTarget.style.transform = 'scale(1)'
              }
            }}
          />
        </Tooltip>
      </motion.div>

      {/* MIX ID sync status indicator */}
      {mixIdConfig && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Tooltip label={mixIdConfig.description}>
            <Badge
              color={mixIdConfig.color}
              variant="light"
              leftSection={mixIdConfig.icon}
              size="lg"
              style={{
                userSelect: 'none',
              }}
            />
          </Tooltip>
        </motion.div>
      )}

      {/* Unified sync status indicator */}
      {unifiedSyncConfig && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Tooltip label={unifiedSyncConfig.description}>
            <Badge
              color={unifiedSyncConfig.color}
              variant="light"
              leftSection={unifiedSyncConfig.icon}
              size="lg"
              style={{
                cursor: isUnifiedSyncClickable ? 'pointer' : 'default',
                userSelect: 'none',
              }}
              onClick={isUnifiedSyncClickable ? () => performSync('manual') : undefined}
              onMouseDown={(e) => {
                if (isUnifiedSyncClickable) {
                  e.currentTarget.style.transform = 'scale(0.95)'
                }
              }}
              onMouseUp={(e) => {
                if (isUnifiedSyncClickable) {
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
              onMouseLeave={(e) => {
                if (isUnifiedSyncClickable) {
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
            />
          </Tooltip>
        </motion.div>
      )}
    </Group>
  )
}

