"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getT } from "@/lib/translations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

var ALL_MODULES = [
  { label: "Portal", href: "/dashboard/portal", icon: "person", modulo: "portal" },
  { label: "Colaboradores", href: "/dashboard/colaboradores", icon: "badge", modulo: "colaboradores" },
  { label: "Contratos", href: "/dashboard/contratos", icon: "description", modulo: "contratos" },
  { label: "Departamentos", href: "/dashboard/departamentos", icon: "corporate_fare", modulo: "departamentos" },
  { label: "Assiduidade", href: "/dashboard/assiduidade", icon: "timer", modulo: "assiduidade" },
  { label: "Faltas e Atrasos", href: "/dashboard/faltas", icon: "event_busy", modulo: "faltas" },
  { label: "Advertências", href: "/dashboard/advertencias", icon: "warning", modulo: "advertencias" },
  { label: "Comunicados", href: "/dashboard/comunicados", icon: "campaign", modulo: "comunicados" },
  { label: "Férias", href: "/dashboard/ferias", icon: "beach_access", modulo: "ferias" },
  { label: "Pedidos", href: "/dashboard/pedidos", icon: "assignment", modulo: "pedidos" },
  { label: "Avaliação", href: "/dashboard/avaliacao", icon: "query_stats", modulo: "avaliacao" },
  { label: "Formação", href: "/dashboard/formacao", icon: "school", modulo: "formacao" },
  { label: "Folha Salarial", href: "/dashboard/folha-salarial", icon: "payments", modulo: "folha_salarial" },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: "analytics", modulo: "relatorios" },
  { label: "Configurações", href: "/dashboard/configuracoes", icon: "settings", modulo: "configuracoes" },
  { label: "Utilizadores", href: "/dashboard/utilizadores", icon: "manage_accounts", modulo: "utilizadores" },
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

var CONTRATO_COLORS = { "Efetivo": "bg-primary", "Termo Certo": "bg-secondary", "Estágio": "bg-success", "Prestação Serviço": "bg-warning", "Temporário": "bg-error" };

var TIPO_LABEL = { "Determinado": "Termo Certo", "Indeterminado": "Efetivo", "Prestacao_Servicos": "Prestação Serviço", "Estagio": "Estágio", "Temporario": "Temporário" };

export default function DashboardPage() {
  var auth = useAuth();
  var utilizador = auth ? auth.utilizador : null;
  var [stats, setStats] = useState(null);
  var [cartoes, setCartoes] = useState([]);
  var [deptData, setDeptData] = useState([]);
  var [contratoData, setContratoData] = useState([]);
  var [loading, setLoading] = useState(true);
  var T = getT();

  var tem = function (mod, op) {
    return auth.hasPermission(mod, op);
  };

  function cardConfigsPara() {
    var cfgs = [];
    var agora = new Date();
    var mes = agora.getMonth() + 1;
    var ano = agora.getFullYear();
    if (tem("colaboradores", "read")) {
      cfgs.push({ key: "total", label: "Total de Colaboradores", icon: "groups_3", borderColor: "stat-card-primary", trendLabel: "ATIVO", fetch: function () { return api.get("/api/colaboradores?limit=1").then(function (r) { return r.paginacao ? r.paginacao.total : 0; }); } });
    }
    if (tem("contratos", "read")) {
      cfgs.push({ key: "contratos", label: "Contratos Ativos", icon: "rule", borderColor: "stat-card-success", trendLabel: "ATIVOS", fetch: function () { return api.get("/api/contratos?limit=1&estado=Activo").then(function (r) { return r.paginacao ? r.paginacao.total : 0; }); } });
    }
    if (tem("departamentos", "read")) {
      cfgs.push({ key: "departamentos", label: "Departamentos", icon: "corporate_fare", borderColor: "stat-card-secondary", trendLabel: "ATIVOS", fetch: function () { return api.get("/api/departamentos?limit=1").then(function (r) { return r.paginacao ? r.paginacao.total : 0; }); } });
    }
    if (tem("ferias", "read")) {
      cfgs.push({ key: "ferias", label: "Férias Pendentes", icon: "beach_access", borderColor: "stat-card-warning", trendLabel: "PENDENTES", fetch: function () { return api.get("/api/ferias?limit=1").then(function (r) { return r.paginacao ? r.paginacao.total : 0; }); } });
    }
    if (tem("folha_salarial", "read")) {
      cfgs.push({ key: "folhaMes", label: "Pagamentos (mês atual)", icon: "payments", borderColor: "stat-card-secondary", trendLabel: "MÊS", fetch: function () { return api.get("/api/folha-salarial/pagamentos?limit=1&mes=" + mes + "&ano=" + ano).then(function (r) { return r.paginacao ? r.paginacao.total : 0; }); } });
    }
    if (tem("portal", "read")) {
      cfgs.push({ key: "pedidos", label: "Os Meus Pedidos Pendentes", icon: "assignment", borderColor: "stat-card-primary", trendLabel: "MEUS", fetch: function () { return api.get("/api/portal/stats").then(function (r) { return (r.dados && r.dados.pedidos_stats) ? r.dados.pedidos_stats.pendentes : 0; }); } });
      cfgs.push({ key: "feriasDisp", label: "Férias Disponíveis", icon: "beach_access", borderColor: "stat-card-warning", trendLabel: "DIAS", fetch: function () { return api.get("/api/portal/stats").then(function (r) { return (r.dados && r.dados.ferias) ? (r.dados.ferias.disponiveis || 0) : 0; }); } });
      cfgs.push({ key: "desconto", label: "Desconto Estimado por Faltas", icon: "event_busy", borderColor: "stat-card-success", trendLabel: "KZ", fetch: function () { return api.get("/api/portal/stats").then(function (r) { return (r.dados && r.dados.desconto_estimado) ? r.dados.desconto_estimado.valor : 0; }); } });
    }
    return cfgs;
  }

  useEffect(function () {
    var cfgs = cardConfigsPara();
    var ativos = cfgs.slice(0, 4);
    setCartoes(ativos);
    if (ativos.length === 0) { setLoading(false); return; }
    var ops = ativos.map(function (cfg) {
      return cfg.fetch().then(function (v) { return { key: cfg.key, v: v }; }).catch(function () { return { key: cfg.key, v: null }; });
    });
    Promise.all(ops).then(function (res) {
      var obj = {};
      res.forEach(function (r) { obj[r.key] = r.v; });
      setStats(obj);
      setLoading(false);
    });
  }, []);

  useEffect(function () {
    if (!tem("departamentos", "read")) return;
    var loadDepts = async function () {
      try {
        var res = await api.get("/api/departamentos?limit=100");
        var rows = res.dados || [];
        var counts = {};
        rows.forEach(function (d) { counts[d.nome] = (counts[d.nome] || 0) + 1; });
        var total = rows.length || 1;
        setDeptData(Object.entries(counts).map(function (entry) {
          return { nome: entry[0], pct: Math.round((entry[1] / total) * 100), count: entry[1] };
        }));
      } catch (e) { /* silêncio */ }
    };
    loadDepts();
  }, []);

  useEffect(function () {
    if (!tem("contratos", "read")) return;
    var loadContratos = async function () {
      try {
        var res = await api.get("/api/contratos?limit=100");
        var rows = res.dados || [];
        var counts = {};
        rows.forEach(function (c) { counts[c.tipo] = (counts[c.tipo] || 0) + 1; });
        var total = rows.length || 1;
        setContratoData(Object.entries(counts).map(function (entry) {
          return { label: TIPO_LABEL[entry[0]] || entry[0], pct: Math.round((entry[1] / total) * 100), count: entry[1], tipo: entry[0] };
        }));
      } catch (e) { /* silêncio */ }
    };
    loadContratos();
  }, []);

  var now = new Date();
  var hora = now.getHours();
  var saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  var nome = "";
  if (utilizador && utilizador.nome_completo) {
    nome = " " + utilizador.nome_completo.split(" ")[0] + ".";
  }
  var dataHoje = now.toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  var modulosVisiveis = ALL_MODULES.filter(function (m) {
    return auth.hasPermission(m.modulo, "read");
  });

  var textoSistema = tem("colaboradores", "read")
    ? (stats ? (stats.total != null ? stats.total : 0) : 0) + " colaboradores registados no sistema."
    : "Bem-vindo(a) ao teu painel pessoal. Tens " + modulosVisiveis.length + " módulos à tua disposição.";

  return (
    <div className="space-y-8">
      <section className="animate-dash">
        <div className="relative overflow-hidden rounded-3xl wave-bg p-8 sm:p-12 md:p-16 min-h-[220px] flex flex-col justify-center">
          <div className="relative z-10 max-w-2xl">
            <p className="text-white/50 font-bold text-[11px] tracking-[0.3em] uppercase mb-3">{dataHoje}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-[1.1] tracking-tight">{saudacao}{nome}</h2>
            <p className="text-white/70 text-base sm:text-lg leading-relaxed">{textoSistema}</p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        {tem("portal", "read") && (
          <Link href="/dashboard/portal">
            <Button variant="outline">
              <span className="material-symbols-outlined text-[18px]">assignment</span>
              Os Meus Pedidos
            </Button>
          </Link>
        )}
        {tem("colaboradores", "create") && (
          <Link href="/dashboard/colaboradores">
            <Button variant="default">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Admitir Colaborador
            </Button>
          </Link>
        )}
        {tem("relatorios", "read") && (
          <Link href="/dashboard/relatorios">
            <Button variant="outline">
              <span className="material-symbols-outlined text-[18px]">description</span>
              Relatórios
            </Button>
          </Link>
        )}
        {tem("ferias", "read") && (
          <Link href="/dashboard/ferias">
            <Button variant="outline">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              Planeamento de Férias
            </Button>
          </Link>
        )}
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cartoes.map(function (item, i) {
          return (
            <StatCard
              key={item.key}
              label={item.label}
              value={stats ? (stats[item.key] != null ? stats[item.key] : 0) : 0}
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
          {loading ? (
            <div className="space-y-3">
              <div className="skeleton w-full h-6" />
              <div className="skeleton w-full h-6" />
              <div className="skeleton w-3/4 h-6" />
            </div>
          ) : deptData.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-on-surface-variant/40 text-sm">Sem dados de departamentos</div>
          ) : (
            <div className="space-y-4">
              {deptData.map(function (dept, i) {
                return (
                  <div key={dept.nome}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-on-surface">{dept.nome}</span>
                      <span className="text-[12px] font-bold text-primary">{dept.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: dept.pct + "%", animationDelay: i * 0.1 + "s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card p-6">
          <h3 className="text-base font-bold text-on-surface mb-1">Tipos de Contrato</h3>
          <p className="text-[13px] text-on-surface-variant/70 mb-6">Distribuição por vínculo</p>
          {loading ? (
            <div className="space-y-3">
              <div className="skeleton w-full h-6" />
              <div className="skeleton w-full h-6" />
              <div className="skeleton w-3/4 h-6" />
            </div>
          ) : contratoData.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-on-surface-variant/40 text-sm">Sem dados de contratos</div>
          ) : (
            <div className="space-y-4">
              {contratoData.map(function (item) {
                var colorClass = CONTRATO_COLORS[item.label] || "bg-primary";
                return (
                  <div key={item.tipo} className="flex items-center gap-3">
                    <div className={"w-3 h-3 rounded-full " + colorClass} />
                    <span className="flex-1 text-[13px] font-medium text-on-surface">{item.label}</span>
                    <span className="text-[12px] font-bold text-on-surface-variant">{item.pct}%</span>
                    <div className="w-24 sm:w-32 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={"h-full rounded-full " + colorClass} style={{ width: item.pct + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-on-surface">Módulos</h3>
          <span className="badge badge-primary">{modulosVisiveis.length} Módulos</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {modulosVisiveis.map(function (m) {
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