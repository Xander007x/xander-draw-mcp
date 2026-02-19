import { useCallback, useEffect, useRef, useState } from "react";

type WSStatus = "connecting" | "connected" | "disconnected";

export function useWebSocket(url: string) {
  const [status, setStatus] = useState<WSStatus>("connecting");
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        console.log("[WS] Connected to ingest server");
        setStatus("connected");
      };

      ws.onmessage = (event) => {
        setLastMessage(event.data);
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected — reconnecting in 3s...");
        setStatus("disconnected");
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("[WS] Error:", err);
        ws.close();
      };
    } catch (err) {
      console.error("[WS] Connection failed:", err);
      setStatus("disconnected");
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { status, lastMessage, sendMessage };
}
