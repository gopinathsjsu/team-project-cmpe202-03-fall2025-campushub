import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

export const useWS = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWS must be used within WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const subscribersRef = useRef(new Map());
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;

    const getWSUrl = () => {
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }

        // Determine WebSocket URL based on environment
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.VITE_WS_URL || 'localhost:8081';
        
        return `${protocol}//${host}/ws?token=${token}`;
    };

    const connect = useCallback(() => {
        try {
            // Close existing connection if any
            if (wsRef.current) {
                wsRef.current.close();
            }

            const wsUrl = getWSUrl();
            console.log('Connecting to WebSocket:', wsUrl.replace(/token=.+/, 'token=***'));
            
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                setConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('WebSocket message received:', message);

                    // Notify all subscribers for this event type
                    const subscribers = subscribersRef.current.get(message.type) || [];
                    subscribers.forEach(callback => {
                        try {
                            callback(message);
                        } catch (err) {
                            console.error('Error in subscriber callback:', err);
                        }
                    });
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            };

            ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('Connection error occurred');
            };

            ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setConnected(false);
                wsRef.current = null;

                // Attempt to reconnect if not a normal closure
                if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1;
                    console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, reconnectDelay);
                } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                    setError('Failed to connect after multiple attempts');
                }
            };

            wsRef.current = ws;
        } catch (err) {
            console.error('Error creating WebSocket connection:', err);
            setError(err.message);
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close(1000, 'Client disconnect');
            wsRef.current = null;
        }
        setConnected(false);
    }, []);

    const sendMessage = useCallback((message) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        const messageStr = JSON.stringify(message);
        console.log('Sending WebSocket message:', message);
        wsRef.current.send(messageStr);
    }, []);

    const subscribe = useCallback((eventType, callback) => {
        if (!subscribersRef.current.has(eventType)) {
            subscribersRef.current.set(eventType, []);
        }
        subscribersRef.current.get(eventType).push(callback);
        console.log(`Subscribed to ${eventType}`);
    }, []);

    const unsubscribe = useCallback((eventType, callback) => {
        if (subscribersRef.current.has(eventType)) {
            const subscribers = subscribersRef.current.get(eventType);
            const index = subscribers.indexOf(callback);
            if (index > -1) {
                subscribers.splice(index, 1);
                console.log(`Unsubscribed from ${eventType}`);
            }
        }
    }, []);

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        // Only connect if user is authenticated
        const token = localStorage.getItem('authToken');
        if (token) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    // Reconnect when token changes (user logs in)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'token') {
                if (e.newValue) {
                    // Token added, connect
                    connect();
                } else {
                    // Token removed, disconnect
                    disconnect();
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [connect, disconnect]);

    const value = {
        connected,
        error,
        sendMessage,
        subscribe,
        unsubscribe,
        reconnect: connect,
        disconnect
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};