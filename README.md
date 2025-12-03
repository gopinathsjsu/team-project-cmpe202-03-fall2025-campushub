# CMPE-202 Fall 2025 - Team CampusHub

## Team Members:
- **[Team Member 1]**
- **[Team Member 2]**
- **[Team Member 3]**
- **[Team Member 4]**

## Team Contributions:
- **[Team Member 1]** - [Role and responsibilities]
- **[Team Member 2]** - [Role and responsibilities]
- **[Team Member 3]** - [Role and responsibilities]
- **[Team Member 4]** - [Role and responsibilities]

## Project Links:
- **Git Repo**: https://github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub
- **User Story Document**: [Add Google Docs link]
- **Sprint Plan Document**: [Add Google Docs link]
- **Project Journal**: [Add Google Docs link]
- **WireFrame**: [Add link to wireframes in docs folder]

---

## To Run the Project Locally:

### Prerequisites
- **Docker & Docker Compose** - For PostgreSQL and MinIO
- **Go 1.21+** - For backend services
- **Node.js 18+** - For frontend
- **npm** - Package manager

---

## Backend Setup

1. **Start Docker Services (PostgreSQL + MinIO)**
   ```bash
   cd backend/build
   docker compose -f docker-compose.dev.yml up -d
   ```
   
   Verify services are running:
   ```bash
   docker ps
   ```
   
   Create MinIO bucket:
   - Open http://localhost:9001
   - Login: `minioadmin` / `minioadmin`
   - Create bucket: `campushub-01-uploads`

2. **Run Database Migrations**
   ```bash
   cd backend/build
   cat ../migrations/*.sql | docker compose -f docker-compose.dev.yml exec -T db psql -U postgres -d campus -v ON_ERROR_STOP=1 -f -
   ```

3. **Configure Backend Environment**
   
   Create `backend/.env` file with your credentials

4. **Start Backend Services**
   
   Open three separate terminals:
   
   **Terminal 1 - API Server:**
   ```bash
   cd backend
   go run cmd/api/main.go
   ```
   
   **Terminal 2 - WebSocket Server:**
   ```bash
   cd backend
   go run cmd/ws/main.go
   ```
   
   **Terminal 3 - Worker:**
   ```bash
   cd backend
   go run cmd/worker/main.go
   ```

---

## Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Frontend Environment**
   
   Create `frontend/.env` file with your Firebase and API credentials

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The application will run at http://localhost:5173

---

## 🌐 Service URLs

Once all services are running:

- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:8082
- **WebSocket**: ws://localhost:8081
- **MinIO Console**: http://localhost:9001
---

## XP Core Values:

**Communication:**
- Regular sprint planning and task ownership were distributed among team members
- Shared responsibilities fostered collaboration across frontend, backend, and deployment
- Wireframes and UI designs were iterated on together
- Daily standups and consistent updates maintained team alignment

**Feedback:**
- Features were tested early and refined based on user feedback and bug reports
- Code reviews and pull requests ensured quality and knowledge sharing
- Continuous integration of feedback improved system reliability and user experience

---

## Tech Stack:

- **Backend**: Go + Gin Framework + WebSocket
- **Frontend**: React.js + Vite + Tailwind CSS
- **Database**: PostgreSQL
- **Storage**: AWS S3 / MinIO
- **Real-time Chat**: Firebase Firestore
- **AI Integration**: Google Gemini 2.5 Flash API
- **Deployment**: AWS EC2 + Load Balancer
- **Containerization**: Docker + Docker Compose

---

## Feature Set:

1. **User Authentication**
   - User signup and login functionality
   - JWT-based secure authentication
   - Profile management

2. **Marketplace Features**
   - Browse listings with filters (category, price range, condition)
   - Search functionality for finding specific items
   - Listing creation with image upload support
   - View detailed listing information with seller contact

3. **Real-time Chat System**
   - Buyer-seller messaging using Firebase
   - AI-powered chatbot assistant with Gemini integration
   - Admin communication for support and moderation

4. **Admin Dashboard**
   - View and manage all listings
   - User management and moderation
   - Report handling and resolution
   - Platform analytics

5. **Image Management**
   - AWS S3 integration for image storage
   - Presigned URL generation for secure uploads
   - Multiple images per listing support

6. **WebSocket Integration**
   - Real-time notifications
   - Live chat updates
   - Connection status tracking

---

## Design Decisions:

- **Go for Backend**: Chosen for its excellent concurrency support, performance, and ease of deployment. Perfect for handling WebSocket connections and real-time features.

- **React + Vite**: Selected for fast development experience, hot module replacement, and modern build tooling. Vite provides significantly faster builds compared to traditional bundlers.

- **PostgreSQL**: Selected for its reliability, ACID compliance, and robust support for complex queries needed for marketplace filtering and search.

- **Firebase for Chat**: Provides real-time synchronization out of the box, reducing development time for chat features while ensuring scalability.

- **Gemini AI Integration**: Leverages Google's latest AI model for intelligent chatbot responses, helping users find items and get marketplace assistance.

- **Tailwind CSS**: Utility-first approach enables rapid UI development with consistent design and responsive layouts.

- **Microservices Architecture**: Separated API server, WebSocket server, and worker processes for better scalability and maintenance.

---

## Additional Documentation:

- [Backend README](./backend/README.md) - Detailed backend architecture and setup
- [API Documentation](./backend/APIDocumentation.md) - Complete API endpoint reference
- [WebSocket Documentation](./backend/WEBSOCKET_CHATBOT.md) - WebSocket implementation details
- [Gemini Integration](./backend/GEMINI_INTEGRATION.md) - AI chatbot setup guide

**Note**: All project documents, diagrams, and wireframes are available in the `project-journal-docs/` folder.