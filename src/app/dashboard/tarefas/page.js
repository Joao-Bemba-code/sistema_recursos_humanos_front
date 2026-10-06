"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatDateTime } from "@/lib/helpers";

var ESTADOS = ["Pendente", "Em_curso", "Concluida", "Validada", "Cancelada"];
var PRIORIDADES = ["Baixa", "Media", "Alta", "Urgente"];

var LABEL_ESTADO = {
  Pendente: "Pendente",
  Em_curso: "Em Curso",
  Concluida: "Concluída",
  Validada: "Validada",
  Cancelada: "Cancelada",
};

var COR_ESTADO = {
  Pendente: "bg-amber-50 text-amber-700 border-amber-200",
  Em_curso: "bg-sky-50 text-sky-700 border-sky-200",
  Concluida: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Validada: "bg-green-50 text-green-700 border-green-200",
  Cancelada: "bg-slate-100 text-slate-500 border-slate-200",
};

var COR_PRIORIDADE = {
  Baixa: "bg-slate-100 text-slate-600",
  Media: "bg-sky-100 text-sky-700",
  Alta: "bg-amber-100 text-amber-700",
  Urgente: "bg-red-100 text-red-700",
};

var NOMES_GESTOR = [
  "administrador geral",
  "director geral",
  "director de recursos humanos",
  "técnico de rh",
  "tecnico de rh",
];

var FILTROS_VAZIOS = { search: "", estado: "", prioridade: "", colaborador_id: "", atrasadas: false };

var FORM_VAZIO = { colaborador_id: "", titulo: "", descricao: "", prazo: "", prazo_hora: "", prioridade: "Media" };

// Prazo ja passado? Com hora marcada compara-se a hora; sem hora vale o fim do dia.
function estaAtrasada(t) {
  if (!t || !t.prazo) return false;
  if (t.estado !== "Pendente" && t.estado !== "Em_curso") return false;
  var partes = String(t.prazo).slice(0, 10).split("-");
  if (partes.length !== 3) return false;
  var hora = t.prazo_hora ? String(t.prazo_hora).slice(0, 5).split(":") : ["23", "59"];
  var limite = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2]),
    Number(hora[0]) || 0,
    Number(hora[1]) || 0
  );
  return Date.now() > limite.getTime();
}

function horaPrazo(t) {
  return t && t.prazo_hora ? String(t.prazo_hora).slice(0, 5) : "";
}

function rotuloDia(chave) {
  if (!chave) return "Sem prazo";
  var partes = chave.split("-");
  var dia = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  var diff = Math.round((dia.getTime() - hoje.getTime()) / 86400000);
  var detalhe = dia.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" });
  if (diff === 0) return "Hoje · " + detalhe;
  if (diff === 1) return "Amanhã · " + detalhe;
  if (diff === -1) return "Ontem · " + detalhe;
  return detalhe.charAt(0).toUpperCase() + detalhe.slice(1);
}

// Agrupa a pagina actual por dia de prazo (sem prazo fica no fim),
// ordenando dentro de cada dia pela hora (quem nao tem hora fica no fim).
function agruparPorDia(lista) {
  var ordem = [];
  var mapa = {};
  lista.forEach(function (t) {
    var chave = t.prazo ? String(t.prazo).slice(0, 10) : "";
    if (!mapa[chave]) {
      mapa[chave] = [];
      ordem.push(chave);
    }
    mapa[chave].push(t);
  });
  ordem.sort(function (a, b) {
    if (!a) return 1;
    if (!b) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return ordem.map(function (chave) {
    var itens = mapa[chave].slice().sort(function (x, y) {
      var hx = horaPrazo(x) || "99:99";
      var hy = horaPrazo(y) || "99:99";
      return hx < hy ? -1 : hx > hy ? 1 : 0;
    });
    return { chave: chave, itens: itens };
  });
}

function Badge({ className, children }) {
  return <span className={"text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border " + className}>{children}</span>;
}

function BarraProgresso({ valor }) {
  var v = valor || 0;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-outline-variant/60 rounded-full overflow-hidden">
        <div
          className={"h-full rounded-full transition-all " + (v >= 100 ? "bg-emerald-500" : v >= 50 ? "bg-primary" : "bg-amber-500")}
          style={{ width: v + "%" }}
        />
      </div>
      <span className="text-[11px] font-semibold text-on-surface-variant w-9 text-right">{v}%</span>
    </div>
  );
}

export default function TarefasPage() {
  var auth = useAuth();
  var utilizador = auth ? auth.utilizador : null;

  var perfis = [];
  if (utilizador) {
    perfis = Array.isArray(utilizador.perfis) && utilizador.perfis.length > 0
      ? utilizador.perfis
      : (utilizador.perfil ? [utilizador.perfil] : []);
  }
  var ehGestor = !!(auth && auth.hasPermission("tarefas", "create")) ||
    perfis.some(function (p) {
      return p && ((p.nivel || 0) >= 2 || NOMES_GESTOR.indexOf(String(p.nome).toLowerCase()) !== -1);
    });

  var [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  var [tarefas, setTarefas] = useState([]);
  var [stats, setStats] = useState(null);
  var [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, limite: 20, total_paginas: 1 });
  var [pagina, setPagina] = useState(1);
  var [loading, setLoading] = useState(true);
  var [colaboradores, setColaboradores] = useState([]);
  var [msg, setMsg] = useState(null);
  var [modal, setModal] = useState(null);
  var [detalhe, setDetalhe] = useState(null);
  var [detalheLoading, setDetalheLoading] = useState(false);
  var [progressoInput, setProgressoInput] = useState(0);
  var [saving, setSaving] = useState(false);
  var [confirmar, setConfirmar] = useState(null);
  var [visualizacao, setVisualizacao] = useState("tabela");

  var mostrarMsg = function (texto, tipo) {
    setMsg({ texto: texto, tipo: tipo || "sucesso" });
    setTimeout(function () { setMsg(null); }, 4000);
  };

  var carregarStats = async function () {
    try {
      var data = await api.get("/api/tarefas/estatisticas");
      if (data && data.dados) setStats(data.dados);
    } catch (e) { /* manter estatisticas anteriores */ }
  };

  var carregar = async function (pag, silencioso) {
    if (!silencioso) setLoading(true);
    try {
      var url = "/api/tarefas?page=" + (pag || 1) + "&limit=20";
      if (filtros.search) url += "&search=" + encodeURIComponent(filtros.search);
      if (filtros.estado) url += "&estado=" + filtros.estado;
      if (filtros.prioridade) url += "&prioridade=" + filtros.prioridade;
      if (filtros.colaborador_id) url += "&colaborador_id=" + filtros.colaborador_id;
      if (filtros.atrasadas) url += "&atrasadas=true";
      var data = await api.get(url);
      setTarefas((data && data.dados) || []);
      setPaginacao((data && data.paginacao) || { total: 0, pagina: 1, limite: 20, total_paginas: 1 });
      setPagina(pag || 1);
    } catch (e) {
      if (!silencioso) mostrarMsg(e.message, "erro");
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  var carregarColaboradores = async function () {
    try {
      var data = await api.get("/api/colaboradores?page=1&limit=9999");
      setColaboradores((data && data.dados) || []);
    } catch (e) { /* lista vazia */ }
  };

  useEffect(function () {
    carregarColaboradores();
  }, []);

  // Recarrega a lista e as estatisticas quando qualquer filtro muda
  useEffect(function () {
    var timer = setTimeout(function () {
      carregar(1);
      carregarStats();
    }, filtros.search ? 400 : 0);
    return function () { clearTimeout(timer); };
  }, [filtros]);

  // Tempo real: actualiza a lista e as estatisticas de 10 em 10 segundos,
  // excepto quando ha um modal aberto ou o separador esta oculto.
  useEffect(function () {
    var intervalo = setInterval(function () {
      if (modal || detalhe) return;
      if (typeof document !== "undefined" && document.hidden) return;
      carregar(pagina, true);
      carregarStats();
    }, 10000);
    return function () { clearInterval(intervalo); };
  }, [filtros, pagina, modal, detalhe]);

  var alterarFiltro = function (campo, valor) {
    setFiltros(function (actual) { return Object.assign({}, actual, { [campo]: valor }); });
  };

  var limparFiltros = function () {
    setFiltros(FILTROS_VAZIOS);
  };

  var abrirDetalhe = async function (tarefa) {
    setDetalhe(tarefa);
    setProgressoInput(tarefa.progresso || 0);
    setDetalheLoading(true);
    try {
      var data = await api.get("/api/tarefas/" + tarefa.id);
      if (data && data.dados) {
        setDetalhe(data.dados);
        setProgressoInput(data.dados.progresso || 0);
      }
    } catch (e) {
      mostrarMsg(e.message, "erro");
    } finally {
      setDetalheLoading(false);
    }
  };

  var actualizarDetalhe = async function (id) {
    try {
      var data = await api.get("/api/tarefas/" + id);
      if (data && data.dados) setDetalhe(data.dados);
    } catch (e) { /* manter */ }
  };

  var acao = async function (metodo, endpoint, body, aposAcao) {
    setSaving(true);
    try {
      var data = await api[metodo](endpoint, body);
      if (data && data.mensagem) mostrarMsg(data.mensagem, "sucesso");
      if (aposAcao) await aposAcao(data);
      await carregar(pagina, true);
      await carregarStats();
    } catch (e) {
      mostrarMsg(e.message, "erro");
    } finally {
      setSaving(false);
    }
  };

  var guardarProgresso = function () {
    if (!detalhe) return;
    acao("put", "/api/tarefas/" + detalhe.id + "/progresso", { progresso: progressoInput }, async function () {
      await actualizarDetalhe(detalhe.id);
    });
  };

  var iniciarTarefa = function () {
    if (!detalhe) return;
    acao("put", "/api/tarefas/" + detalhe.id + "/iniciar", {}, async function () {
      await actualizarDetalhe(detalhe.id);
    });
  };

  var cancelarTarefa = function () {
    if (!detalhe) return;
    setConfirmar({
      titulo: "Cancelar Tarefa",
      mensagem: "Tem a certeza que deseja cancelar esta tarefa?",
      executar: function () {
        acao("put", "/api/tarefas/" + detalhe.id + "/cancelar", {}, async function () {
          await actualizarDetalhe(detalhe.id);
        });
      },
    });
  };

  var validarTarefa = function (accao) {
    if (!detalhe) return;
    acao("put", "/api/tarefas/" + detalhe.id + "/validar", { acao: accao }, async function () {
      await actualizarDetalhe(detalhe.id);
    });
  };

  var eliminarTarefa = function (t) {
    setConfirmar({
      titulo: "Eliminar Tarefa",
      mensagem: "Tem a certeza que deseja eliminar a tarefa '" + t.titulo + "'? Esta acção nao pode ser desfeita.",
      executar: function () {
        setDetalhe(null);
        acao("delete", "/api/tarefas/" + t.id, undefined, function () { return Promise.resolve(); });
      },
    });
  };

  var guardarForm = async function (e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal && modal.id) {
        await api.put("/api/tarefas/" + modal.id, modal);
        mostrarMsg("Tarefa actualizada com sucesso", "sucesso");
      } else {
        await api.post("/api/tarefas", modal);
        mostrarMsg("Tarefa atribuida com sucesso", "sucesso");
      }
      setModal(null);
      await carregar(1);
      await carregarStats();
      if (detalhe) await actualizarDetalhe(detalhe.id);
    } catch (e) {
      mostrarMsg(e.message, "erro");
    } finally {
      setSaving(false);
    }
  };

  var editarTarefa = function (t) {
    setModal({
      id: t.id,
      colaborador_id: t.colaborador_id ? String(t.colaborador_id) : "",
      titulo: t.titulo || "",
      descricao: t.descricao || "",
      prazo: t.prazo ? String(t.prazo).slice(0, 10) : "",
      prazo_hora: horaPrazo(t),
      prioridade: t.prioridade || "Media",
    });
  };

  var statsExibicao = [
    { titulo: "Total", valor: stats ? stats.total : "…", cor: "text-on-surface" },
    { titulo: "Pendentes", valor: stats ? (stats.por_estado.Pendente || 0) : "…", cor: "text-amber-600" },
    { titulo: "Em Curso", valor: stats ? (stats.por_estado.Em_curso || 0) : "…", cor: "text-sky-600" },
    { titulo: "Concluídas", valor: stats ? ((stats.por_estado.Concluida || 0) + (stats.por_estado.Validada || 0)) : "…", cor: "text-emerald-600" },
    { titulo: "Atrasadas", valor: stats ? stats.atrasadas : "…", cor: "text-red-600" },
    { titulo: "Nota Média", valor: stats && stats.nota_media !== null && stats.nota_media !== undefined ? stats.nota_media.toFixed(1) : "—", cor: "text-primary" },
  ];

  var temFiltros = filtros.search || filtros.estado || filtros.prioridade || filtros.colaborador_id || filtros.atrasadas;

  var paginacaoBloc = paginacao.total_paginas > 1 ? (
    <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/30">
      <p className="text-[12px] text-outline">Página {pagina} de {paginacao.total_paginas}</p>
      <div className="flex gap-2">
        <button onClick={function () { carregar(pagina - 1); }} disabled={pagina <= 1} className="px-3 py-1.5 text-[12px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-30">Anterior</button>
        <button onClick={function () { carregar(pagina + 1); }} disabled={pagina >= paginacao.total_paginas} className="px-3 py-1.5 text-[12px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-30">Próximo</button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-outline font-medium uppercase tracking-wide">
            <span>Desenvolvimento</span>
            <span>/</span>
            <span className="text-on-surface-variant">Gestão de Tarefas</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface">Gestão de Tarefas</h1>
          <p className="text-[13px] text-on-surface-variant">
            {ehGestor
              ? "Atribuya tarefas aos colaboradores, acompanhe o progresso em tempo real e valide os resultados."
              : "Acompanhe as suas tarefas, actualize o progresso e consulte a avaliação automática."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/portal" className="px-4 py-2.5 text-[13px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container transition-all">
            Portal
          </Link>
          {ehGestor && (
            <button onClick={function () { setModal(Object.assign({}, FORM_VAZIO)); }} className="px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg hover:bg-primary/90 transition-all">
              Nova Tarefa
            </button>
          )}
        </div>
      </section>

      {msg && (
        <div className={"text-[13px] font-medium p-3 rounded-lg " + (msg.tipo === "erro" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
          {msg.texto}
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsExibicao.map(function (s, i) {
          return (
            <div key={i} className="bg-surface-card border border-outline-variant rounded-xl p-4">
              <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">{s.titulo}</p>
              <p className={"text-[24px] font-bold mt-1 " + s.cor}>{s.valor}</p>
            </div>
          );
        })}
      </section>

      <section className="glass-panel rounded-xl border border-outline-variant/30 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Pesquisar</label>
            <input
              type="text"
              value={filtros.search}
              onChange={function (e) { alterarFiltro("search", e.target.value); }}
              placeholder="Titulo ou descricao..."
              className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Estado</label>
            <select value={filtros.estado} onChange={function (e) { alterarFiltro("estado", e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30 focus:border-primary/50">
              <option value="">Todos</option>
              {ESTADOS.map(function (e) { return <option key={e} value={e}>{LABEL_ESTADO[e]}</option>; })}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Prioridade</label>
            <select value={filtros.prioridade} onChange={function (e) { alterarFiltro("prioridade", e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30 focus:border-primary/50">
              <option value="">Todas</option>
              {PRIORIDADES.map(function (p) { return <option key={p} value={p}>{p}</option>; })}
            </select>
          </div>
          {ehGestor && (
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Colaborador</label>
              <select value={filtros.colaborador_id} onChange={function (e) { alterarFiltro("colaborador_id", e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30 focus:border-primary/50">
                <option value="">Todos</option>
                {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo}</option>; })}
              </select>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <label className="flex items-center gap-2 text-[13px] text-on-surface-variant cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!filtros.atrasadas}
              onChange={function (e) { alterarFiltro("atrasadas", e.target.checked); }}
              className="rounded border-outline-variant text-primary focus:ring-primary/30"
            />
            Somente atrasadas
          </label>
          {temFiltros && (
            <button onClick={limparFiltros} className="px-4 py-2 text-[13px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container transition-colors">
              Limpar Tudo
            </button>
          )}
        </div>
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-5 pb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-on-surface">
            {ehGestor ? "Tarefas" : "As Minhas Tarefas"}
            <span className="ml-2 text-[12px] font-normal text-outline">({paginacao.total} registo(s))</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-outline">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Actualização automática a cada 10s
            </span>
            <div className="flex rounded-lg border border-outline-variant overflow-hidden">
              <button
                onClick={function () { setVisualizacao("tabela"); }}
                className={"px-3 py-1.5 text-[12px] font-medium transition-colors " + (visualizacao === "tabela" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container")}
              >
                Tabela
              </button>
              <button
                onClick={function () { setVisualizacao("dia"); }}
                className={"px-3 py-1.5 text-[12px] font-medium transition-colors " + (visualizacao === "dia" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container")}
              >
                Por dia
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-[12px] text-outline p-5">A carregar...</p>
        ) : tarefas.length === 0 ? (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-[36px] text-outline/50">task_alt</span>
            <p className="text-[13px] text-outline mt-2">Nenhuma tarefa encontrada</p>
            {temFiltros && (
              <button onClick={limparFiltros} className="mt-3 text-[13px] font-medium text-primary hover:underline">Limpar filtros</button>
            )}
          </div>
        ) : visualizacao === "dia" ? (
          <div className="p-5 space-y-5">
            {agruparPorDia(tarefas).map(function (grupo) {
              var atrasadasGrupo = grupo.itens.filter(estaAtrasada).length;
              return (
                <div key={grupo.chave || "sem-prazo"}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={"material-symbols-outlined text-[16px] " + (grupo.chave ? "text-primary" : "text-outline/60")}>calendar_month</span>
                    <h3 className="text-[13px] font-semibold text-on-surface">{rotuloDia(grupo.chave)}</h3>
                    <span className="text-[11px] text-outline">({grupo.itens.length} tarefa(s))</span>
                    {atrasadasGrupo > 0 && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-red-50 text-red-600 border-red-200">
                        {atrasadasGrupo} atrasada(s)
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {grupo.itens.map(function (t) {
                      var atrasada = estaAtrasada(t);
                      return (
                        <div key={t.id} className={"border rounded-lg p-3 flex flex-wrap items-center gap-3 " + (atrasada ? "border-red-200 bg-red-50/40" : "border-outline-variant/50 bg-surface-card")}>
                          <span className={"text-[12px] font-semibold w-12 text-center " + (horaPrazo(t) ? "text-on-surface" : "text-outline/60")}>
                            {horaPrazo(t) || "—"}
                          </span>
                          <div className="flex-1 min-w-[180px]">
                            <p className="text-[13px] font-medium text-on-surface leading-tight">{t.titulo}</p>
                            <p className="text-[11px] text-outline">
                              {ehGestor && t.colaborador ? t.colaborador.nome_completo + " · " : ""}
                              {horaPrazo(t) ? "até às " + horaPrazo(t) : "fim do dia"}
                            </p>
                          </div>
                          <div className="hidden md:block"><BarraProgresso valor={t.progresso} /></div>
                          <Badge className={COR_PRIORIDADE[t.prioridade] || "bg-slate-100 text-slate-600"}>{t.prioridade}</Badge>
                          <Badge className={COR_ESTADO[t.estado] || "bg-slate-100 text-slate-600 border-slate-200"}>{LABEL_ESTADO[t.estado] || t.estado}</Badge>
                          <span className="text-[12px] font-bold text-on-surface w-9 text-right">
                            {t.nota !== null && t.nota !== undefined ? parseFloat(t.nota).toFixed(1) : "—"}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={function () { abrirDetalhe(t); }} className="text-[11px] font-medium text-primary hover:underline">Detalhes</button>
                            {ehGestor && (
                              <button onClick={function () { editarTarefa(t); }} className="text-[11px] font-medium text-on-surface-variant hover:underline">Editar</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {paginacaoBloc}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Tarefa</th>
                  {ehGestor && <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Colaborador</th>}
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Prazo</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Prioridade</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Progresso</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Estado</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Nota</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {tarefas.map(function (t) {
                  var atrasada = estaAtrasada(t);
                  return (
                    <tr key={t.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="px-4 py-2.5 max-w-[260px]">
                        <p className="text-[13px] font-medium text-on-surface truncate">{t.titulo}</p>
                        {t.descricao && <p className="text-[11px] text-outline truncate">{t.descricao}</p>}
                      </td>
                      {ehGestor && (
                        <td className="px-4 py-2.5 text-[12px] text-on-surface-variant">{t.colaborador ? t.colaborador.nome_completo : "—"}</td>
                      )}
                      <td className="px-4 py-2.5 text-[12px]">
                        <span className={atrasada ? "font-semibold text-red-600" : "text-on-surface-variant"}>
                          {t.prazo ? formatDate(t.prazo) : "—"}
                        </span>
                        {horaPrazo(t) && <span className="block text-[11px] text-outline">às {horaPrazo(t)}</span>}
                        {atrasada && <span className="block text-[10px] font-semibold text-red-500">Atrasada</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={COR_PRIORIDADE[t.prioridade] || "bg-slate-100 text-slate-600"}>{t.prioridade}</Badge>
                      </td>
                      <td className="px-4 py-2.5"><BarraProgresso valor={t.progresso} /></td>
                      <td className="px-4 py-2.5">
                        <Badge className={COR_ESTADO[t.estado] || "bg-slate-100 text-slate-600 border-slate-200"}>{LABEL_ESTADO[t.estado] || t.estado}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {t.nota !== null && t.nota !== undefined ? (
                          <span className="text-[13px] font-bold text-on-surface">{parseFloat(t.nota).toFixed(1)}</span>
                        ) : (
                          <span className="text-[12px] text-outline/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={function () { abrirDetalhe(t); }} className="text-[11px] font-medium text-primary hover:underline px-1.5 py-0.5 rounded hover:bg-primary/5">
                            Detalhes
                          </button>
                          {ehGestor && (
                            <button onClick={function () { editarTarefa(t); }} className="text-[11px] font-medium text-on-surface-variant hover:underline px-1.5 py-0.5 rounded hover:bg-surface-container">
                              Editar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {paginacaoBloc}
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setModal(null); }} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-on-surface">{modal.id ? "Editar Tarefa" : "Nova Tarefa"}</h3>
              <button onClick={function () { setModal(null); }} className="text-[13px] text-outline hover:text-on-surface-variant">Fechar</button>
            </div>
            <form onSubmit={guardarForm} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Colaborador *</label>
                <select
                  value={modal.colaborador_id}
                  onChange={function (e) { setModal(Object.assign({}, modal, { colaborador_id: e.target.value })); }}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                >
                  <option value="">Selecionar...</option>
                  {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo}</option>; })}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Titulo *</label>
                <input
                  type="text"
                  value={modal.titulo}
                  onChange={function (e) { setModal(Object.assign({}, modal, { titulo: e.target.value })); }}
                  required
                  maxLength={200}
                  placeholder="Ex.: Preparar relatorio mensal"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Descricao</label>
                <textarea
                  value={modal.descricao}
                  onChange={function (e) { setModal(Object.assign({}, modal, { descricao: e.target.value })); }}
                  rows={3}
                  placeholder="Detalhe o que precisa de ser feito"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Prazo</label>
                  <input
                    type="date"
                    value={modal.prazo}
                    onChange={function (e) { setModal(Object.assign({}, modal, { prazo: e.target.value })); }}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Hora do prazo</label>
                  <input
                    type="time"
                    value={modal.prazo_hora || ""}
                    onChange={function (e) { setModal(Object.assign({}, modal, { prazo_hora: e.target.value })); }}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Prioridade</label>
                <select
                  value={modal.prioridade}
                  onChange={function (e) { setModal(Object.assign({}, modal, { prioridade: e.target.value })); }}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                >
                  {PRIORIDADES.map(function (p) { return <option key={p} value={p}>{p}</option>; })}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={function () { setModal(null); }} className="flex-1 py-2 rounded-lg border border-outline-variant text-[13px] font-medium text-on-surface-variant hover:bg-surface-container">Cancelar</button>
                <button type="submit" disabled={saving || !modal.titulo || !modal.colaborador_id} className="flex-1 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-40">
                  {saving ? "A guardar..." : (modal.id ? "Guardar" : "Atribuir")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detalhe && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setDetalhe(null); }} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-xl p-5 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface leading-snug">{detalhe.titulo}</h3>
                <p className="text-[11px] text-outline mt-0.5">
                  {detalhe.colaborador ? detalhe.colaborador.nome_completo : ""}
                  {detalhe.atribuidor ? " · Atribuída por " + detalhe.atribuidor.nome_completo : ""}
                </p>
              </div>
              <button onClick={function () { setDetalhe(null); }} className="text-[13px] text-outline hover:text-on-surface-variant">Fechar</button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className={COR_ESTADO[detalhe.estado] || "bg-slate-100 text-slate-600 border-slate-200"}>{LABEL_ESTADO[detalhe.estado] || detalhe.estado}</Badge>
              <Badge className={COR_PRIORIDADE[detalhe.prioridade] || "bg-slate-100 text-slate-600"}>{detalhe.prioridade}</Badge>
              {detalhe.prazo && (
                <span className="text-[12px] text-on-surface-variant">
                  Prazo: <strong>{formatDate(detalhe.prazo)}{horaPrazo(detalhe) ? " às " + horaPrazo(detalhe) : ""}</strong>
                  {estaAtrasada(detalhe) && <span className="ml-1 font-semibold text-red-600">(atrasada)</span>}
                </span>
              )}
            </div>

            {detalhe.descricao && (
              <p className="text-[13px] text-on-surface-variant whitespace-pre-line bg-surface-container rounded-lg p-3 mb-4">{detalhe.descricao}</p>
            )}

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-on-surface-variant uppercase">Progresso</span>
                <span className="text-[13px] font-bold text-on-surface">{detalhe.progresso || 0}%</span>
              </div>
              <BarraProgresso valor={detalhe.progresso} />
            </div>

            {(detalhe.nota !== null && detalhe.nota !== undefined) && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase">Avaliação Automática</p>
                    <p className="text-[11px] text-outline mt-0.5">{detalhe.avaliacao_detalhes}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[24px] font-bold text-primary leading-none">{parseFloat(detalhe.nota).toFixed(1)}</p>
                    <p className="text-[11px] text-outline">/ 20 · {detalhe.classificacao}</p>
                  </div>
                </div>
                {detalhe.atraso_dias > 0 && (
                  <p className="text-[11px] text-red-600 mt-2 font-medium">Concluída com {detalhe.atraso_dias} dia(s) de atraso</p>
                )}
                {detalhe.atraso_dias === 0 && detalhe.atraso_minutos > 0 && (
                  <p className="text-[11px] text-red-600 mt-2 font-medium">Concluída {detalhe.atraso_minutos} min após o prazo</p>
                )}
                {detalhe.data_conclusao && (
                  <p className="text-[11px] text-outline mt-1">Concluída em {formatDateTime(detalhe.data_conclusao)}</p>
                )}
              </div>
            )}

            {(detalhe.estado === "Pendente" || detalhe.estado === "Em_curso") && (
              <div className="bg-surface-container rounded-lg p-4 mb-4">
                <label className="text-[12px] font-semibold text-on-surface-variant uppercase block mb-2">Actualizar progresso</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressoInput}
                    onChange={function (e) { setProgressoInput(parseInt(e.target.value, 10)); }}
                    className="flex-1 accent-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={progressoInput}
                    onChange={function (e) {
                      var v = parseInt(e.target.value, 10);
                      if (isNaN(v)) v = 0;
                      setProgressoInput(Math.max(0, Math.min(100, v)));
                    }}
                    className="w-20 px-2 py-1.5 rounded-lg border border-outline-variant text-[13px] text-on-surface text-center"
                  />
                  <button
                    onClick={guardarProgresso}
                    disabled={saving || progressoInput === (detalhe.progresso || 0)}
                    className="px-4 py-2 bg-primary text-white text-[13px] font-medium rounded-lg hover:bg-primary/90 disabled:opacity-40"
                  >
                    {saving ? "..." : "Guardar"}
                  </button>
                </div>
                <p className="text-[11px] text-outline mt-2">Ao chegar a 100% a tarefa e concluida e a nota e calculada automaticamente.</p>
                {detalhe.estado === "Pendente" && (
                  <button onClick={iniciarTarefa} disabled={saving} className="mt-3 w-full py-2 text-[13px] font-medium text-on-surface border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-40">
                    Iniciar tarefa
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {ehGestor && detalhe.estado === "Concluida" && (
                <button onClick={function () { validarTarefa("validar"); }} disabled={saving} className="flex-1 py-2 bg-emerald-600 text-white text-[13px] font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40">
                  Validar
                </button>
              )}
              {ehGestor && (detalhe.estado === "Validada" || detalhe.estado === "Concluida") && (
                <button onClick={function () { validarTarefa("reabrir"); }} disabled={saving} className="flex-1 py-2 text-[13px] font-medium text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 disabled:opacity-40">
                  Reabrir
                </button>
              )}
              {ehGestor && (
                <button onClick={function () { editarTarefa(detalhe); }} className="flex-1 py-2 text-[13px] font-medium text-on-surface border border-outline-variant rounded-lg hover:bg-surface-container">
                  Editar
                </button>
              )}
              {detalhe.estado !== "Validada" && detalhe.estado !== "Cancelada" && (
                <button onClick={cancelarTarefa} disabled={saving} className="flex-1 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40">
                  Cancelar
                </button>
              )}
              {ehGestor && (
                <button onClick={function () { eliminarTarefa(detalhe); }} className="py-2 px-3 text-[13px] font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                  Eliminar
                </button>
              )}
            </div>

            <div>
              <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase mb-2">Histórico</h4>
              {detalheLoading ? (
                <p className="text-[12px] text-outline">A carregar...</p>
              ) : !detalhe.eventos || detalhe.eventos.length === 0 ? (
                <p className="text-[12px] text-outline">Sem movimentos registados</p>
              ) : (
                <div className="space-y-2">
                  {detalhe.eventos.map(function (ev) {
                    return (
                      <div key={ev.id} className="flex items-start gap-3 text-[12px] border-b border-outline-variant/30 last:border-0 pb-2 last:pb-0">
                        <span className="text-[11px] text-outline whitespace-nowrap">{formatDateTime(ev.createdAt)}</span>
                        <div className="flex-1">
                          <p className="text-on-surface-variant">{ev.descricao}</p>
                          {ev.utilizador && <p className="text-[11px] text-outline">{ev.utilizador.nome_completo}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setConfirmar(null); }} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-[15px] font-semibold text-on-surface mb-2">{confirmar.titulo}</h3>
            <p className="text-[13px] text-on-surface-variant mb-5">{confirmar.mensagem}</p>
            <div className="flex gap-2">
              <button onClick={function () { setConfirmar(null); }} className="flex-1 py-2 rounded-lg border border-outline-variant text-[13px] font-medium text-on-surface-variant hover:bg-surface-container">Cancelar</button>
              <button
                onClick={async function () {
                  var fn = confirmar.executar;
                  setConfirmar(null);
                  if (fn) await fn();
                }}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[13px] font-medium hover:bg-red-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
