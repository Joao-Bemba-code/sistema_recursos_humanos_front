"use client";

import { createContext, useState, useEffect, useCallback, useContext } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("utilizador");
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUtilizador(user);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("utilizador");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", response.token);
    localStorage.setItem("utilizador", JSON.stringify(response.utilizador));
    setUtilizador(response.utilizador);
    setIsAuthenticated(true);
    return response;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("utilizador");
    setUtilizador(null);
    setIsAuthenticated(false);
  }, []);

  const updateUser = useCallback((user) => {
    setUtilizador(user);
    localStorage.setItem("utilizador", JSON.stringify(user));
  }, []);

  const hasPermission = useCallback((modulo, operacao) => {
    if (!utilizador || !utilizador.perfil) return false;
    if (utilizador.perfil.nivel >= 4) return true;
    const permissoes = utilizador.perfil.permissoes || {};
    if (permissoes._all && permissoes._all.indexOf(operacao) !== -1) return true;
    if (permissoes[modulo] && permissoes[modulo].indexOf(operacao) !== -1) return true;
    return false;
  }, [utilizador]);

  const value = {
    utilizador,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
