/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X, Send, Loader2, ExternalLink, Tag, DollarSign, Wifi, WifiOff } from "lucide-react";
import api from "../api/apiClient";
import { useWS } from "../context/WebSocketContext";


export default function ChatbotModal({ onClose }) {
    const [q, setQ] = useState("");
    const [answer, setAnswer] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]); // Chat history
    const { connected, error, sendMessage, subscribe, unsubscribe } = useWS();
    const currentRequestId = useRef(null);

    useEffect(() => {
    if (connected) {
      console.log('Chat WebSocket connected!');
      
    }
    }, [connected]);

     useEffect(() => {
        if (!connected) return;

        const handleAgentResponse = (event) => {
            console.log('Received agent response:', event);
            
            // Only process if this response matches our current request
            if (event.requestId === currentRequestId.current) {
                setLoading(false);
                
                // Parse payload if it's a string
                let payload = event.payload;
                if (typeof payload === 'string') {
                    try {
                        payload = JSON.parse(payload);
                    } catch (e) {
                        console.error('Failed to parse payload:', e);
                    }
                }
                
                const answerText = payload?.answer || payload?.message || "No response from AI";
                const resultList = payload?.results || [];
                
                setAnswer(answerText);
                setResults(resultList);
                
                // Add to chat history
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    text: answerText,
                    results: resultList,
                    timestamp: new Date()
                }]);
                
                currentRequestId.current = null; // Clear after processing
            }
        };

        const handleChatResponse = (event) => {
            console.log('Received chat response:', event);
            
            // Only process if this response matches our current request
            if (event.requestId === currentRequestId.current) {
                setLoading(false);
                
                // Parse payload if it's a string
                let payload = event.payload;
                if (typeof payload === 'string') {
                    try {
                        payload = JSON.parse(payload);
                    } catch (e) {
                        console.error('Failed to parse payload:', e);
                    }
                }
                
                const answerText = payload?.answer || payload?.message || "No response from AI";
                const resultList = payload?.results || [];
                
                setAnswer(answerText);
                setResults(resultList);
                
                // Add to chat history
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    text: answerText,
                    results: resultList,
                    timestamp: new Date()
                }]);
                
                currentRequestId.current = null;
            }
        };

        const handleError = (event) => {
            console.error('Received error:', event);
            
            // Only process if this error matches our current request
            if (event.requestId === currentRequestId.current) {
                setLoading(false);
                
                // Parse payload if it's a string
                let payload = event.payload;
                if (typeof payload === 'string') {
                    try {
                        payload = JSON.parse(payload);
                    } catch (e) {
                        // If parsing fails, use the string as message
                        payload = { message: payload };
                    }
                }
                
                const errorMsg = payload?.message || payload?.code || "Sorry, I couldn't process your request. Please try again.";
                setAnswer(errorMsg);
                setResults([]);
                
                // Add error to chat history
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    text: errorMsg,
                    results: [],
                    timestamp: new Date(),
                    isError: true
                }]);
                
                currentRequestId.current = null;
            }
        };

        // Subscribe to response and error events
        subscribe('agent.response', handleAgentResponse);
        subscribe('chat.response', handleChatResponse);
        subscribe('error', handleError);

        // Cleanup subscriptions on unmount
        return () => {
            unsubscribe('agent.response', handleAgentResponse);
            unsubscribe('chat.response', handleChatResponse);
            unsubscribe('error', handleError);
        };
    }, [connected, subscribe, unsubscribe]);

    // Helper to detect if query is a greeting (for UI purposes, backend handles this)
    const detectGreeting = (text) => {
        const lower = text.toLowerCase().trim();
        const greetings = ['hi', 'hello', 'hey', 'how are you', 'howdy', 'greetings', 'good morning', 'good afternoon', 'good evening'];
        return greetings.some(g => lower.includes(g)) && lower.length < 50;
    };

    const ask = async () => {
        if (!q.trim()) return;
        
        if (!connected) {
            const errorMsg = "Not connected to chat server. Please wait for connection or refresh the page.";
            setAnswer(errorMsg);
            setMessages(prev => [...prev, {
                type: 'assistant',
                text: errorMsg,
                results: [],
                timestamp: new Date(),
                isError: true
            }]);
            return;
        }

        const queryText = q.trim();
        setLoading(true);
        setAnswer("");
        setResults([]);
        
        // Add user message to chat history
        setMessages(prev => [...prev, {
            type: 'user',
            text: queryText,
            timestamp: new Date()
        }]);
        
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        currentRequestId.current = requestId;

        // Set a timeout for the request (30 seconds)
        const timeoutId = setTimeout(() => {
            if (currentRequestId.current === requestId) {
                setLoading(false);
                const timeoutMsg = "Request timed out. The AI might be taking longer than usual. Please try again.";
                setAnswer(timeoutMsg);
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    text: timeoutMsg,
                    results: [],
                    timestamp: new Date(),
                    isError: true
                }]);
                currentRequestId.current = null;
            }
        }, 30000);

        try {
            // Use agent.search for all queries (greetings and product searches)
            // The backend ProcessQuery now handles both greetings and product searches
            sendMessage({
                type: "agent.search",
                requestId: requestId,
                payload: {
                    query: queryText
                }
            });

            console.log('Sent agent.search:', { requestId, query: queryText, isGreeting: detectGreeting(queryText) });
            
            // Clear input after sending
            setQ("");
            
            // Clear timeout when response is received (handled in response handlers)
            // Store timeout ID to clear it
            const originalTimeoutId = timeoutId;
            // We'll clear this in the response handlers
            setTimeout(() => {
                clearTimeout(originalTimeoutId);
            }, 30000);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Error sending message:', error);
            setLoading(false);
            const errorMsg = error.message || "Failed to send request. Please check your connection and try again.";
            setAnswer(errorMsg);
            
            // Add error to chat history
            setMessages(prev => [...prev, {
                type: 'assistant',
                text: errorMsg,
                results: [],
                timestamp: new Date(),
                isError: true
            }]);
            
            currentRequestId.current = null;
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            ask();
        }
    };

     return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-700 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                            <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                AI Assistant
                            </h2>
                            <div className="flex items-center space-x-2">
                                <p className="text-xs text-primary-100">
                                    Powered by Gemini AI
                                </p>
                                {connected ? (
                                    <div className="flex items-center space-x-1 text-green-300">
                                        <Wifi size={12} />
                                        <span className="text-xs">Connected</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-1 text-yellow-300">
                                        <WifiOff size={12} />
                                        <span className="text-xs">Connecting...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                 
                    {error && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                ⚠️ {error}
                            </p>
                        </div>
                    )}

                    {/* Chat History */}
                    {messages.length > 0 && (
                        <div className="mb-6 space-y-4 max-h-96 overflow-y-auto pr-2">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                            msg.type === 'user'
                                                ? 'bg-primary-600 text-white'
                                                : msg.isError
                                                ? 'bg-red-50 text-red-800 border border-red-200'
                                                : 'bg-gray-100 text-gray-900'
                                        }`}
                                    >
                                        <p className="text-sm whitespace-pre-line break-words">{msg.text}</p>
                                        {msg.results && msg.results.length > 0 && (
                                            <p className="text-xs mt-2 opacity-75">
                                                Found {msg.results.length} {msg.results.length === 1 ? 'listing' : 'listings'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mb-6">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                                placeholder="Say hi, ask about products, or search for items..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                            />
                            <button
                                onClick={ask}
                                disabled={loading || !q.trim()}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-white font-medium hover:from-primary-600 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2
                                            size={18}
                                            className="animate-spin"
                                        />
                                        <span>Thinking...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        <span>Send</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 ml-1">
                            Try: "Hi" or "Hello" or "MacBook under $500" or "Calculus textbook"
                        </p>
                    </div>

                    {/* Show latest answer if no chat history yet (backward compatibility) */}
                    {answer && messages.length === 0 && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl border border-primary-100">
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-primary-900 mb-1">
                                        AI Response:
                                    </p>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                        {answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Show results from latest message or current answer */}
                    {(() => {
                        const displayResults = results.length > 0 ? results : (messages.length > 0 && messages[messages.length - 1]?.results) || [];
                        return displayResults.length > 0 ? (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                Found {displayResults.length}{" "}
                                {displayResults.length === 1 ? "listing" : "listings"}
                            </h3>
                            {displayResults.map((r) => (
                                <div
                                    key={r.id}
                                    className="border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-md transition-all duration-200 bg-white"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                                                {r.title}
                                            </h4>
                                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                                {r.description}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                                <span className="inline-flex items-center space-x-1 text-gray-600">
                                                    <Tag size={14} />
                                                    <span>{r.category}</span>
                                                </span>
                                                <span className="inline-flex items-center space-x-1 text-green-700 font-semibold">
                                                    <DollarSign size={14} />
                                                    <span>{r.price}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/listing/${r.id}`}
                                            onClick={onClose}
                                            className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors whitespace-nowrap shadow-sm hover:shadow"
                                        >
                                            <span>View</span>
                                            <ExternalLink size={14} />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                        ) : null;
                    })()}
                    
                    {/* Empty state - only show if no messages and not loading */}
                    {!loading && messages.length === 0 && !answer && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg
                                    className="w-10 h-10 text-primary-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Start a conversation
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Ask me anything! I can help you find products or just chat.
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                <button
                                    onClick={() => setQ("Hi")}
                                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    👋 Say Hi
                                </button>
                                <button
                                    onClick={() => setQ("MacBook under $500")}
                                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    💻 Find Products
                                </button>
                                <button
                                    onClick={() => setQ("How are you?")}
                                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    💬 Chat
                                </button>
                            </div>
                        </div>
                    )}

                 
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2
                                size={40}
                                className="text-primary-500 animate-spin mb-3"
                            />
                            <p className="text-sm text-gray-600">
                                AI is thinking...
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}