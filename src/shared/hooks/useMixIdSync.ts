import { useEffect, useRef, useCallback } from 'react'
import { mixIdApi } from '@/shared/api/mixIdApi'
import { Settings, useSettings } from './useSettings'
import { db } from '@/shared/api/db'
import { wsClient } from '@/shared/api/websocket'
import { offlineQueue } from '@/shared/api/offlineQueue'

const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes (fallback HTTP sync)
const HEARTBEAT_INTERVAL = 30 * 1000 // 30 seconds

export function useMixIdSync() {
  const { settings, updateSettings } = useSettings()
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSettingsVersionRef = useRef<number>(0)
  const lastSettingsUpdateRef = useRef<number>(0)

  // Handle conflict resolution - prefer newer updates
  const mergeWithConflictResolution = useCallback(
    (local: Settings, remote: Settings, remoteUpdatedAt: string): Settings => {
      const remoteTime = new Date(remoteUpdatedAt).getTime()
      const localTime = lastSettingsUpdateRef.current

      // If remote is newer, use it; otherwise merge with local taking precedence
      if (remoteTime > localTime) {
        lastSettingsUpdateRef.current = remoteTime
        return { ...local, ...remote }
      }
      return local
    },
    []
  )

  // Upload settings with conflict resolution
  const uploadSettings = useCallback(
    async (settingsToUpload: Settings, version?: number) => {
      try {
        const syncStatus = await mixIdApi.getSyncStatus()
        if (!syncStatus.syncSettings) return

        const result = await mixIdApi.uploadSettings(settingsToUpload)
        lastSettingsVersionRef.current = result.version
        lastSettingsUpdateRef.current = Date.now()

        // Send via WebSocket for real-time sync
        if (wsClient.isConnected()) {
          wsClient.send({
            type: 'sync:settings',
            settings: settingsToUpload,
            version: result.version,
          })
        }
      } catch (error) {
        console.error('Failed to upload settings:', error)
        // Queue for offline sync
        offlineQueue.enqueue('settings', settingsToUpload)
      }
    },
    []
  )

  // Upload data with conflict resolution
  const uploadData = useCallback(async (dataType: string, data: Record<string, any>) => {
    try {
      const syncStatus = await mixIdApi.getSyncStatus()
      if (!syncStatus.syncData) return

      await mixIdApi.uploadData(dataType, data)

      // Send via WebSocket for real-time sync
      if (wsClient.isConnected()) {
        wsClient.send({
          type: 'sync:data',
          dataType,
          data,
        })
      }
    } catch (error) {
      console.error(`Failed to upload ${dataType}:`, error)
      // Queue for offline sync
      offlineQueue.enqueue('data', data, dataType)
    }
  }, [])

  // Process offline queue
  const processOfflineQueue = useCallback(async () => {
    await offlineQueue.processQueue(async (operation) => {
      if (operation.type === 'settings') {
        await uploadSettings(operation.data)
      } else if (operation.type === 'data' && operation.dataType) {
        await uploadData(operation.dataType, operation.data)
      }
    })
  }, [uploadSettings, uploadData])

  // Perform sync
  const performSync = useCallback(async () => {
    try {
      const config = mixIdApi.getConfig()
      if (!config || !config.accessToken) {
        return
      }

      // Get sync status
      const syncStatus = await mixIdApi.getSyncStatus()

      // Check for updates
      const updates = await mixIdApi.checkUpdates(
        lastSettingsVersionRef.current,
        syncStatus.syncData ? ['timesheets', 'projects', 'activities'] : undefined
      )

      // Download updates if available
      if (updates.hasUpdates) {
        if (updates.updates.settings && syncStatus.syncSettings) {
          try {
            const remoteSettings = await mixIdApi.downloadSettings()
            const merged = mergeWithConflictResolution(settings, remoteSettings.settings, remoteSettings.updatedAt)
            updateSettings(merged)
            lastSettingsVersionRef.current = remoteSettings.version
          } catch (error) {
            console.error('Failed to download settings:', error)
          }
        }

        if (updates.updates.data && syncStatus.syncData) {
          // Download data updates via HTTP (WebSocket handles real-time)
          for (const dataType of ['timesheets', 'projects', 'activities']) {
            if (updates.updates.data[dataType]) {
              try {
                const remoteData = await mixIdApi.downloadData(dataType)
                // Merge with conflict resolution
                if (dataType === 'timesheets') {
                  const local = await db.getTimesheets()
                  const localMap = new Map(local.map((t) => [t.id.toString(), t]))
                  const remoteMap = new Map(Object.entries(remoteData.data))

                  const merged: any[] = []
                  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

                  for (const id of allIds) {
                    const localItem = localMap.get(id)
                    const remoteItem = remoteMap.get(id)

                    if (remoteItem && (!localItem || new Date(remoteItem.updatedAt || 0) > new Date(localItem.updatedAt || 0))) {
                      merged.push(remoteItem)
                    } else if (localItem) {
                      merged.push(localItem)
                    }
                  }

                  await db.saveTimesheets(merged)
                } else if (dataType === 'projects') {
                  const local = await db.getProjects()
                  const localMap = new Map(local.map((p) => [p.id.toString(), p]))
                  const remoteMap = new Map(Object.entries(remoteData.data))

                  const merged: any[] = []
                  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

                  for (const id of allIds) {
                    const localItem = localMap.get(id)
                    const remoteItem = remoteMap.get(id)

                    if (remoteItem && (!localItem || new Date(remoteItem.updatedAt || 0) > new Date(localItem.updatedAt || 0))) {
                      merged.push(remoteItem)
                    } else if (localItem) {
                      merged.push(localItem)
                    }
                  }

                  await db.saveProjects(merged)
                } else if (dataType === 'activities') {
                  const local = await db.getActivities()
                  const localMap = new Map(local.map((a) => [a.id.toString(), a]))
                  const remoteMap = new Map(Object.entries(remoteData.data))

                  const merged: any[] = []
                  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

                  for (const id of allIds) {
                    const localItem = localMap.get(id)
                    const remoteItem = remoteMap.get(id)

                    if (remoteItem && (!localItem || new Date(remoteItem.updatedAt || 0) > new Date(localItem.updatedAt || 0))) {
                      merged.push(remoteItem)
                    } else if (localItem) {
                      merged.push(localItem)
                    }
                  }

                  await db.saveActivities(merged)
                }
        } catch (error) {
                console.error(`Failed to download ${dataType}:`, error)
              }
            }
          }
        }
      }

      // Upload local changes (only if not already synced via WebSocket)
      if (syncStatus.syncSettings) {
        await uploadSettings(settings)
      }

      if (syncStatus.syncData) {
        try {
          const timesheets = await db.getTimesheets()
          const projects = await db.getProjects()
          const activities = await db.getActivities()

          const timesheetsData: Record<string, any> = {}
          timesheets.forEach((ts) => {
            timesheetsData[ts.id.toString()] = { ...ts, updatedAt: new Date().toISOString() }
          })

          const projectsData: Record<string, any> = {}
          projects.forEach((p) => {
            projectsData[p.id.toString()] = { ...p, updatedAt: new Date().toISOString() }
          })

          const activitiesData: Record<string, any> = {}
          activities.forEach((a) => {
            activitiesData[a.id.toString()] = { ...a, updatedAt: new Date().toISOString() }
          })

          await uploadData('timesheets', timesheetsData)
          await uploadData('projects', projectsData)
          await uploadData('activities', activitiesData)
        } catch (error) {
          console.error('Failed to upload data:', error)
        }
      }

      // Process offline queue
      await processOfflineQueue()
    } catch (error) {
      console.error('Sync error:', error)
    }
  }, [settings, updateSettings, mergeWithConflictResolution, uploadSettings, uploadData, processOfflineQueue])

  useEffect(() => {
    const setupSync = () => {
      const config = mixIdApi.getConfig()
      if (!config || !config.accessToken) {
        // Disconnect WebSocket if config is cleared
        wsClient.disconnect()
        return
      }

      // Connect WebSocket
      wsClient.connect()
    }

    // Initial setup
    setupSync()

    // Listen for config changes
    const handleConfigChange = () => {
      setupSync()
    }

    window.addEventListener('mixid-config-changed', handleConfigChange)

    const config = mixIdApi.getConfig()
    if (!config || !config.accessToken) {
      return () => {
        window.removeEventListener('mixid-config-changed', handleConfigChange)
      }
    }

    // Set up WebSocket event handlers
    const handleSettingsUpdate = (message: any) => {
      if (message.settings && message.updatedAt) {
        const merged = mergeWithConflictResolution(settings, message.settings, message.updatedAt)
        updateSettings(merged)
        lastSettingsVersionRef.current = message.version || lastSettingsVersionRef.current
      }
    }

    const handleDataUpdate = async (message: any) => {
      if (message.dataType && message.data) {
        try {
          // Merge with conflict resolution - newer data wins
          if (message.dataType === 'timesheets') {
            const local = await db.getTimesheets()
            const localMap = new Map(local.map((t) => [t.id.toString(), t]))
            const remoteMap = new Map(Object.entries(message.data))

            // Merge: remote takes precedence if it's newer
            const merged: any[] = []
            const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

            for (const id of allIds) {
              const localItem = localMap.get(id)
              const remoteItem = remoteMap.get(id)

              if (remoteItem && (!localItem || new Date(remoteItem.updatedAt || 0) > new Date(localItem.updatedAt || 0))) {
                merged.push(remoteItem)
              } else if (localItem) {
                merged.push(localItem)
              }
            }

            await db.saveTimesheets(merged)
          } else if (message.dataType === 'projects') {
            const local = await db.getProjects()
            const localMap = new Map(local.map((p) => [p.id.toString(), p]))
            const remoteMap = new Map(Object.entries(message.data))

            const merged: any[] = []
            const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

            for (const id of allIds) {
              const localItem = localMap.get(id)
              const remoteItem = remoteMap.get(id)

              if (remoteItem && (!localItem || new Date(remoteItem.updatedAt || 0) > new Date(localItem.updatedAt || 0))) {
                merged.push(remoteItem)
              } else if (localItem) {
                merged.push(localItem)
              }
            }

            await db.saveProjects(merged)
          } else if (message.dataType === 'activities') {
            const local = await db.getActivities()
            const localMap = new Map(local.map((a) => [a.id.toString(), a]))
            const remoteMap = new Map(Object.entries(message.data))

            const merged: any[] = []
            const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

            for (const id of allIds) {
              const localItem = localMap.get(id)
              const remoteItem = remoteMap.get(id)

              if (remoteItem && (!localItem || new Date(remoteItem.updatedAt || 0) > new Date(localItem.updatedAt || 0))) {
                merged.push(remoteItem)
              } else if (localItem) {
                merged.push(localItem)
              }
            }

            await db.saveActivities(merged)
          }
        } catch (error) {
          console.error(`Error merging ${message.dataType}:`, error)
        }
      }
    }

    wsClient.on('sync:settings:update', handleSettingsUpdate)
    wsClient.on('sync:data:update', handleDataUpdate)

    // Initial sync
    performSync()

    // Set up periodic sync (fallback HTTP sync)
    syncIntervalRef.current = setInterval(performSync, SYNC_INTERVAL)

    // Set up heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      mixIdApi.heartbeat({
        platform: navigator.platform,
        userAgent: navigator.userAgent,
      }).catch(console.error)
    }, HEARTBEAT_INTERVAL)

    // Process offline queue when online
    if (navigator.onLine) {
      processOfflineQueue()
    }

    return () => {
      window.removeEventListener('mixid-config-changed', handleConfigChange)
      wsClient.off('sync:settings:update', handleSettingsUpdate)
      wsClient.off('sync:data:update', handleDataUpdate)
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [settings, updateSettings, mergeWithConflictResolution, uploadSettings, uploadData, processOfflineQueue, performSync])

  return { performSync, uploadSettings, uploadData }
}

