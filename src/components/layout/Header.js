"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import helpers from "@/lib/helpers";

export default function Header({ sidebarCollapsed }) {
  const auth = useAuth();
  const utilizador = auth ? auth.utilizador : null;
  const logout = auth ? auth.logout : () => {};
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setMenuOpen(false);
    if (menuOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  return (
    <header className={`fixed top-0 right-0 z-30 h-16 bg-surface-card border-b border-outline-variant transition-all duration-300 ${sidebarCollapsed ? "left-[68px]" : "left-60"}`}>
      <div className="flex items-center justify-between h-full px-5">
        <div className="hidden sm:block">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-72 pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="relative p-2.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container-low transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface-card" />
          </button>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-semibold text-on-primary">
                  {helpers.getInitials(utilizador ? utilizador.nome_completo : "U")}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-on-surface leading-none">{utilizador ? utilizador.nome_completo : "Utilizador"}</p>
                <p className="text-[11px] text-outline mt-0.5">{utilizador && utilizador.perfil ? utilizador.perfil.nome : ""}</p>
              </div>
              <svg className="w-4 h-4 text-outline hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-card rounded-lg shadow-lg border border-outline-variant py-1 z-50">
                <div className="px-4 py-2.5 border-b border-outline-variant">
                  <p className="text-sm font-medium text-on-surface">{utilizador ? utilizador.nome_completo : ""}</p>
                  <p className="text-xs text-outline">{utilizador ? utilizador.email : ""}</p>
                </div>
                <a href="/dashboard/configuracoes" className="flex items-center gap-2.5 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  Meu Perfil
                </a>
                <hr className="my-1 border-outline-variant" />
                <button onClick={logout} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-error hover:bg-error-container/50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                  Terminar Sessão
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
