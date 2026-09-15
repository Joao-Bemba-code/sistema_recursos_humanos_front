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

  useEffect(() => {
    if (!isAuthenticated) return;
    const intervalo = setInterval(async () => {
      try {
        const response = await api.get("/auth/profile");
        const user = response && response.utilizador ? response.utilizador : null;
        if (user) {
          setUtilizador(user);
          localStorage.setItem("utilizador", JSON.stringify(user));
        }
      } catch (e) {
        // 401 é tratado no api.js (remove token e redireciona)
      }
    }, 300000);
    return () => clearInterval(intervalo);
  }, [isAuthenticated]);

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

  const refreshUtilizador = useCallback(async () => {
    try {
      const response = await api.get("/auth/profile");
      const user = response && response.utilizador ? response.utilizador : null;
      if (user) {
        setUtilizador(user);
        localStorage.setItem("utilizador", JSON.stringify(user));
      }
      return user;
    } catch (e) {
      return null;
    }
  }, []);

  const hasPermission = useCallback((modulo, operacao) => {
    if (!utilizador) return false;
    const perfis = Array.isArray(utilizador.perfis) && utilizador.perfis.length > 0
      ? utilizador.perfis
      : (utilizador.perfil ? [utilizador.perfil] : []);

    for (const perfil of perfis) {
      if (!perfil) continue;
      if (perfil.nivel >= 4) return true;
      let permissoes = perfil.permissoes || {};
      if (typeof permissoes === "string") {
        try { permissoes = JSON.parse(permissoes); } catch (e) { permissoes = {}; }
      }
      if (permissoes[modulo] && permissoes[modulo].indexOf(operacao) !== -1) return true;
    }
    return false;
  }, [utilizador]);

  const isAdmin = useCallback(() => {
    if (!utilizador) return false;
    const perfis = Array.isArray(utilizador.perfis) && utilizador.perfis.length > 0
      ? utilizador.perfis
      : (utilizador.perfil ? [utilizador.perfil] : []);
    return perfis.some((p) => p && p.nivel >= 4);
  }, [utilizador]);

  const value = {
    utilizador,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    refreshUtilizador,
    hasPermission,
    isAdmin,
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
