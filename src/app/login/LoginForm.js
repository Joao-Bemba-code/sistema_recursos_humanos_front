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
        const perfilNome = response.utilizador && response.utilizador.perfil
          ? response.utilizador.perfil.nome
          : "";
        router.push(perfilNome === "Colaborador" ? "/dashboard/portal" : "/dashboard");
      }
    } catch (err) {
      setError(err.message || "Credenciais invalidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-container)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
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
              <span className="material-symbols-outlined text-[20px] text-on-primary">group</span>
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
            <div className="flex items-center gap-2.5 bg-error/10 text-error p-3.5 rounded-xl mb-6 border border-error/10">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span className="text-[13px] font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="exemplo@cenffor.co.ao"
                className="input-field h-11"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wider mb-1.5 block">Palavra-passe</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input-field h-11 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined text-[18px]">lock</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-11 justify-center mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
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
