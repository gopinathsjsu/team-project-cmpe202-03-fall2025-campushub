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

    // Check for existing authentication on mount
    useEffect(() => {
        const authStatus = localStorage.getItem("isAuthenticated");
        const role = localStorage.getItem("userRole");
        const email = localStorage.getItem("userEmail");
        const name = localStorage.getItem("userName");

        if (authStatus === "true") {
            setIsAuthenticated(true);
            setUserRole(role || "user");
            setUserEmail(email || "");
            setUserName(name || "");
        }
    }, []);

    const login = (role, email, name = "") => {
        console.log("Logging in user:", { role, email, name });
        setIsAuthenticated(true);
        setUserRole(role);
        setUserEmail(email);
        setUserName(name);
        
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userRole", role);
        localStorage.setItem("userEmail", email);
        if (name) localStorage.setItem("userName", name);
        console.log("User logged in successfully");
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUserRole("user");
        setUserEmail("");
        setUserName("");
        
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
    };

    const isAdmin = userRole === "admin";

    const value = useMemo(() => ({ 
        isAuthenticated, 
        userRole, 
        userEmail, 
        userName, 
        isAdmin,
        login, 
        logout 
    }), [isAuthenticated, userRole, userEmail, userName, isAdmin]);

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
