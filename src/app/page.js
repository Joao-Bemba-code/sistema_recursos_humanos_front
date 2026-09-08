"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth && !auth.loading) {
      if (auth.isAuthenticated) {
        var isColaborador = auth.utilizador && auth.utilizador.perfil && auth.utilizador.perfil.nome === "Colaborador";
        router.push(isColaborador ? "/dashboard/portal" : "/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [auth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[var(--color-primary-container)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-on-surface-variant">A carregar sistema...</p>
      </div>
    </div>
  );
}
