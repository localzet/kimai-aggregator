import { Settings, AppMode } from '@/shared/hooks/useSettings'
import { Timesheet, WeekData } from './kimaiApi'

export interface BackendAuthResponse {
  token: string
  user_id: string
}
export interface BackendAuthWithRefreshResponse extends BackendAuthResponse {
  refresh_token?: string
}

export interface BackendTimesheetListResponse {
  timesheets: Timesheet[]
  total: number
}

export interface BackendSyncStatus {
  status: string
  last_kimai_sync?: string
  last_calendar_sync?: string
  last_ml_sync?: string
}

export class BackendApi {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.token = token || null
  }

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    })

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`)
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Неверный токен авторизации')
      }
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async login(mixIdToken: string): Promise<BackendAuthResponse> {
    return this.request<BackendAuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ mix_id_token: mixIdToken }),
    })
  }

  async exchangeMixIdCode(code: string, redirectUri?: string): Promise<BackendAuthResponse> {
    return this.request<BackendAuthWithRefreshResponse>('/api/auth/mixid/exchange', {
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })
  }

  async refreshSession(refreshToken: string): Promise<BackendAuthWithRefreshResponse> {
    return this.request<BackendAuthWithRefreshResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    })
  }

  async getTimesheets(
    startDate?: string,
    endDate?: string,
    limit?: number,
    offset?: number
  ): Promise<BackendTimesheetListResponse> {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())

    return this.request<BackendTimesheetListResponse>(
      `/api/timesheets?${params.toString()}`
    )
  }

  async getSettings(): Promise<Settings> {
    return this.request<Settings>('/api/settings')
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    return this.request<Settings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  async triggerSync(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(
      '/api/sync/trigger',
      {
        method: 'POST',
      }
    )
  }

  async getSyncStatus(): Promise<BackendSyncStatus> {
    return this.request<BackendSyncStatus>('/api/sync/status', {
      method: 'POST',
    })
  }

  async getMLPrediction(
    predictionType: string,
    context?: Record<string, unknown>
  ): Promise<unknown> {
    return this.request('/api/ml/predict', {
      method: 'POST',
      body: JSON.stringify({
        prediction_type: predictionType,
        context: context || {},
      }),
    })
  }
}

