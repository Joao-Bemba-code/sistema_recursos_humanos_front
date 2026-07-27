"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getT } from "@/lib/translations";

var ALL_MODULES = [
  { label: "Colaboradores", href: "/dashboard/colaboradores", icon: "badge" },
  { label: "Contratos", href: "/dashboard/contratos", icon: "description" },
  { label: "Departamentos", href: "/dashboard/departamentos", icon: "corporate_fare" },
  { label: "Assiduidade", href: "/dashboard/assiduidade", icon: "timer" },
  { label: "Faltas e Atrasos", href: "/dashboard/faltas", icon: "event_busy" },
  { label: "Férias", href: "/dashboard/ferias", icon: "beach_access" },
  { label: "Pedidos", href: "/dashboard/pedidos", icon: "assignment" },
  { label: "Avaliação", href: "/dashboard/avaliacao", icon: "query_stats" },
  { label: "Formação", href: "/dashboard/formacao", icon: "school" },
  { label: "Folha Salarial", href: "/dashboard/folha-salarial", icon: "payments" },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: "analytics" },
  { label: "Configurações", href: "/dashboard/configuracoes", icon: "settings" },
];

var statsConfig = [
  { label: "Total de Colaboradores", icon: "groups_3", borderColor: "stat-card-primary", trendLabel: "ATIVO" },
  { label: "Contratos Ativos", icon: "rule", borderColor: "stat-card-success", trendLabel: "ESTÁVEL" },
  { label: "Departamentos", icon: "corporate_fare", borderColor: "stat-card-secondary", trendLabel: "ATIVO" },
  { label: "Férias Pendentes", icon: "beach_access", borderColor: "stat-card-warning", trendLabel: "PENDENTE" },
];

function useAnimatedCounter(target, duration, enabled) {
  var [value, setValue] = useState(0);
  useEffect(function () {
    if (!enabled || target === 0) { setValue(target); return; }
    var start = performance.now();
    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target, duration, enabled]);
  return value;
}

function StatCard({ label, value, icon, borderColor, trendLabel, index, loading }) {
  var displayValue = useAnimatedCounter(value, 1500, !loading);
  return (
    <div className={"card p-5 animate-dash animate-dash-delay-" + (index + 1)}>
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton w-10 h-10" />
          <div className="skeleton w-24 h-3" />
          <div className="skeleton w-16 h-6" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className={"p-2.5 rounded-xl " + (borderColor === "stat-card-primary" ? "bg-primary/10" : borderColor === "stat-card-success" ? "bg-success/10" : borderColor === "stat-card-secondary" ? "bg-secondary/10" : "bg-warning/10")}>
              <span className={"material-symbols-outlined text-[22px] " + (borderColor === "stat-card-primary" ? "text-primary" : borderColor === "stat-card-success" ? "text-success" : borderColor === "stat-card-secondary" ? "text-secondary" : "text-warning")}>{icon}</span>
            </div>
            <span className="badge badge-primary text-[10px]">{trendLabel}</span>
          </div>
          <p className="text-[11px] font-bold text-outline uppercase tracking-wider mb-0.5">{label}</p>
          <p className="text-[26px] font-bold text-on-surface tracking-tight">{displayValue.toLocaleString("pt-PT")}</p>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  var auth = useAuth();
  var utilizador = auth ? auth.utilizador : null;
  var [stats, setStats] = useState(null);
  var [loading, setLoading] = useState(true);
  var T = getT();

  useEffect(function () {
    var load = async function () {
      try {
        var [resCol, resCon, resDep, resFer] = await Promise.all([
          api.get("/api/colaboradores?limit=1"),
          api.get("/api/contratos?limit=1"),
          api.get("/api/departamentos?limit=1"),
          api.get("/api/ferias?limit=1"),
        ]);
        setStats({
          total: resCol.paginacao ? resCol.paginacao.total : 0,
          contratos: resCon.paginacao ? resCon.paginacao.total : 0,
          departamentos: resDep.paginacao ? resDep.paginacao.total : 0,
          ferias: resFer.paginacao ? resFer.paginacao.total : 0,
        });
      } catch (e) { /* silent */ }
      setLoading(false);
    };
    load();
  }, []);

  var now = new Date();
  var hora = now.getHours();
  var saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  var nome = "";
  if (utilizador && utilizador.nome_completo) {
    nome = " " + utilizador.nome_completo.split(" ")[0] + ".";
  }
  var dataHoje = now.toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  var statValues = [
    stats ? stats.total : 0,
    stats ? stats.contratos : 0,
    stats ? stats.departamentos : 0,
    stats ? stats.ferias : 0,
  ];

  return (
    <div className="space-y-8">
      <section className="animate-dash">
        <div className="relative overflow-hidden rounded-3xl wave-bg p-8 sm:p-12 md:p-16 min-h-[220px] flex flex-col justify-center">
          <div className="relative z-10 max-w-2xl">
            <p className="text-white/50 font-bold text-[11px] tracking-[0.3em] uppercase mb-3">{dataHoje}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-[1.1] tracking-tight">{saudacao}{nome}</h2>
            <p className="text-white/70 text-base sm:text-lg leading-relaxed">
              {stats ? stats.total : 0} colaboradores registados no sistema.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/dashboard/colaboradores" className="btn btn-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Admitir Colaborador
        </Link>
        <Link href="/dashboard/relatorios" className="btn btn-secondary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">description</span>
          Relatórios
        </Link>
        <Link href="/dashboard/ferias" className="btn btn-secondary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          Planeamento de Férias
        </Link>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statsConfig.map(function (item, i) {
          return (
            <StatCard
              key={i}
              label={item.label}
              value={statValues[i]}
              icon={item.icon}
              borderColor={item.borderColor}
              trendLabel={item.trendLabel}
              index={i}
              loading={loading}
            />
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-bold text-on-surface mb-1">Distribuição por Departamento</h3>
          <p className="text-[13px] text-on-surface-variant/70 mb-6">Composição atual da equipa</p>
          <div className="space-y-4">
            {["Direção", "RH", "Financeiro", "TI", "Operações"].map(function (dept, i) {
              var pct = [30, 25, 15, 20, 10][i];
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-semibold text-on-surface">{dept}</span>
                    <span className="text-[12px] font-bold text-primary">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: pct + "%", animationDelay: i * 0.1 + "s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-base font-bold text-on-surface mb-1">Tipos de Contrato</h3>
          <p className="text-[13px] text-on-surface-variant/70 mb-6">Distribuição por vínculo</p>
          <div className="space-y-4">
            {[{ label: "Efetivo", pct: 45, color: "bg-primary" }, { label: "Termo Certo", pct: 30, color: "bg-secondary" }, { label: "Estágio", pct: 15, color: "bg-success" }, { label: "Prestação Serviço", pct: 10, color: "bg-warning" }].map(function (item) {
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={"w-3 h-3 rounded-full " + item.color.replace("bg-", "bg-")} />
                  <span className="flex-1 text-[13px] font-medium text-on-surface">{item.label}</span>
                  <span className="text-[12px] font-bold text-on-surface-variant">{item.pct}%</span>
                  <div className="w-24 sm:w-32 h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div className={"h-full rounded-full " + item.color} style={{ width: item.pct + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-on-surface">Módulos</h3>
          <span className="badge badge-primary">{ALL_MODULES.length} Módulos</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {ALL_MODULES.map(function (m) {
            return (
              <Link key={m.label} href={m.href} className="card p-4 flex flex-col items-center text-center group hover:-translate-y-1">
                <div className="module-icon-wrap w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-2.5">
                  <span className="material-symbols-outlined text-[22px] sm:text-[24px] text-primary">{m.icon}</span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-on-surface leading-tight">{m.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
