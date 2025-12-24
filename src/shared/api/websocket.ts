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
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;
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
          console.error("WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("WebSocket closed");
          this.ws = null;
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
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
