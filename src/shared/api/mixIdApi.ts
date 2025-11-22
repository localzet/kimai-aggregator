const MIX_ID_API_BASE = import.meta.env.VITE_MIX_ID_API_BASE || 'http://localhost:3000/api'

export interface MixIdConfig {
  apiBase: string
  clientId: string
  clientSecret: string
  accessToken?: string
  refreshToken?: string
}

class MixIdApi {
  private config: MixIdConfig | null = null

  setConfig(config: MixIdConfig) {
    this.config = config
    // Save config without tokens (tokens saved separately)
    const { accessToken, refreshToken, ...configWithoutTokens } = config
    localStorage.setItem('mixId_config', JSON.stringify(configWithoutTokens))
    
    if (config.accessToken) {
      localStorage.setItem('mixId_accessToken', config.accessToken)
    }
    if (config.refreshToken) {
      localStorage.setItem('mixId_refreshToken', config.refreshToken)
    }
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('mixid-config-changed'))
  }

  getConfig(): MixIdConfig | null {
    if (!this.config) {
      try {
        const accessToken = localStorage.getItem('mixId_accessToken')
        const refreshToken = localStorage.getItem('mixId_refreshToken')
        const stored = localStorage.getItem('mixId_config')
        if (stored) {
          const parsed = JSON.parse(stored)
          this.config = { 
            ...parsed, 
            accessToken: accessToken || undefined, 
            refreshToken: refreshToken || undefined 
          }
        } else if (accessToken || refreshToken) {
          // If we have tokens but no config, try to restore from tokens
          // This handles the case where config was lost but tokens remain
          console.warn('MIX ID config missing but tokens found. Please reconfigure MIX ID.')
        }
      } catch (error) {
        console.error('Error loading MIX ID config:', error)
        this.config = null
      }
    }
    return this.config
  }

  clearConfig() {
    this.config = null
    localStorage.removeItem('mixId_config')
    localStorage.removeItem('mixId_accessToken')
    localStorage.removeItem('mixId_refreshToken')
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('mixid-config-changed'))
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const config = this.getConfig()
    if (!config) {
      throw new Error('MIX ID not configured')
    }

    const token = config.accessToken || localStorage.getItem('mixId_accessToken')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${config.apiBase || MIX_ID_API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        headers['Authorization'] = `Bearer ${refreshed}`
        const retryResponse = await fetch(`${config.apiBase || MIX_ID_API_BASE}${endpoint}`, {
          ...options,
          headers,
        })
        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}`)
        }
        return retryResponse.json()
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  private async refreshAccessToken(): Promise<string | null> {
    const config = this.getConfig()
    const refreshToken = config?.refreshToken || localStorage.getItem('mixId_refreshToken')
    if (!refreshToken) return null

    try {
      const response = await fetch(`${config?.apiBase || MIX_ID_API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) return null

      const data = await response.json()
      if (data.accessToken) {
        localStorage.setItem('mixId_accessToken', data.accessToken)
        if (this.config) {
          this.config.accessToken = data.accessToken
          // Save updated config
          const { accessToken: _, refreshToken: __, ...configWithoutTokens } = this.config
          localStorage.setItem('mixId_config', JSON.stringify(configWithoutTokens))
        }
        // Dispatch custom event for same-tab updates
        window.dispatchEvent(new Event('mixid-config-changed'))
        return data.accessToken
      }
    } catch (error) {
      console.error('Failed to refresh token:', error)
    }
    return null
  }

  // OAuth flow
  async initiateOAuth(redirectUri: string, state?: string): Promise<{ authorizationUrl: string; code: string }> {
    const config = this.getConfig()
    if (!config) {
      throw new Error('MIX ID not configured')
    }

    return this.request<{ authorizationUrl: string; code: string; state?: string }>(
      '/auth/oauth/authorize',
      {
        method: 'POST',
        body: JSON.stringify({
          clientId: config.clientId,
          redirectUri,
          state,
        }),
      }
    )
  }

  async exchangeCodeForToken(code: string, redirectUri?: string): Promise<{
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
  }> {
    const config = this.getConfig()
    if (!config) {
      throw new Error('MIX ID not configured')
    }

    // Don't use this.request() here because we don't have a token yet
    // Make direct fetch without Authorization header
    const response = await fetch(`${config.apiBase || MIX_ID_API_BASE}/auth/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token: string
      token_type: string
      expires_in: number
    }

    // Save tokens
    this.setConfig({
      ...config,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    })

    return data
  }

  // Sync
  async getSyncStatus(): Promise<{
    syncSettings: boolean
    syncData: boolean
    lastSyncAt: string | null
  }> {
    return this.request('/sync/status')
  }

  async updateSyncPreferences(syncSettings: boolean, syncData: boolean): Promise<{ success: boolean }> {
    return this.request('/sync/preferences', {
      method: 'PUT',
      body: JSON.stringify({ syncSettings, syncData }),
    })
  }

  async uploadSettings(settings: any): Promise<{ success: boolean; version: number }> {
    return this.request('/sync/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    })
  }

  async downloadSettings(): Promise<{ settings: any; version: number; updatedAt: string }> {
    return this.request('/sync/settings')
  }

  async uploadData(dataType: string, data: Record<string, any>): Promise<{ success: boolean }> {
    // Split large data into chunks to avoid 413 Payload Too Large
    const CHUNK_SIZE = 100 // Number of items per chunk
    const dataEntries = Object.entries(data)
    
    if (dataEntries.length <= CHUNK_SIZE) {
      // Small enough to send in one request
      return this.request('/sync/data', {
        method: 'POST',
        body: JSON.stringify({ dataType, data }),
      })
    }
    
    // Split into chunks
    const chunks: Record<string, any>[] = []
    for (let i = 0; i < dataEntries.length; i += CHUNK_SIZE) {
      const chunk: Record<string, any> = {}
      for (let j = i; j < Math.min(i + CHUNK_SIZE, dataEntries.length); j++) {
        chunk[dataEntries[j][0]] = dataEntries[j][1]
      }
      chunks.push(chunk)
    }
    
    // Upload chunks sequentially
    for (const chunk of chunks) {
      await this.request('/sync/data', {
        method: 'POST',
        body: JSON.stringify({ dataType, data: chunk }),
      })
    }
    
    return { success: true }
  }

  async downloadData(dataType: string): Promise<{ data: Record<string, any>; dataType: string }> {
    return this.request(`/sync/data?dataType=${dataType}`)
  }

  async checkUpdates(settingsVersion?: number, dataTypes?: string[]): Promise<{
    updates: {
      settings?: { version: number; updatedAt: string }
      data?: Record<string, { updatedAt: string }>
    }
    hasUpdates: boolean
  }> {
    const params = new URLSearchParams()
    if (settingsVersion) params.append('settingsVersion', settingsVersion.toString())
    if (dataTypes) params.append('dataTypes', dataTypes.join(','))
    return this.request(`/sync/check-updates?${params.toString()}`)
  }

  // Session heartbeat
  async heartbeat(deviceInfo?: any): Promise<{ success: boolean }> {
    return this.request('/sessions/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ deviceInfo }),
    })
  }
}

export const mixIdApi = new MixIdApi()

