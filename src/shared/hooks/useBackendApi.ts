import { createBackendClient } from "@/shared/api/backendClient";
import { useMemo } from "react";
import { useSettings } from "./useSettings";

export function useBackendApi() {
  const { settings } = useSettings();
  const client = useMemo(() => {
    const base =
      settings.backendUrl || (import.meta.env.VITE_BACKEND_URL as string) || "https://kimai-api.zorin.cloud";
    return createBackendClient(base);
  }, [settings.backendUrl]);

  return client;
}

export default useBackendApi;
