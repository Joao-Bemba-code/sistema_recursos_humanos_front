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
  { label: "Estrutura Org.", href: "/dashboard/departamentos", icon: "account_tree" },
  { label: "Recrutamento", href: "/dashboard/colaboradores", icon: "person_search" },
  { label: "Onboarding", href: "/dashboard/colaboradores", icon: "handshake" },
  { label: "Assiduidade", href: "/dashboard/assiduidade", icon: "timer" },
  { label: "Faltas e Atrasos", href: "/dashboard/faltas", icon: "event_busy" },
  { label: "Férias", href: "/dashboard/ferias", icon: "beach_access" },
  { label: "Pedidos", href: "/dashboard/pedidos", icon: "assignment" },
  { label: "Avaliação", href: "/dashboard/avaliacao", icon: "query_stats" },
  { label: "Formação", href: "/dashboard/formacao", icon: "school" },
  { label: "Formadores", href: "/dashboard/formacao", icon: "co_present" },
  { label: "G. Disciplinar", href: "/dashboard/avaliacao", icon: "gavel" },
  { label: "Saúde e Seg.", href: "/dashboard/assiduidade", icon: "health_and_safety" },
  { label: "Folha Salarial", href: "/dashboard/folha-salarial", icon: "payments" },
  { label: "Benefícios", href: "/dashboard/folha-salarial", icon: "featured_seasonal_and_gifts" },
  { label: "Comun. Int.", href: "/dashboard", icon: "campaign" },
  { label: "G. Documental", href: "/dashboard/colaboradores", icon: "folder_shared" },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: "analytics" },
];

var BORDER_MAP = {
  "stat-card-primary": { bg: "bg-primary/10", text: "text-primary" },
  "stat-card-secondary": { bg: "bg-secondary/10", text: "text-secondary" },
  "stat-card-error": { bg: "bg-error/10", text: "text-error" },
  "stat-card-success": { bg: "bg-success/10", text: "text-success" },
  "stat-card-warning": { bg: "bg-warning/10", text: "text-warning" },
};

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

function StatCard({ label, value, icon, trend, trendLabel, borderColor, trendColor, delay, loading }) {
  var displayValue = useAnimatedCounter(value, 1500, !loading);
  var styles = BORDER_MAP[borderColor] || BORDER_MAP["stat-card-primary"];
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-2 bg-slate-100 rounded w-20" />
          <div className="h-6 bg-slate-100 rounded w-12" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={"p-1.5 rounded-lg " + styles.bg}>
          <span className={"material-symbols-outlined text-[18px] " + styles.text}>{icon}</span>
        </div>
        <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + trendColor}>{trendLabel}</span>
      </div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-[20px] font-bold text-slate-800 mt-0.5">{displayValue.toLocaleString("pt-PT")}</p>
    </div>
  );
}

function smoothPath(pts) {
  if (pts.length < 2) return "";
  var d = "M" + pts[0].x + "," + pts[0].y;
  for (var i = 0; i < pts.length - 1; i++) {
    var p0 = pts[Math.max(i - 1, 0)];
    var p1 = pts[i];
    var p2 = pts[i + 1];
    var p3 = pts[Math.min(i + 2, pts.length - 1)];
    var cp1x = p1.x + (p2.x - p0.x) / 6;
    var cp1y = p1.y + (p2.y - p0.y) / 6;
    var cp2x = p2.x - (p3.x - p1.x) / 6;
    var cp2y = p2.y - (p3.y - p1.y) / 6;
    d += " C" + cp1x + "," + cp1y + " " + cp2x + "," + cp2y + " " + p2.x + "," + p2.y;
  }
  return d;
}

function WaveChart({ title, subtitle, color, data, months, badgeText, badgeColor, delay }) {
  var maxVal = Math.max.apply(null, data.map(function (d) { return d.y; }).concat([1]));
  var points = data.map(function (d, i) {
    var x = (i / (data.length - 1)) * 100;
    var y = 100 - (d.y / maxVal) * 60 - 15;
    return { x: x, y: y };
  });
  var pathD = smoothPath(points);
  var fillD = pathD + " L100,100 L0,100 Z";
  var gradId = "grad_" + color.replace("#", "");

  return (
    <div className="glass-panel p-10 rounded-[2.5rem] animate-dash" style={{ animationDelay: delay + "s" }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h4 className="text-xl font-bold text-on-surface">{title}</h4>
          <p className="text-xs text-on-surface-variant/60">{subtitle}</p>
        </div>
        <button className="p-2 hover:bg-white/50 rounded-xl transition-all">
          <span className="material-symbols-outlined text-outline">more_horiz</span>
        </button>
      </div>
      <div className="h-[280px] relative">
        <svg className="w-full h-full chart-wave" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id={gradId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.02 }} />
            </linearGradient>
          </defs>
          <path className="chart-fill" d={fillD} fill={"url(#" + gradId + ")"} />
          <path className="chart-line" d={pathD} fill="none" stroke={color} strokeWidth="0.4" strokeLinecap="round" />
          {points.map(function (p, i) {
            return <circle className="chart-dot" key={i} cx={p.x} cy={p.y} fill={color} r="0" style={{ animationDelay: (0.6 + i * 0.12) + "s" }} />;
          })}
        </svg>
        {badgeText && (
          <div className={"absolute top-2 right-4 flex items-center gap-2 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg " + badgeColor}>
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> {badgeText}
          </div>
        )}
      </div>
      <div className="flex justify-between mt-4 px-2 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
        {months.map(function (m) { return <span key={m}>{m}</span>; })}
      </div>
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
    api.get("/api/colaboradores/stats")
      .then(function (data) { if (data && data.dados) setStats(data.dados); })
      .catch(function () {})
      .finally(function () { setLoading(false); });
  }, []);

  var now = new Date();
  var hora = now.getHours();
  var saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  var nome = "";
  if (utilizador && utilizador.nome_completo) {
    nome = " " + utilizador.nome_completo.split(" ")[0] + ".";
  }
  var dataHoje = now.toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).toUpperCase();

  var statsCards = [
    { label: "Total de Capital Humano", value: stats ? stats.total : 0, icon: "groups_3", trend: "arrow_upward", trendLabel: "2.4%", borderColor: "stat-card-primary", trendColor: "bg-green-100 text-green-700" },
    { label: "Contratos Ativos", value: stats ? stats.activos : 0, icon: "rule", trend: "verified", trendLabel: "ESTÁVEL", borderColor: "stat-card-secondary", trendColor: "bg-blue-100 text-blue-700" },
    { label: "Formadores Internos", value: stats ? stats.formadores_internos : 0, icon: "school", trend: "arrow_upward", trendLabel: "ATIVO", borderColor: "stat-card-success", trendColor: "bg-green-100 text-green-700" },
    { label: "Formadores Externos", value: stats ? stats.formadores_externos : 0, icon: "co_present", trend: "person_add", trendLabel: "CONTRATADO", borderColor: "stat-card-warning", trendColor: "bg-purple-100 text-purple-700" },
  ];

  var turnoverData = [
    { y: 35 }, { y: 42 }, { y: 38 }, { y: 55 },
    { y: 48 }, { y: 62 }, { y: 58 }, { y: 70 },
    { y: 65 }, { y: 78 }, { y: 72 }, { y: 85 },
  ];

  var headcountData = [
    { y: 45 }, { y: 52 }, { y: 48 }, { y: 60 },
    { y: 55 }, { y: 68 }, { y: 63 }, { y: 75 },
    { y: 70 }, { y: 82 }, { y: 78 }, { y: 90 },
  ];

  return (
    <div className="space-y-10">
      <section className="animate-dash" style={{ animationDelay: "0.1s" }}>
        <div className="relative overflow-hidden rounded-[2.5rem] wave-bg p-10 md:p-14 min-h-[280px] flex flex-col justify-center shadow-2xl shadow-primary/20">
          <div className="relative z-10 max-w-2xl">
            <p className="text-white/60 font-bold text-[11px] tracking-[0.3em] uppercase mb-4">{dataHoje}</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-[1.1] tracking-tight">{saudacao}{nome}</h2>
            <p className="text-white/80 text-lg leading-relaxed font-light">
              A sua visão geral estratégica para hoje:{" "}
              <span className="font-bold text-white underline decoration-white/30 underline-offset-4">
                {stats ? stats.total : 0} colaboradores
              </span>{" "}
              registados no sistema.
            </p>
          </div>
          <div className="absolute right-[-10%] top-[-20%] opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[400px]">waves</span>
          </div>
        </div>
      </section>

      <section className="animate-dash" style={{ animationDelay: "0.2s" }}>
        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard/colaboradores" className="flex items-center gap-3 bg-primary-container text-on-primary px-8 py-4 rounded-2xl hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95 group">
            <span className="material-symbols-outlined transition-transform group-hover:rotate-90">add_circle</span>
            <span className="font-bold text-sm tracking-wide">ADMITIR COLABORADOR</span>
          </Link>
          <Link href="/dashboard/relatorios" className="flex items-center gap-3 glass-panel text-primary-container px-8 py-4 rounded-2xl glass-panel-hover group">
            <span className="material-symbols-outlined group-hover:animate-bounce">description</span>
            <span className="font-bold text-sm tracking-wide">RELATÓRIOS ANALÍTICOS</span>
          </Link>
          <Link href="/dashboard/ferias" className="flex items-center gap-3 glass-panel text-on-surface-variant px-8 py-4 rounded-2xl glass-panel-hover">
            <span className="material-symbols-outlined">calendar_today</span>
            <span className="font-bold text-sm tracking-wide">PLANEAMENTO DE FÉRIAS</span>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-dash" style={{ animationDelay: "0.3s" }}>
        {statsCards.map(function (item, i) {
          return <StatCard key={i} label={item.label} value={item.value} icon={item.icon} trend={item.trend} trendLabel={item.trendLabel} borderColor={item.borderColor} trendColor={item.trendColor} delay={0.3 + i * 0.08} loading={loading} />;
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-dash" style={{ animationDelay: "0.4s" }}>
        <WaveChart
          title="Distribuição por Tipo"
          subtitle="Composição da equipa atual"
          color="#002b92"
          data={turnoverData}
          months={["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]}
          badgeText={stats ? "TOTAL: " + (stats.total || 0) : "A carregar..."}
          badgeColor="bg-primary-container"
          delay={0.4}
        />
        <WaveChart
          title="Evolução do Pessoal"
          subtitle="Contratações vs Saídas"
          color="#4648d4"
          data={headcountData}
          months={["T1", "T2", "T3", "T4"]}
          badgeText="META DE EXPANSÃO"
          badgeColor="bg-secondary"
          delay={0.48}
        />
      </section>

      <section className="animate-dash" style={{ animationDelay: "0.5s" }}>
        <div className="flex items-center justify-between mb-8 px-2">
          <h4 className="text-2xl font-bold text-on-surface tracking-tight">Explorar Módulos Corporativos</h4>
          <span className="text-xs font-bold text-primary-container bg-primary/10 px-4 py-1.5 rounded-full">20 Módulos Ativos</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {ALL_MODULES.map(function (m) {
            return (
              <Link key={m.label} href={m.href} className="glass-panel glass-panel-hover p-6 rounded-3xl flex flex-col items-center text-center group">
                <div className="module-icon-wrap w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[28px] text-primary-container">{m.icon}</span>
                </div>
                <span className="text-xs font-bold text-on-surface tracking-tight">{m.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
