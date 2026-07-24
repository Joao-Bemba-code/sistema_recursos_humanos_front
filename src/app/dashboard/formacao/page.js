"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { getT } from "@/lib/translations";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

var TIPOS_CURSO = [
  { value: "Interno", label: "Interno" },
  { value: "Externo", label: "Externo" },
  { value: "Online", label: "Online" },
  { value: "Seminario", label: "Seminario" },
  { value: "Workshop", label: "Workshop" },
];

var ESTADOS_CURSO = [
  { value: "Planeado", label: "Planeado" },
  { value: "Em_curso", label: "Em Curso" },
  { value: "Concluido", label: "Concluido" },
  { value: "Cancelado", label: "Cancelado" },
];

var ESTADOS_INSCRICAO = [
  { value: "Inscrito", label: "Inscrito" },
  { value: "Concluido", label: "Concluido" },
  { value: "Abandonou", label: "Abandonou" },
  { value: "Certificado", label: "Certificado" },
];

var defaultCursoForm = {
  nome: "",
  descricao: "",
  categoria: "",
  tipo: "Interno",
  horas: "",
  data_inicio: "",
  data_fim: "",
  vagas: "",
  local: "",
  estado: "Planeado",
};

var defaultInscricaoForm = {
  curso_id: "",
  colaborador_id: "",
  estado: "Inscrito",
  nota_avaliacao: "",
  horas_realizadas: "",
  certificado: false,
  observacoes: "",
};

export default function FormacaoPage() {
  var t = getT();

  var [aba, setAba] = useState("cursos");

  var [cursos, setCursos] = useState([]);
  var [loadingCursos, setLoadingCursos] = useState(true);
  var [searchCurso, setSearchCurso] = useState("");
  var [filtroEstadoCurso, setFiltroEstadoCurso] = useState("");
  var [filtroTipoCurso, setFiltroTipoCurso] = useState("");
  var [paginacaoCursos, setPaginacaoCursos] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  var [inscricoes, setInscricoes] = useState([]);
  var [loadingInscricoes, setLoadingInscricoes] = useState(true);
  var [filtroCursoInsc, setFiltroCursoInsc] = useState("");
  var [filtroColabInsc, setFiltroColabInsc] = useState("");
  var [filtroEstadoInsc, setFiltroEstadoInsc] = useState("");
  var [paginacaoInsc, setPaginacaoInsc] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  var [showCursoModal, setShowCursoModal] = useState(false);
  var [editandoCurso, setEditandoCurso] = useState(null);
  var [cursoForm, setCursoForm] = useState({ ...defaultCursoForm });
  var [savingCurso, setSavingCurso] = useState(false);

  var [showInscricaoModal, setShowInscricaoModal] = useState(false);
  var [editandoInscricao, setEditandoInscricao] = useState(null);
  var [inscriçãoForm, setInscricaoForm] = useState({ ...defaultInscricaoForm });
  var [savingInscricao, setSavingInscricao] = useState(false);

  var [showViewCurso, setShowViewCurso] = useState(false);
  var [cursoView, setCursoView] = useState(null);

  var [msg, setMsg] = useState(null);

  var [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "", tipo: "" });

  var [cursosDropdown, setCursosDropdown] = useState([]);
  var [colaboradoresDropdown, setColaboradoresDropdown] = useState([]);

  var carregarCursos = async function (page) {
    page = page || 1;
    setLoadingCursos(true);
    try {
      var url = "/api/formacao/cursos?page=" + page + "&limit=15";
      if (searchCurso) url += "&search=" + encodeURIComponent(searchCurso);
      if (filtroEstadoCurso) url += "&estado=" + filtroEstadoCurso;
      if (filtroTipoCurso) url += "&tipo=" + filtroTipoCurso;
      var data = await api.get(url);
      setCursos(data.dados || []);
      setPaginacaoCursos(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingCursos(false);
    }
  };

  var carregarInscricoes = async function (page) {
    page = page || 1;
    setLoadingInscricoes(true);
    try {
      var url = "/api/formacao/inscricoes?page=" + page + "&limit=15";
      if (filtroCursoInsc) url += "&curso_id=" + filtroCursoInsc;
      if (filtroColabInsc) url += "&colaborador_id=" + filtroColabInsc;
      if (filtroEstadoInsc) url += "&estado=" + filtroEstadoInsc;
      var data = await api.get(url);
      setInscricoes(data.dados || []);
      setPaginacaoInsc(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingInscricoes(false);
    }
  };

  var carregarDropdowns = async function () {
    try {
      var cData = await api.get("/api/formacao/cursos?limit=200");
      setCursosDropdown(cData.dados || []);
    } catch (e) { /* ignore */ }
    try {
      var colData = await api.get("/api/colaboradores?limit=200");
      setColaboradoresDropdown(colData.dados || []);
    } catch (e) { /* ignore */ }
  };

  useEffect(function () {
    carregarCursos();
    carregarInscricoes();
    carregarDropdowns();
  }, []);

  useEffect(function () {
    if (aba === "cursos") carregarCursos(1);
    if (aba === "inscricoes") carregarInscricoes(1);
  }, [aba]);

  var abrirNovoCurso = function () {
    setEditandoCurso(null);
    setCursoForm({ ...defaultCursoForm });
    setShowCursoModal(true);
    setMsg(null);
  };

  var abrirEditarCurso = function (c) {
    setEditandoCurso(c);
    setCursoForm({
      nome: c.nome || "",
      descricao: c.descricao || "",
      categoria: c.categoria || "",
      tipo: c.tipo || "Interno",
      horas: c.horas || "",
      data_inicio: c.data_inicio ? c.data_inicio.substring(0, 10) : "",
      data_fim: c.data_fim ? c.data_fim.substring(0, 10) : "",
      vagas: c.vagas || "",
      local: c.local || "",
      estado: c.estado || "Planeado",
    });
    setShowCursoModal(true);
    setMsg(null);
  };

  var guardarCurso = async function (e) {
    e.preventDefault();
    setSavingCurso(true);
    setMsg(null);
    try {
      if (editandoCurso) {
        await api.put("/api/formacao/cursos/" + editandoCurso.id, cursoForm);
        setMsg({ tipo: "sucesso", texto: "Curso atualizado com sucesso" });
      } else {
        await api.post("/api/formacao/cursos", cursoForm);
        setMsg({ tipo: "sucesso", texto: "Curso criado com sucesso" });
      }
      setShowCursoModal(false);
      carregarCursos(paginacaoCursos.pagina);
      carregarDropdowns();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSavingCurso(false);
    }
  };

  var eliminarCurso = async function () {
    try {
      await api.delete("/api/formacao/cursos/" + confirmDelete.id);
      setMsg({ tipo: "sucesso", texto: "Curso eliminado com sucesso" });
      setConfirmDelete({ open: false, id: null, nome: "", tipo: "" });
      carregarCursos(paginacaoCursos.pagina);
      carregarDropdowns();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  var abrirVerCurso = async function (c) {
    try {
      var data = await api.get("/api/formacao/cursos/" + c.id);
      setCursoView(data.dados || c);
    } catch (e) {
      setCursoView(c);
    }
    setShowViewCurso(true);
  };

  var abrirNovoInscricao = function () {
    setEditandoInscricao(null);
    setInscricaoForm({ ...defaultInscricaoForm });
    setShowInscricaoModal(true);
    setMsg(null);
  };

  var abrirEditarInscricao = function (ins) {
    setEditandoInscricao(ins);
    setInscricaoForm({
      curso_id: ins.curso_id || (ins.curso && ins.curso.id) || "",
      colaborador_id: ins.colaborador_id || (ins.colaborador && ins.colaborador.id) || "",
      estado: ins.estado || "Inscrito",
      nota_avaliacao: ins.nota_avaliacao || "",
      horas_realizadas: ins.horas_realizadas || "",
      certificado: ins.certificado || false,
      observacoes: ins.observacoes || "",
    });
    setShowInscricaoModal(true);
    setMsg(null);
  };

  var guardarInscricao = async function (e) {
    e.preventDefault();
    setSavingInscricao(true);
    setMsg(null);
    try {
      if (editandoInscricao) {
        await api.put("/api/formacao/inscricoes/" + editandoInscricao.id, inscriçãoForm);
        setMsg({ tipo: "sucesso", texto: "Inscricao actualizada com sucesso" });
      } else {
        await api.post("/api/formacao/inscricoes", inscriçãoForm);
        setMsg({ tipo: "sucesso", texto: "Inscricao criada com sucesso" });
      }
      setShowInscricaoModal(false);
      carregarInscricoes(paginacaoInsc.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSavingInscricao(false);
    }
  };

  var eliminarInscricao = async function () {
    try {
      await api.delete("/api/formacao/inscricoes/" + confirmDelete.id);
      setMsg({ tipo: "sucesso", texto: "Inscricao eliminada com sucesso" });
      setConfirmDelete({ open: false, id: null, nome: "", tipo: "" });
      carregarInscricoes(paginacaoInsc.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  var handleCursoInput = function (e) {
    setCursoForm(function (prev) {
      var next = {};
      var keys = Object.keys(prev);
      for (var i = 0; i < keys.length; i++) {
        next[keys[i]] = prev[keys[i]];
      }
      next[e.target.name] = e.target.value;
      return next;
    });
  };

  var handleInscricaoInput = function (e) {
    setInscricaoForm(function (prev) {
      var next = {};
      var keys = Object.keys(prev);
      for (var i = 0; i < keys.length; i++) {
        next[keys[i]] = prev[keys[i]];
      }
      next[e.target.name] = e.target.value;
      return next;
    });
  };

  var handleInscricaoCheckbox = function (e) {
    setInscricaoForm(function (prev) {
      var next = {};
      var keys = Object.keys(prev);
      for (var i = 0; i < keys.length; i++) {
        next[keys[i]] = prev[keys[i]];
      }
      next[e.target.name] = e.target.checked;
      return next;
    });
  };

  var getTipoBadgeClass = function (tipo) {
    var map = {
      "Interno": "badge-primary",
      "Externo": "badge-warning",
      "Online": "badge-info",
      "Seminario": "badge-secondary",
      "Workshop": "badge-success",
    };
    return map[tipo] || "badge-secondary";
  };

  var getInscricaoEstadoBadge = function (estado) {
    var map = {
      "Inscrito": "badge-info",
      "Concluido": "badge-success",
      "Abandonou": "badge-danger",
      "Certificado": "badge-success",
    };
    return map[estado] || "badge-secondary";
  };

  var cursoFilters = [];
  if (filtroEstadoCurso) cursoFilters.push({ label: "Estado: " + filtroEstadoCurso, onClear: function () { setFiltroEstadoCurso(""); } });
  if (filtroTipoCurso) cursoFilters.push({ label: "Tipo: " + filtroTipoCurso, onClear: function () { setFiltroTipoCurso(""); } });

  var inscFilters = [];
  if (filtroCursoInsc) inscFilters.push({ label: "Curso", onClear: function () { setFiltroCursoInsc(""); } });
  if (filtroColabInsc) inscFilters.push({ label: "Colaborador", onClear: function () { setFiltroColabInsc(""); } });
  if (filtroEstadoInsc) inscFilters.push({ label: "Estado: " + filtroEstadoInsc, onClear: function () { setFiltroEstadoInsc(""); } });

  var renderPagination = function (pag, carregarFn) {
    if (pag.total_paginas <= 1) return null;
    var pages = [];
    var total = Math.min(pag.total_paginas, 7);
    for (var i = 1; i <= total; i++) {
      pages.push(i);
    }
    return (
      <div className="flex items-center gap-1.5">
        {pages.map(function (p) {
          return (
            <button key={p} onClick={function () { carregarFn(p); }} className={"w-8 h-8 rounded-lg text-[13px] font-medium transition-all " + (p === pag.pagina ? "bg-primary text-white font-bold" : "hover:bg-primary/5 text-on-surface-variant")}>
              {p}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo={confirmDelete.tipo === "curso" ? "Eliminar Curso" : "Eliminar Inscricao"}
        mensagem={confirmDelete.tipo === "curso"
          ? "Tem certeza que deseja eliminar o curso \"" + confirmDelete.nome + "\"?"
          : "Tem certeza que deseja eliminar esta inscrição?"}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={confirmDelete.tipo === "curso" ? eliminarCurso : eliminarInscricao}
        onCancel={function () { setConfirmDelete({ open: false, id: null, nome: "", tipo: "" }); }}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>Desenvolvimento</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Formacao</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Formacao e Desenvolvimento</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={aba === "cursos" ? abrirNovoCurso : abrirNovoInscricao} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            {aba === "cursos" ? "Novo Curso" : "Nova Inscricao"}
          </button>
        </div>
      </section>

      <div className="flex gap-1 border-b border-outline-variant/20">
        <button onClick={function () { setAba("cursos"); }} className={"flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors border-b-2 " + (aba === "cursos" ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface border-transparent")}>
          <span className="material-symbols-outlined text-[18px]">school</span>
          Cursos
        </button>
        <button onClick={function () { setAba("inscricoes"); }} className={"flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors border-b-2 " + (aba === "inscricoes" ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface border-transparent")}>
          <span className="material-symbols-outlined text-[18px]">badge</span>
          Inscricoes
        </button>
      </div>

      {msg && (
        <div className={"p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 " + (msg.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10")}>
          <span className="material-symbols-outlined text-[18px]">{msg.tipo === "sucesso" ? "check_circle" : "error"}</span>
          {msg.texto}
          <button onClick={function () { setMsg(null); }} className="ml-auto hover:opacity-60">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {aba === "cursos" && (
        <>
          <section className="glass-panel p-5 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-grow space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Curso</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                  <input
                    type="text"
                    placeholder="Nome do curso..."
                    value={searchCurso}
                    onChange={function (e) { setSearchCurso(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter") carregarCursos(1); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
                  <select value={filtroEstadoCurso} onChange={function (e) { setFiltroEstadoCurso(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Todos</option>
                    {ESTADOS_CURSO.map(function (e) { return <option key={e.value} value={e.value}>{e.label}</option>; })}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Tipo</label>
                  <select value={filtroTipoCurso} onChange={function (e) { setFiltroTipoCurso(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Todos</option>
                    {TIPOS_CURSO.map(function (tp) { return <option key={tp.value} value={tp.value}>{tp.label}</option>; })}
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <button onClick={function () { carregarCursos(1); }} className="w-full px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                    Filtrar
                  </button>
                </div>
              </div>
            </div>
            {cursoFilters.length > 0 && (
              <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros activos:</span>
                {cursoFilters.map(function (f, i) {
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                      {f.label}
                      <button onClick={f.onClear} className="hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
                    </span>
                  );
                })}
                <button onClick={function () { setFiltroEstadoCurso(""); setFiltroTipoCurso(""); setSearchCurso(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
              </div>
            )}
          </section>

          <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse data-grid-tight">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant/20">
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Periodo</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Vagas</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Local</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loadingCursos ? (
                    [1,2,3,4,5].map(function (i) {
                      return (
                        <tr key={i}><td colSpan={7} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                      );
                    })
                  ) : cursos.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">school</span>
                      <p className="text-on-surface-variant font-medium">Nenhum curso encontrado</p>
                      <p className="text-[13px] text-outline mt-1">Clique em &quot;Novo Curso&quot; para adicionar</p>
                    </td></tr>
                  ) : (
                    cursos.map(function (c) {
                      return (
                        <tr key={c.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{c.nome}</span>
                              {c.categoria && <span className="text-[12px] text-on-surface-variant/70">{c.categoria}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + getTipoBadgeClass(c.tipo)}>
                              {c.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface-variant text-[13px]">
                              {helpers.formatDate(c.data_inicio)} - {helpers.formatDate(c.data_fim)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface">{c.vagas || "—"}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface-variant text-[13px]">{c.local || "—"}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + helpers.getEstadoBadgeClass(c.estado)}>
                              <span className={"w-1.5 h-1.5 rounded-full " + (c.estado === "Concluido" ? "bg-success" : c.estado === "Em_curso" ? "bg-info" : c.estado === "Cancelado" ? "bg-error" : "bg-outline")} />
                              {(c.estado || "").replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end">
                              <button onClick={function () { abrirVerCurso(c); }} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                              </button>
                              <button onClick={function () { abrirEditarCurso(c); }} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button onClick={function () { setConfirmDelete({ open: true, id: c.id, nome: c.nome, tipo: "curso" }); }} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
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
                Exibindo {cursos.length} de {paginacaoCursos.total} cursos
              </div>
              {renderPagination(paginacaoCursos, carregarCursos)}
            </div>
          </section>
        </>
      )}

      {aba === "inscricoes" && (
        <>
          <section className="glass-panel p-5 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-grow space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Curso</label>
                <select value={filtroCursoInsc} onChange={function (e) { setFiltroCursoInsc(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos os cursos</option>
                  {cursosDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome}</option>; })}
                </select>
              </div>
              <div className="flex-grow space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Colaborador</label>
                <select value={filtroColabInsc} onChange={function (e) { setFiltroColabInsc(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos os colaboradores</option>
                  {colaboradoresDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>; })}
                </select>
              </div>
              <div className="space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
                <select value={filtroEstadoInsc} onChange={function (e) { setFiltroEstadoInsc(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos</option>
                  {ESTADOS_INSCRICAO.map(function (e) { return <option key={e.value} value={e.value}>{e.label}</option>; })}
                </select>
              </div>
              <div className="flex items-end pb-0.5">
                <button onClick={function () { carregarInscricoes(1); }} className="w-full px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                  Filtrar
                </button>
              </div>
            </div>
            {inscFilters.length > 0 && (
              <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros activos:</span>
                {inscFilters.map(function (f, i) {
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                      {f.label}
                      <button onClick={f.onClear} className="hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
                    </span>
                  );
                })}
                <button onClick={function () { setFiltroCursoInsc(""); setFiltroColabInsc(""); setFiltroEstadoInsc(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
              </div>
            )}
          </section>

          <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse data-grid-tight">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant/20">
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Colaborador</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Curso</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Data Inscricao</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nota</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Certificado</th>
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loadingInscricoes ? (
                    [1,2,3,4,5].map(function (i) {
                      return (
                        <tr key={i}><td colSpan={7} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                      );
                    })
                  ) : inscricoes.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">badge</span>
                      <p className="text-on-surface-variant font-medium">Nenhuma inscrição encontrada</p>
                      <p className="text-[13px] text-outline mt-1">Clique em &quot;Nova Inscricao&quot; para adicionar</p>
                    </td></tr>
                  ) : (
                    inscricoes.map(function (ins) {
                      var colabNome = ins.colaborador ? ins.colaborador.nome_completo : "—";
                      var colabNum = ins.colaborador ? ins.colaborador.numero_colaborador : "";
                      var cursoNome = ins.curso ? ins.curso.nome : "—";
                      return (
                        <tr key={ins.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{colabNome}</span>
                              {colabNum && <span className="text-[12px] text-on-surface-variant/70">{colabNum}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface-variant text-[13px]">{cursoNome}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface-variant text-[13px]">{helpers.formatDate(ins.data_inscrição)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + getInscricaoEstadoBadge(ins.estado)}>
                              <span className={"w-1.5 h-1.5 rounded-full " + (ins.estado === "Concluido" || ins.estado === "Certificado" ? "bg-success" : ins.estado === "Abandonou" ? "bg-error" : "bg-info")} />
                              {ins.estado}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface font-medium">{ins.nota_avaliacao != null && ins.nota_avaliacao !== "" ? ins.nota_avaliacao : "—"}</span>
                          </td>
                          <td className="px-4 py-4">
                            {ins.certificado ? (
                              <span className="material-symbols-outlined text-[18px] text-success">verified</span>
                            ) : (
                              <span className="material-symbols-outlined text-[18px] text-outline-variant/40">close</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end">
                              <button onClick={function () { abrirEditarInscricao(ins); }} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button onClick={function () { setConfirmDelete({ open: true, id: ins.id, nome: "", tipo: "inscrição" }); }} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
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
                Exibindo {inscricoes.length} de {paginacaoInsc.total} inscricoes
              </div>
              {renderPagination(paginacaoInsc, carregarInscricoes)}
            </div>
          </section>
        </>
      )}

      {showCursoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowCursoModal(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editandoCurso ? "Editar Curso" : "Novo Curso"}</h3>
              <button onClick={function () { setShowCursoModal(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={guardarCurso} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome *</label>
                  <input name="nome" value={cursoForm.nome} onChange={handleCursoInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Descrição</label>
                  <textarea name="descricao" value={cursoForm.descricao} onChange={handleCursoInput} rows={3} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Categoria</label>
                  <input name="categoria" value={cursoForm.categoria} onChange={handleCursoInput} placeholder="Ex: Seguranca, Gestao, TI" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Tipo</label>
                  <select name="tipo" value={cursoForm.tipo} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {TIPOS_CURSO.map(function (tp) { return <option key={tp.value} value={tp.value}>{tp.label}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Horas</label>
                  <input name="horas" type="number" min="0" value={cursoForm.horas} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Vagas</label>
                  <input name="vagas" type="number" min="0" value={cursoForm.vagas} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Início</label>
                  <input name="data_inicio" type="date" value={cursoForm.data_inicio} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data Fim</label>
                  <input name="data_fim" type="date" value={cursoForm.data_fim} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Local</label>
                  <input name="local" value={cursoForm.local} onChange={handleCursoInput} placeholder="Ex: Sala de Formacao, Online" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado</label>
                  <select name="estado" value={cursoForm.estado} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {ESTADOS_CURSO.map(function (e) { return <option key={e.value} value={e.value}>{e.label}</option>; })}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={function () { setShowCursoModal(false); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingCurso} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{savingCurso ? "hourglass_empty" : "save"}</span>
                  {savingCurso ? "A guardar..." : editandoCurso ? "Actualizar" : "Criar Curso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInscricaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowInscricaoModal(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editandoInscricao ? "Editar Inscricao" : "Nova Inscricao"}</h3>
              <button onClick={function () { setShowInscricaoModal(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={guardarInscricao} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Curso *</label>
                  <select name="curso_id" value={inscriçãoForm.curso_id} onChange={handleInscricaoInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Selecionar curso</option>
                    {cursosDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome}</option>; })}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador *</label>
                  <select name="colaborador_id" value={inscriçãoForm.colaborador_id} onChange={handleInscricaoInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Selecionar colaborador</option>
                    {colaboradoresDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado</label>
                  <select name="estado" value={inscriçãoForm.estado} onChange={handleInscricaoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {ESTADOS_INSCRICAO.map(function (e) { return <option key={e.value} value={e.value}>{e.label}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nota de Avaliacao</label>
                  <input name="nota_avaliacao" type="number" min="0" max="20" step="0.5" value={inscriçãoForm.nota_avaliacao} onChange={handleInscricaoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Horas Realizadas</label>
                  <input name="horas_realizadas" type="number" min="0" step="0.5" value={inscriçãoForm.horas_realizadas} onChange={handleInscricaoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input
                    type="checkbox"
                    id="certificado"
                    name="certificado"
                    checked={inscriçãoForm.certificado}
                    onChange={handleInscricaoCheckbox}
                    className="w-4 h-4 text-primary bg-background border-outline-variant rounded focus:ring-primary/20"
                  />
                  <label htmlFor="certificado" className="text-[13px] font-semibold text-on-surface cursor-pointer">Certificado Obtido</label>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Observacoes</label>
                  <textarea name="observacoes" value={inscriçãoForm.observacoes} onChange={handleInscricaoInput} rows={3} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={function () { setShowInscricaoModal(false); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingInscricao} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{savingInscricao ? "hourglass_empty" : "save"}</span>
                  {savingInscricao ? "A guardar..." : editandoInscricao ? "Actualizar" : "Criar Inscricao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewCurso && cursoView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowViewCurso(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Detalhes do Curso</h3>
              <button onClick={function () { setShowViewCurso(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[32px] text-primary">school</span>
                </div>
                <div className="flex-grow">
                  <h2 className="text-xl font-bold text-on-surface">{cursoView.nome}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + getTipoBadgeClass(cursoView.tipo)}>
                      {cursoView.tipo}
                    </span>
                    <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + helpers.getEstadoBadgeClass(cursoView.estado)}>
                      {(cursoView.estado || "").replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                  Informacoes Gerais
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Categoria", cursoView.categoria],
                    ["Horas", cursoView.horas],
                    ["Vagas", cursoView.vagas],
                    ["Local", cursoView.local],
                    ["Data de Início", cursoView.data_inicio ? helpers.formatDate(cursoView.data_inicio) : null],
                    ["Data Fim", cursoView.data_fim ? helpers.formatDate(cursoView.data_fim) : null],
                  ].map(function (pair) {
                    return (
                      <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
                {cursoView.descricao && (
                  <div className="mt-3 bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Descrição</p>
                    <p className="text-[13px] text-on-surface">{cursoView.descricao}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={function () { setShowViewCurso(false); abrirEditarCurso(cursoView); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar
                </button>
                <button onClick={function () { setShowViewCurso(false); }} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">close</span>
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