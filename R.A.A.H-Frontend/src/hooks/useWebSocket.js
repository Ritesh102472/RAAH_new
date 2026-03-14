import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing WebSocket connections to the R.A.A.H. real-time stream.
 * @param {Object} options - Hook options
 * @param {Function} options.onMessage - Callback for when a message is received
 * @param {boolean} options.enabled - Whether to connect automatically
 */
export default function useWebSocket({ onMessage, enabled = true } = {}) {
  const [isLive, setIsLive] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use environment variable if available, otherwise fallback to standard backend port
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const host = rawUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${protocol}//${host}/ws`;

    console.log('📡 Connecting to R.A.A.H. Stream:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Real-time connection established');
      setIsLive(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('❌ Real-time connection lost');
      setIsLive(false);
      // Attempt reconnection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, [onMessage]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, connect]);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }, []);

  return { isLive, sendMessage };
}
