import { createInstance } from "./axios";

function handleError(e: unknown) {
  if (
    e &&
    typeof e === "object" &&
    (e as any).response &&
    (e as any).response.data
  ) {
    const d = (e as any).response.data;
    if (d && typeof d === "object") {
      return d.message || d.error || d.detail || JSON.stringify(d);
    }
    return String(d);
  }
  return e instanceof Error ? e.message : String(e);
}

export function createBackendClient(baseUrl: string) {
  const api = createInstance(baseUrl);

  return {
    async login(email: string, password: string) {
      try {
        const r = await api.post("/api/v1/auth/login", { email, password });
        return r.data;
      } catch (e) {
        throw new Error(handleError(e));
      }
    },

    async register(email: string, password: string) {
      try {
        const r = await api.post("/api/v1/auth/register", { email, password });
        return r.data;
      } catch (e) {
        throw new Error(handleError(e));
      }
    },

    async refreshSession(refreshToken: string) {
      try {
        const r = await api.post("/api/v1/auth/refresh", {
          refresh_token: refreshToken,
        });
        return r.data;
      } catch (e) {
        throw new Error(handleError(e));
      }
    },

    async logout() {
      try {
        const r = await api.post("/api/v1/auth/logout");
        return r.data;
      } catch (e) {
        throw new Error(handleError(e));
      }
    },

    async getSettings() {
      try {
        const r = await api.get("/api/v1/settings");
        return r.data;
      } catch (e) {
        throw new Error(handleError(e));
      }
    },

    async updateSettings(settings: unknown) {
      try {
        const r = await api.put("/api/v1/settings", settings);
        return r.data;
      } catch (e) {
        throw new Error(handleError(e));
      }
    },

    async triggerSync() {
      const r = await api.post("/api/v1/sync/trigger");
      return r.data;
    },

    async getSyncStatus() {
      const r = await api.post("/api/v1/sync/status");
      return r.data;
    },

    async getTimesheets(
      startDate?: string,
      endDate?: string,
      limit?: number,
      offset?: number,
    ) {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (limit) params.limit = limit;
      if (offset) params.offset = offset;
      const r = await api.get("/api/v1/timesheets", { params });
      return r.data;
    },

    async getDashboardWeeks() {
      try {
        const r = await api.get("/api/v1/dashboard/weeks");
        return r.data;
      } catch (e) {
        throw new Error(handleError(e));
      }
    },

    async getDashboardMetrics() {
      try {
        const r = await api.get("/api/v1/dashboard/metrics");
        return r.data;
      } catch (e) {
        throw new Error(handleError(e));
      }
    },
  };
}

export default createBackendClient;
