/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx
import { createContext, useContext, useState, useMemo, useEffect } from "react";

const AuthContext = createContext(null);
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState("user"); // user | admin
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");
    const [userId, setUserId] = useState("");

    // Check for existing authentication on mount
    useEffect(() => {
        const authStatus = localStorage.getItem("isAuthenticated");
        const role = localStorage.getItem("userRole");
        const email = localStorage.getItem("userEmail");
        const name = localStorage.getItem("userName");
        const id = localStorage.getItem("userId");

        if (authStatus === "true") {
            setIsAuthenticated(true);
            setUserRole(role || "user");
            setUserEmail(email || "");
            setUserName(name || "");
            setUserId(id || "");
        }
    }, []);

    const login = (role, email, name = "", id = "") => {
        console.log("Logging in user:", { role, email, name, id });
        setIsAuthenticated(true);
        setUserRole(role);
        setUserEmail(email);
        setUserName(name);
        setUserId(id);
        
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userRole", role);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userId", id);
        if (name) localStorage.setItem("userName", name);
        console.log("User logged in successfully");
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUserRole("user");
        setUserEmail("");
        setUserName("");
        setUserId("");
        
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        localStorage.removeItem("userId");
        localStorage.removeItem("authToken");
    };

    const isAdmin = userRole === "admin";

    const value = useMemo(() => ({ 
        isAuthenticated, 
        userRole, 
        userEmail, 
        userName,
        userId,
        isAdmin,
        login, 
        logout 
    }), [isAuthenticated, userRole, userEmail, userName, userId, isAdmin]);

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
