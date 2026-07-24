"use client";

import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { getT } from "@/lib/translations";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function getNotaFinal(notaTecnica, notaComportamental) {
  var t = parseFloat(notaTecnica) || 0;
  var c = parseFloat(notaComportamental) || 0;
  return ((t + c) / 2).toFixed(1);
}

function getClassificacao(notaFinal) {
  var n = parseFloat(notaFinal) || 0;
  if (n >= 18) return "Excelente";
  if (n >= 15) return "Bom";
  if (n >= 12) return "Suficiente";
  if (n >= 8) return "Insuficiente";
  return "Mau";
}

function classificacaoBadge(cls) {
  switch (cls) {
    case "Excelente": return "badge-success";
    case "Bom": return "badge-primary";
    case "Suficiente": return "badge-warning";
    case "Insuficiente": return "badge-secondary";
    case "Mau": return "badge-danger";
    default: return "badge-secondary";
  }
}

function estadoCicloBadge(estado) {
  switch (estado) {
    case "Em_curso": return "badge-success";
    case "Planeado": return "badge-warning";
    case "Concluido": return "badge-primary";
    case "Cancelado": return "badge-secondary";
    default: return "badge-secondary";
  }
}

function estadoAvaliacaoBadge(estado) {
  switch (estado) {
    case "Rascunho": return "badge-secondary";
    case "Submetida": return "badge-warning";
    case "Validada": return "badge-success";
    case "Arquivada": return "badge-primary";
    default: return "badge-secondary";
  }
}

export default function AvaliacaoPage() {
  var t = getT();
  var [aba, setAba] = useState("ciclos");

  var [ciclos, setCiclos] = useState([]);
  var [ciclosLoading, setCiclosLoading] = useState(true);
  var [ciclosSearch, setCiclosSearch] = useState("");
  var [filtroEstadoCiclo, setFiltroEstadoCiclo] = useState("");
  var [ciclosPaginacao, setCiclosPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  var [showCicloModal, setShowCicloModal] = useState(false);
  var [cicloEditando, setCicloEditando] = useState(null);
  var [cicloForm, setCicloForm] = useState({ nome: "", descricao: "", data_inicio: "", data_fim: "", estado: "Planeado" });
  var [savingCiclo, setSavingCiclo] = useState(false);
  var [msgCiclo, setMsgCiclo] = useState(null);
  var [confirmDeleteCiclo, setConfirmDeleteCiclo] = useState({ open: false, id: null, nome: "" });
  var [showCicloView, setShowCicloView] = useState(false);
  var [cicloView, setCicloView] = useState(null);

  var [avaliacoes, setAvaliacoes] = useState([]);
  var [avaliacoesLoading, setAvaliacoesLoading] = useState(true);
  var [filtroCicloId, setFiltroCicloId] = useState("");
  var [filtroColaboradorId, setFiltroColaboradorId] = useState("");
  var [filtroEstadoAval, setFiltroEstadoAval] = useState("");
  var [filtroClassificacao, setFiltroClassificacao] = useState("");
  var [avaliacoesPaginacao, setAvaliacoesPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  var [showAvalModal, setShowAvalModal] = useState(false);
  var [avalEditando, setAvalEditando] = useState(null);
  var [avalForm, setAvalForm] = useState({
    colaborador_id: "", ciclo_id: "", nota_tecnica: "", nota_comportamental: "",
    pontos_fortes: "", pontos_melhoria: "", plano_melhoria: "",
    feedback_avaliador: "", feedback_avaliado: "", estado: "Rascunho"
  });
  var [savingAval, setSavingAval] = useState(false);
  var [msgAval, setMsgAval] = useState(null);
  var [confirmDeleteAval, setConfirmDeleteAval] = useState({ open: false, id: null, nome: "" });
  var [showAvalView, setShowAvalView] = useState(false);
  var [avalView, setAvalView] = useState(null);

  var [colaboradores, setColaboradores] = useState([]);
  var [ciclosParaSelect, setCiclosParaSelect] = useState([]);

  var autoNotaFinal = useMemo(function () {
    return getNotaFinal(avalForm.nota_tecnica, avalForm.nota_comportamental);
  }, [avalForm.nota_tecnica, avalForm.nota_comportamental]);

  var autoClassificacao = useMemo(function () {
    return getClassificacao(autoNotaFinal);
  }, [autoNotaFinal]);

  var carregarCiclos = async function (page) {
    page = page || 1;
    setCiclosLoading(true);
    try {
      var url = "/api/avaliacao/ciclos?page=" + page + "&limit=15";
      if (ciclosSearch) url += "&search=" + encodeURIComponent(ciclosSearch);
      if (filtroEstadoCiclo) url += "&estado=" + filtroEstadoCiclo;
      var data = await api.get(url);
      setCiclos(data.dados);
      setCiclosPaginacao(data.paginacao);
    } catch (e) {
      setMsgCiclo({ tipo: "erro", texto: e.message });
    } finally {
      setCiclosLoading(false);
    }
  };

  var carregarAvaliacoes = async function (page) {
    page = page || 1;
    setAvaliacoesLoading(true);
    try {
      var url = "/api/avaliacao/avaliacoes?page=" + page + "&limit=15";
      if (filtroCicloId) url += "&ciclo_id=" + filtroCicloId;
      if (filtroColaboradorId) url += "&colaborador_id=" + filtroColaboradorId;
      if (filtroEstadoAval) url += "&estado=" + filtroEstadoAval;
      if (filtroClassificacao) url += "&classificacao=" + filtroClassificacao;
      var data = await api.get(url);
      setAvaliacoes(data.dados);
      setAvaliacoesPaginacao(data.paginacao);
    } catch (e) {
      setMsgAval({ tipo: "erro", texto: e.message });
    } finally {
      setAvaliacoesLoading(false);
    }
  };

  var carregarColaboradores = async function () {
    try {
      var data = await api.get("/api/colaboradores?page=1&limit=9999");
      setColaboradores(data.dados || []);
    } catch (e) {
      setColaboradores([]);
    }
  };

  var carregarCiclosParaSelect = async function () {
    try {
      var data = await api.get("/api/avaliacao/ciclos?page=1&limit=9999");
      setCiclosParaSelect(data.dados || []);
    } catch (e) {
      setCiclosParaSelect([]);
    }
  };

  useEffect(function () {
    carregarCiclos();
    carregarColaboradores();
    carregarCiclosParaSelect();
  }, []);

  useEffect(function () {
    if (aba === "avaliacoes") {
      carregarAvaliacoes();
    }
  }, [aba]);

  var cicloEstadoOptions = ["Planeado", "Em_curso", "Concluido", "Cancelado"];
  var avalEstadoOptions = ["Rascunho", "Submetida", "Validada", "Arquivada"];
  var classificacaoOptions = ["Excelente", "Bom", "Suficiente", "Insuficiente", "Mau"];

  var abrirNovoCiclo = function () {
    setCicloEditando(null);
    setCicloForm({ nome: "", descricao: "", data_inicio: "", data_fim: "", estado: "Planeado" });
    setMsgCiclo(null);
    setShowCicloModal(true);
  };

  var abrirEditarCiclo = function (c) {
    setCicloEditando(c);
    setCicloForm({
      nome: c.nome || "",
      descricao: c.descricao || "",
      data_inicio: c.data_inicio ? c.data_inicio.substring(0, 10) : "",
      data_fim: c.data_fim ? c.data_fim.substring(0, 10) : "",
      estado: c.estado || "Planeado",
    });
    setMsgCiclo(null);
    setShowCicloModal(true);
  };

  var abrirVerCiclo = function (c) {
    setCicloView(c);
    setShowCicloView(true);
  };

  var guardarCiclo = async function (e) {
    e.preventDefault();
    setSavingCiclo(true);
    setMsgCiclo(null);
    try {
      if (cicloEditando) {
        await api.put("/api/avaliacao/ciclos/" + cicloEditando.id, cicloForm);
        setMsgCiclo({ tipo: "sucesso", texto: "Ciclo atualizado com sucesso" });
      } else {
        await api.post("/api/avaliacao/ciclos", cicloForm);
        setMsgCiclo({ tipo: "sucesso", texto: "Ciclo criado com sucesso" });
      }
      setShowCicloModal(false);
      carregarCiclos(ciclosPaginacao.pagina);
      carregarCiclosParaSelect();
    } catch (e) {
      setMsgCiclo({ tipo: "erro", texto: e.message });
    } finally {
      setSavingCiclo(false);
    }
  };

  var eliminarCiclo = async function () {
    try {
      await api.delete("/api/avaliacao/ciclos/" + confirmDeleteCiclo.id);
      setMsgCiclo({ tipo: "sucesso", texto: "Ciclo eliminado com sucesso" });
      setConfirmDeleteCiclo({ open: false, id: null, nome: "" });
      carregarCiclos(ciclosPaginacao.pagina);
      carregarCiclosParaSelect();
    } catch (e) {
      setMsgCiclo({ tipo: "erro", texto: e.message });
    }
  };

  var handleCicloInput = function (e) {
    setCicloForm(function (prev) { return Object.assign({}, prev, { [e.target.name]: e.target.value }); });
  };

  var abrirNovaAvaliacao = function () {
    setAvalEditando(null);
    setAvalForm({
      colaborador_id: "", ciclo_id: "", nota_tecnica: "", nota_comportamental: "",
      pontos_fortes: "", pontos_melhoria: "", plano_melhoria: "",
      feedback_avaliador: "", feedback_avaliado: "", estado: "Rascunho"
    });
    setMsgAval(null);
    setShowAvalModal(true);
  };

  var abrirEditarAvaliacao = function (a) {
    setAvalEditando(a);
    setAvalForm({
      colaborador_id: a.colaborador ? (a.colaborador.id || "") : "",
      ciclo_id: a.ciclo ? (a.ciclo.id || "") : "",
      nota_tecnica: a.nota_tecnica != null ? a.nota_tecnica : "",
      nota_comportamental: a.nota_comportamental != null ? a.nota_comportamental : "",
      pontos_fortes: a.pontos_fortes || "",
      pontos_melhoria: a.pontos_melhoria || "",
      plano_melhoria: a.plano_melhoria || "",
      feedback_avaliador: a.feedback_avaliador || "",
      feedback_avaliado: a.feedback_avaliado || "",
      estado: a.estado || "Rascunho",
    });
    setMsgAval(null);
    setShowAvalModal(true);
  };

  var abrirVerAvaliacao = function (a) {
    setAvalView(a);
    setShowAvalView(true);
  };

  var guardarAvaliacao = async function (e) {
    e.preventDefault();
    setSavingAval(true);
    setMsgAval(null);
    if (!avalForm.colaborador_id) { setSavingAval(false); setMsgAval({ tipo: "erro", texto: "Selecione o colaborador" }); return; }
    if (!avalForm.ciclo_id) { setSavingAval(false); setMsgAval({ tipo: "erro", texto: "Selecione o ciclo de avaliação" }); return; }
    try {
      var body = {
        colaborador_id: avalForm.colaborador_id,
        ciclo_id: avalForm.ciclo_id,
        nota_tecnica: avalForm.nota_tecnica !== "" ? parseFloat(avalForm.nota_tecnica) : null,
        nota_comportamental: avalForm.nota_comportamental !== "" ? parseFloat(avalForm.nota_comportamental) : null,
        pontos_fortes: avalForm.pontos_fortes,
        pontos_melhoria: avalForm.pontos_melhoria,
        plano_melhoria: avalForm.plano_melhoria,
        feedback_avaliador: avalForm.feedback_avaliador,
        feedback_avaliado: avalForm.feedback_avaliado,
        estado: avalForm.estado || "Rascunho",
      };
      if (avalEditando) {
        await api.put("/api/avaliacao/avaliacoes/" + avalEditando.id, body);
        setMsgAval({ tipo: "sucesso", texto: "Avaliacao actualizada com sucesso" });
      } else {
        await api.post("/api/avaliacao/avaliacoes", body);
        setMsgAval({ tipo: "sucesso", texto: "Avaliacao criada com sucesso" });
      }
      setShowAvalModal(false);
      carregarAvaliacoes(avaliacoesPaginacao.pagina);
    } catch (e) {
      setMsgAval({ tipo: "erro", texto: e.message });
    } finally {
      setSavingAval(false);
    }
  };

  var eliminarAvaliacao = async function () {
    try {
      await api.delete("/api/avaliacao/avaliacoes/" + confirmDeleteAval.id);
      setMsgAval({ tipo: "sucesso", texto: "Avaliacao eliminada com sucesso" });
      setConfirmDeleteAval({ open: false, id: null, nome: "" });
      carregarAvaliacoes(avaliacoesPaginacao.pagina);
    } catch (e) {
      setMsgAval({ tipo: "erro", texto: e.message });
    }
  };

  var handleAvalInput = function (e) {
    setAvalForm(function (prev) { return Object.assign({}, prev, { [e.target.name]: e.target.value }); });
  };

  var inputClass = "w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDeleteCiclo.open}
        titulo="Eliminar Ciclo"
        mensagem={"Tem certeza que deseja eliminar o ciclo \"" + confirmDeleteCiclo.nome + "\"? Esta ação não pode ser desfeita."}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Manter"
        variante="perigo"
        onConfirm={eliminarCiclo}
        onCancel={function () { setConfirmDeleteCiclo({ open: false, id: null, nome: "" }); }}
      />

      <ConfirmDialog
        open={confirmDeleteAval.open}
        titulo="Eliminar Avaliacao"
        mensagem={"Tem certeza que deseja eliminar esta avaliação? Esta ação não pode ser desfeita."}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Manter"
        variante="perigo"
        onConfirm={eliminarAvaliacao}
        onCancel={function () { setConfirmDeleteAval({ open: false, id: null, nome: "" }); }}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>Desenvolvimento</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Avaliacao</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Avaliacao de Desempenho</h1>
        </div>
        <div className="flex items-center gap-3">
          {aba === "ciclos" && (
            <button onClick={abrirNovoCiclo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Novo Ciclo
            </button>
          )}
          {aba === "avaliacoes" && (
            <button onClick={abrirNovaAvaliacao} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Nova Avaliacao
            </button>
          )}
        </div>
      </section>

      <div className="flex gap-1 border-b border-outline-variant/20">
        <button
          onClick={function () { setAba("ciclos"); }}
          className={"flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold transition-colors whitespace-nowrap border-b-2 " + (aba === "ciclos" ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface border-transparent")}
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          Ciclos
        </button>
        <button
          onClick={function () { setAba("avaliacoes"); }}
          className={"flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold transition-colors whitespace-nowrap border-b-2 " + (aba === "avaliacoes" ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface border-transparent")}
        >
          <span className="material-symbols-outlined text-[18px]">star</span>
          Avaliacoes
        </button>
      </div>

      {aba === "ciclos" && (
        <>
          {msgCiclo && (
            <div className={"p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 " + (msgCiclo.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10")}>
              <span className="material-symbols-outlined text-[18px]">{msgCiclo.tipo === "sucesso" ? "check_circle" : "error"}</span>
              {msgCiclo.texto}
              <button onClick={function () { setMsgCiclo(null); }} className="ml-auto hover:opacity-60">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          <section className="glass-panel p-5 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-grow space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Ciclo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                  <input
                    type="text"
                    placeholder="Nome do ciclo..."
                    value={ciclosSearch}
                    onChange={function (e) { setCiclosSearch(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter") carregarCiclos(1); }}
                    className={"pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px] w-full"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
                  <select value={filtroEstadoCiclo} onChange={function (e) { setFiltroEstadoCiclo(e.target.value); }} className={inputClass}>
                    <option value="">Todos</option>
                    {cicloEstadoOptions.map(function (e) { return <option key={e} value={e}>{e.replace("_", " ")}</option>; })}
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <button onClick={function () { carregarCiclos(1); }} className="w-full px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                    Filtrar
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse data-grid-tight">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant/20">
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Periodo</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {ciclosLoading ? (
                    [1, 2, 3, 4, 5].map(function (i) {
                      return (
                        <tr key={i}><td colSpan={4} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                      );
                    })
                  ) : ciclos.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">calendar_month</span>
                      <p className="text-on-surface-variant font-medium">Nenhum ciclo encontrado</p>
                      <p className="text-[13px] text-outline mt-1">Clique em "Novo Ciclo" para adicionar</p>
                    </td></tr>
                  ) : (
                    ciclos.map(function (c) {
                      return (
                        <tr key={c.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{c.nome}</span>
                              {c.descricao && <span className="text-[12px] text-on-surface-variant/70 truncate max-w-[280px]">{c.descricao}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-[13px] text-on-surface-variant">
                              <span className="material-symbols-outlined text-[16px]">event</span>
                              <span>{c.data_inicio ? helpers.formatDate(c.data_inicio) : "—"}</span>
                              <span className="text-outline">—</span>
                              <span>{c.data_fim ? helpers.formatDate(c.data_fim) : "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + estadoCicloBadge(c.estado)}>
                              <span className="w-1.5 h-1.5 rounded-full" />
                              {(c.estado || "").replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end">
                              <button onClick={function () { abrirVerCiclo(c); }} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                              </button>
                              <button onClick={function () { abrirEditarCiclo(c); }} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button onClick={function () { setConfirmDeleteCiclo({ open: true, id: c.id, nome: c.nome }); }} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
                Exibindo {ciclos.length} de {ciclosPaginacao.total} ciclos
              </div>
              {ciclosPaginacao.total_paginas > 1 && (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(ciclosPaginacao.total_paginas, 5) }, function (_, i) { return i + 1; }).map(function (p) {
                    return (
                      <button key={p} onClick={function () { carregarCiclos(p); }} className={"w-8 h-8 rounded-lg text-[13px] font-medium transition-all " + (p === ciclosPaginacao.pagina ? "bg-primary text-white font-bold" : "hover:bg-primary/5 text-on-surface-variant")}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {aba === "avaliacoes" && (
        <>
          {msgAval && (
            <div className={"p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 " + (msgAval.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10")}>
              <span className="material-symbols-outlined text-[18px]">{msgAval.tipo === "sucesso" ? "check_circle" : "error"}</span>
              {msgAval.texto}
              <button onClick={function () { setMsgAval(null); }} className="ml-auto hover:opacity-60">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          <section className="glass-panel p-5 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="space-y-2 w-full lg:w-auto lg:flex-grow">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Ciclo</label>
                <select value={filtroCicloId} onChange={function (e) { setFiltroCicloId(e.target.value); }} className={inputClass}>
                  <option value="">Todos</option>
                  {ciclosParaSelect.map(function (c) { return <option key={c.id} value={c.id}>{c.nome}</option>; })}
                </select>
              </div>
              <div className="space-y-2 w-full lg:w-auto lg:flex-grow">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Colaborador</label>
                <select value={filtroColaboradorId} onChange={function (e) { setFiltroColaboradorId(e.target.value); }} className={inputClass}>
                  <option value="">Todos</option>
                  {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo}</option>; })}
                </select>
              </div>
              <div className="space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
                <select value={filtroEstadoAval} onChange={function (e) { setFiltroEstadoAval(e.target.value); }} className={inputClass}>
                  <option value="">Todos</option>
                  {avalEstadoOptions.map(function (e) { return <option key={e} value={e}>{e}</option>; })}
                </select>
              </div>
              <div className="space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Classificacao</label>
                <select value={filtroClassificacao} onChange={function (e) { setFiltroClassificacao(e.target.value); }} className={inputClass}>
                  <option value="">Todas</option>
                  {classificacaoOptions.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
                </select>
              </div>
              <div className="flex items-end pb-0.5">
                <button onClick={function () { carregarAvaliacoes(1); }} className="w-full px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                  Filtrar
                </button>
              </div>
            </div>
          </section>

          <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse data-grid-tight">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant/20">
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider w-[220px]">Colaborador</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Ciclo</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nota Final</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Classificacao</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {avaliacoesLoading ? (
                    [1, 2, 3, 4, 5].map(function (i) {
                      return (
                        <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                      );
                    })
                  ) : avaliacoes.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">star</span>
                      <p className="text-on-surface-variant font-medium">Nenhuma avaliação encontrada</p>
                      <p className="text-[13px] text-outline mt-1">Clique em "Nova Avaliacao" para adicionar</p>
                    </td></tr>
                  ) : (
                    avaliacoes.map(function (a) {
                      var nf = a.nota_final != null ? parseFloat(a.nota_final).toFixed(1) : getNotaFinal(a.nota_tecnica, a.nota_comportamental);
                      var cls = a.classificacao || getClassificacao(nf);
                      return (
                        <tr key={a.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{a.colaborador ? a.colaborador.nome_completo : "—"}</span>
                              <span className="text-[12px] text-on-surface-variant/70">{a.colaborador ? a.colaborador.numero_colaborador : ""}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface">{a.ciclo ? a.ciclo.nome : "—"}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-[15px] font-bold text-on-surface">{nf}</span>
                            <span className="text-[11px] text-on-surface-variant/60 ml-1">/20</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + classificacaoBadge(cls)}>
                              {cls}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + estadoAvaliacaoBadge(a.estado)}>
                              <span className="w-1.5 h-1.5 rounded-full" />
                              {a.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end">
                              <button onClick={function () { abrirVerAvaliacao(a); }} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                              </button>
                              <button onClick={function () { abrirEditarAvaliacao(a); }} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button onClick={function () { setConfirmDeleteAval({ open: true, id: a.id, nome: (a.colaborador ? a.colaborador.nome_completo : "esta avaliação") }); }} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
                Exibindo {avaliacoes.length} de {avaliacoesPaginacao.total} avaliacoes
              </div>
              {avaliacoesPaginacao.total_paginas > 1 && (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(avaliacoesPaginacao.total_paginas, 5) }, function (_, i) { return i + 1; }).map(function (p) {
                    return (
                      <button key={p} onClick={function () { carregarAvaliacoes(p); }} className={"w-8 h-8 rounded-lg text-[13px] font-medium transition-all " + (p === avaliacoesPaginacao.pagina ? "bg-primary text-white font-bold" : "hover:bg-primary/5 text-on-surface-variant")}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {showCicloModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowCicloModal(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{cicloEditando ? "Editar Ciclo" : "Novo Ciclo"}</h3>
              <button onClick={function () { setShowCicloModal(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardarCiclo} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome *</label>
                  <input name="nome" value={cicloForm.nome} onChange={handleCicloInput} required className={inputClass} placeholder="Ex: Avaliacao Trimestral Q1 2026" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Descrição</label>
                  <textarea name="descricao" value={cicloForm.descricao} onChange={handleCicloInput} rows={3} className={inputClass} placeholder="Descrição do ciclo de avaliação..." />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Início</label>
                  <input name="data_inicio" type="date" value={cicloForm.data_inicio} onChange={handleCicloInput} className={inputClass} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data Fim</label>
                  <input name="data_fim" type="date" value={cicloForm.data_fim} onChange={handleCicloInput} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado</label>
                  <select name="estado" value={cicloForm.estado} onChange={handleCicloInput} className={inputClass}>
                    {cicloEstadoOptions.map(function (e) { return <option key={e} value={e}>{e.replace("_", " ")}</option>; })}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={function () { setShowCicloModal(false); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingCiclo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{savingCiclo ? "hourglass_empty" : "save"}</span>
                  {savingCiclo ? "A guardar..." : cicloEditando ? "Actualizar" : "Criar Ciclo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCicloView && cicloView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowCicloView(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Detalhes do Ciclo</h3>
              <button onClick={function () { setShowCicloView(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[28px] text-primary">calendar_month</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">{cicloView.nome}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + estadoCicloBadge(cicloView.estado)}>
                      <span className="w-1.5 h-1.5 rounded-full" />
                      {(cicloView.estado || "").replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                  Informacoes
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Nome", cicloView.nome],
                    ["Data de Início", cicloView.data_inicio ? helpers.formatDate(cicloView.data_inicio) : null],
                    ["Data Fim", cicloView.data_fim ? helpers.formatDate(cicloView.data_fim) : null],
                    ["Estado", (cicloView.estado || "").replace("_", " ")],
                  ].map(function (pair) {
                    return (
                      <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
                {cicloView.descricao && (
                  <div className="mt-3 bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Descrição</p>
                    <p className="text-[13px] text-on-surface">{cicloView.descricao}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={function () { setShowCicloView(false); abrirEditarCiclo(cicloView); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar
                </button>
                <button onClick={function () { setShowCicloView(false); }} className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowAvalModal(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{avalEditando ? "Editar Avaliacao" : "Nova Avaliacao"}</h3>
              <button onClick={function () { setShowAvalModal(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardarAvaliacao} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador *</label>
                  <select name="colaborador_id" value={avalForm.colaborador_id} onChange={handleAvalInput} required className={inputClass}>
                    <option value="">Selecionar...</option>
                    {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Ciclo *</label>
                  <select name="ciclo_id" value={avalForm.ciclo_id} onChange={handleAvalInput} required className={inputClass}>
                    <option value="">Selecionar...</option>
                    {ciclosParaSelect.map(function (c) { return <option key={c.id} value={c.id}>{c.nome}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nota Tecnica (0-20) *</label>
                  <input name="nota_tecnica" type="number" min="0" max="20" step="0.1" value={avalForm.nota_tecnica} onChange={handleAvalInput} required className={inputClass} placeholder="0.0" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nota Comportamental (0-20) *</label>
                  <input name="nota_comportamental" type="number" min="0" max="20" step="0.1" value={avalForm.nota_comportamental} onChange={handleAvalInput} required className={inputClass} placeholder="0.0" />
                </div>
                <div className="sm:col-span-2">
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">calculate</span>
                      <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wide">Nota Final:</span>
                    </div>
                    <span className="text-lg font-bold text-primary">{autoNotaFinal}</span>
                    <span className={"inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + classificacaoBadge(autoClassificacao)}>
                      {autoClassificacao}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado</label>
                  <select name="estado" value={avalForm.estado} onChange={handleAvalInput} className={inputClass}>
                    {avalEstadoOptions.map(function (e) { return <option key={e} value={e}>{e}</option>; })}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Pontos Fortes</label>
                  <textarea name="pontos_fortes" value={avalForm.pontos_fortes} onChange={handleAvalInput} rows={3} className={inputClass} placeholder="Descreva os pontos fortes do colaborador..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Pontos de Melhoria</label>
                  <textarea name="pontos_melhoria" value={avalForm.pontos_melhoria} onChange={handleAvalInput} rows={3} className={inputClass} placeholder="Descreva os pontos que necessitam de melhoria..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Plano de Melhoria</label>
                  <textarea name="plano_melhoria" value={avalForm.plano_melhoria} onChange={handleAvalInput} rows={3} className={inputClass} placeholder="Plano de accao para desenvolvimento..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Feedback do Avaliador</label>
                  <textarea name="feedback_avaliador" value={avalForm.feedback_avaliador} onChange={handleAvalInput} rows={3} className={inputClass} placeholder="Feedback geral do avaliador..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Feedback do Avaliado</label>
                  <textarea name="feedback_avaliado" value={avalForm.feedback_avaliado} onChange={handleAvalInput} rows={3} className={inputClass} placeholder="Auto-avaliação ou feedback do colaborador..." />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={function () { setShowAvalModal(false); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingAval} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{savingAval ? "hourglass_empty" : "save"}</span>
                  {savingAval ? "A guardar..." : avalEditando ? "Actualizar" : "Criar Avaliacao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAvalView && avalView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowAvalView(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Detalhes da Avaliacao</h3>
              <button onClick={function () { setShowAvalView(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[32px] text-primary">star</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">{avalView.colaborador ? avalView.colaborador.nome_completo : "—"}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[13px] text-on-surface-variant/70">{avalView.colaborador ? avalView.colaborador.numero_colaborador : ""}</span>
                    <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + estadoAvaliacaoBadge(avalView.estado)}>
                      <span className="w-1.5 h-1.5 rounded-full" />
                      {avalView.estado}
                    </span>
                    {avalView.ciclo && (
                      <span className="text-[12px] text-on-surface-variant/60 badge-primary px-2 py-0.5 rounded">
                        {avalView.ciclo.nome}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">calculate</span>
                  Notas e Classificacao
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Nota Tecnica</p>
                    <p className="text-[15px] font-bold text-on-surface">{avalView.nota_tecnica != null ? parseFloat(avalView.nota_tecnica).toFixed(1) : "—"}<span className="text-[11px] text-on-surface-variant/60 ml-0.5">/20</span></p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Nota Comportamental</p>
                    <p className="text-[15px] font-bold text-on-surface">{avalView.nota_comportamental != null ? parseFloat(avalView.nota_comportamental).toFixed(1) : "—"}<span className="text-[11px] text-on-surface-variant/60 ml-0.5">/20</span></p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                    <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wide mb-0.5">Nota Final</p>
                    <p className="text-[18px] font-bold text-primary">{avalView.nota_final != null ? parseFloat(avalView.nota_final).toFixed(1) : getNotaFinal(avalView.nota_tecnica, avalView.nota_comportamental)}<span className="text-[11px] text-primary/60 ml-0.5">/20</span></p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Classificacao</p>
                    <span className={"inline-flex items-center px-2.5 py-1 rounded text-[12px] font-bold uppercase tracking-wider " + classificacaoBadge(avalView.classificacao || getClassificacao(avalView.nota_final != null ? avalView.nota_final : getNotaFinal(avalView.nota_tecnica, avalView.nota_comportamental)))}>
                      {avalView.classificacao || getClassificacao(avalView.nota_final != null ? avalView.nota_final : getNotaFinal(avalView.nota_tecnica, avalView.nota_comportamental))}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">thumb_up</span>
                  Pontos Fortes
                </h4>
                <div className="bg-background/50 rounded-lg p-4 border border-outline-variant/20">
                  <p className="text-[13px] text-on-surface whitespace-pre-wrap">{avalView.pontos_fortes || "—"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">trending_up</span>
                  Pontos de Melhoria
                </h4>
                <div className="bg-background/50 rounded-lg p-4 border border-outline-variant/20">
                  <p className="text-[13px] text-on-surface whitespace-pre-wrap">{avalView.pontos_melhoria || "—"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">route</span>
                  Plano de Melhoria
                </h4>
                <div className="bg-background/50 rounded-lg p-4 border border-outline-variant/20">
                  <p className="text-[13px] text-on-surface whitespace-pre-wrap">{avalView.plano_melhoria || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">rate_review</span>
                    Feedback do Avaliador
                  </h4>
                  <div className="bg-background/50 rounded-lg p-4 border border-outline-variant/20">
                    <p className="text-[13px] text-on-surface whitespace-pre-wrap">{avalView.feedback_avaliador || "—"}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">record_voice_over</span>
                    Feedback do Avaliado
                  </h4>
                  <div className="bg-background/50 rounded-lg p-4 border border-outline-variant/20">
                    <p className="text-[13px] text-on-surface whitespace-pre-wrap">{avalView.feedback_avaliado || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={function () { setShowAvalView(false); abrirEditarAvaliacao(avalView); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar
                </button>
                <button onClick={function () { setShowAvalView(false); }} className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
