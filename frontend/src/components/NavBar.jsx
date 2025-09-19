import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChatbotButton from "./ChatbotButton";

export default function NavBar() {
  const { role, setRole } = useAuth();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-xl font-semibold">CampusHub</Link>
        <nav className="ml-4 flex items-center gap-3 text-sm">
          <Link className={`px-3 py-1 rounded ${isActive("/")?"bg-gray-900 text-white":"hover:bg-gray-100"}`} to="/">Browse</Link>
          <Link className={`px-3 py-1 rounded ${isActive("/sell")?"bg-gray-900 text-white":"hover:bg-gray-100"}`} to="/sell">Sell</Link>
          <Link className={`px-3 py-1 rounded ${isActive("/chat")?"bg-gray-900 text-white":"hover:bg-gray-100"}`} to="/chat">Chat</Link>
          <Link className={`px-3 py-1 rounded ${isActive("/admin")?"bg-gray-900 text-white":"hover:bg-gray-100"}`} to="/admin">Admin</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ChatbotButton />
          <select value={role} onChange={(e)=>setRole(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option>Buyer</option>
            <option>Seller</option>
            <option>Admin</option>
          </select>
        </div>
      </div>
    </header>
  );
}
