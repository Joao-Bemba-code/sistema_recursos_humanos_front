"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TopNavBar from "@/components/layout/TopNavBar";
import PageTransition from "@/components/ui/PageTransition";
import { ToastProvider } from "@/components/ui/Toast";

var ADMIN_ROUTES = [
  "/dashboard",
  "/dashboard/colaboradores",
  "/dashboard/contratos",
  "/dashboard/departamentos",
  "/dashboard/assiduidade",
  "/dashboard/faltas",
  "/dashboard/ferias",
  "/dashboard/avaliacao",
  "/dashboard/formacao",
  "/dashboard/folha-salarial",
  "/dashboard/relatorios",
  "/dashboard/configuracoes",
  "/dashboard/pedidos",
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (auth && !auth.loading && !auth.isAuthenticated) {
      router.push("/login");
    }
  }, [auth, router]);

  useEffect(() => {
    if (auth && !auth.loading && auth.isAuthenticated && auth.utilizador) {
      const perfilNome = auth.utilizador.perfil ? auth.utilizador.perfil.nome : "";
      if (perfilNome === "Colaborador" && ADMIN_ROUTES.includes(pathname)) {
        router.push("/dashboard/portal");
      }
    }
  }, [auth, router, pathname]);

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

  if (auth && !auth.isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
      <main className="flex-grow max-w-[1440px] w-full mx-auto px-4 sm:px-5 md:px-16 py-4 sm:py-8">
        <ToastProvider><PageTransition>{children}</PageTransition></ToastProvider>
      </main>
      <footer className="bg-surface border-t border-outline-variant/30 w-full py-8 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-5 md:px-16 w-full max-w-[1440px] mx-auto gap-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary">SGHR</span>
            <span className="text-[13px] text-on-surface-variant/60 font-medium">&copy; 2026 CENFFOR. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-8">
            <span className="text-[13px] font-medium text-on-surface-variant/80">Termos e Condições</span>
            <span className="text-[13px] font-medium text-on-surface-variant/80">Política de Dados</span>
            <span className="text-[13px] font-medium text-on-surface-variant/80">Canal de Suporte</span>
          </div>
        </div>
      </footer>
    </div>
  );
}