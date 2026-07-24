"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const login = auth ? auth.login : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (auth && auth.isAuthenticated) {
      router.push("/dashboard");
    }
  }, [auth, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (login) {
        const response = await login(email, password);
        const perfilNome = response.utilizador && response.utilizador.perfil
          ? response.utilizador.perfil.nome
          : "";
        if (perfilNome === "Colaborador") {
          router.push("/dashboard/portal");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      setError(err.message || "Credenciais invalidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px]">
      <div className="bg-surface/80 backdrop-blur-md border border-outline-variant/30 rounded-xl shadow-xl overflow-hidden">
        <header className="pt-10 pb-6 px-8 text-center bg-gradient-to-b from-surface-container-low to-transparent">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full shadow-lg shadow-primary/20 mb-4">
            <span className="material-symbols-outlined text-[32px] text-on-primary">group</span>
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight mb-1">SGHR</h1>
          <p className="text-[13px] text-on-surface-variant max-w-[280px] mx-auto">
            Sistema de Gestao de Recursos Humanos - CENFFOR
          </p>
        </header>

        <div className="px-8 pb-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-on-surface tracking-tight mb-1">Iniciar sessao</h2>
            <p className="text-[13px] text-on-surface-variant/60">Insira as suas credenciais para continuar.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error/10 text-error p-3 rounded-lg mb-5 border border-error/10">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="text-[13px] font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="exemplo@cenffor.co.ao"
                  className="w-full h-12 pl-10 pr-4 bg-background border border-outline-variant/50 rounded-lg text-[14px] text-on-surface placeholder:text-outline/60 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Palavra-passe</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-12 bg-background border border-outline-variant/50 rounded-lg text-[14px] text-on-surface placeholder:text-outline/60 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  A entrar...
                </>
              ) : (
                <>
                  <span>Aceder a Plataforma</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-[12px] text-outline mt-6">
        SGHR v1.0 &middot; CENFFOR &middot; 2026
      </p>
    </div>
  );
}
