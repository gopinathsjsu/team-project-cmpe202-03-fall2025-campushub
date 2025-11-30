import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WebSocketProvider } from './context/WebSocketContext';

import NavBar from "./components/NavBar";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import BrowsePage from "./pages/BrowsePage";
import SellPage from "./pages/SellPage";
import ListingDetailPage from "./pages/ListingDetailPage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";
import MyListingsPage from "./pages/MyListingsPage";
import EditListingPage from "./pages/EditListingPage";

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppContent() {
  const location = useLocation();
  const showNavBar = location.pathname !== "/" && location.pathname !== "/login" && location.pathname !== "/signup";

  return (
    <div className="min-h-screen bg-gray-50">
      {showNavBar && <NavBar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        } />
        <Route path="/browse" element={
          <ProtectedRoute>
            <BrowsePage />
          </ProtectedRoute>
        } />
        <Route path="/sell" element={
          <ProtectedRoute>
            <SellPage />
          </ProtectedRoute>
        } />
        <Route path="/listing/:id" element={
          <ProtectedRoute>
            <ListingDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/my-listings" element={
          <ProtectedRoute>
            <MyListingsPage />
          </ProtectedRoute>
        } 
      />
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/listing/:id/edit" element={<EditListingPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
    <WebSocketProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      </WebSocketProvider>
    </BrowserRouter>
  );
}
