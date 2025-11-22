import { useState, useEffect, useCallback } from 'react'
import { mixIdApi } from '@/shared/api/mixIdApi'
import { wsClient } from '@/shared/api/websocket'

export type MixIdSyncStatus = 'connected-ws' | 'connected-rest' | 'disconnected' | 'checking'

export interface UseMixIdStatusReturn {
  isConnected: boolean
  syncStatus: MixIdSyncStatus
  hasConfig: boolean
  refresh: () => void
}

export function useMixIdStatus(): UseMixIdStatusReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [syncStatus, setSyncStatus] = useState<MixIdSyncStatus>('checking')
  const [hasConfig, setHasConfig] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      const config = mixIdApi.getConfig()
      const hasConfigValue = !!(config && config.accessToken)
      setHasConfig(hasConfigValue)

      if (!hasConfigValue) {
        setIsConnected(false)
        setSyncStatus('disconnected')
        return
      }

      // Check WebSocket connection
      const wsConnected = wsClient.isConnected()
      
      if (wsConnected) {
        setIsConnected(true)
        setSyncStatus('connected-ws')
      } else {
        // Check if we can use REST API (try to get sync status)
        try {
          await mixIdApi.getSyncStatus()
          setIsConnected(true)
          setSyncStatus('connected-rest')
        } catch (error) {
          setIsConnected(false)
          setSyncStatus('disconnected')
        }
      }
    } catch (error) {
      setIsConnected(false)
      setSyncStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    // Initial check
    checkStatus()

    // Check periodically
    const interval = setInterval(checkStatus, 2000) // Check every 2 seconds

    // Listen to storage changes (for cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mixId_config' || e.key === 'mixId_accessToken' || e.key === 'mixId_refreshToken') {
        checkStatus()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Listen to custom events for same-tab updates
    const handleConfigChange = () => {
      checkStatus()
    }

    const handleWsStatusChange = () => {
      checkStatus()
    }

    window.addEventListener('mixid-config-changed', handleConfigChange)
    window.addEventListener('mixid-ws-status-changed', handleWsStatusChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('mixid-config-changed', handleConfigChange)
      window.removeEventListener('mixid-ws-status-changed', handleWsStatusChange)
    }
  }, [checkStatus])

  return {
    isConnected,
    syncStatus,
    hasConfig,
    refresh: checkStatus,
  }
}

