export type MixIdSyncStatus =
  | "connected-ws"
  | "connected-rest"
  | "disconnected"
  | "checking";

export type UseMixIdStatusReturn = {
  isConnected: boolean;
  hasConfig: boolean;
  syncStatus: MixIdSyncStatus;
};

export function useMixIdStatus(): UseMixIdStatusReturn {
  return {
    isConnected: false,
    hasConfig: false,
    syncStatus: "disconnected",
  };
}

export default useMixIdStatus;
