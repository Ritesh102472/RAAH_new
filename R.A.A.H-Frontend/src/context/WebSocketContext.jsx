import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocketContext = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider = ({ children }) => {
    const [isLive, setIsLive] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const socketRef = useRef(null);
    const listenersRef = useRef(new Set());

    const connect = useCallback(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const socketUrl = `${protocol}//${host}/ws`;

        console.log('🔌 Connecting to WebSocket:', socketUrl);
        const ws = new WebSocket(socketUrl);

        ws.onopen = () => {
            console.log('✅ WebSocket Connected');
            setIsLive(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📩 Global WebSocket message:', data);
                setLastMessage(data);
                listenersRef.current.forEach(listener => listener(data));
            } catch (err) {
                console.error('❌ Error parsing message:', err);
            }
        };

        ws.onclose = () => {
            console.log('❌ WebSocket Disconnected');
            setIsLive(false);
            // Reconnect after 5 seconds
            setTimeout(connect, 5000);
        };

        ws.onerror = (err) => {
            console.error('❌ WebSocket Error:', err);
            ws.close();
        };

        socketRef.current = ws;
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [connect]);

    const subscribe = useCallback((listener) => {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
    }, []);

    const value = {
        isLive,
        lastMessage,
        subscribe
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};
