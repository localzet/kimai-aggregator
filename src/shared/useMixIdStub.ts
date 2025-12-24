export function useMixIdStatus() {
  return {
    isConnected: false,
    hasConfig: false,
    syncStatus: 'disconnected',
  } as const;
}
