import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWS } from "../context/WebSocketContext";
import toast from "react-hot-toast";

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userId, userName } = useAuth();
  const { connected, error: wsError, sendMessage, subscribe, unsubscribe, reconnect } = useWS();
  
  // Get URL parameters for starting a new chat
  const sellerId = searchParams.get("sellerId");
  const listingId = searchParams.get("listingId");
  const listingTitle = searchParams.get("listingTitle");
  
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const threadInitializedRef = useRef(new Set()); // Track initialized threads to prevent duplicates
  
  // Generate a thread ID for the current chat (simple format: userId-sellerId-listingId)
  // Ensure listingId is included only if it exists to avoid duplicates
  const currentThreadId = sellerId && userId 
    ? `chat-${userId}-${sellerId}-${listingId ? listingId : 'general'}` 
    : null;

  // Initialize thread if coming from listing page
  useEffect(() => {
    if (!sellerId || !listingTitle || !userId || !currentThreadId) {
      return; // Wait for required params
    }
    
    // Prevent duplicate initialization using ref
    if (threadInitializedRef.current.has(currentThreadId)) {
      setActiveThreadId(currentThreadId);
      return;
    }
    
    // Use functional setState to ensure we're working with latest state
    setThreads(prev => {
      // Check if thread already exists - prevent duplicates
      const existingThread = prev.find(t => t.id === currentThreadId);
      if (existingThread) {
        threadInitializedRef.current.add(currentThreadId);
        return prev; // Thread already exists, no changes
      }
      
      // Create new thread only if it doesn't exist
      const newThread = {
        id: currentThreadId,
        title: listingTitle,
        sellerId: sellerId,
        buyerId: userId, // Current user is the buyer
        listingId: listingId || null,
        messages: []
      };
      
      threadInitializedRef.current.add(currentThreadId);
      return [newThread, ...prev];
    });
    
    // Set as active thread after state update
    setActiveThreadId(currentThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, listingTitle, userId]); // Only depend on these to avoid re-creating thread

  // Subscribe to WebSocket messages
  useEffect(() => {
    if (!userId) return;
    
    // If connected is false but we're trying to subscribe, the connection might be in progress
    // We'll still set up handlers so if messages arrive, we can process them

    const handleError = (event) => {
      if (event.type === "error" && event.payload) {
        try {
          const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
          const errorMessage = payload.message || payload.code || "An error occurred";
          const errorCode = payload.code || "";
          
          console.error("WebSocket error:", { payload, event });
          
          // If it's a "RECIPIENT_OFFLINE" error, provide helpful message
          if (errorCode === "RECIPIENT_OFFLINE" || errorMessage.includes("not connected") || errorMessage.includes("user not connected")) {
            toast.error("⚠️ The recipient is not currently connected to chat. They need to open the chat page to receive messages.", {
              duration: 7000,
            });
          } else {
            // Show generic error
            toast.error(`Chat error: ${errorMessage}`, { duration: 5000 });
          }
        } catch (err) {
          console.error("Error parsing error payload:", err, event);
          toast.error("An error occurred while sending the message.", { duration: 5000 });
        }
      }
    };

    const handleChatDeliver = (event) => {
      try {
        if (event.type === "chat.deliver" && event.payload) {
          const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
          const { fromUserId, text, sentAt } = payload;

          // Determine which thread this message belongs to
          let threadId = null;
          
          // Use setState callback to access current threads
          setThreads(currentThreads => {
            // First, try to find thread by matching both participants
            currentThreads.forEach(thread => {
              const threadParticipants = [thread.sellerId, thread.buyerId].filter(Boolean);
              if (threadParticipants.includes(fromUserId) && threadParticipants.includes(userId)) {
                threadId = thread.id;
              }
            });

            // If no thread found and message is for current user, create/find appropriate thread
            if (!threadId && fromUserId !== userId) {
              // Try to find or create a thread with this user
              // Check if there's a thread where this user is the seller or buyer
              const existingThread = currentThreads.find(t => 
                t.sellerId === fromUserId || t.buyerId === fromUserId
              );
              
              if (existingThread) {
                threadId = existingThread.id;
              } else {
                // Create new thread with the first message
                threadId = `chat-${userId}-${fromUserId}`;
                
                // Double-check it doesn't exist (prevent duplicates)
                if (currentThreads.find(t => t.id === threadId)) {
                  return currentThreads; // Already exists, skip
                }
                
                const newThread = {
                  id: threadId,
                  title: `Chat`,
                  sellerId: fromUserId,
                  buyerId: userId,
                  messages: [{
                    from: "other",
                    text: text,
                    sentAt: sentAt || new Date().toISOString(),
                    fromUserId: fromUserId
                  }]
                };
                
                // Auto-scroll after state update
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
                
                return [newThread, ...currentThreads];
              }
            }

            // If we found a thread, update it with the new message
            if (threadId) {
              const updated = currentThreads.map(thread => {
                if (thread.id === threadId) {
                  // Skip messages from current user - we already added them optimistically
                  // They will be replaced when confirmed
                  if (fromUserId === userId) {
                    // Check if there's an optimistic message with the same text to replace
                    const optimisticIndex = thread.messages.findIndex(msg => 
                      msg.isOptimistic && 
                      msg.text === text && 
                      msg.fromUserId === userId
                    );
                    
                    if (optimisticIndex !== -1) {
                      // Replace optimistic message with confirmed one
                      const newMessages = [...thread.messages];
                      newMessages[optimisticIndex] = {
                        ...newMessages[optimisticIndex],
                        id: undefined,
                        isOptimistic: false,
                        sentAt: sentAt || new Date().toISOString()
                      };
                      return {
                        ...thread,
                        messages: newMessages
                      };
                    }
                    
                    // If no optimistic message found, check for exact duplicate
                    const exactDuplicate = thread.messages.some(msg => 
                      msg.text === text && 
                      msg.fromUserId === fromUserId &&
                      !msg.isOptimistic
                    );
                    
                    if (exactDuplicate) {
                      // Don't add duplicate - message already exists
                      return thread;
                    }
                  } else {
                    // For messages from other users, check if message already exists
                    const messageExists = thread.messages.some(msg => 
                      msg.text === text && 
                      msg.fromUserId === fromUserId &&
                      msg.sentAt === (sentAt || new Date().toISOString())
                    );
                    
                    if (messageExists) {
                      // Don't add duplicate
                      return thread;
                    }
                  }
                  
                  // Add new message (only for messages from other users, or if no optimistic version exists)
                  return {
                    ...thread,
                    messages: [...thread.messages, {
                      from: fromUserId === userId ? "me" : "other",
                      text: text,
                      sentAt: sentAt || new Date().toISOString(),
                      fromUserId: fromUserId
                    }]
                  };
                }
                return thread;
              });
              
              // Auto-scroll to bottom after state update
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
              
              return updated;
            }
            
            return currentThreads; // No changes
          });
        }
      } catch (error) {
        console.error("Error handling chat message:", error);
      }
    };

    subscribe("chat.deliver", handleChatDeliver);
    subscribe("error", handleError);

    return () => {
      unsubscribe("chat.deliver", handleChatDeliver);
      unsubscribe("error", handleError);
    };
  }, [connected, userId, subscribe, unsubscribe]); // Removed threads from deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads]);

  const sendChatMessage = () => {
    if (!input.trim() || !activeThreadId) {
      return;
    }

    // Check connection - but if we're receiving messages, connection exists
    // So we'll let sendMessage handle the actual connection check

    const activeThread = threads.find(t => t.id === activeThreadId);
    if (!activeThread) {
      toast.error("No active conversation");
      return;
    }

    // Determine recipient ID
    // If current user is the seller, send to buyer. Otherwise, send to seller.
    const recipientId = activeThread.sellerId === userId 
      ? (activeThread.buyerId || null)
      : activeThread.sellerId;
    
    if (!recipientId) {
      toast.error("Cannot determine recipient. Please refresh and try again.");
      return;
    }

    // Generate request ID
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store message text before clearing input
    const messageText = input.trim();
    setInput("");

    // Add message to UI immediately (optimistic update)
    // Add a temporary ID to track this message and prevent duplicates
    const optimisticMessageId = `temp-${requestId}`;
    const optimisticSentAt = new Date().toISOString();
    
    setThreads(prev => prev.map(thread => {
      if (thread.id === activeThreadId) {
        return {
          ...thread,
          messages: [...thread.messages, {
            id: optimisticMessageId,
            from: "me",
            text: messageText,
            sentAt: optimisticSentAt,
            fromUserId: userId,
            isOptimistic: true // Mark as optimistic so we can replace it later
          }]
        };
      }
      return thread;
    }));

    // Scroll after state update
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    // Send via WebSocket (with error handling)
    try {
      sendMessage({
        type: "chat.message",
        requestId: requestId,
        payload: {
          toUserId: recipientId,
          text: messageText
        }
      });
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Check if it's a connection error
      if (error.message.includes('not connected') || error.message.includes('not ready')) {
        toast.error("WebSocket connection issue. Trying to reconnect...", { duration: 4000 });
        // Try to reconnect
        reconnect();
        
        // Wait a bit and try again
        setTimeout(() => {
          if (connected) {
            try {
              sendMessage({
                type: "chat.message",
                requestId: requestId,
                payload: {
                  toUserId: recipientId,
                  text: messageText
                }
              });
            } catch (retryError) {
              console.error("Retry failed:", retryError);
              toast.error("Still not connected. Please refresh the page.", { duration: 5000 });
              // Remove optimistic message and restore input
              setThreads(prev => prev.map(thread => {
                if (thread.id === activeThreadId) {
                  return {
                    ...thread,
                    messages: thread.messages.filter((msg, idx) => 
                      !(idx === thread.messages.length - 1 && msg.from === "me" && msg.text === messageText)
                    )
                  };
                }
                return thread;
              }));
              setInput(messageText);
            }
          } else {
            // Still not connected after retry
            toast.error("Connection failed. Please refresh the page and try again.", { duration: 5000 });
            setThreads(prev => prev.map(thread => {
              if (thread.id === activeThreadId) {
                return {
                  ...thread,
                  messages: thread.messages.filter((msg, idx) => 
                    !(idx === thread.messages.length - 1 && msg.from === "me" && msg.text === messageText)
                  )
                };
              }
              return thread;
            }));
            setInput(messageText);
          }
        }, 2000);
      } else {
        // Other error
        toast.error(`Failed to send message: ${error.message}`, { duration: 3000 });
        // Remove the optimistic message on error
        setThreads(prev => prev.map(thread => {
          if (thread.id === activeThreadId) {
            return {
              ...thread,
              messages: thread.messages.filter((msg, idx) => 
                !(idx === thread.messages.length - 1 && msg.from === "me" && msg.text === messageText)
              )
            };
          }
          return thread;
        }));
        // Restore input text so user can retry
        setInput(messageText);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const activeThread = threads.find(t => t.id === activeThreadId);

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to use chat</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 grid md:grid-cols-3 gap-4">
        {/* Sidebar - Chat Threads */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold">
            Chats
            {!connected && !wsError && (
              <div className="text-xs font-normal text-primary-100 mt-1">
                <Loader2 size={12} className="inline animate-spin mr-1" />
                Connecting...
              </div>
            )}
            {wsError && (
              <div className="text-xs font-normal text-red-200 mt-1">
                ⚠️ Connection failed
              </div>
            )}
          </div>
          {wsError && (
            <div className="p-3 bg-red-50 border-b border-red-200">
              <p className="text-xs text-red-700 mb-2">{wsError}</p>
              <p className="text-xs text-red-600 mb-2">
                Make sure the WebSocket server is running on port 8081.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-blue-600 hover:underline"
              >
                Retry Connection
              </button>
            </div>
          )}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {threads.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet. Start chatting from a listing!
              </div>
            ) : (
              threads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                    activeThreadId === thread.id ? "bg-primary-50 border-primary-200" : ""
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{thread.title}</div>
                  <div className="text-xs text-gray-600 line-clamp-1 mt-1">
                    {thread.messages.at(-1)?.text || "No messages yet"}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="md:col-span-2 bg-white border rounded-2xl flex flex-col shadow-sm">
          {activeThread ? (
            <>
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="font-semibold text-gray-900">{activeThread.title}</div>
                {listingId && (
                  <div className="text-xs text-gray-500 mt-1">
                    About listing: {activeThread.listingId}
                  </div>
                )}
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
                {activeThread.messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  activeThread.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                          message.from === "me"
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                        {message.sentAt && (
                          <p className={`text-xs mt-1 ${
                            message.from === "me" ? "text-primary-100" : "text-gray-500"
                          }`}>
                            {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input Area */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={connected ? "Type a message..." : "Connecting to chat..."}
                    disabled={!connected}
                    className="flex-1 border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!connected || !input.trim()}
                    className="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Send size={18} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
                {!connected && !wsError && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    Connecting to chat server...
                  </p>
                )}
                {wsError && (
                  <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <p className="font-semibold mb-1">⚠️ Connection Failed</p>
                    <p className="mb-2">{wsError}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          reconnect();
                          toast.success("Reconnecting...", { duration: 2000 });
                        }}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        Retry Connection
                      </button>
                      <button
                        onClick={() => {
                          window.location.reload();
                        }}
                        className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                      >
                        Refresh Page
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                <p>Select a conversation or start a new chat from a listing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
