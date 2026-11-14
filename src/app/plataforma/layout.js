"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

export default function PlataformaLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();

  var noLogin = pathname === "/plataforma/login" || pathname.indexOf("/plataforma/login/") === 0;

  useEffect(function () {
    if (noLogin) return;
    if (!auth || auth.loading) return;
    if (!auth.isAuthenticated) {
      router.replace("/plataforma/login");
      return;
    }
    if (!auth.utilizador || !auth.utilizador.super_admin) {
      router.replace("/dashboard");
    }
  }, [auth, router, noLogin]);

  var sair = function () {
    if (auth && auth.logout) auth.logout();
    router.replace("/plataforma/login");
  };

  if (noLogin) {
    return children;
  }

  if (auth && auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-outline-variant border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-on-surface-variant">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!auth || !auth.isAuthenticated) {
    return null;
  }

  var nome = auth.utilizador && auth.utilizador.nome_completo ? auth.utilizador.nome_completo : "Administrador";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-bold text-white tracking-tight">SRH</span>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-on-surface leading-tight truncate">Plataforma SGHR</p>
              <p className="text-[11px] text-on-surface-variant/60 truncate">Gestão de organizações</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="hidden sm:block text-right min-w-0">
              <p className="text-[12px] font-semibold text-on-surface truncate max-w-[180px]">{nome}</p>
              <p className="text-[10px] text-on-surface-variant/60">Super administrador</p>
            </div>
            <button
              onClick={sair}
              title="Terminar sessão"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-outline-variant/40 text-[12px] font-semibold text-on-surface-variant hover:text-error hover:border-error/30 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <ToastProvider>{children}</ToastProvider>
      </main>

      <footer className="border-t border-outline-variant/30 bg-surface">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-on-surface-variant/60">Plataforma SGHR &copy; 2026</p>
          <p className="text-[11px] text-on-surface-variant/60">Acesso exclusivo do super administrador</p>
        </div>
      </footer>
    </div>
  );
}
