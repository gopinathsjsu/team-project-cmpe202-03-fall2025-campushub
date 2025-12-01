# CampusHub - Complete Setup Guide

This guide will help you run all services for the CampusHub application.

## 🚀 Quick Start

### Option 1: Automated Script (Recommended)

```bash
# Make scripts executable
chmod +x start-all.sh stop-all.sh

# Start all services
./start-all.sh

# Stop all services
./stop-all.sh
```

### Option 2: Manual Setup

Follow the steps below to start each service manually.

---

## 📋 Prerequisites

- **Docker & Docker Compose** - For PostgreSQL and MinIO
- **Go 1.21+** - For backend services
- **Node.js 18+** - For frontend
- **npm** - Package manager

---

## 🔧 Step-by-Step Setup

### 1. Start Docker Services (PostgreSQL + MinIO)

```bash
cd backend/build
docker compose -f docker-compose.dev.yml up -d
```

**Verify services are running:**
```bash
docker ps
```

**Create MinIO bucket:**
1. Open http://localhost:9001
2. Login with `minioadmin` / `minioadmin`
3. Create bucket: `campushub-01-uploads`

### 2. Run Database Migrations

```bash
cd backend
cat migrations/*.sql | docker compose -f build/docker-compose.dev.yml exec -T db psql -U postgres -d campus -v ON_ERROR_STOP=1 -f -
```

### 3. Configure Backend Environment

Create `backend/.env` file:

```env
ENV=dev
PORT=8082
WS_PORT=8081
DB_DSN=postgres://postgres:postgres@localhost:5434/campus?sslmode=disable
JWT_SECRET=supersecret-dev-key
GEMINI_API_KEY=your-gemini-api-key-here
S3_BUCKET=campushub-01-uploads
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
S3_PATH_STYLE=true
PRESIGN_EXPIRY=15
```

### 4. Start Backend Services

**Terminal 1 - API Server:**
```bash
cd backend
make run-api
```

**Terminal 2 - WebSocket Server:**
```bash
cd backend
make run-ws
```

**Terminal 3 - Worker (Optional):**
```bash
cd backend
make run-worker
```

### 5. Configure Frontend Environment

Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:8082/v1
VITE_WS_URL=ws://localhost:8081
```

### 6. Start Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

---

## 🌐 Service URLs

Once all services are running:

- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:8082
- **WebSocket**: ws://localhost:8081
- **MinIO Console**: http://localhost:9001
- **PostgreSQL**: localhost:5434

---

## 🧪 Health Checks

**API Health:**
```bash
curl http://localhost:8082/healthz
```

**Database:**
```bash
docker compose -f backend/build/docker-compose.dev.yml exec db psql -U postgres -d campus -c "\dt"
```

---

## 🛑 Stopping Services

### Using the script:
```bash
./stop-all.sh
```

### Manually:

1. **Stop Frontend**: Press `Ctrl+C` in the frontend terminal
2. **Stop Backend**: Press `Ctrl+C` in each backend terminal
3. **Stop Docker** (optional):
   ```bash
   cd backend/build
   docker compose -f docker-compose.dev.yml down
   ```

---

## 📝 Troubleshooting

### Port Already in Use
If a port is already in use, either:
- Stop the service using that port
- Change the port in the respective `.env` file

### Database Connection Issues
- Ensure Docker services are running: `docker ps`
- Check `DB_DSN` in `backend/.env` uses port `5434`

### MinIO Bucket Not Found
- Access MinIO console at http://localhost:9001
- Create bucket: `campushub-01-uploads`

### Frontend Can't Connect to Backend
- Verify `VITE_API_URL` in `frontend/.env`
- Check backend API is running on port 8082
- Check browser console for CORS errors

---

## 📚 Additional Documentation

- [Backend README](./backend/README.md) - Detailed backend setup
- [Frontend README](./frontend/README.md) - Frontend development guide
- [API Documentation](./backend/APIDocumentation.md) - API endpoints
- [WebSocket Chatbot](./backend/WEBSOCKET_CHATBOT.md) - WebSocket features

---

## 🎯 Development Workflow

1. **Start Docker services** (run once, stays up)
2. **Start backend services** (API + WebSocket)
3. **Start frontend** (auto-reloads on changes)
4. **Make changes** and see them reflected immediately

---

**Happy Coding! 🚀**

