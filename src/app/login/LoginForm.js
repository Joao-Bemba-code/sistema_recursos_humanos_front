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
        const perfilNome =
          response.utilizador && response.utilizador.perfil
            ? response.utilizador.perfil.nome
            : "";
        router.push(perfilNome === "Colaborador" ? "/dashboard/portal" : "/dashboard");
      }
    } catch (err) {
      setError(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)" }}>
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 80px 80px",
          }}
        />
        <div className="relative z-10 text-center px-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 backdrop-blur-sm rounded-2xl mb-6 border border-white/10">
            <span className="material-symbols-outlined text-[40px] text-white">group</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">SGHR</h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-sm mx-auto">
            Sistema de Gestão de Recursos Humanos
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-white/20" />
            <span className="text-white/40 text-[13px] font-medium tracking-wider">CENFFOR</span>
            <div className="h-px w-12 bg-white/20" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-white">group</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-on-surface">SGHR</h1>
              <p className="text-[11px] text-on-surface-variant/60">CENFFOR</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-1">Iniciar sessão</h2>
            <p className="text-[14px] text-on-surface-variant/70">Insira as suas credenciais para aceder ao sistema.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 w-full p-3.5 mb-6 text-[13px] font-semibold rounded-xl bg-error-container text-error border border-error/10">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="exemplo@cenffor.co.ao"
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
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 bg-background border border-outline-variant/50 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 inline-flex items-center justify-center gap-2 bg-primary text-white text-[14px] font-semibold rounded-xl shadow-sm hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  A entrar...
                </>
              ) : (
                <>
                  Aceder à Plataforma
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}