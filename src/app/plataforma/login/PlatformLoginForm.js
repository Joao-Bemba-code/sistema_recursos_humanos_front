"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function PlatformLoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const loginPlataforma = auth ? auth.loginPlataforma : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth && !auth.loading && auth.isAuthenticated && auth.utilizador && auth.utilizador.super_admin && !loading) {
      router.replace("/plataforma");
    }
  }, [auth, router, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!loginPlataforma) throw new Error("Serviço indisponível");
      const response = await loginPlataforma(email.trim(), password);
      if (!response || !response.utilizador || !response.utilizador.super_admin) {
        if (auth && auth.logout) auth.logout();
        throw new Error("Esta conta não tem acesso à plataforma.");
      }
      router.replace("/plataforma");
    } catch (err) {
      setError(err.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px] text-white">shield_person</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-on-surface leading-tight">Plataforma SGHR</h1>
            <p className="text-[11px] text-on-surface-variant/60">Gestão de organizações</p>
          </div>
        </div>

        <div className="bg-surface-card border border-outline-variant/30 rounded-2xl p-6 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-on-surface tracking-tight mb-1">Acesso da plataforma</h2>
            <p className="text-[13px] text-on-surface-variant/70">
              Área reservada ao super administrador das organizações.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 w-full p-3.5 mb-5 text-[13px] font-semibold rounded-xl bg-error-container text-error border border-error/10">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wider block">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-outline">email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="nome@empresa.co.ao"
                  className="w-full h-11 pl-10 pr-4 bg-background border border-outline-variant/50 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wider block">
                Palavra-passe
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-outline">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 bg-background border border-outline-variant/50 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 inline-flex items-center justify-center gap-2 bg-primary text-white text-[14px] font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  A entrar...
                </>
              ) : (
                <>
                  Entrar na plataforma
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-outline-variant/30 text-center">
            <Link href="/login" className="text-[12px] font-semibold text-primary hover:underline">
              Voltar ao login do sistema
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-on-surface-variant/60 text-center mt-4 leading-relaxed">
          Só contas da plataforma entram aqui. Administradores e colaboradores de uma organização usam o login normal.
        </p>
      </div>
    </div>
  );
}
