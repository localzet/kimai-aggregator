export function useMixIdStatus() {
  return {
    isConnected: false,
    hasConfig: false,
    // union of possible statuses used in UI
    syncStatus: 'disconnected' as 'connected-ws' | 'connected-rest' | 'disconnected' | 'checking',
  }
}
