# Gemini AI Integration - WebSocket Chatbot

## ✅ What Was Built

A real-time WebSocket chatbot that uses **Google Gemini AI** to understand natural language queries and search the Campus Marketplace listings.

### Architecture

```
Frontend (Browser)
    ↓ WebSocket
WebSocket Server (cmd/ws)
    ↓ Pub/Sub (Go channels)
Agent Worker (integrated in cmd/ws)
    ↓ HTTP REST API
Google Gemini API (gemini-1.5-flash)
    ↓ Search Intent
PostgreSQL Database (listings)
    ↓ Results
Back to User via WebSocket
```

## 🔑 Key Components

### 1. **WebSocket Server** (`cmd/ws/main.go`)
- Handles WebSocket connections on port **8081**
- No JWT authentication required (simplified for testing)
- Routes messages via pub/sub bus
- Integrated agent worker for processing queries

### 2. **Agent Service** (`internal/service/agent_service.go`)
- Uses **Gemini 1.5 Flash** model via REST API
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- Extracts search intent (category, keywords, price range)
- Searches PostgreSQL listings
- Generates natural language responses

### 3. **Pub/Sub Bus** (`internal/pubsub/`)
- In-memory event bus using Go channels
- Events: `agent.request` → `agent.response`
- Decouples WebSocket server from agent worker

### 4. **WebSocket Hub** (`internal/transport/ws/`)
- Manages active client connections
- Gorilla WebSocket implementation
- Read/write pumps for concurrent message handling

## 🚀 How to Use

### Setup

1. **Get Gemini API Key**
   - Visit: https://aistudio.google.com/app/apikey
   - Create API key (starts with `AIzaSy...`)

2. **Add to `.env`**
   ```bash
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   # or use existing field:
   OPENAI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

3. **Start Database**
   ```bash
   docker compose -f docker-compose.dev.yml up -d db
   ```

4. **Run WebSocket Server**
   ```bash
   cd backend
   go run ./cmd/ws
   ```

### Test in Browser

```javascript
const ws = new WebSocket('ws://localhost:8081/ws');

ws.onopen = () => {
    console.log('🔌 Connected!');
    ws.send(JSON.stringify({
        type: "agent.search",
        requestId: "test-" + Date.now(),
        payload: { query: "I need a cheap MacBook for college" }
    }));
};

ws.onmessage = (e) => {
    const resp = JSON.parse(e.data);
    console.log('📥 Answer:', resp.payload.answer);
    console.log('📚 Results:', resp.payload.results);
};
```

## 📋 Event Schema

### Request (Client → Server)
```json
{
    "type": "agent.search",
    "requestId": "unique-id",
    "payload": {
        "query": "do you have a used textbook for cmpe202?"
    }
}
```

### Response (Server → Client)
```json
{
    "type": "agent.response",
    "requestId": "unique-id",
    "payload": {
        "answer": "I found 3 textbooks for CMPE 202...",
        "results": [
            {
                "id": "uuid",
                "title": "CMPE 202 Textbook",
                "description": "Used textbook in good condition",
                "price": 45.00,
                "category": "Textbooks",
                "imageUrl": "https://..."
            }
        ]
    }
}
```

### Error Response
```json
{
    "type": "error",
    "requestId": "unique-id",
    "payload": {
        "message": "Invalid request format"
    }
}
```

## 🔧 Configuration

### Environment Variables (`.env`)

```bash
# Database
DB_DSN=postgres://campushub:password@localhost:5432/campushub?sslmode=disable

# WebSocket Server
WS_PORT=8081

# Gemini API
GEMINI_API_KEY=AIzaSy...  # Preferred
OPENAI_API_KEY=AIzaSy...  # Alternative (will use for Gemini)

# JWT (not currently enforced for WebSocket)
JWT_SECRET=your-secret-key
```

## 🎯 Example Queries

The chatbot can understand natural language queries like:

- "do you have a used textbook for cmpe202?"
- "I need a cheap MacBook for college"
- "looking for furniture under $100"
- "electronics for sale"
- "show me clothing items"

### How It Works

1. **User sends query** via WebSocket
2. **Gemini AI analyzes** the query to extract:
   - Category (Textbooks, Electronics, Furniture, etc.)
   - Keywords (e.g., "cmpe202", "used")
   - Price range (min/max)
3. **Database search** using extracted parameters
4. **Gemini generates** a natural language response
5. **Results sent back** via WebSocket with listings

## 📊 Fallback Behavior

If Gemini API fails:
- Falls back to **simple keyword extraction**
- Still searches database
- Returns results with "(simple search, no AI)" message
- Ensures system remains functional

## 🔒 Security Notes

- **JWT authentication temporarily disabled** for testing
- To re-enable: Uncomment auth checks in `cmd/ws/main.go`
- API key is never exposed to frontend
- All AI processing happens server-side

## 🚢 Production Considerations

1. **Re-enable JWT authentication**
2. **Use external pub/sub** (Redis/NATS) instead of in-memory
3. **Scale worker separately** from WebSocket server
4. **Add rate limiting** for API calls
5. **Configure proper CORS** for production domains
6. **Monitor Gemini API usage** and costs
7. **Add caching** for common queries

## 📁 Files Modified/Created

- ✅ `cmd/ws/main.go` - WebSocket server with integrated worker
- ✅ `cmd/worker/main.go` - Standalone worker (optional)
- ✅ `internal/service/agent_service.go` - Gemini AI integration
- ✅ `internal/transport/ws/` - WebSocket hub, client, events
- ✅ `internal/pubsub/` - Pub/sub bus implementation
- ✅ `internal/config/config.go` - Added Gemini API key config
- ✅ `go.mod` - Added Gorilla WebSocket dependency

## 🎓 Tech Stack

- **Go 1.21+**
- **Gorilla WebSocket** - WebSocket implementation
- **Google Gemini 1.5 Flash** - AI model
- **PostgreSQL** - Database
- **Zap** - Structured logging
- **Go Channels** - Pub/sub implementation

---

## ✨ Success!

Your Campus Marketplace now has an intelligent chatbot that can:
- ✅ Understand natural language queries
- ✅ Search listings intelligently
- ✅ Provide real-time responses via WebSocket
- ✅ Handle errors gracefully with fallback

**Ready for demo day!** 🎉

