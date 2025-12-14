/** Хук для обнаружения аномалий */

import { useState, useEffect } from 'react'
import { getMLClient } from '../client'
import { AnomalyOutput } from '../types'
import { WeekData } from '@/shared/api/kimaiApi'
import { Settings } from '@/shared/hooks/useSettings'

export function useAnomalies(weeks: WeekData[], settings: Settings) {
  const [anomalies, setAnomalies] = useState<AnomalyOutput[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Минимум 20 записей для обнаружения аномалий
    const totalEntries = weeks.reduce((sum, w) => sum + (w.entries?.length || 0), 0)
    if (totalEntries < 20) {
      setAnomalies([])
      return
    }

    const loadAnomalies = async () => {
      setLoading(true)
      setError(null)

      try {
        const client = getMLClient()
        const result = await client.detectAnomalies(weeks, settings)
        setAnomalies(result || [])
      } catch (err) {
        console.error('Anomaly detection error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setAnomalies([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce
    const timeoutId = setTimeout(loadAnomalies, 500)
    return () => clearTimeout(timeoutId)
  }, [weeks, settings])

  return { anomalies, loading, error }
}

