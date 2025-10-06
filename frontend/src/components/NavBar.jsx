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
} from "lucide-react";
import ChatbotButton from "./ChatbotButton";

export default function NavBar() {
    const { role, setRole } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { path: "/", label: "Browse", icon: ShoppingBag },
        { path: "/sell", label: "Sell", icon: Store },
        { path: "/chat", label: "Chat", icon: MessageCircle },
        { path: "/admin", label: "Admin", icon: Shield, adminOnly: true },
    ];

    const getRoleBadgeClass = (selectedRole) => {
        const badges = {
            Buyer: "bg-green-100 text-green-800",
            Seller: "bg-accent-500 text-white",
            Admin: "bg-red-100 text-red-800",
        };
        return badges[selectedRole] || badges.Buyer;
    };

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
                        {navLinks.map(
                            ({ path, label, icon: Icon, adminOnly }) => {
                                if (adminOnly && role !== "Admin") return null;

                                return (
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
                                );
                            }
                        )}
                    </nav>

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-3">
                        {/* Chatbot Button - Desktop */}
                        <div className="hidden sm:block">
                            <ChatbotButton />
                        </div>

                        {/* Role Selector */}
                        <div className="hidden md:block relative">
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className={`appearance-none pl-3 pr-8 py-2 rounded-lg text-sm font-medium cursor-pointer border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 ${getRoleBadgeClass(
                                    role
                                )}`}
                            >
                                <option value="Buyer">Buyer</option>
                                <option value="Seller">Seller</option>
                                <option value="Admin">Admin</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                        </div>

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
                        {navLinks.map(
                            ({ path, label, icon: Icon, adminOnly }) => {
                                if (adminOnly && role !== "Admin") return null;

                                return (
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
                                );
                            }
                        )}

                        {/* Mobile Chatbot Button */}
                        <div className="pt-2">
                            <ChatbotButton />
                        </div>

                        {/* Mobile Role Selector */}
                        <div className="pt-2 pb-1">
                            <label className="block text-xs font-medium text-gray-600 mb-2 px-1">
                                Your Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className={`w-full appearance-none px-4 py-3 rounded-lg text-sm font-medium cursor-pointer border-2 transition-all duration-200 ${getRoleBadgeClass(
                                    role
                                )}`}
                            >
                                <option value="Buyer">Buyer</option>
                                <option value="Seller">Seller</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
