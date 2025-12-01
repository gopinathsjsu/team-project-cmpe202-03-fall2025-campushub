// import { useState, useEffect, useRef } from "react";
// import { useSearchParams, useNavigate } from "react-router-dom";
// import { MessageCircle, Send, Loader2 } from "lucide-react";
// import { useAuth } from "../context/AuthContext";
// import { useWS } from "../context/WebSocketContext";
// import toast from "react-hot-toast";
// import api from "../api/apiClient";

// // Helper to deduplicate threads by conversation ID
// function deduplicateThreads(threads) {
//   const seen = new Map();
//   const result = [];
  
//   for (const thread of threads) {
//     if (!seen.has(thread.id)) {
//       seen.set(thread.id, true);
//       result.push(thread);
//     }
//   }
  
//   return result;
// }

// export default function ChatPage() {
//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();
//   const { userId, userName } = useAuth();
//   const {
//     connected,
//     error: wsError,
//     sendMessage,
//     subscribe,
//     unsubscribe,
//     reconnect,
//   } = useWS();

//   // Get URL parameters for starting a new chat
//   const sellerId = searchParams.get("sellerId");
//   const listingId = searchParams.get("listingId");
//   const listingTitle = searchParams.get("listingTitle");

//   const [threads, setThreads] = useState([]);
//   const [activeThreadId, setActiveThreadId] = useState(null);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const messagesEndRef = useRef(null);
//   const pendingChatRef = useRef(null); // Track pending chat from URL params

//   // Store pending chat info from URL params
//   useEffect(() => {
//     if (sellerId && userId) {
//       pendingChatRef.current = {
//         sellerId,
//         listingId: listingId || null,
//         listingTitle: listingTitle || "Chat",
//       };
//     }
//   }, [sellerId, listingId, listingTitle, userId]);

//   // Fetch existing conversations from backend
//   useEffect(() => {
//     if (!userId) return;

//     let cancelled = false;
//     const loadThreads = async () => {
//       try {
//         const res = await api.listChatThreads();
//         if (cancelled || !res?.items) return;

//         const normalized = res.items.map((t) => ({
//           id: t.id, // Real conversation ID from database
//           title: t.listingTitle || t.otherUserName || "Chat",
//           otherUserId: t.otherUserID,
//           otherUserName: t.otherUserName,
//           listingId: t.listingID || null,
//           // seller / buyer IDs from backend (various casings)
//           sellerId:
//             t.sellerId || t.sellerID || t.seller_id || t.seller || null,
//           buyerId:
//             t.buyerId || t.buyerID || t.buyer_id || t.buyer || null,
//           messages: [], // Will be loaded when thread is selected
//           lastMessage: t.lastMessage,
//           lastSentAt: t.lastSentAt,
//         }));

//         // Deduplicate and merge with existing threads
//         setThreads((prev) => {
//           const threadMap = new Map();
          
//           // Add all server threads (source of truth)
//           for (const thread of normalized) {
//             threadMap.set(thread.id, thread);
//           }
          
//           // Merge loaded messages from existing threads
//           for (const existingThread of prev) {
//             if (threadMap.has(existingThread.id)) {
//               // Thread exists in API response, preserve loaded messages
//               const apiThread = threadMap.get(existingThread.id);
//               if (existingThread.messages && existingThread.messages.length > 0) {
//                 threadMap.set(existingThread.id, {
//                   ...apiThread,
//                   messages: existingThread.messages
//                 });
//               }
//             } else if (existingThread.isTemp) {
//               // Keep temp threads that haven't been created yet
//               threadMap.set(existingThread.id, existingThread);
//             }
//           }
          
//           // Convert to array and sort by most recent
//           return Array.from(threadMap.values()).sort((a, b) => {
//             const timeA = a.lastSentAt ? new Date(a.lastSentAt).getTime() : 0;
//             const timeB = b.lastSentAt ? new Date(b.lastSentAt).getTime() : 0;
//             return timeB - timeA;
//           });
//         });

//         // Check if we have a pending chat from URL params
//         if (pendingChatRef.current) {
//           const {
//             sellerId: pendingSellerId,
//             listingId: pendingListingId,
//           } = pendingChatRef.current;

//           // Try to find existing conversation with this user
//           const existingThread = normalized.find(
//             (t) =>
//               t.otherUserId === pendingSellerId &&
//               (pendingListingId ? t.listingId === pendingListingId : true)
//           );

//           if (existingThread) {
//             // Conversation exists, select it and load history
//             setActiveThreadId(existingThread.id);
//             handleSelectThread(existingThread.id);
//           } else {
//             // No existing conversation - will be created when first message is sent
//             // Create a temporary thread for UI
//             const tempThread = {
//               id: `temp-${pendingSellerId}-${pendingListingId || "general"}`,
//               title: pendingChatRef.current.listingTitle,
//               otherUserId: pendingSellerId,
//               listingId: pendingListingId,
//               // we know roles here: current user is buyer, seller from URL
//               sellerId: pendingSellerId,
//               buyerId: userId,
//               messages: [],
//               isTemp: true, // Mark as temporary
//             };
//             setThreads((prev) => [tempThread, ...prev]);
//             setActiveThreadId(tempThread.id);
//           }
//           pendingChatRef.current = null; // Clear pending chat
//         } else if (!activeThreadId && normalized.length > 0) {
//           // Auto-select first thread and load its messages
//           const firstThreadId = normalized[0].id;
//           setActiveThreadId(firstThreadId);
//           // Load messages for the first thread
//           handleSelectThread(firstThreadId);
//         } else if (activeThreadId) {
//           // If there's already an active thread, reload its messages
//           handleSelectThread(activeThreadId);
//         }
//       } catch (err) {
//         console.error("Failed to load chat threads:", err);
//       } 
//     };
//     loadThreads();

//     return () => {
//       cancelled = true;
//     };
//   }, [userId]); // Remove activeThreadId from deps

//   // Load full message history when a thread is selected
//   const handleSelectThread = async (threadId) => {
//     setActiveThreadId(threadId);

//     // NEW: if this is a temp thread, don't hit the API (backend only knows real IDs)
//     const thread = threads.find((t) => t.id === threadId);
//     if (thread?.isTemp) {
//       return;
//     }

//     try {
//       const res = await api.listChatMessages(threadId);
//       const msgs = (res.items || []).map((m) => ({
//         id: m.id,
//         from:
//           String(m.sender_id || m.senderId) === String(userId)
//             ? "me"
//             : "other",
//         text: m.body,
//         sentAt: m.created_at || m.createdAt,
//         fromUserId: m.sender_id || m.senderId,
//       }));
//       setThreads((prev) =>
//         prev.map((t) => (t.id === threadId ? { ...t, messages: msgs } : t))
//       );
//       // Scroll to bottom after loading history
//       setTimeout(() => {
//         messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//       }, 100);
//     } catch (err) {
//       console.error("Failed to load chat history:", err);
//       toast.error("Failed to load chat history.");
//     }
//   };

//   // Subscribe to WebSocket messages
//   useEffect(() => {
//     if (!userId) return;

//     const handleError = (event) => {
//       if (event.type === "error" && event.payload) {
//         try {
//           const payload =
//             typeof event.payload === "string"
//               ? JSON.parse(event.payload)
//               : event.payload;
//           const errorMessage =
//             payload.message || payload.code || "An error occurred";
//           const errorCode = payload.code || "";

//           console.error("WebSocket error:", {
//             payload,
//             event,
//             errorCode,
//             errorMessage,
//             requestId: event.requestId,
//           });

//           // Handle RECIPIENT_OFFLINE error
//           if (
//             errorCode === "RECIPIENT_OFFLINE" ||
//             errorMessage.includes("not connected") ||
//             errorMessage.includes("user not connected") ||
//             errorMessage.includes("recipient not connected")
//           ) {
//             // Instead of showing a toast, mark the message as sent but not delivered
//             setThreads((prev) =>
//               prev.map((thread) => {
//                 if (thread.id === activeThreadId) {
//                   return {
//                     ...thread,
//                     messages: thread.messages.map((msg) =>
//                       msg.isOptimistic && msg.requestId === event.requestId
//                         ? { ...msg, deliveryStatus: "sent-not-delivered" }
//                         : msg
//                     ),
//                   };
//                 }
//                 return thread;
//               })
//             );
//             return;
//           } else {
//             toast.error(`Chat error: ${errorMessage}`, { duration: 5000 });
//           }
//         } catch (err) {
//           console.error("Error parsing error payload:", err, event);
//           toast.error("An error occurred while sending the message.", {
//             duration: 5000,
//           });
//         }
//       }
//     };

//     const handleChatDeliver = (event) => {
//       try {
//         if (event.type === "chat.deliver" && event.payload) {
//           const payload =
//             typeof event.payload === "string"
//               ? JSON.parse(event.payload)
//               : event.payload;

//           const {
//             conversationId,
//             messageId,
//             fromUserId,
//             text,
//             sentAt,
//             listingId: payloadListingId,
//             listingTitle: payloadListingTitle,
//             otherUserId,
//           } = payload;

//           const fromUserIdStr = String(fromUserId);
//           const currentUserIdStr = String(userId);
//           const convId = conversationId || null;

//           setThreads((currentThreads) => {
//             let updatedThread = null;

//             // First pass: try to match / promote existing threads
//             const updatedThreads = currentThreads.map((thread) => {
//               let threadToUse = thread;

//               // If we got a real conversationId and this thread is a temp one that matches the participants/listing, promote it
//               if (
//                 convId &&
//                 thread.isTemp &&
//                 String(thread.otherUserId || "") ===
//                   String(otherUserId || fromUserId) &&
//                 String(thread.listingId || "") ===
//                   String(payloadListingId || "")
//               ) {
//                 threadToUse = {
//                   ...thread,
//                   id: convId,
//                   isTemp: false,
//                 };
//               }

//               const isTargetThread =
//                 (convId && threadToUse.id === convId) ||
//                 (!convId &&
//                   String(threadToUse.otherUserId || "") ===
//                     String(otherUserId || fromUserId));

//               if (!isTargetThread) return threadToUse;

//               const isFromMe = fromUserIdStr === currentUserIdStr;

//               // Check for existing message (by messageId if present, otherwise optimistic match)
//               const existingIndex = threadToUse.messages.findIndex((msg) => {
//                 if (messageId && msg.messageId === messageId) return true;
//                 if (!messageId && msg.isOptimistic) {
//                   return (
//                     msg.text === text &&
//                     String(msg.fromUserId || "") === fromUserIdStr
//                   );
//                 }
//                 return false;
//               });

//               // If we already have a message with this messageId, update/convert optimistic
//               if (existingIndex !== -1) {
//                 const newMessages = [...threadToUse.messages];
//                 newMessages[existingIndex] = {
//                   ...newMessages[existingIndex],
//                   id: messageId || newMessages[existingIndex].id,
//                   messageId:
//                     messageId || newMessages[existingIndex].messageId,
//                   isOptimistic: false,
//                   sentAt: sentAt || newMessages[existingIndex].sentAt,
//                   deliveryStatus: "delivered",
//                 };

//                 updatedThread = {
//                   ...threadToUse,
//                   messages: newMessages,
//                 };
//                 return updatedThread;
//               }

//               // Defensive duplicate check (same text+time+sender)
//               if (
//                 messageId &&
//                 threadToUse.messages.some((m) => m.messageId === messageId)
//               ) {
//                 updatedThread = threadToUse;
//                 return threadToUse;
//               }

//               if (
//                 !messageId &&
//                 threadToUse.messages.some(
//                   (m) =>
//                     m.text === text &&
//                     m.sentAt === sentAt &&
//                     String(m.fromUserId || "") === fromUserIdStr
//                 )
//               ) {
//                 updatedThread = threadToUse;
//                 return threadToUse;
//               }

//               // Append new message
//               const newMessage = {
//                 id: messageId,
//                 messageId,
//                 from: isFromMe ? "me" : "other",
//                 text,
//                 sentAt: sentAt || new Date().toISOString(),
//                 fromUserId,
//                 isOptimistic: false,
//                 deliveryStatus: isFromMe ? "delivered" : undefined,
//               };

//               const newThread = {
//                 ...threadToUse,
//                 messages: [...threadToUse.messages, newMessage],
//               };

//               updatedThread = newThread;
//               return newThread;
//             });

//             // If we didn't match any existing thread, create or merge into one
//             if (!updatedThread) {
//               const newThread = {
//                 id: convId || `chat-${userId}-${fromUserId}`,
//                 title: payloadListingTitle || "Chat",
//                 otherUserId: otherUserId || fromUserId,
//                 listingId: payloadListingId || null,
//                 messages: [
//                   {
//                     id: messageId,
//                     messageId,
//                     from:
//                       fromUserIdStr === currentUserIdStr ? "me" : "other",
//                     text,
//                     sentAt: sentAt || new Date().toISOString(),
//                     fromUserId,
//                     isOptimistic: false,
//                   },
//                 ],
//               };

//               // Safety check: don't create duplicate thread
//               const newThreadId = convId || `chat-${userId}-${fromUserId}`;
//               if (updatedThreads.some(t => t.id === newThreadId)) {
//                 return updatedThreads; // Thread already exists
//               }

//               setTimeout(() => {
//                 messagesEndRef.current?.scrollIntoView({
//                   behavior: "smooth",
//                 });
//               }, 100);

//               return [newThread, ...updatedThreads];
//             }

//             setTimeout(() => {
//               messagesEndRef.current?.scrollIntoView({
//                 behavior: "smooth",
//               });
//             }, 100);

//             return updatedThreads;
//           });
//         }
//       } catch (error) {
//         console.error("Error handling chat message:", error);
//       }
//     };

//     subscribe("chat.deliver", handleChatDeliver);
//     subscribe("error", handleError);

//     return () => {
//       unsubscribe("chat.deliver", handleChatDeliver);
//       unsubscribe("error", handleError);
//     };
//   }, [connected, userId, subscribe, unsubscribe]); // Removed threads from deps

//   // Auto-scroll to bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [threads]);

//   // Send chat.seen event when viewing an active thread with new messages from others
//   useEffect(() => {
//     if (!activeThreadId || !userId || !sendMessage) return;
//     const current = threads.find((t) => t.id === activeThreadId);
//     if (!current || !current.messages || !current.messages.length) return;
//     const lastFromOther = [...current.messages]
//       .reverse()
//       .find((msg) => msg.from !== "me");
//     if (!lastFromOther) return;
//     if (!current.lastSeenAt || current.lastSeenAt < lastFromOther.sentAt) {
//       sendMessage({
//         type: "chat.seen",
//         requestId: `seen-${activeThreadId}-${Date.now()}`,
//         payload: {
//           conversation_id: activeThreadId,
//           seen_at: lastFromOther.sentAt || new Date().toISOString(),
//         },
//       });
//       setThreads((prev) =>
//         prev.map((t) =>
//           t.id === activeThreadId
//             ? { ...t, lastSeenAt: lastFromOther.sentAt }
//             : t
//         )
//       );
//     }
//   }, [activeThreadId, threads, userId, sendMessage]);

//   const sendChatMessage = () => {
//     if (!input.trim() || !activeThreadId) {
//       return;
//     }

//     const activeThread = threads.find((t) => t.id === activeThreadId);
//     if (!activeThread) {
//       toast.error("No active conversation");
//       return;
//     }

//     // Determine recipient ID - ensure string comparison for user IDs
//     const currentUserIdStr = String(userId);
//     const sellerIdStr = String(activeThread.sellerId || ""); // may be null
//     const buyerIdStr = String(activeThread.buyerId || "");   // may be null

//     const recipientId =
//       sellerIdStr === currentUserIdStr
//         ? activeThread.buyerId
//           ? String(activeThread.buyerId)
//           : null
//         : activeThread.sellerId
//         ? String(activeThread.sellerId)
//         : // Fallback: use otherUserId if seller/buyer aren't set
//           activeThread.otherUserId
//         ? String(activeThread.otherUserId)
//         : null;

//     console.log("Sending chat message:", {
//       userId: currentUserIdStr,
//       sellerId: sellerIdStr,
//       buyerId: buyerIdStr,
//       recipientId: recipientId,
//       activeThread: activeThread,
//     });

//     if (!recipientId) {
//       toast.error("Cannot determine recipient. Please refresh and try again.");
//       return;
//     }

//     const requestId = `chat-${Date.now()}-${Math.random()
//       .toString(36)
//       .substr(2, 9)}`;

//     const messageText = input.trim();
//     setInput("");

//     const optimisticMessageId = `temp-${requestId}`;
//     const optimisticSentAt = new Date().toISOString();

//     setThreads((prev) =>
//       prev.map((thread) => {
//         if (thread.id === activeThreadId) {
//           return {
//             ...thread,
//             messages: [
//               ...thread.messages,
//               {
//                 id: optimisticMessageId,
//                 messageId: optimisticMessageId,
//                 from: "me",
//                 text: messageText,
//                 sentAt: optimisticSentAt,
//                 fromUserId: userId,
//                 isOptimistic: true,
//                 deliveryStatus: "optimistic",
//                 requestId,
//               },
//             ],
//           };
//         }
//         return thread;
//       })
//     );

//     setTimeout(() => {
//       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     }, 100);

//     try {
//       sendMessage({
//         type: "chat.message",
//         requestId: requestId,
//         payload: {
//           toUserId: recipientId,
//           text: messageText,
//         },
//       });
//     } catch (error) {
//       console.error("Error sending message:", error);

//       if (
//         error.message.includes("not connected") ||
//         error.message.includes("not ready")
//       ) {
//         toast.error("WebSocket connection issue. Trying to reconnect...", {
//           duration: 4000,
//         });
//         reconnect();

//         setTimeout(() => {
//           if (connected) {
//             try {
//               sendMessage({
//                 type: "chat.message",
//                 requestId: requestId,
//                 payload: {
//                   toUserId: recipientId,
//                   text: messageText,
//                 },
//               });
//             } catch (retryError) {
//               console.error("Retry failed:", retryError);
//               toast.error("Still not connected. Please refresh the page.", {
//                 duration: 5000,
//               });
//               setThreads((prev) =>
//                 prev.map((thread) => {
//                   if (thread.id === activeThreadId) {
//                     return {
//                       ...thread,
//                       messages: thread.messages.filter(
//                         (msg) => msg.messageId !== optimisticMessageId
//                       ),
//                     };
//                   }
//                   return thread;
//                 })
//               );
//               setInput(messageText);
//             }
//           } else {
//             toast.error(
//               "Connection failed. Please refresh the page and try again.",
//               { duration: 5000 }
//             );
//             setThreads((prev) =>
//               prev.map((thread) => {
//                 if (thread.id === activeThreadId) {
//                   return {
//                     ...thread,
//                     messages: thread.messages.filter(
//                       (msg) => msg.messageId !== optimisticMessageId
//                     ),
//                   };
//                 }
//                 return thread;
//               })
//             );
//             setInput(messageText);
//           }
//         }, 2000);
//       } else {
//         toast.error(`Failed to send message: ${error.message}`, {
//           duration: 3000,
//         });
//         setThreads((prev) =>
//           prev.map((thread) => {
//             if (thread.id === activeThreadId) {
//               return {
//                 ...thread,
//                 messages: thread.messages.filter(
//                   (msg) => msg.messageId !== optimisticMessageId
//                 ),
//               };
//             }
//             return thread;
//           })
//         );
//         setInput(messageText);
//       }
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       sendChatMessage();
//     }
//   };

//   const activeThread = threads.find((t) => t.id === activeThreadId);

//   if (!userId) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-gray-600">Please log in to use chat</p>
//           <button
//             onClick={() => navigate("/login")}
//             className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg"
//           >
//             Go to Login
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="mx-auto max-w-6xl px-4 py-6 grid md:grid-cols-3 gap-4">
//         {/* Sidebar - Chat Threads */}
//         <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
//           <div className="px-4 py-3 border-b bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold">
//             Chats
//             {!connected && !wsError && (
//               <div className="text-xs font-normal text-primary-100 mt-1">
//                 <Loader2
//                   size={12}
//                   className="inline animate-spin mr-1"
//                 />
//                 Connecting...
//               </div>
//             )}
//             {wsError && (
//               <div className="text-xs font-normal text-red-200 mt-1">
//                 ⚠️ Connection failed
//               </div>
//             )}
//           </div>
//           {wsError && (
//             <div className="p-3 bg-red-50 border-b border-red-200">
//               <p className="text-xs text-red-700 mb-2">{wsError}</p>
//               <p className="text-xs text-red-600 mb-2">
//                 Make sure the WebSocket server is running on port 8081.
//               </p>
//               <button
//                 onClick={() => window.location.reload()}
//                 className="text-xs text-blue-600 hover:underline"
//               >
//                 Retry Connection
//               </button>
//             </div>
//           )}
//           <div
//             className="overflow-y-auto"
//             style={{ maxHeight: "calc(100vh - 200px)" }}
//           >
//             {threads.length === 0 ? (
//               <div className="p-4 text-center text-gray-500 text-sm">
//                 No conversations yet. Start chatting from a listing!
//               </div>
//             ) : (
//               threads.map((thread) => (
//                 <button
//                   key={thread.id}
//                   onClick={() => handleSelectThread(thread.id)}
//                   className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
//                     activeThreadId === thread.id
//                       ? "bg-primary-50 border-primary-200"
//                       : ""
//                   }`}
//                 >
//                   <div className="font-medium text-sm text-gray-900">
//                     {thread.title}
//                   </div>
//                   <div className="text-xs text-gray-600 line-clamp-1 mt-1">
//                     {thread.messages.at(-1)?.text || "No messages yet"}
//                   </div>
//                 </button>
//               ))
//             )}
//           </div>
//         </div>

//         {/* Main Chat Area */}
//         <div className="md:col-span-2 bg-white border rounded-2xl flex flex-col shadow-sm">
//           {activeThread ? (
//             <>
//               <div className="px-4 py-3 border-b bg-gray-50">
//                 <div className="font-semibold text-gray-900">
//                   {activeThread.title}
//                 </div>
//                 {listingId && (
//                   <div className="text-xs text-gray-500 mt-1">
//                     About listing: {activeThread.listingId}
//                   </div>
//                 )}
//               </div>

//               {/* Messages */}
//               <div
//                 className="flex-1 p-4 space-y-3 overflow-y-auto"
//                 style={{ maxHeight: "calc(100vh - 300px)" }}
//               >
//                 {activeThread.messages.length === 0 ? (
//                   <div className="text-center text-gray-500 py-8">
//                     <MessageCircle
//                       size={48}
//                       className="mx-auto mb-2 text-gray-300"
//                     />
//                     <p>No messages yet. Start the conversation!</p>
//                   </div>
//                 ) : (
//                   activeThread.messages.map((message, index) => (
//                     <div
//                       key={message.id || index}
//                       className={`flex ${
//                         message.from === "me"
//                           ? "justify-end"
//                           : "justify-start"
//                       }`}
//                     >
//                       <div
//                         className={`max-w-[70%] px-4 py-2 rounded-2xl ${
//                           message.from === "me"
//                             ? "bg-primary-600 text-white"
//                             : "bg-gray-100 text-gray-900"
//                         }`}
//                       >
//                         <p className="text-sm whitespace-pre-wrap break-words">
//                           {message.text}
//                         </p>
//                         {message.sentAt && (
//                           <p
//                             className={`text-xs mt-1 ${
//                               message.from === "me"
//                                 ? "text-primary-100"
//                                 : "text-gray-500"
//                             }`}
//                           >
//                             {new Date(message.sentAt).toLocaleTimeString(
//                               [],
//                               { hour: "2-digit", minute: "2-digit" }
//                             )}
//                             {message.from === "me" && (
//                               <span className="ml-2">
//                                 {message.deliveryStatus ===
//                                 "sent-not-delivered"
//                                   ? "✓"
//                                   : message.deliveryStatus ===
//                                     "optimistic"
//                                   ? "…"
//                                   : "✓✓"}
//                               </span>
//                             )}
//                           </p>
//                         )}
//                       </div>
//                     </div>
//                   ))
//                 )}
//                 <div ref={messagesEndRef} />
//               </div>

//               {/* Input Area */}
//               <div className="p-4 border-t bg-gray-50">
//                 <div className="flex gap-2">
//                   <input
//                     type="text"
//                     value={input}
//                     onChange={(e) => setInput(e.target.value)}
//                     onKeyPress={handleKeyPress}
//                     placeholder={
//                       connected
//                         ? "Type a message..."
//                         : "Connecting to chat..."
//                     }
//                     disabled={!connected}
//                     className="flex-1 border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
//                   />
//                   <button
//                     onClick={sendChatMessage}
//                     disabled={!connected || !input.trim()}
//                     className="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
//                   >
//                     <Send size={18} />
//                     <span className="hidden sm:inline">Send</span>
//                   </button>
//                 </div>
//                 {!connected && !wsError && (
//                   <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
//                     <Loader2 size={12} className="animate-spin" />
//                     Connecting to chat server...
//                   </p>
//                 )}
//                 {wsError && (
//                   <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">
//                     <p className="font-semibold mb-1">
//                       ⚠️ Connection Failed
//                     </p>
//                     <p className="mb-2">{wsError}</p>
//                     <div className="flex gap-2">
//                       <button
//                         onClick={() => {
//                           reconnect();
//                           toast.success("Reconnecting...", {
//                             duration: 2000,
//                           });
//                         }}
//                         className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
//                       >
//                         Retry Connection
//                       </button>
//                       <button
//                         onClick={() => {
//                           window.location.reload();
//                         }}
//                         className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
//                       >
//                         Refresh Page
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </>
//           ) : (
//             <div className="flex-1 flex items-center justify-center text-gray-500">
//               <div className="text-center">
//                 <MessageCircle
//                   size={48}
//                   className="mx-auto mb-2 text-gray-300"
//                 />
//                 <p>Select a conversation or start a new chat from a listing</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { MessageCircle, Send } from "lucide-react";

export default function ChatPage() {
  const { userId, userName } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // --------- 1) AUTO-START CONVERSATION FROM URL PARAMS ---------
  // URL: /chat?sellerId=...&listingId=...&listingTitle=...
  useEffect(() => {
    if (!userId) return;

    const sellerId = searchParams.get("sellerId");
    const listingId = searchParams.get("listingId");
    const listingTitle = searchParams.get("listingTitle");

    if (!sellerId) return;

    const startConversationFromParams = async () => {
      const participantIds = [userId, sellerId].sort();
      const conversationId = `${participantIds.join("_")}_${listingId ?? "general"}`;

      const convoRef = doc(db, "conversations", conversationId);

      await setDoc(
        convoRef,
        {
          participantIds,
          listingId: listingId ?? null,
          listingTitle: listingTitle ?? "Chat",
          lastMessage: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setActiveThreadId(convoRef.id);

      // Optional: clean up URL so reloading /chat doesn't restart params logic
      const url = new URL(window.location.href);
      url.searchParams.delete("sellerId");
      url.searchParams.delete("listingId");
      url.searchParams.delete("listingTitle");
      window.history.replaceState({}, "", url.toString());
    };

    startConversationFromParams().catch((err) =>
      console.error("Failed to start conversation from URL params:", err)
    );
  }, [userId, searchParams]);

  // --------- 2) LOAD CONVERSATIONS FOR CURRENT USER ---------
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a, b) =>
            (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0)
        );

      setThreads(data);
      if (!activeThreadId && data.length) {
        setActiveThreadId(data[0].id);
      }
    });

    return unsubscribe;
  }, [userId, activeThreadId]);

  // --------- 3) LOAD MESSAGES FOR ACTIVE CONVERSATION ---------
  useEffect(() => {
    if (!activeThreadId) return;

    const q = query(
      collection(db, "conversations", activeThreadId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return unsubscribe;
  }, [activeThreadId]);

  // --------- 4) SEND MESSAGE ---------
  const handleSend = async () => {
    if (!input.trim() || !activeThreadId || !userId) return;

    const batch = writeBatch(db);
    const convoRef = doc(db, "conversations", activeThreadId);
    const messagesRef = collection(convoRef, "messages");
    const text = input.trim();

    const newMessageRef = doc(messagesRef);

    batch.set(newMessageRef, {
      senderId: userId,
      senderName: userName ?? "Me",
      text,
      createdAt: serverTimestamp(),
      deliveryStatus: "sent",
    });

    batch.set(
      convoRef,
      {
        lastMessage: text,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
    setInput("");
  };

  // Optional: could be reused from other parts of the app if you want
  const startConversation = async ({ sellerId, listingId, listingTitle }) => {
    if (!userId || !sellerId) return;
    const participantIds = [userId, sellerId].sort();
    const conversationId = `${participantIds.join("_")}_${listingId ?? "general"}`;

    const convoRef = doc(db, "conversations", conversationId);

    await setDoc(
      convoRef,
      {
        participantIds,
        listingId: listingId ?? null,
        listingTitle: listingTitle ?? "Chat",
        lastMessage: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setActiveThreadId(convoRef.id);
  };

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId),
    [threads, activeThreadId]
  );

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Please sign in to use chat.</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // --------- UI ---------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 grid md:grid-cols-3 gap-4">
        {/* Sidebar */}
        <aside className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold">
            Chats
          </div>
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            {threads.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet.
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                    activeThreadId === thread.id
                      ? "bg-primary-50 border-primary-200"
                      : ""
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">
                    {thread.listingTitle || "Conversation"}
                  </div>
                  <div className="text-xs text-gray-600 line-clamp-1 mt-1">
                    {thread.lastMessage || "No messages yet"}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main panel */}
        <section className="md:col-span-2 bg-white border rounded-2xl flex flex-col shadow-sm">
          {activeThread ? (
            <>
              <header className="px-4 py-3 border-b bg-gray-50">
                <div className="font-semibold text-gray-900">
                  {activeThread.listingTitle || "Conversation"}
                </div>
              </header>

              <div
                className="flex-1 p-4 space-y-3 overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 300px)" }}
              >
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle
                      size={48}
                      className="mx-auto mb-2 text-gray-300"
                    />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.senderId === userId
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                          msg.senderId === userId
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                        {msg.createdAt?.toDate && (
                          <p
                            className={`text-xs mt-1 ${
                              msg.senderId === userId
                                ? "text-primary-100"
                                : "text-gray-500"
                            }`}
                          >
                            {msg.createdAt
                              .toDate()
                              .toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <footer className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Send size={18} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle
                  size={48}
                  className="mx-auto mb-2 text-gray-300"
                />
                <p>Select a conversation or start a new chat.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
