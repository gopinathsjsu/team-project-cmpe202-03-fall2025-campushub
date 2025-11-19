# WebSocket Chatbot Implementation

## Overview

This document describes the WebSocket-based AI chatbot feature that uses Go pub/sub and ChatGPT API to enable natural language search queries for marketplace listings.

## Architecture

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   Frontend  │ ◄──────────────────────► │  WS Server   │
│  (Port 3000)│      (port 8081)           │  cmd/ws      │
└─────────────┘                            └──────┬───────┘
                                                  │
                                                  │ Go Pub/Sub Bus
                                                  │ (in-memory channels)
                                                  │
                                           ┌──────▼────────┐
                                           │ Agent Worker  │
                                           │  cmd/worker   │
                                           │               │
                                           │ • ChatGPT API │
                                           │ • DB Search   │
                                           └───────────────┘
```

## Components

### 1. Pub/Sub Bus (`internal/pubsub/`)
- **File**: `pubsub.go`
- **Purpose**: In-memory event bus using Go channels
- **Topics**:
  - `agent.request` - Client queries from WebSocket
  - `agent.response` - Results from worker to WebSocket
- **Key Methods**:
  - `Subscribe(topic)` - Returns channel for receiving messages
  - `Publish(topic, payload)` - Sends message to all subscribers
  - `Unsubscribe(topic, ch)` - Removes subscriber

### 2. WebSocket Server (`cmd/ws/`)
- **Port**: 8081 (configurable via `WS_PORT`)
- **Endpoint**: `/ws`
- **Authentication**: JWT token required (query param or Authorization header)
- **Features**:
  - Gorilla WebSocket for connection handling
  - Hub pattern for managing multiple clients
  - Ping/pong for connection health
  - Automatic reconnection handling

### 3. WebSocket Hub (`internal/transport/ws/hub.go`)
- **Purpose**: Manages all active WebSocket connections
- **Responsibilities**:
  - Register/unregister clients
  - Route messages between pub/sub and clients
  - Track connected users
- **Key Methods**:
  - `Run()` - Main hub loop
  - `BroadcastToUser(userID, message)` - Send to specific user

### 4. WebSocket Client (`internal/transport/ws/client.go`)
- **Purpose**: Represents individual WebSocket connection
- **Pattern**: Read pump + Write pump (concurrent goroutines)
- **Features**:
  - `ReadPump()` - Reads from WebSocket, publishes to pub/sub
  - `WritePump()` - Reads from send channel, writes to WebSocket
  - Event validation and error handling

### 5. Event Schema (`internal/transport/ws/events.go`)

**Base Event Structure:**
```json
{
  "type": "agent.search | agent.response | error",
  "requestId": "unique-uuid",
  "payload": {}
}
```

**Agent Search (Client → Server):**
```json
{
  "type": "agent.search",
  "requestId": "abc-123",
  "payload": {
    "query": "used textbook for cmpe202"
  }
}
```

**Agent Response (Server → Client):**
```json
{
  "type": "agent.response",
  "requestId": "abc-123",
  "payload": {
    "answer": "I found 2 items for 'used textbook for cmpe202'...",
    "results": [
      {
        "id": "uuid",
        "title": "CMPE 202 Textbook",
        "category": "Textbooks",
        "price": 25.00
      }
    ]
  }
}
```

**Error Event (Server → Client):**
```json
{
  "type": "error",
  "requestId": "abc-123",
  "payload": {
    "message": "Invalid query",
    "code": "INVALID_QUERY"
  }
}
```

### 6. Agent Service (`internal/service/agent_service.go`)
- **Purpose**: Processes queries with ChatGPT and database search
- **Flow**:
  1. Extract search intent using ChatGPT API
  2. Parse JSON response (category, keywords, price range)
  3. Query listings database with extracted filters
  4. Format results and generate natural language answer
- **ChatGPT Prompt**: System prompt guides AI to extract structured search parameters

### 7. Agent Worker (`cmd/worker/`)
- **Purpose**: Background processor for agent requests
- **Responsibilities**:
  - Subscribe to `agent.request` topic
  - Process queries via `AgentService`
  - Publish results to `agent.response` topic
- **Scalability**: Can run multiple workers in production

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# WebSocket server port
WS_PORT=8081

# OpenAI API key (required for worker)
OPENAI_API_KEY=sk-proj-your-key-here

# Existing config
PORT=8080
DB_DSN=postgres://...
JWT_SECRET=supersecret
```

## Running the System

### 1. Start Database
```bash
cd backend/build
docker compose -f docker-compose.dev.yml up -d db
```

### 2. Start API Server (existing)
```bash
cd backend
make run-api
# Runs on port 8080
```

### 3. Start WebSocket Server
```bash
cd backend
make run-ws
# Runs on port 8081
```

### 4. Start Agent Worker
```bash
cd backend
make run-worker
# No port - subscribes to pub/sub
```

## Testing

### Using `wscat` (WebSocket CLI tool)

1. **Install wscat**:
```bash
npm install -g wscat
```

2. **Get JWT Token**:
```bash
# Sign up or sign in via REST API
curl -X POST http://localhost:8080/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"user@sjsu.edu","password":"password"}'

# Copy the "token" from response
```

3. **Connect to WebSocket**:
```bash
wscat -c "ws://localhost:8081/ws?token=YOUR_JWT_TOKEN"
```

4. **Send Agent Search**:
```json
{"type":"agent.search","requestId":"test-123","payload":{"query":"used textbook for cmpe202"}}
```

5. **Expected Response**:
```json
{
  "type": "agent.response",
  "requestId": "test-123",
  "payload": {
    "answer": "I found X items...",
    "results": [...]
  }
}
```

### Using Browser JavaScript

```javascript
// Get token from login
const token = "your-jwt-token";
const ws = new WebSocket(`ws://localhost:8081/ws?token=${token}`);

ws.onopen = () => {
  console.log("Connected");
  ws.send(JSON.stringify({
    type: "agent.search",
    requestId: "req-" + Date.now(),
    payload: { query: "MacBook under $500" }
  }));
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log("Response:", response);
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
```

## Integration with Frontend

The existing frontend already has `ChatbotModal.jsx` that currently uses mock data. To enable WebSocket:

1. **Frontend connects** to `ws://localhost:8081/ws?token=<jwt>`
2. **On user query**, send `agent.search` event
3. **Listen for** `agent.response` event
4. **Display** answer and results in UI

**Note**: User requested no frontend changes, so the mock API remains active. Frontend can be updated later to use WebSocket.

## Production Deployment

### WebSocket Server
- Deploy as separate service alongside API
- Expose via ALB with WebSocket support enabled
- Configure proper origin validation in `CheckOrigin`
- Use same domain to avoid CORS issues (e.g., `wss://api.campushub.com/ws`)

### Worker Scaling
- Run multiple worker instances
- **Important**: Current in-memory pub/sub won't work across processes
- **Upgrade to Redis/NATS** for multi-instance deployment:
  ```
  Replace: internal/pubsub with Redis Pub/Sub or NATS
  Update: Hub and Worker to use external broker
  Keep interface the same for easy swap
  ```

### Load Balancer Configuration
```yaml
# ALB Target Group for WebSocket
Protocol: HTTP
Port: 8081
Health Check: /health
Stickiness: Enabled (for WebSocket connections)
```

### High Availability
```
┌─────────┐
│   ALB   │
└────┬────┘
     │
     ├──► WS Server 1 ──┐
     │                  │
     ├──► WS Server 2 ──┼──► Redis Pub/Sub ◄──┐
     │                  │                      │
     └──► WS Server 3 ──┘                      │
                                               │
     ┌──────────────────────────────────────────┘
     │
     ├──► Worker 1
     ├──► Worker 2
     └──► Worker 3
```

## Monitoring

### Health Checks
- WebSocket: `GET /health` returns 200 OK
- Track connected clients: `hub.GetClientCount()`

### Logs
All components use `zap` structured logging:
```
{"level":"info","msg":"client connected","userId":"user-123","role":"buyer"}
{"level":"info","msg":"processing agent request","query":"textbook cmpe202"}
{"level":"info","msg":"agent response published","resultCount":3}
```

### Metrics to Track
- WebSocket connections count
- Agent request latency
- ChatGPT API latency
- Database query performance
- Pub/sub queue depth

## Error Handling

### Connection Errors
- Client reconnects automatically on disconnect
- Server sends error events for invalid messages
- Worker retries on transient errors

### ChatGPT API Errors
- Fallback to basic keyword search if API fails
- Rate limiting handled with exponential backoff
- Invalid API key causes worker startup failure

### Database Errors
- Returns error event to client
- Logs error with request context
- Worker continues processing other requests

## Security Considerations

1. **JWT Validation**: All connections require valid JWT
2. **Origin Validation**: Configure `CheckOrigin` for production
3. **Rate Limiting**: Add per-user rate limits (future)
4. **Input Sanitization**: Queries validated before ChatGPT
5. **API Key Protection**: OpenAI key only in worker environment

## File Structure

```
backend/
├── cmd/
│   ├── api/          # REST API (existing)
│   ├── ws/           # WebSocket server (new)
│   │   └── main.go
│   └── worker/       # Agent worker (new)
│       └── main.go
├── internal/
│   ├── pubsub/       # Pub/sub bus (new)
│   │   ├── pubsub.go
│   │   └── types.go
│   ├── transport/
│   │   └── ws/       # WebSocket transport (new)
│   │       ├── hub.go
│   │       ├── client.go
│   │       ├── events.go
│   │       └── auth.go
│   └── service/
│       └── agent_service.go  # ChatGPT integration (new)
└── go.mod            # Added github.com/gorilla/websocket
```

## Troubleshooting

### WebSocket won't connect
- Check JWT token is valid and not expired
- Verify WS_PORT matches in config and client
- Check firewall allows port 8081
- Ensure CORS/origin validation allows your domain

### Worker not processing requests
- Verify OPENAI_API_KEY is set
- Check database connection is working
- Ensure pub/sub topics match ("agent.request")
- Check worker logs for startup errors

### No ChatGPT response
- Verify OpenAI API key has credits
- Check API rate limits
- Review agent_service.go logs for API errors
- Test with simple query like "textbook"

### Results empty but no error
- Check database has listings data
- Verify listings have status="available"
- Review search filters extracted by ChatGPT
- Check listings repository query logic

## Future Enhancements

1. **Redis Pub/Sub**: Replace in-memory bus for multi-instance
2. **Rate Limiting**: Per-user query limits
3. **Caching**: Cache ChatGPT responses for common queries
4. **Analytics**: Track popular search terms
5. **Conversation History**: Store chat history in database
6. **Multi-turn Conversations**: Remember context across queries
7. **Voice Input**: Accept voice queries via WebRTC
8. **Streaming Responses**: Stream ChatGPT response in real-time

## Support

For questions or issues:
- Check logs in `zap` structured format
- Review event payload schemas
- Test with `wscat` for debugging
- Refer to existing API documentation

---

**Author**: CampusHub Team  
**Last Updated**: November 2025




