import { Group, Badge, Tooltip } from '@mantine/core'
import { IconWifi, IconWifiOff, IconRefresh, IconCloud, IconCloudOff, IconPlugConnected, IconPlugConnectedX, IconClock } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { useMemo, useCallback } from 'react'
import { useSettings, useSyncStatus } from '@/shared/hooks'
import { useMixIdStatus } from '@localzet/data-connector/hooks'
import { useDataFreshness } from '@/shared/hooks/useDataFreshness'
import { useDashboardData } from '@/shared/hooks/useDashboardData'
import { BackendApi } from '@/shared/api/backendApi'

export function HeaderStatusIndicator() {
  const { settings } = useSettings()
  const syncStatus = useSyncStatus(settings)
  const mixIdStatus = useMixIdStatus()
  const { syncing, reload } = useDashboardData(settings, syncStatus)
  const dataFreshness = useDataFreshness(settings)

  const currentDataStatus = syncing ? 'updating' : syncStatus.status

  // Обработчик клика на индикатор: запускает синхронизацию на бэке и запрашивает данные
  const handleRefresh = useCallback(async () => {
    if (!settings.backendUrl || !settings.backendToken) {
      return
    }

    try {
      const backendApi = new BackendApi(settings.backendUrl, settings.backendToken)
      // Запускаем синхронизацию на бэке
      await backendApi.triggerSync()
      // Запрашиваем обновленные данные
      await reload()
    } catch (error) {
      console.error('Error triggering sync:', error)
    }
  }, [settings.backendUrl, settings.backendToken, reload])

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

  const isDataClickable = !!reload && currentDataStatus !== 'updating'

  // Конфигурация индикатора актуальности данных
  const freshnessConfig = useMemo(() => {
    switch (dataFreshness.status) {
      case 'fresh':
        return {
          color: 'green' as const,
          icon: <IconClock size="1rem" />,
          label: 'Актуально',
          description: dataFreshness.message,
        }
      case 'stale':
        return {
          color: 'orange' as const,
          icon: <IconClock size="1rem" />,
          label: 'Устарело',
          description: dataFreshness.message,
        }
      case 'very_stale':
        return {
          color: 'red' as const,
          icon: <IconClock size="1rem" />,
          label: 'Сильно устарело',
          description: dataFreshness.message,
        }
      default:
        return null
    }
  }, [dataFreshness.status, dataFreshness.message])

  return (
    <Group gap="xs">
      {/* Data freshness indicator */}
      {freshnessConfig && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Tooltip label={freshnessConfig.description}>
            <Badge
              color={freshnessConfig.color}
              variant="light"
              leftSection={freshnessConfig.icon}
              size="lg"
              style={{
                userSelect: 'none',
              }}
            />
          </Tooltip>
        </motion.div>
      )}

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
            onClick={isDataClickable ? handleRefresh : undefined}
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

    </Group>
  )
}

