import { Timesheet } from "./kimaiApi";

export interface WebSocketMessage {
  type: string;
  payload?: any;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private onTimesheetsUpdateCallbacks: Set<(timesheets: Timesheet[]) => void> =
    new Set();

  constructor(baseUrl: string, token: string) {
    // Normalize base URL and avoid duplicate /api segments
    let base = (baseUrl || "").trim();
    if (typeof window !== "undefined" && base === "") {
      base = window.location.origin;
    }
    if (!/^https?:\/\//i.test(base) && typeof window !== "undefined") {
      base = (window.location.protocol || "https:") + "//" + base;
    }

    // Ensure no trailing slash
    base = base.replace(/\/$/, "");

    // If base already contains /api at the end, use /ws, otherwise use /api/ws
    const needsApiPrefix = !base.endsWith("/api");

    // Convert http(s) -> ws(s)
    const wsBase = base.replace(/^http/, "ws");
    this.url = `${wsBase}${needsApiPrefix ? "/api/ws" : "/ws"}?token=${encodeURIComponent(token)}`;
    this.token = token;
  }

  connect(): Promise<void> {
    // Prevent connecting with an obviously expired or missing token
    try {
      if (!this.token) {
        return Promise.reject(new Error("No token provided for WebSocket"));
      }
      // Basic JWT expiry check (token is base64 parts)
      const parts = this.token.split(".");
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.exp && typeof payload.exp === "number") {
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
              return Promise.reject(new Error("Token expired"));
            }
          }
        } catch (e) {
          // ignore malformed payload
        }
      }

      this.ws = new WebSocket(this.url);

      return new Promise((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
          if (!this.ws) return;
          this.ws.onopen = null;
          this.ws.onmessage = null;
          this.ws.onerror = null;
          this.ws.onclose = null;
        };

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          settled = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          if (!settled) {
            settled = true;
            cleanup();
            reject(new Error("WebSocket connection error"));
          } else {
            console.error("WebSocket error after connect:", error);
          }
        };

        this.ws.onclose = (ev) => {
          console.log("WebSocket closed", ev?.code, ev?.reason);
          this.ws = null;
          if (!settled) {
            settled = true;
            cleanup();
            reject(new Error("WebSocket closed before open"));
          } else {
            this.attemptReconnect();
          }
        };
      });
    } catch (e) {
      return Promise.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(
        `Attempting to reconnect WebSocket in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );

      setTimeout(() => {
        if (!this.ws) {
          this.connect().catch((error) => {
            console.error("Reconnection failed:", error);
          });
        }
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  private handleMessage(message: WebSocketMessage) {
    // Call all listeners for this message type
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(message.payload);
        } catch (error) {
          console.error(
            `Error in WebSocket listener for ${message.type}:`,
            error,
          );
        }
      });
    }

    // Special handling for timesheets updates
    if (message.type === "timesheets_updated" && message.payload?.timesheets) {
      this.onTimesheetsUpdateCallbacks.forEach((callback) => {
        try {
          callback(message.payload.timesheets);
        } catch (error) {
          console.error("Error in timesheets update callback:", error);
        }
      });
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  onTimesheetsUpdate(callback: (timesheets: Timesheet[]) => void) {
    this.onTimesheetsUpdateCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.onTimesheetsUpdateCallbacks.delete(callback);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.onTimesheetsUpdateCallbacks.clear();
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
