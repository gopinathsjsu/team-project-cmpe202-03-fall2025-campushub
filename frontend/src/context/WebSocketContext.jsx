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
    const receivedMessageRef = useRef(false);
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
            const existingWs = wsRef.current;
            if (existingWs && existingWs.readyState !== WebSocket.CLOSED) {
                existingWs.close(1000, 'Reconnecting');
            }
            // Clear ref after closing
            wsRef.current = null;
            setConnected(false);

            const wsUrl = getWSUrl();
            const token = localStorage.getItem('authToken');
            console.log('Connecting to WebSocket:', {
                url: wsUrl.replace(/token=.+/, 'token=***'),
                hasToken: !!token,
                tokenLength: token ? token.length : 0,
                server: import.meta.env.VITE_WS_URL || 'localhost:8081'
            });
            
            const ws = new WebSocket(wsUrl);
            
            // Log connection state changes
            ws.addEventListener('open', () => {
                console.log('✅ WebSocket connection opened');
            });
            
            ws.addEventListener('error', (error) => {
                console.error('❌ WebSocket error event:', error);
            });
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                // Always set ref first, then update state
                wsRef.current = ws;
                receivedMessageRef.current = false; // Reset message tracking
                setConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0;
                console.log('WebSocket connection state updated:', {
                    connected: true,
                    readyState: ws.readyState,
                    refSet: wsRef.current !== null,
                    refMatches: wsRef.current === ws
                });
            };

            ws.onmessage = (event) => {
                try {
                    // If we receive a message, the connection is definitely open
                    receivedMessageRef.current = true;
                    
                    // Update connection state if it was incorrectly marked as disconnected
                    if (!connected && wsRef.current === ws) {
                        console.log('Connection confirmed by receiving message - updating state');
                        setConnected(true);
                        setError(null);
                    }
                    
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
                // Don't set error here - let onclose handle it
                // This prevents showing error before we know the actual close code
            };

            ws.onclose = (event) => {
                console.log('WebSocket closed:', {
                    code: event.code,
                    reason: event.reason || 'No reason provided',
                    wasClean: event.wasClean
                });
                // Only clear ref if this is the current connection
                if (wsRef.current === ws) {
                    wsRef.current = null;
                    receivedMessageRef.current = false; // Reset message tracking
                }
                setConnected(false);

                // Don't reconnect on normal closure
                if (event.code === 1000) {
                    console.log('WebSocket closed normally');
                    return;
                }
                
                // Handle different close codes
                const token = localStorage.getItem('authToken');
                
                // 1008 = Policy violation (likely auth failure)
                // 1006 = Abnormal closure (connection lost)
                if (event.code === 1008) {
                    if (!token) {
                        setError('Please log in to connect to chat. No authentication token found.');
                    } else {
                        setError('WebSocket authentication failed. Your token may be expired. Please try logging out and logging back in.');
                    }
                    console.error('WebSocket authentication failed:', {
                        code: event.code,
                        reason: event.reason,
                        hasToken: !!token,
                        tokenLength: token ? token.length : 0
                    });
                    return;
                }
                
                if (event.code === 1006) {
                    setError('WebSocket connection lost. This might be a network issue. Please check your connection and refresh the page.');
                    console.error('WebSocket abnormal closure:', {
                        code: event.code,
                        reason: event.reason
                    });
                    return;
                }

                // Attempt to reconnect if not a normal closure
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1;
                    console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, reconnectDelay);
                } else {
                    const token = localStorage.getItem('authToken');
                    let errorMsg = `Failed to connect after ${maxReconnectAttempts} attempts.`;
                    if (!token) {
                        errorMsg += ' Please log in first.';
                    } else {
                        errorMsg += ' Please check if the WebSocket server is running on port 8081, or try logging out and back in.';
                    }
                    setError(errorMsg);
                    console.error('Max reconnection attempts reached. Close code:', event.code);
                }
            };

            // Set ref immediately when WebSocket is created
            wsRef.current = ws;
            
            // Verify connection after a short delay
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN && wsRef.current === ws) {
                    console.log('✅ WebSocket connection verified and ready');
                    if (!connected) {
                        console.log('Updating connection state after verification');
                        setConnected(true);
                    }
                } else {
                    console.warn('WebSocket verification failed:', {
                        readyState: ws.readyState,
                        refMatches: wsRef.current === ws,
                        connected
                    });
                }
            }, 500);
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
        const ws = wsRef.current;
        
        // If we've received messages, the connection exists even if state is out of sync
        const hasReceivedMessages = receivedMessageRef.current;
        
        if (!ws) {
            console.error('WebSocket ref is null. Connection state:', {
                connected,
                hasRef: wsRef.current !== null,
                hasReceivedMessages,
                error: error
            });
            // If we've received messages but ref is null, there's a sync issue
            if (hasReceivedMessages) {
                console.warn('Have received messages but ref is null - attempting reconnect');
                receivedMessageRef.current = false;
            }
            throw new Error('WebSocket is not connected. Please wait for connection or refresh the page.');
        }
        
        if (ws.readyState === WebSocket.CONNECTING) {
            throw new Error('WebSocket is still connecting. Please wait a moment and try again.');
        }
        
        if (ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket readyState check failed:', {
                readyState: ws.readyState,
                states: {
                    CONNECTING: WebSocket.CONNECTING,
                    OPEN: WebSocket.OPEN,
                    CLOSING: WebSocket.CLOSING,
                    CLOSED: WebSocket.CLOSED
                },
                connected,
                hasRef: wsRef.current !== null,
                hasReceivedMessages
            });
            
            // If we've received messages but readyState is not OPEN, update state
            if (hasReceivedMessages && ws.readyState === WebSocket.CLOSED) {
                console.warn('Have received messages but connection closed - reconnecting...');
                receivedMessageRef.current = false;
                setConnected(false);
                connect();
            }
            
            throw new Error(`WebSocket is not ready (state: ${ws.readyState}). Please wait for connection or refresh the page.`);
        }

        try {
            const messageStr = JSON.stringify(message);
            console.log('Sending WebSocket message:', message, {
                readyState: ws.readyState,
                connected,
                hasReceivedMessages
            });
            ws.send(messageStr);
            return true; // Success
        } catch (err) {
            console.error('Error sending WebSocket message:', err);
            throw new Error(`Failed to send message: ${err.message}`);
        }
    }, [connected, error, connect]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

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