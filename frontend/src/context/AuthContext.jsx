/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import api from "../api/apiClient";

const AuthContext = createContext(null);
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing authentication on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = api.getToken();
            
            if (token) {
                try {
                    // Verify token is still valid by getting user data
                    const userData = JSON.parse(localStorage.getItem("user") || "null");
                    
                    if (userData) {
                        setIsAuthenticated(true);
                        setUser(userData);
                    } else {
                        // Token exists but no user data, clear everything
                        api.logout();
                    }
                } catch (error) {
                    console.error("Failed to restore session:", error);
                    api.logout();
                }
            }
            
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.login(email, password);
            
            api.setToken(response.data.token);
          
            const userData = response.data.user;
            setUser(userData);
            setIsAuthenticated(true);
            
            localStorage.setItem("user", JSON.stringify(userData));
            
            return { success: true, user: userData };
        } catch (error) {
            console.error("Login failed:", error);
            return { 
                success: false, 
                error: error.message || "Login failed. Please check your credentials." 
            };
        }
    };

    const register = async (name, email, password, role = "user") => {
        try {
            const response = await api.register(name, email, password, role);
            
            api.setToken(response.data.token);
           
            const userData = response.data.user;
            setUser(userData);
            setIsAuthenticated(true);
           
            localStorage.setItem("user", JSON.stringify(userData));
            
            return { success: true, user: userData };
        } catch (error) {
            console.error("Registration failed:", error);
            return { 
                success: false, 
                error: error.message || "Registration failed. Please try again." 
            };
        }
    };

    const logout = () => {
        api.logout();
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("user");
    };

    const userRole = user?.role || "user";
    const userEmail = user?.email || "";
    const userName = user?.name || "";
    const userId = user?.id || "";
    const isAdmin = userRole === "admin";

    const value = useMemo(() => ({ 
        isAuthenticated, 
        user,
        loading,
        userRole, 
        userEmail, 
        userName, 
        userId,
        isAdmin,
        login, 
        logout ,
        register
    }), [isAuthenticated, user, loading, userRole, userEmail, userName, userId, isAdmin]);

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
