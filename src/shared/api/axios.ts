import consola from "consola/browser";
import axios, { AxiosInstance } from "axios";

import { logoutEvents } from "../emitters/emit-logout";
import { useSessionStore, setToken } from "@entities/session-store";

let authorizationToken = "";

export const instance = axios.create({
  baseURL:
    typeof __DOMAIN_BACKEND__ !== "undefined"
      ? (__DOMAIN_BACKEND__ as any)
      : "",
  timeout: 15000, // 15 second timeout to prevent hanging requests
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
const initialToken = useSessionStore.getState().accessToken;
consola.debug('[axios] Initial token from session store:', {
  hasToken: !!initialToken,
  tokenLength: initialToken?.length || 0,
});
setAuthorizationToken(initialToken);

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
    if (!config.headers) config.headers = {} as any;
    // Always use current token from session store, not the module-level cached one
    const currentToken = useSessionStore.getState().accessToken;
    consola.debug('[axios] Request interceptor:', {
      url: config.url,
      hasToken: !!currentToken,
      tokenLength: currentToken?.length || 0,
    });
    if (currentToken) {
      config.headers["Authorization"] = `Bearer ${currentToken}`;
    } else if (authorizationToken) {
      // Fallback to module token for backwards compatibility
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
              .post("/api/v1/auth/refresh", { refresh_token: refreshToken })
              .then((res) => {
                const data = res.data;
                // support normalized response: { success: true, data: { accessToken, refreshToken } }
                const payload =
                  data && data.success && data.data ? data.data : data;
                const newAccess =
                  payload.accessToken || payload.token || payload.access_token;
                const newRefresh =
                  payload.refreshToken || payload.refresh_token;
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
                return payload;
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
    timeout: 15000, // 15 second timeout to prevent hanging requests
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
