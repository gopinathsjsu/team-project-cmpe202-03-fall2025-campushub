/* eslint-disable no-unused-vars */
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import {
    Menu,
    X,
    ShoppingBag,
    MessageCircle,
    Shield,
    Store,
    Sparkles,
    LogOut,
    Package,
    User,
} from "lucide-react";
import ChatbotButton from "./ChatbotButton";

export default function NavBar() {
    const { isAuthenticated, isAdmin, userName, logout } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { path: "/browse", label: "Browse", icon: ShoppingBag },
        { path: "/sell", label: "Sell", icon: Store },
        { path: "/my-listings", label: "My Listings", icon: Package },
        { path: "/chat", label: "Chat", icon: MessageCircle },
    ];

    const adminNavLinks = [
        { path: "/admin", label: "Moderation", icon: Shield },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-primary-100 bg-white shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200 shadow-md">
                            <span className="text-white font-bold text-lg">
                                CH
                            </span>
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                                CampusHub
                            </div>
                            <div className="text-[10px] text-accent-600 font-medium -mt-1">
                                SJSU Marketplace
                            </div>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-1">
                        {isAdmin ? (
                            // Admin navigation - only moderation
                            adminNavLinks.map(({ path, label, icon: Icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        isActive(path)
                                            ? "bg-red-500 text-white shadow-md"
                                            : "text-gray-700 hover:bg-red-50 hover:text-red-700"
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{label}</span>
                                </Link>
                            ))
                        ) : (
                            // Regular user navigation
                            navLinks.map(({ path, label, icon: Icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        isActive(path)
                                            ? "bg-primary-500 text-white shadow-md"
                                            : "text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{label}</span>
                                </Link>
                            ))
                        )}
                    </nav>

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-3">
                        {/* Chatbot Button - Desktop */}
                        <div className="hidden sm:block">
                            <ChatbotButton />
                        </div>

                        {/* User Menu */}
                        {isAuthenticated ? (
                            <div className="flex items-center space-x-3">
                                <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                                    <User size={16} className="text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {userName || "User"}
                                    </span>
                                </div>
                                <button
                                    onClick={logout}
                                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span className="hidden sm:inline text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            {mobileMenuOpen ? (
                                <X size={24} />
                            ) : (
                                <Menu size={24} />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 bg-white">
                    <div className="px-4 py-3 space-y-2">
                        {/* Mobile Navigation Links */}
                        {isAdmin ? (
                            // Admin mobile navigation
                            adminNavLinks.map(({ path, label, icon: Icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        isActive(path)
                                            ? "bg-red-500 text-white"
                                            : "text-gray-700 hover:bg-red-50"
                                    }`}
                                >
                                    <Icon size={18} />
                                    <span>{label}</span>
                                </Link>
                            ))
                        ) : (
                            // Regular user mobile navigation
                            navLinks.map(({ path, label, icon: Icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        isActive(path)
                                            ? "bg-primary-500 text-white"
                                            : "text-gray-700 hover:bg-primary-50"
                                    }`}
                                >
                                    <Icon size={18} />
                                    <span>{label}</span>
                                </Link>
                            ))
                        )}

                        {/* Mobile Chatbot Button */}
                        <div className="pt-2">
                            <ChatbotButton />
                        </div>

                        {/* Mobile User Menu */}
                        {isAuthenticated ? (
                            <div className="pt-2 border-t border-gray-200">
                                <div className="flex items-center space-x-3 px-4 py-3 bg-gray-100 rounded-lg mb-2">
                                    <User size={18} className="text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {userName || "User"}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        logout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span className="text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        ) : (
                            <div className="pt-2 border-t border-gray-200 space-y-2">
                                <Link
                                    to="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full text-center px-4 py-3 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full text-center px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
