Here's your README:

# CampusHub - Campus Marketplace Frontend

A modern React-based marketplace platform for students to buy and sell textbooks, gadgets, and other essentials within their campus community.

## 🎯 Overview

CampusHub enables students to easily trade items with fellow campus members through an intuitive interface with real-time chat, AI-powered search, and comprehensive listing management.

**Roles:**
- **Sellers**: Create and manage listings with photos
- **Buyers**: Search, filter, and negotiate with sellers
- **Admins**: Moderate content and handle reports

## ✨ Key Features

- 📝 Create and manage listings with multiple images
- 🔍 Advanced search and filtering by category, price, and keywords
- 🤖 AI-powered chatbot search using Gemini AI (natural language queries)
- 💬 Real-time WebSocket chat for buyer-seller negotiation
- ✅ Mark items as sold
- 🚩 Report inappropriate/incomplete listings
- 📱 Responsive design for mobile and desktop
- 🔐 JWT-based authentication

## 🛠️ Tech Stack

- **React** 19.1.1
- **Vite** 7.2.4 - Build tool
- **React Router DOM** 7.9.1 - Client-side routing
- **Tailwind CSS** 3.4.14 - Styling
- **Axios** 1.12.2 - HTTP client
- **Lucide React** 0.544.0 - Icons
- **React Hot Toast** 2.6.0 - Notifications

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- Backend API running (default: http://localhost:8082)
- WebSocket server running (default: ws://localhost:8081)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:8082/v1
   VITE_WS_URL=ws://localhost:8081
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## 📜 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── api/              # API client and endpoints
│   │   └── apiClient.js
│   ├── components/       # Reusable UI components
│   │   ├── ChatbotModal.jsx
│   │   ├── Filters.jsx
│   │   ├── ImagePicker.jsx
│   │   ├── ListingCard.jsx
│   │   ├── ReportModal.jsx
│   │   └── SearchBar.jsx
│   ├── context/          # React Context providers
│   │   └── AuthContext.jsx
│   ├── hooks/            # Custom React hooks
│   │   └── useWebSocket.js
│   ├── pages/            # Page components
│   │   ├── BrowsePage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── EditListingPage.jsx
│   │   ├── ListingDetailPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── MyListingsPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── SellPage.jsx
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── .env                  # Environment variables
├── tailwind.config.js    # Tailwind configuration
├── vite.config.js        # Vite configuration
└── package.json
```

## 🔌 API Integration

The frontend connects to two backend services:

### REST API (Port 8082)
- User authentication
- Listing CRUD operations
- Image uploads
- Reports management

### WebSocket Server (Port 8081)
- Real-time chat
- AI chatbot search (Gemini AI integration)
- Live notifications

## 🤖 AI Chatbot Feature

The AI-powered search assistant uses Google Gemini AI to understand natural language queries:

**Example queries:**
- "do you have a used textbook for cmpe202?"
- "I need a cheap MacBook for college"
- "furniture under $100"

The chatbot extracts search intent and returns relevant listings with natural language responses.

## 🎨 Features Breakdown

### For Sellers
- Create listings with title, description, price, category, and condition
- Upload multiple images per listing
- Edit existing listings
- Mark items as sold
- View stats (total listings, active, sold, revenue)

### For Buyers
- Browse all listings with pagination
- Search by keywords
- Filter by category and price range
- Sort by date or price
- Report suspicious listings
- Contact sellers via chat

### AI Search
- Natural language query processing
- Intelligent category and price extraction
- Contextual search results

## 🔒 Authentication

Uses JWT tokens stored in localStorage. Protected routes require authentication.

## 🚧 Development

### Mock Data Mode

Toggle mock data in `src/api/apiClient.js`:
```javascript
const USE_MOCK = false; // Set to true for development without backend
```

### Code Quality

```bash
npm run lint      # Check for linting errors
npm run format    # Auto-format code
```

## 📦 Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## 🐛 Troubleshooting

**WebSocket connection failed:**
- Ensure WebSocket server is running on port 8081
- Check `VITE_WS_URL` in `.env`

**API requests failing:**
- Verify backend API is running on port 8082
- Check `VITE_API_URL` in `.env`
- Check browser console for CORS errors

**Images not uploading:**
- Verify image size limits (typically 5MB max)
- Check network tab for upload errors

## 📄 License

Private - Academic Project

---

