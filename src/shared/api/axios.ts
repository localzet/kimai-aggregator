import consola from "consola/browser";
import axios, { AxiosInstance } from "axios";

import { logoutEvents } from "../emitters/emit-logout";
import { useSessionStore } from "@entities/session-store";

let authorizationToken = "";

export const instance = axios.create({
  baseURL:
    typeof __DOMAIN_BACKEND__ !== "undefined"
      ? (__DOMAIN_BACKEND__ as any)
      : "",
  headers: {
    "Content-type": "application/json",
    Accept: "application/json",
  },
});

export const setAuthorizationToken = (token: string) => {
  authorizationToken = token || "";
  try {
    if (token) {
      instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete instance.defaults.headers.common["Authorization"];
    }
  } catch (e) {
    // ignore
  }
};

// apply initial token from session store
setAuthorizationToken(useSessionStore.getState().accessToken);

// keep module token in sync with session store changes
useSessionStore.subscribe((state) => {
  try {
    setAuthorizationToken(state.accessToken);
  } catch (e) {
    // ignore
  }
});

function applyInterceptors(inst: AxiosInstance) {
  // request
  inst.interceptors.request.use((config) => {
    if (!config.headers) config.headers = {};
    if (authorizationToken) {
      config.headers["Authorization"] = `Bearer ${authorizationToken}`;
    }
    return config;
  });

  // response with refresh flow
  let isRefreshing = false;
  let refreshPromise: Promise<any> | null = null;

  inst.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (!originalRequest) return Promise.reject(error);

      const status = error.response?.status;
      if ((status === 401 || status === 403) && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = useSessionStore.getState().refreshToken;
        if (!refreshToken) {
          try {
            logoutEvents.emit();
          } catch (e) {
            console.error(e);
          }
          return Promise.reject(error);
        }

        try {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = inst
              .post("/api/auth/refresh", { refresh_token: refreshToken })
              .then((res) => {
                const data = res.data;
                const newAccess = data.token || data.access_token;
                const newRefresh =
                  data.refresh_token || data.refreshToken || data.refreshToken;
                if (newAccess) {
                  // update module token and session store
                  setAuthorizationToken(newAccess);
                  try {
                    setToken({
                      accessToken: newAccess,
                      refreshToken: newRefresh,
                    });
                  } catch (e) {}
                }
                return data;
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          await refreshPromise;
          // retry original request with new token
          const updatedToken = useSessionStore.getState().accessToken;
          if (updatedToken) {
            originalRequest.headers["Authorization"] = `Bearer ${updatedToken}`;
          }
          return inst(originalRequest);
        } catch (e) {
          try {
            logoutEvents.emit();
          } catch (er) {
            console.error(er);
          }
          return Promise.reject(e);
        }
      }

      return Promise.reject(error);
    },
  );
}

// apply interceptors to the default instance
applyInterceptors(instance);

// factory to create axios instance with same interceptors but different baseURL
export function createInstance(baseURL?: string) {
  const inst = axios.create({
    baseURL: baseURL || instance.defaults.baseURL,
    headers: { "Content-type": "application/json", Accept: "application/json" },
  });
  // keep reference to default Authorization header
  if (authorizationToken) {
    inst.defaults.headers.common["Authorization"] =
      `Bearer ${authorizationToken}`;
  }
  applyInterceptors(inst);
  return inst;
}
