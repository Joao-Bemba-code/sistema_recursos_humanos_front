"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { NAV_ITEMS } from "@/lib/constants";
import { getT, getNavLabel, getGroupLabel } from "@/lib/translations";

export default function TopNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const utilizador = auth ? auth.utilizador : null;
  const logout = auth ? auth.logout : () => {};
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [notifModal, setNotifModal] = useState(null);
  const [notifFiltro, setNotifFiltro] = useState("");
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  var T = getT();

  const allItems = NAV_ITEMS.flatMap((g) => g.items);
  const itensPermitidos = allItems.filter((i) => !i.modulo || auth.hasPermission(i.modulo, "read"));
  const mainItems = itensPermitidos.filter((i) =>
    ["/dashboard", "/dashboard/portal", "/dashboard/colaboradores", "/dashboard/contratos", "/dashboard/departamentos"].includes(i.href)
  );
  const temModulosAdministrativos = itensPermitidos.some((i) => i.href !== "/dashboard" && i.href !== "/dashboard/portal");
  const isAdmin = auth.isAdmin();
  const soColaborador = auth.hasPermission("portal", "read") && !isAdmin && !temModulosAdministrativos;

  var perfisNomes = [];
  if (utilizador && Array.isArray(utilizador.perfis) && utilizador.perfis.length > 0) {
    perfisNomes = utilizador.perfis.map(function (p) { return p.nome; });
  } else if (utilizador && utilizador.perfil) {
    perfisNomes = [utilizador.perfil.nome];
  }
  var rotuloPerfil = perfisNomes.join(", ");

  const navGroups = itensPermitidos.length > 0
    ? (function () {
        var grupos = [];
        NAV_ITEMS.forEach(function (g) {
          var items = g.items.filter(function (i) { return !i.modulo || auth.hasPermission(i.modulo, "read"); });
          if (items.length > 0) grupos.push({ titulo: g.titulo, items: items });
        });
        return grupos;
      })()
    : [{ titulo: "Portal", items: [{ label: "Portal do Colaborador", href: "/dashboard/portal", icon: "person" }] }];

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    var fetchNotificacoes = function () {
      api.get("/api/notificacoes")
        .then(function (data) {
          if (data && data.dados) {
            setNotificacoes(data.dados.slice(0, 8));
            setNotifCount(data.nao_lidas || 0);
          }
        })
        .catch(function () {});
    };
    fetchNotificacoes();
    var interval = setInterval(fetchNotificacoes, 15000);
    return function () { clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    setMobileOpen(false);
    logout();
    router.push("/login");
  };

  var initials = "U";
  if (utilizador && utilizador.nome_completo) {
    var parts = utilizador.nome_completo.split(" ");
    initials = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
    initials = initials.toUpperCase();
  }

  var iconMap = {
    ferias: "beach_access",
    pedido: "description",
    avaliacao: "query_stats",
    sistema: "settings",
    info: "info",
    warning: "warning",
    success: "check_circle",
    error: "error",
  };

  var MODULO_LABELS_NOTIF = { pedidos: "Pedidos", avaliacao: "Avaliação", advertencias: "Advertência", folha_salarial: "Folha Salarial", portal: "Portal" };
  var labelDeModulo = function (mod) { return MODULO_LABELS_NOTIF[mod] || "Sistema"; };

  var modulosDisponiveis = [];
  var modulosVistos = {};
  notificacoes.forEach(function (n) {
    var m = n.modulo || "sistema";
    if (!modulosVistos[m]) {
      modulosVistos[m] = true;
      modulosDisponiveis.push(m);
    }
  });
  var notificacoesVisiveis = notifFiltro
    ? notificacoes.filter(function (n) { return (n.modulo || "sistema") === notifFiltro; })
    : notificacoes;
  var chipNotif = function (ativo) {
    return "px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors " + (ativo ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant hover:bg-primary/10");
  };

  var timeAgo = function (dateStr) {
    if (!dateStr) return "";
    var diff = Date.now() - new Date(dateStr).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "Agora";
    if (mins < 60) return mins + " min";
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "h";
    var days = Math.floor(hours / 24);
    return days + "d";
  };

  var handleNotifClick = function (notif) {
    if (!notif.lida) {
      api.put("/api/notificacoes/" + notif.id + "/read").then(function () {
        setNotifCount(function (c) { return Math.max(0, c - 1); });
        setNotificacoes(function (prev) {
          return prev.map(function (n) {
            if (n.id === notif.id) return Object.assign({}, n, { lida: true });
            return n;
          });
        });
      }).catch(function () {});
    }
    setNotifModal(notif);
    setNotifOpen(false);
  };

  var handleMarkAllRead = function () {
    api.put("/api/notificacoes/read-all").then(function () {
      setNotifCount(0);
      setNotificacoes(function (prev) { return prev.map(function (n) { return Object.assign({}, n, { lida: true }); }); });
    }).catch(function () {});
  };

  return (
    <>
      <header className="bg-surface/80 backdrop-blur-md sticky top-0 z-50 border-b border-outline-variant/30">
        <div className="flex justify-between items-center w-full px-4 md:px-16 h-14 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-10">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <Link href={soColaborador ? "/dashboard/portal" : "/dashboard"} className="text-xl font-bold tracking-tight text-primary">SGHR</Link>
            <nav className="hidden lg:flex items-center gap-8">
              {mainItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-[13px] font-medium transition-colors relative ${
                      isActive
                        ? "text-primary font-semibold after:absolute after:bottom-[-17px] after:left-0 after:w-full after:h-[2px] after:bg-primary"
                        : "text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {!soColaborador && (
              <Link href="/dashboard/configuracoes" className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[22px]">settings</span>
              </Link>
            )}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-surface-card rounded-2xl shadow-2xl border border-outline-variant py-2 z-50">
                  <div className="px-4 py-2 border-b border-outline-variant/30 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-on-surface">Notificações</span>
                    {notifCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-primary hover:underline">
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  {notificacoes.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <span className="material-symbols-outlined text-[32px] text-on-surface-variant/20 block mb-2">notifications_none</span>
                      <p className="text-[12px] text-on-surface-variant/60">Sem notificações</p>
                    </div>
                  ) : (
                    <>
                      {modulosDisponiveis.length > 1 && (
                        <div className="px-4 py-2 border-b border-outline-variant/30 flex items-center gap-1.5 overflow-x-auto">
                          <button onClick={function () { setNotifFiltro(""); }} className={chipNotif(notifFiltro === "")}>Todas</button>
                          {modulosDisponiveis.map(function (m) {
                            return (
                              <button key={m} onClick={function () { setNotifFiltro(notifFiltro === m ? "" : m); }} className={chipNotif(notifFiltro === m)}>
                                {labelDeModulo(m)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {notificacoesVisiveis.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/20 block mb-2">filter_none</span>
                          <p className="text-[12px] text-on-surface-variant/60">Sem notificações neste módulo</p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto">
                          {notificacoesVisiveis.map(function (notif) {
                            var nIcon = iconMap[notif.tipo] || "notifications";
                            var isLida = notif.lida;
                            return (
                              <button
                                key={notif.id}
                                onClick={function () { handleNotifClick(notif); }}
                                className={"w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-container transition-colors " + (!isLida ? "bg-primary/5" : "")}
                              >
                                <div className={"p-1.5 rounded-lg flex-shrink-0 mt-0.5 " + (!isLida ? "bg-primary/10" : "bg-surface-container-high")}>
                                  <span className={"material-symbols-outlined text-[16px] " + (!isLida ? "text-primary" : "text-outline")}>{nIcon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={"text-[12px] truncate " + (!isLida ? "font-bold text-on-surface" : "text-on-surface-variant")}>{notif.titulo || "Notificação"}</p>
                                  <p className="text-[11px] text-on-surface-variant/60 truncate">{notif.mensagem || ""}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className="text-[10px] text-on-surface-variant/40">{timeAgo(notif.createdAt)}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-wide text-primary/70">{labelDeModulo(notif.modulo)}</span>
                                  {!isLida && <span className="w-2 h-2 bg-primary rounded-full" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 pl-3 md:pl-4 border-l border-outline-variant/30 cursor-pointer"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[12px] font-semibold">{utilizador ? utilizador.nome_completo : "Admin"}</span>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">{rotuloPerfil || "CENFFOR"}</span>
                </div>
                <div className="h-8 w-8 rounded-full border border-outline-variant/50 overflow-hidden bg-primary/10 flex items-center justify-center">
                  <span className="text-[12px] font-bold text-primary">{initials}</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{menuOpen ? "expand_less" : "expand_more"}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-xl border border-outline-variant/30 py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-outline-variant/20">
                    <p className="text-[13px] font-semibold text-on-surface">{utilizador ? utilizador.nome_completo : ""}</p>
                    <p className="text-[11px] text-on-surface-variant/60">{utilizador ? utilizador.email : ""}</p>
                  </div>
                  <Link href={soColaborador ? "/dashboard/portal" : (auth.hasPermission("configuracoes", "read") ? "/dashboard/configuracoes" : "/dashboard")} onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-on-surface-variant hover:bg-primary/5 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    {soColaborador ? "Os Meus Dados" : "Meu Perfil"}
                  </Link>
{auth.hasPermission("configuracoes", "read") && (
                    <Link href="/dashboard/configuracoes" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-on-surface-variant hover:bg-primary/5 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">settings</span>
                      Configurações
                    </Link>
                  )}
                  <hr className="my-1 border-outline-variant/20" />
                  <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-error hover:bg-error/5 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Terminar Sessão
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-surface shadow-2xl flex flex-col animate-slide-in">
            <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
              <Link href={soColaborador ? "/dashboard/portal" : "/dashboard"} onClick={() => setMobileOpen(false)} className="text-xl font-bold tracking-tight text-primary">SGHR</Link>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              {navGroups.map((group) => (
                <div key={group.titulo} className="mb-3">
                  <p className="px-5 py-1.5 text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">{getGroupLabel(group.titulo)}</p>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-on-surface-variant hover:bg-primary/5 hover:text-on-surface"
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-primary" : "text-on-surface-variant/60"}`}>{item.icon}</span>
                  {getNavLabel(item.label)}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="border-t border-outline-variant/20 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-outline-variant/30">
                  <span className="text-[13px] font-bold text-primary">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-on-surface truncate">{utilizador ? utilizador.nome_completo : ""}</p>
                  <p className="text-[11px] text-on-surface-variant/60 truncate">{utilizador ? utilizador.email : ""}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-error/10 text-error text-[13px] font-semibold hover:bg-error/20 transition-all">
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Terminar Sessão
              </button>
            </div>
          </div>
        </div>
      )}

      {notifModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setNotifModal(null); }} />
          <div className="relative bg-surface-card rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={"p-2 rounded-lg " + (notifModal.tipo === "success" ? "bg-success-container" : notifModal.tipo === "error" ? "bg-error-container" : notifModal.tipo === "warning" ? "bg-warning-container" : "bg-primary/10")}>
                  <span className={"material-symbols-outlined text-[20px] " + (notifModal.tipo === "success" ? "text-success" : notifModal.tipo === "error" ? "text-error" : notifModal.tipo === "warning" ? "text-warning" : "text-primary")}>
                    {iconMap[notifModal.tipo] || "notifications"}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-on-surface">Notificação</h3>
              </div>
              <button onClick={function () { setNotifModal(null); }} className="text-outline hover:text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-outline uppercase tracking-wide">Título</p>
                <p className="text-[14px] font-semibold text-on-surface mt-0.5">{notifModal.titulo}</p>
              </div>
              <div>
                <p className="text-[11px] text-outline uppercase tracking-wide">Mensagem</p>
                <p className="text-[13px] text-on-surface-variant mt-0.5 leading-relaxed">{notifModal.mensagem}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30">
                <span className="text-[11px] text-outline">{notifModal.createdAt ? new Date(notifModal.createdAt).toLocaleString("pt-PT") : ""}</span>
                {notifModal.link && (
                  <button
                    onClick={function () {
                      setNotifModal(null);
                      router.push(notifModal.link);
                    }}
                    className="text-[12px] font-medium text-primary hover:underline"
                  >
                    Ver detalhe
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
