"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/helpers";

var TIPO_LABELS = { ferias: "Férias", adiantamento: "Adiantamento", justificacao: "Justificação", aumento: "Aumento", dispensa: "Dispensa", licenca: "Licença", outro: "Outro" };
var TIPOS_SOLICITACAO = [
  { value: "ferias", label: "Férias" },
  { value: "dispensa", label: "Dispensa" },
  { value: "licenca", label: "Licença" },
  { value: "adiantamento", label: "Adiantamento" },
  { value: "aumento", label: "Aumento Salarial" },
  { value: "justificacao", label: "Justificação" },
  { value: "outro", label: "Outro" },
];
var MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
var TIPOS_PRESENCA = [
  { value: "", label: "Todos" },
  { value: "presente", label: "Presente" },
  { value: "ausencia", label: "Ausência" },
  { value: "atraso", label: "Atraso" },
  { value: "falta", label: "Faltas" },
  { value: "licenca", label: "Licença" },
  { value: "ferias", label: "Férias" },
  { value: "fim_semana", label: "Fim de semana" },
];
var COMUNICADO_BADGES = { Geral: "badge-primary", Urgente: "badge-danger", Informativo: "badge-secondary", Evento: "badge-warning" };
function diasEntre(inicio, fim) {
  if (!inicio || !fim) return 0;
  var d1 = new Date(inicio);
  var d2 = new Date(fim);
  var diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

function FeriasWaveChart({ data }) {
  var total = (data.disponiveis || 0) + (data.gozados || 0) + (data.planeados || 0) || 1;
  var segments = [
    { label: "Disponíveis", value: data.disponiveis || 0, color: "#16a34a" },
    { label: "Gozados", value: data.gozados || 0, color: "#002b92" },
    { label: "Planeados", value: data.planeados || 0, color: "#c084fc" },
  ];
  var pct = segments.map(function (s) { return (s.value / total) * 100; });

  var w = 400;
  var h = 80;
  var pts = [];
  for (var i = 0; i <= w; i++) {
    var x = i;
    var base = h - 8;
    var amp = 6;
    var y = base - amp * Math.sin((i / w) * Math.PI * 2.5) * Math.min(total, 22) / 22;
    pts.push(x + "," + y);
  }
  var waveLine = pts.join(" ");
  var waveFill = waveLine + " " + w + "," + h + " 0," + h;

  return (
    <div className="bg-surface-card border border-outline-variant rounded-xl p-5">
      <h2 className="text-[14px] font-semibold text-on-surface mb-3">Mapa de Férias</h2>
      <div className="relative mb-3">
        <svg viewBox={"0 0 " + w + " " + h} className="w-full h-16">
          <polygon points={waveFill} fill="url(#portalWave)" opacity="0.12" />
          <polyline points={waveLine} fill="none" stroke="#002b92" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5" />
          <defs>
            <linearGradient id="portalWave" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#002b92" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#002b92" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex gap-4">
        {segments.map(function (s, i) {
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-on-surface-variant">{s.label}</span>
              <span className="text-[11px] font-semibold text-on-surface">{s.value}</span>
              <span className="text-[10px] text-outline">({Math.round(pct[i])}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function estadoClasses(estado) {
  if (estado === "aprovado") return "bg-green-50 text-green-700 border border-green-200";
  if (estado === "pendente") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (estado === "rejeitado") return "bg-red-50 text-red-700 border border-red-200";
  return "bg-surface-container text-on-surface-variant border border-outline-variant";
}

function presencaLabel(estado) {
  if (estado === "Presente") return "Presente";
  if (estado === "Ausente") return "Ausente";
  if (estado === "Atrasado") return "Atraso";
  if (estado === "Licenca") return "Licença";
  if (estado === "Ferias") return "Férias";
  if (estado === "Fim_semana") return "Fim de semana";
  return estado;
}

function presencaClasses(estado) {
  if (estado === "Presente") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (estado === "Ausente") return "bg-red-50 text-red-700 border border-red-200";
  if (estado === "Atrasado") return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-surface-container text-on-surface-variant border border-outline-variant";
}

export default function PortalPage() {
  var auth = useAuth();
  var utilizador = auth ? auth.utilizador : null;

  var [portalData, setPortalData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [comunicados, setComunicados] = useState([]);
  var [showSolicitacaoModal, setShowSolicitacaoModal] = useState(false);
  var [showPasswordModal, setShowPasswordModal] = useState(false);
  var [justificacaoForm, setJustificacaoForm] = useState({ falta: null, tipo: "Atestado_Medico", ficheiro: null });
  var [solicitacaoForm, setSolicitacaoForm] = useState({ tipo: "dispensa", titulo: "", descricao: "", data_inicio: "", data_fim: "", numero_dias: "", ficheiro: null });
  var [passwordForm, setPasswordForm] = useState({ atual: "", nova: "", confirmar: "" });
  var [passwordMsg, setPasswordMsg] = useState("");
  var [submitting, setSubmitting] = useState(false);
  var [uploadDrag, setUploadDrag] = useState(false);
  var fileInputRef = useRef(null);

  var [search, setSearch] = useState("");
  var [filterTipo, setFilterTipo] = useState("");
  var [filterMes, setFilterMes] = useState("");
  var [filterAno, setFilterAno] = useState("");
  var [filterDia, setFilterDia] = useState("");
  var [regPagina, setRegPagina] = useState(1);
  var [registos, setRegistos] = useState([]);
  var [regPaginacao, setRegPaginacao] = useState({ total: 0, pagina: 1, limite: 30, total_paginas: 0 });
  var [regLoading, setRegLoading] = useState(false);
  var registosTimer = useRef(null);
  var registosRef = useRef({ busca: "", tipo: "", mes: "", ano: "", dia: "" });

  var carregarRegistros = function (pagina) {
    setRegLoading(true);
    var f = registosRef.current;
    var params = new URLSearchParams();
    if (f.busca) params.set("busca", f.busca);
    if (f.tipo) params.set("tipo", f.tipo);
    if (f.mes) params.set("mes", f.mes);
    if (f.ano) params.set("ano", f.ano);
    if (f.dia) params.set("dia", f.dia);
    params.set("pagina", pagina || 1);
    var qs = params.toString();
    api.get("/api/portal/registos-presenca" + (qs ? "?" + qs : "")).then(function (res) {
      if (res) {
        setRegistos(res.dados || []);
        setRegPaginacao(res.paginacao || { total: 0, pagina: 1, limite: 30, total_paginas: 0 });
        setRegPagina(pagina || 1);
      }
    }).catch(function () { setRegistos([]); setRegPaginacao({ total: 0, pagina: 1, limite: 30, total_paginas: 0 }); })
      .finally(function () { setRegLoading(false); });
  };

  var handleFilterChange = function (campo, valor) {
    if (campo === "tipo") setFilterTipo(valor);
    if (campo === "mes") setFilterMes(valor);
    if (campo === "ano") setFilterAno(valor);
    if (campo === "dia") setFilterDia(valor);
    setRegPagina(1);
    setTimeout(function () {
      var novo = {};
      if (campo === "tipo") novo.tipo = valor;
      if (campo === "mes") novo.mes = valor;
      if (campo === "ano") novo.ano = valor;
      if (campo === "dia") novo.dia = valor;
      registosRef.current = Object.assign({}, registosRef.current, novo, { busca: search });
      carregarRegistros(1);
    }, 0);
  };

  var limparFiltros = function () {
    setSearch(""); setFilterTipo(""); setFilterMes(""); setFilterAno(""); setFilterDia("");
    setRegPagina(1);
    registosRef.current = { busca: "", tipo: "", mes: "", ano: "", dia: "" };
    setTimeout(function () { carregarRegistros(1); }, 0);
  };

  var handleSearchChange = function (e) {
    var v = e.target.value;
    setSearch(v);
    if (registosTimer.current) clearTimeout(registosTimer.current);
    registosTimer.current = setTimeout(function () {
      registosRef.current = Object.assign({}, registosRef.current, { busca: v });
      carregarRegistros(1);
      setRegPagina(1);
    }, 350);
  };

  var handleFilterSubmit = function (e) {
    e.preventDefault();
    registosRef.current = { busca: search, tipo: filterTipo, mes: filterMes, ano: filterAno, dia: filterDia };
    carregarRegistros(1);
  };

  var anos = [];
  var anoActual = new Date().getFullYear();
  for (var i = 2020; i <= anoActual + 1; i++) anos.push(i);
  var temFiltros = search || filterTipo || filterMes || filterAno || filterDia;

  var now = new Date();
  var hora = now.getHours();
  var saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  var nome = "";
  if (utilizador && utilizador.nome_completo) {
    nome = " " + utilizador.nome_completo.split(" ")[0] + ".";
  }
  var dataHoje = now.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(function () {
    var fetchData = function () {
      api.get("/api/portal/stats").then(function (res) {
        if (res && res.dados) setPortalData(res.dados);
      }).catch(function () {}).finally(function () { setLoading(false); });
      api.get("/api/comunicados?page=1&limit=5").then(function (res) {
        if (res && res.dados) setComunicados(res.dados);
      }).catch(function () {});
    };
    fetchData();
    var interval = setInterval(fetchData, 30000);
    return function () { clearInterval(interval); };
  }, []);

  useEffect(function () {
    carregarRegistros(1);
  }, []);

  var handleFileDrop = function (e) {
    e.preventDefault();
    setUploadDrag(false);
    var files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (files && files.length > 0) setSolicitacaoForm(Object.assign({}, solicitacaoForm, { ficheiro: files[0] }));
  };

  var handleFileSelect = function (e) {
    if (e.target.files && e.target.files.length > 0) setSolicitacaoForm(Object.assign({}, solicitacaoForm, { ficheiro: e.target.files[0] }));
  };

  var handleSubmitSolicitacao = function (e) {
    e.preventDefault();
    if (!solicitacaoForm.tipo || !solicitacaoForm.titulo) return;
    setSubmitting(true);
    var formData = new FormData();
    formData.append("tipo", solicitacaoForm.tipo);
    formData.append("titulo", solicitacaoForm.titulo);
    formData.append("descricao", solicitacaoForm.descricao);
    var dados = {
      data_inicio: solicitacaoForm.data_inicio,
      data_fim: solicitacaoForm.data_fim,
      numero_dias: solicitacaoForm.numero_dias,
    };
    formData.append("dados", JSON.stringify(dados));
    if (solicitacaoForm.ficheiro) formData.append("ficheiro", solicitacaoForm.ficheiro);
    api.upload("/api/pedidos", formData).then(function () {
      setShowSolicitacaoModal(false);
      setSolicitacaoForm({ tipo: "dispensa", titulo: "", descricao: "", data_inicio: "", data_fim: "", numero_dias: "", ficheiro: null });
      return api.get("/api/portal/stats");
    }).then(function (res) { if (res && res.dados) setPortalData(res.dados); })
      .catch(function () {}).finally(function () { setSubmitting(false); });
  };

  var handleSubmitJustificacao = function (e) {
    e.preventDefault();
    if (!justificacaoForm.falta) return;
    setSubmitting(true);
    var formData = new FormData();
    formData.append("tipo", "justificacao");
    formData.append("titulo", "Justificação de Falta");
    formData.append("descricao", "Tipo: " + justificacaoForm.tipo + " - Data: " + justificacaoForm.falta.data);
    formData.append("dados", JSON.stringify({ data: justificacaoForm.falta.data, tipo: justificacaoForm.tipo, registos_presenca_id: justificacaoForm.falta.id }));
    if (justificacaoForm.ficheiro) formData.append("ficheiro", justificacaoForm.ficheiro);
    api.upload("/api/pedidos", formData).then(function () {
      setJustificacaoForm({ falta: null, tipo: "Atestado_Medico", ficheiro: null });
      return api.get("/api/portal/stats");
    }).then(function (res) { if (res && res.dados) setPortalData(res.dados); carregarRegistros(regPagina); })
      .catch(function () {}).finally(function () { setSubmitting(false); });
  };

  var handleSubmitPassword = function (e) {
    e.preventDefault();
    setPasswordMsg("");
    if (passwordForm.nova !== passwordForm.confirmar) { setPasswordMsg("As senhas não coincidem"); return; }
    if (passwordForm.nova.length < 6) { setPasswordMsg("Mínimo 6 caracteres"); return; }
    setSubmitting(true);
    api.put("/auth/change-password", { password_atual: passwordForm.atual, password_nova: passwordForm.nova })
      .then(function () { setPasswordMsg("Senha alterada com sucesso!"); setPasswordForm({ atual: "", nova: "", confirmar: "" }); setTimeout(function () { setShowPasswordModal(false); setPasswordMsg(""); }, 2000); })
      .catch(function (err) { setPasswordMsg(err.message || "Erro"); })
      .finally(function () { setSubmitting(false); });
  };

  var ferias = portalData ? portalData.ferias : { disponiveis: 0, gozados: 0, planeados: 0 };
  var avaliacoes = portalData ? portalData.avaliacoes : { pontuacao: 0, ciclos: [] };
  var pedidosRecentes = portalData ? (portalData.pedidos_recentes || []) : [];
  var descontoEstimado = portalData ? (portalData.desconto_estimado || { valor: 0, faltas_mes: 0, atrasos_mes: 0, horas_descontar: 0 }) : { valor: 0, faltas_mes: 0, atrasos_mes: 0, horas_descontar: 0 };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pt-2">
        <p className="text-[11px] text-outline uppercase tracking-widest mb-1">{dataHoje}</p>
        <h1 className="text-[22px] font-semibold text-on-surface">{saudacao}{nome}</h1>
      </div>

      {comunicados.length > 0 && (
        <section className="bg-surface-card border border-outline-variant rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-on-surface">Comunicados</h2>
            <Link href="/dashboard/comunicados" className="text-[12px] font-medium text-primary hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-3">
            {comunicados.map(function (c) {
              var badge = COMUNICADO_BADGES[c.tipo] || "badge-secondary";
              return (
                <article key={c.id} className="border border-outline-variant rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={"text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded " + badge}>{c.tipo || "Geral"}</span>
                    <span className="text-[11px] text-outline">{formatDate(c.data_inicio)}</span>
                  </div>
                  <h3 className="text-[13px] font-semibold text-on-surface leading-snug break-words">{c.titulo}</h3>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed mt-1 whitespace-pre-line break-words line-clamp-3">{c.conteudo}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-on-surface">Férias</h2>
          <button onClick={function () { setSolicitacaoForm(Object.assign({}, solicitacaoForm, { tipo: "ferias", titulo: "Pedido de Férias" })); setShowSolicitacaoModal(true); }} className="text-[12px] font-medium text-primary hover:underline">+ Solicitar</button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-px bg-outline-variant rounded-lg overflow-hidden mb-4">
          <div className="bg-surface-card p-4 text-center">
            <p className="text-[20px] font-bold text-on-surface">{ferias.disponiveis}</p>
            <p className="text-[11px] text-outline mt-0.5">Disponíveis</p>
          </div>
          <div className="bg-surface-card p-4 text-center">
            <p className="text-[20px] font-bold text-on-surface">{ferias.gozados}</p>
            <p className="text-[11px] text-outline mt-0.5">Gozados</p>
          </div>
          <div className="bg-surface-card p-4 text-center">
            <p className="text-[20px] font-bold text-on-surface">{ferias.planeados}</p>
            <p className="text-[11px] text-outline mt-0.5">Planeados</p>
          </div>
        </div>
      </section>

      <FeriasWaveChart data={ferias} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-surface-card border border-outline-variant rounded-xl p-5">
          <h2 className="text-[14px] font-semibold text-on-surface mb-3">Solicitações</h2>
          <p className="text-[12px] text-outline mb-4">Peça férias, dispensas, licenças ou qualquer outra coisa com um documento de comprovativo.</p>
          <button onClick={function () { setSolicitacaoForm(Object.assign({}, solicitacaoForm, { tipo: "dispensa" })); setShowSolicitacaoModal(true); }} className="w-full py-2.5 text-[13px] font-medium text-on-surface border border-outline-variant rounded-lg hover:bg-surface-container transition-colors">
            Criar solicitação
          </button>
        </section>

        <section className="bg-surface-card border border-outline-variant rounded-xl p-5">
          <h2 className="text-[14px] font-semibold text-on-surface mb-3">Desconto por Faltas</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-surface-container rounded-lg p-3 text-center">
              <p className="text-[16px] font-bold text-red-600">{descontoEstimado.faltas_mes || 0}</p>
              <p className="text-[10px] text-outline mt-0.5">Faltas</p>
            </div>
            <div className="bg-surface-container rounded-lg p-3 text-center">
              <p className="text-[16px] font-bold text-amber-600">{descontoEstimado.atrasos_mes || 0}</p>
              <p className="text-[10px] text-outline mt-0.5">Atrasos</p>
            </div>
            <div className="bg-surface-container rounded-lg p-3 text-center">
              <p className="text-[16px] font-bold text-primary">{descontoEstimado.horas_descontar || 0}h</p>
              <p className="text-[10px] text-outline mt-0.5">a descontar</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-[11px] text-red-700">Desconto estimado por faltas não justificadas</p>
            <p className={"text-[20px] font-bold " + ((descontoEstimado.valor || 0) > 0 ? "text-red-700" : "text-emerald-600")}>
              {(descontoEstimado.valor || 0).toLocaleString("pt-PT", { style: "currency", currency: "AOA" })}
            </p>
          </div>
        </section>

        <section className="bg-surface-card border border-outline-variant rounded-xl p-5">
          <h2 className="text-[14px] font-semibold text-on-surface mb-3">Avaliações</h2>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[28px] font-bold text-on-surface">{avaliacoes.pontuacao > 0 ? avaliacoes.pontuacao.toFixed(1) : "0.0"}</span>
            {avaliacoes.pontuacao > 0 && <span className="text-[12px] text-outline">/ 20</span>}
          </div>
          {avaliacoes.ciclos.length > 0 ? (
            <div className="space-y-2">
              {avaliacoes.ciclos.slice(0, 3).map(function (ciclo, i) {
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[11px] text-on-surface-variant mb-1">
                      <span>{ciclo.nome}</span>
                      <span className="font-medium text-on-surface-variant">{ciclo.progresso}%</span>
                    </div>
                    <div className="h-1 bg-outline-variant/50 rounded-full overflow-hidden">
                      <div className={"h-full rounded-full " + (ciclo.progresso >= 100 ? "bg-green-500" : ciclo.progresso >= 50 ? "bg-amber-500" : "bg-outline/50")} style={{ width: ciclo.progresso + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-outline">Sem avaliações registadas</p>
          )}
        </section>
      </div>

      <section className="bg-surface-card border border-outline-variant rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-on-surface">Histórico de Presença e Faltas</h2>
          <span className="text-[11px] text-outline">{regPaginacao.total} registo(s)</span>
        </div>

        <form onSubmit={handleFilterSubmit} className="space-y-2 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Pesquisar data, estado ou observação..."
              className="flex-1 px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors"
            />
            <button type="submit" className="px-3 py-2 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors">Pesquisar</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <select value={filterTipo} onChange={function (e) { handleFilterChange("tipo", e.target.value); }} className="px-2 py-2 rounded-lg border border-outline-variant text-[12px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30">
              {TIPOS_PRESENCA.map(function (t) { return <option key={t.value} value={t.value}>{t.label}</option>; })}
            </select>
            <select value={filterMes} onChange={function (e) { handleFilterChange("mes", e.target.value); }} className="px-2 py-2 rounded-lg border border-outline-variant text-[12px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30">
              <option value="">Mês</option>
              {MESES.map(function (m, i) { return <option key={i + 1} value={i + 1}>{m}</option>; })}
            </select>
            <select value={filterAno} onChange={function (e) { handleFilterChange("ano", e.target.value); }} className="px-2 py-2 rounded-lg border border-outline-variant text-[12px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30">
              <option value="">Ano</option>
              {anos.map(function (a) { return <option key={a} value={a}>{a}</option>; })}
            </select>
            <select value={filterDia} onChange={function (e) { handleFilterChange("dia", e.target.value); }} className="px-2 py-2 rounded-lg border border-outline-variant text-[12px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30">
              <option value="">Dia</option>
              {Array.from({ length: 31 }, function (_, i) { return i + 1; }).map(function (d) {
                return <option key={d} value={d}>{String(d).padStart(2, "0")}</option>;
              })}
            </select>
            {temFiltros && (
              <button type="button" onClick={limparFiltros} className="px-2 py-2 rounded-lg border border-outline-variant text-[12px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                Limpar
              </button>
            )}
          </div>
        </form>

        {regLoading && registos.length === 0 ? (
          <p className="text-[12px] text-outline py-4 text-center">A carregar...</p>
        ) : registos.length === 0 ? (
          <p className="text-[12px] text-outline py-4 text-center">Sem registos encontrados</p>
        ) : (
          <>
            <div className="hidden sm:block border border-outline-variant rounded-lg overflow-hidden mb-4">
              <table className="w-full text-left">
                <thead className="bg-surface-container border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Data</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Entrada</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Saída</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Horas</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Estado</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Acção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {registos.map(function (r, i) {
                    var faltaAtroso = r.estado === "Ausente" || r.estado === "Atrasado";
                    return (
                      <tr key={r.id || i} className="hover:bg-surface-container/50 transition-colors">
                        <td className="px-4 py-2.5 text-[12px] text-on-surface-variant">{formatDate(r.data)}</td>
                        <td className="px-4 py-2.5 text-[12px] text-on-surface">{r.hora_entrada ? r.hora_entrada.slice(0, 5) : "—"}</td>
                        <td className="px-4 py-2.5 text-[12px] text-on-surface">{r.hora_saida ? r.hora_saida.slice(0, 5) : "—"}</td>
                        <td className="px-4 py-2.5 text-[12px] text-on-surface font-medium">{r.horas_trabalhadas ? Number(r.horas_trabalhadas).toFixed(1) : "—"}h</td>
                        <td className="px-4 py-2.5">
                          <span className={"text-[11px] font-semibold px-2 py-0.5 rounded " + presencaClasses(r.estado)}>{presencaLabel(r.estado)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {faltaAtroso && !r.justificado && (
                            <button onClick={function () { setJustificacaoForm({ falta: r, tipo: "Atestado_Medico", ficheiro: null }); }} className="text-[11px] font-medium text-primary hover:underline px-2 py-1 rounded hover:bg-primary/5">
                              Justificar
                            </button>
                          )}
                          {r.justificado && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Justificado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden space-y-2 mb-4">
              {registos.map(function (r, i) {
                var faltaAtroso = r.estado === "Ausente" || r.estado === "Atrasado";
                return (
                  <div key={r.id || i} className="border border-outline-variant rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-medium text-on-surface">{formatDate(r.data)}</span>
                      <span className={"text-[11px] font-semibold px-2 py-0.5 rounded " + presencaClasses(r.estado)}>{presencaLabel(r.estado)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-2">
                      <div>
                        <p className="text-[10px] text-outline uppercase">Entrada</p>
                        <p className="text-[13px] font-semibold text-on-surface">{r.hora_entrada ? r.hora_entrada.slice(0, 5) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-outline uppercase">Saída</p>
                        <p className="text-[13px] font-semibold text-on-surface">{r.hora_saida ? r.hora_saida.slice(0, 5) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-outline uppercase">Horas</p>
                        <p className="text-[13px] font-semibold text-on-surface">{r.horas_trabalhadas ? Number(r.horas_trabalhadas).toFixed(1) : "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {faltaAtroso && !r.justificado && (
                        <button onClick={function () { setJustificacaoForm({ falta: r, tipo: "Atestado_Medico", ficheiro: null }); }} className="text-[12px] font-medium text-primary hover:underline px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
                          Justificar
                        </button>
                      )}
                      {r.justificado && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Justificado</span>
                      )}
                      {(!faltaAtroso || r.justificado) && <span />}
                    </div>
                  </div>
                );
              })}
            </div>
            {regPaginacao.total_paginas > 1 && (
              <div className="flex items-center justify-between border-t border-outline-variant pt-3 mt-2">
                <button
                  disabled={regPagina <= 1}
                  onClick={function () { var novaPagina = regPagina - 1; setRegPagina(novaPagina); carregarRegistros(novaPagina); }}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30"
                >
                  Anterior
                </button>
                <span className="text-[12px] text-on-surface-variant">
                  Página <span className="font-semibold text-on-surface">{regPagina}</span> de <span className="font-semibold text-on-surface">{regPaginacao.total_paginas}</span>
                </span>
                <button
                  disabled={regPagina >= regPaginacao.total_paginas}
                  onClick={function () { var novaPagina = regPagina + 1; setRegPagina(novaPagina); carregarRegistros(novaPagina); }}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {justificacaoForm.falta && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setJustificacaoForm({ falta: null, tipo: "Atestado_Medico", ficheiro: null }); }} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-on-surface">Justificar {justificacaoForm.falta.estado === "Ausente" ? "Falta" : "Atraso"}</h3>
              <button onClick={function () { setJustificacaoForm({ falta: null, tipo: "Atestado_Medico", ficheiro: null }); }} className="text-[13px] text-outline hover:text-on-surface-variant">Fechar</button>
            </div>
            <div className="bg-surface-container rounded-lg p-3 text-[13px] text-on-surface-variant mb-3">
              <p><span className="font-semibold">Data:</span> {formatDate(justificacaoForm.falta.data)}</p>
              {justificacaoForm.falta.hora_entrada && <p><span className="font-semibold">Entrada:</span> {justificacaoForm.falta.hora_entrada}</p>}
              {justificacaoForm.falta.observacoes && <p><span className="font-semibold">Observações:</span> {justificacaoForm.falta.observacoes}</p>}
            </div>
            <form onSubmit={handleSubmitJustificacao} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Tipo de Justificação</label>
                <select value={justificacaoForm.tipo} onChange={function (e) { setJustificacaoForm(Object.assign({}, justificacaoForm, { tipo: e.target.value })); }} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors">
                  <option value="Atestado_Medico">Atestado Médico</option>
                  <option value="Assuntos_Pessoais">Assuntos Pessoais</option>
                  <option value="Formacao_Externa">Formação Externa</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Comprovativo</label>
                <div
                  className={"border border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors text-[12px] " + (uploadDrag ? "border-primary bg-primary/5 text-primary" : "border-outline-variant text-outline hover:border-outline")}
                  onDragOver={function (e) { e.preventDefault(); setUploadDrag(true); }}
                  onDragLeave={function () { setUploadDrag(false); }}
                  onDrop={handleFileDrop}
                  onClick={function () { if (fileInputRef.current) fileInputRef.current.click(); }}
                >
                  {justificacaoForm.ficheiro ? justificacaoForm.ficheiro.name : "Anexar comprovativo (PDF, imagem)"}
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={function () { setJustificacaoForm({ falta: null, tipo: "Atestado_Medico", ficheiro: null }); }} className="flex-1 py-2 rounded-lg border border-outline-variant text-[13px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40">
                  {submitting ? "A enviar..." : "Submeter Justificação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="bg-surface-card border border-outline-variant rounded-xl p-5">
        <h2 className="text-[14px] font-semibold text-on-surface mb-3">Pedidos Recentes</h2>
        {loading ? (
          <p className="text-[12px] text-outline">A carregar...</p>
        ) : pedidosRecentes.length === 0 ? (
          <p className="text-[12px] text-outline">Sem pedidos</p>
        ) : (
          <div className="space-y-2 sm:space-y-0">
            <div className="hidden sm:block border border-outline-variant rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-surface-container border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Tipo</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Título</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Estado</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {pedidosRecentes.map(function (p, i) {
                    return (
                      <tr key={i} className="hover:bg-surface-container/50 transition-colors">
                        <td className="px-4 py-2.5 text-[12px] text-on-surface-variant">{TIPO_LABELS[p.tipo] || p.tipo}</td>
                        <td className="px-4 py-2.5 text-[13px] text-on-surface font-medium">{p.titulo || "—"}</td>
                        <td className="px-4 py-2.5"><span className={"text-[11px] font-semibold px-2 py-0.5 rounded " + estadoClasses(p.estado)}>{p.estado}</span></td>
                        <td className="px-4 py-2.5 text-[12px] text-outline">{formatDate(p.createdAt || p.data_criacao)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden space-y-2">
              {pedidosRecentes.map(function (p, i) {
                return (
                  <div key={i} className="border border-outline-variant rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-on-surface">{p.titulo || "—"}</span>
                      <span className={"text-[11px] font-semibold px-2 py-0.5 rounded " + estadoClasses(p.estado)}>{p.estado}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-on-surface-variant">{TIPO_LABELS[p.tipo] || p.tipo}</span>
                      <span className="text-[11px] text-outline">{formatDate(p.createdAt || p.data_criacao)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-outline-variant pt-6">
        <button onClick={function () { setShowPasswordModal(true); setPasswordMsg(""); }} className="text-[13px] text-on-surface-variant hover:text-on-surface transition-colors">
          Alterar senha
        </button>
      </section>

      {showSolicitacaoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setShowSolicitacaoModal(false); }} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-on-surface">Nova Solicitação</h3>
              <button onClick={function () { setShowSolicitacaoModal(false); }} className="text-[13px] text-outline hover:text-on-surface-variant">Fechar</button>
            </div>
            {solicitacaoForm.tipo === "ferias" && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <p className="text-[12px] text-on-surface-variant">Dias disponíveis: <span className="font-bold text-primary">{ferias.disponiveis}</span></p>
              </div>
            )}
            <form onSubmit={handleSubmitSolicitacao} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Tipo</label>
                <select value={solicitacaoForm.tipo} onChange={function (e) { setSolicitacaoForm(Object.assign({}, solicitacaoForm, { tipo: e.target.value })); }} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors">
                  {TIPOS_SOLICITACAO.map(function (t) { return <option key={t.value} value={t.value}>{t.label}</option>; })}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Título</label>
                <input type="text" value={solicitacaoForm.titulo} onChange={function (e) { setSolicitacaoForm(Object.assign({}, solicitacaoForm, { titulo: e.target.value })); }} placeholder="Ex.: Dispensa por motivos pessoais" required className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Conteúdo</label>
                <textarea value={solicitacaoForm.descricao} onChange={function (e) { setSolicitacaoForm(Object.assign({}, solicitacaoForm, { descricao: e.target.value })); }} rows={2} placeholder="Descreva o motivo da solicitação" className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Início</label>
                  <input type="date" value={solicitacaoForm.data_inicio} onChange={function (e) { setSolicitacaoForm(Object.assign({}, solicitacaoForm, { data_inicio: e.target.value })); }} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Fim</label>
                  <input type="date" value={solicitacaoForm.data_fim} onChange={function (e) { setSolicitacaoForm(Object.assign({}, solicitacaoForm, { data_fim: e.target.value })); }} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Nº de dias</label>
                  <input type="number" min="1" value={solicitacaoForm.numero_dias} onChange={function (e) { setSolicitacaoForm(Object.assign({}, solicitacaoForm, { numero_dias: e.target.value })); }} placeholder="Opcional" className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
                </div>
                <div className="hidden sm:block" />
              </div>
              {solicitacaoForm.data_inicio && solicitacaoForm.data_fim && (
                <p className="text-[12px] text-on-surface-variant">Total: <span className="font-bold text-primary">{diasEntre(solicitacaoForm.data_inicio, solicitacaoForm.data_fim)} dia(s)</span></p>
              )}
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Comprovativo (opcional)</label>
                <div
                  className={"border border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors text-[12px] " + (uploadDrag ? "border-primary bg-primary/5 text-primary" : "border-outline-variant text-outline hover:border-outline")}
                  onDragOver={function (e) { e.preventDefault(); setUploadDrag(true); }}
                  onDragLeave={function () { setUploadDrag(false); }}
                  onDrop={handleFileDrop}
                  onClick={function () { if (fileInputRef.current) fileInputRef.current.click(); }}
                >
                  {solicitacaoForm.ficheiro ? solicitacaoForm.ficheiro.name : "Anexar documento (PDF, imagem)"}
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={function () { setShowSolicitacaoModal(false); }} className="flex-1 py-2 rounded-lg border border-outline-variant text-[13px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">{submitting ? "A enviar..." : "Enviar Solicitação"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setShowPasswordModal(false); }} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-on-surface">Alterar Senha</h3>
              <button onClick={function () { setShowPasswordModal(false); }} className="text-[13px] text-outline hover:text-on-surface-variant">Fechar</button>
            </div>
            {passwordMsg && <div className={"text-[12px] font-medium p-2 rounded-lg mb-3 " + (passwordMsg.includes("sucesso") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>{passwordMsg}</div>}
            <form onSubmit={handleSubmitPassword} className="space-y-3">
              <input type="password" value={passwordForm.atual} onChange={function (e) { setPasswordForm(Object.assign({}, passwordForm, { atual: e.target.value })); }} placeholder="Senha atual" required className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              <input type="password" value={passwordForm.nova} onChange={function (e) { setPasswordForm(Object.assign({}, passwordForm, { nova: e.target.value })); }} placeholder="Nova senha" required minLength={6} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              <input type="password" value={passwordForm.confirmar} onChange={function (e) { setPasswordForm(Object.assign({}, passwordForm, { confirmar: e.target.value })); }} placeholder="Confirmar" required minLength={6} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={function () { setShowPasswordModal(false); }} className="flex-1 py-2 rounded-lg border border-outline-variant text-[13px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">{submitting ? "..." : "Alterar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
