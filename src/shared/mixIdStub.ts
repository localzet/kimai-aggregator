export const mixIdApi = {
  getConfig(): { accessToken?: string } | null {
    try {
      const stored = localStorage.getItem('mixid_config')
      if (stored) return JSON.parse(stored)
    } catch {}
    return null
  },

  async getSyncStatus(): Promise<{ syncSettings: boolean; syncData: boolean; lastSyncAt: string | null }> {
    return { syncSettings: false, syncData: false, lastSyncAt: null }
  },

  setConfig(_cfg: Record<string, unknown>) {
    // no-op stub
  },

  async downloadSettings(): Promise<any | null> {
    return null
  },

  async uploadSettings(_settings: any): Promise<void> {
    // no-op
  },

  async initiateOAuth(_redirectUri: string): Promise<{ authorizationUrl: string; code?: string }> {
    return { authorizationUrl: '', code: '' }
  },

  async exchangeCodeForToken(_code: string, _redirectUri?: string) {
    return { access_token: null, refresh_token: null }
  },
}
