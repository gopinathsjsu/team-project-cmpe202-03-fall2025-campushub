# 🧠 CampusHub Backend

CampusHub is a **Go + Gin + Postgres + AWS S3** backend for a campus-only marketplace where students can buy, sell, and chat.

---

## 🚀 Getting Started

### 1️⃣ Prerequisites

| Tool | Minimum Version | Notes |
|------|------------------|-------|
| Go   | 1.21+            | Required to run the backend |
| Docker + Compose | latest | For Postgres & S3/MinIO |
| make | (optional) | Used by Makefile targets |

---

### 2️⃣ Clone and move to backend

```bash
git clone <your-repo-url>
cd backend
```

---

### 3️⃣ Environment Variables

Create a `.env` file in `backend/` (or copy from `.env.example`):

```bash
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

**Important Notes:**
- `DB_DSN` uses port **5434** (not 5432) because Docker maps PostgreSQL to 5434
- `S3_ENDPOINT` should point to MinIO: `http://localhost:9000`
- `S3_PATH_STYLE=true` is required for MinIO compatibility
- `GEMINI_API_KEY` is optional but needed for AI chatbot features

---

### 4️⃣ Start the Database & MinIO

From `backend/build`:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts both PostgreSQL (port 5434) and MinIO (ports 9000, 9001).

Confirm they're running:

```bash
docker ps
```

**Next:** Create the MinIO bucket:
1. Open http://localhost:9001
2. Login with `minioadmin` / `minioadmin`
3. Create bucket: `campushub-01-uploads`

---

### 5️⃣ Apply Database Migrations

Run all `.sql` files from `backend/migrations`:

```bash
# From backend/build
cat ../migrations/*.sql | docker compose -f docker-compose.dev.yml exec -T db psql -U postgres -d campus -v ON_ERROR_STOP=1 -f -
```

Verify tables:

```bash
docker compose -f docker-compose.dev.yml exec -T db   psql -U postgres -d campus -c "\dt"
```

---

### 6️⃣ Run the Backend

```bash
cd backend
make run-api
```

Expected log:
```
{"level":"info","msg":"api listening","addr":":8082"}
```

---

### 7️⃣ Health Check

```bash
curl http://localhost:8082/healthz
```

---
## 🧹 Stopping Services

```bash
docker compose -f backend/build/docker-compose.dev.yml down
```

---

## 📖 References
- [APIDocumentation.md](./APIDocumentation.md)
- [Gin Web Framework](https://gin-gonic.com/docs/)
- [pgx (PostgreSQL)](https://github.com/jackc/pgx)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

---

👨‍💻 **Author**: CampusHub Team  
📅 **Last Updated:** November 2025
