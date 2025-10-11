/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx
import { createContext, useContext, useState, useMemo } from "react";

const AuthContext = createContext(null);
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [role, setRole] = useState("Buyer"); // Buyer | Seller | Admin
    const value = useMemo(() => ({ role, setRole }), [role]);
    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
