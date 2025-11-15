import { useState, useEffect, useCallback, useMemo } from 'react'
import { db } from '../services/db'

export function useSyncStatus(settings) {
  const [status, setStatus] = useState('offline')
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    // Проверяем онлайн статус
    const updateOnlineStatus = () => {
      setStatus(prev => {
        // Не меняем статус на 'offline', если сейчас 'updating'
        if (prev === 'updating' && !navigator.onLine) {
          return prev
        }
        return navigator.onLine ? 'online' : 'offline'
      })
    }

    updateOnlineStatus()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Загружаем информацию о последнем обновлении
    const loadLastUpdate = async () => {
      try {
        await db.init()
        const lastUpdateTime = await db.getMetadata('lastUpdate')
        if (lastUpdateTime) {
          setLastUpdate(lastUpdateTime)
        }
      } catch (err) {
        console.error('Error loading last update:', err)
      }
    }

    loadLastUpdate()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Используем useCallback для стабильности функций
  const setUpdating = useCallback(() => {
    setStatus('updating')
  }, [])

  const setOnline = useCallback(() => {
    setStatus('online')
    db.saveMetadata('lastUpdate', new Date().toISOString()).then(() => {
      db.getMetadata('lastUpdate').then(time => setLastUpdate(time))
    })
  }, [])

  const setOffline = useCallback(() => {
    setStatus('offline')
  }, [])

  // Используем useMemo для стабильности объекта возврата
  return useMemo(() => ({
    status, 
    lastUpdate, 
    setUpdating, 
    setOnline, 
    setOffline 
  }), [status, lastUpdate, setUpdating, setOnline, setOffline])
}

