import createBackendClient from './backendClient'

// Compatibility wrapper: keep class interface used across the app,
// delegate implementation to the new axios-based client factory.
export class BackendApi {
  private client: ReturnType<typeof createBackendClient>

  constructor(baseUrl: string, _token?: string) {
    this.client = createBackendClient(baseUrl)
  }

  setToken(_token: string | null) {
    // token is managed by session store and axios interceptors
  }

  // Legacy mix-id login (kept for compatibility)
  login(mixIdToken: string) {
    return this.client.login(mixIdToken as any)
  }

  // Local login/register (new endpoints)
  loginLocal(email: string, password: string) {
    return this.client.login(email, password)
  }

  registerLocal(email: string, password: string) {
    return this.client.register(email, password)
  }

  refreshSession(refreshToken: string) {
    return this.client.refreshSession(refreshToken)
  }

  logout() {
    return this.client.logout()
  }

  getTimesheets(startDate?: string, endDate?: string, limit?: number, offset?: number) {
    return this.client.getTimesheets(startDate, endDate, limit, offset)
  }

  getSettings() {
    return this.client.getSettings()
  }

  updateSettings(settings: unknown) {
    return this.client.updateSettings(settings)
  }

  triggerSync() {
    return this.client.triggerSync()
  }

  getSyncStatus() {
    return this.client.getSyncStatus()
  }

  getMLPrediction(predictionType: string, context?: Record<string, unknown>) {
    // Optional — backend client may implement ML endpoint
    // @ts-ignore
    return (this.client as any).getMLPrediction?.(predictionType, context)
  }
}

export default BackendApi

