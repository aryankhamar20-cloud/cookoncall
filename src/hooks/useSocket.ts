"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { API_BASE_URL } from "@/lib/api";

// Derive the WS base URL from the API base URL
// e.g. https://...railway.app/api/v1  →  https://...railway.app
function getWsBase(): string {
  try {
    const url = new URL(API_BASE_URL);
    return url.origin; // strips /api/v1
  } catch {
    return API_BASE_URL;
  }
}

export type WsEvent =
  | "booking:created"
  | "booking:accepted"
  | "booking:rejected"
  | "booking:paid"
  | "booking:started"
  | "booking:completed"
  | "booking:cancelled"
  | "booking:expired"
  | "notification:new";

type EventHandler = (data: any) => void;

/**
 * Singleton WebSocket connection to the /events namespace.
 * Authenticates via the JWT stored in coc_token cookie.
 *
 * Usage:
 *   const { on, off } = useSocket();
 *   useEffect(() => {
 *     const handler = (data) => console.log(data);
 *     on("booking:accepted", handler);
 *     return () => off("booking:accepted", handler);
 *   }, [on, off]);
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = Cookies.get("coc_token");
    if (!token) return; // not logged in — no WS connection needed

    // Reuse existing connection if already open
    if (socketRef.current?.connected) return;

    const socket = io(`${getWsBase()}/events`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socket.on("connect", () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[WS] Connected to /events:", socket.id);
      }
    });

    socket.on("connect_error", (err) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[WS] Connection error:", err.message);
      }
    });

    socket.on("disconnect", (reason) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[WS] Disconnected:", reason);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const on = useCallback((event: WsEvent, handler: EventHandler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: WsEvent, handler: EventHandler) => {
    socketRef.current?.off(event, handler);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const isConnected = () => socketRef.current?.connected ?? false;

  return { on, off, emit, isConnected };
}
