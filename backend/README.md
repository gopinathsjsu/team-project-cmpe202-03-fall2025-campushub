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
PORT=8082
DB_URL=postgres://postgres:postgres@localhost:5432/campus?sslmode=disable
JWT_SECRET=supersecret-dev-key
JWT_TTL_MIN=1440
S3_BUCKET=campushub-01-uploads
S3_REGION=us-east-2
S3_ENDPOINT=
PRESIGN_EXP_MIN=15
```

---

### 4️⃣ Start the Database

From `backend/build`:

```bash
docker compose -f docker-compose.dev.yml up -d db
```

Confirm it’s running:

```bash
docker ps
```

---

### 5️⃣ Apply Database Migrations

Run all `.sql` files from `backend/migrations`:

```bash
# From backend/build
cat ../migrations/*.sql | docker compose -f docker-compose.dev.yml exec -T db   psql -U postgres -d campus -v ON_ERROR_STOP=1 -f -
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
