"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { getT } from "@/lib/translations";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const ESTADOS_FERIAS = [
  { value: "Pendente", label: "Pendente" },
  { value: "Aprovado", label: "Aprovado" },
  { value: "Rejeitado", label: "Rejeitado" },
  { value: "Cancelado", label: "Cancelado" },
];

function getEstadoBadgeClass(estado) {
  switch (estado) {
    case "Aprovado": return "badge-success";
    case "Pendente": return "badge-warning";
    case "Rejeitado": return "badge-danger";
    case "Cancelado": return "badge-secondary";
    default: return "badge-secondary";
  }
}

function getEstadoDotClass(estado) {
  switch (estado) {
    case "Aprovado": return "bg-success";
    case "Pendente": return "bg-warning";
    case "Rejeitado": return "bg-error";
    case "Cancelado": return "bg-outline";
    default: return "bg-outline";
  }
}

function calcDias(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return "";
  var d1 = new Date(dataInicio);
  var d2 = new Date(dataFim);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return "";
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}

export default function FeriasPage() {
  var t = getT();
  const [ferias, setFerias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroColaborador, setFiltroColaborador] = useState("");
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "" });
  const [showViewModal, setShowViewModal] = useState(false);
  const [feriasView, setFeriasView] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);

  const carregar = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/api/ferias?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filtroEstado) url += `&estado=${encodeURIComponent(filtroEstado)}`;
      if (filtroColaborador) url += `&colaborador_id=${filtroColaborador}`;
      const data = await api.get(url);
      setFerias(data.dados);
      setPaginacao(data.paginacao);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoading(false);
    }
  };

  const carregarColaboradores = async () => {
    try {
      const data = await api.get("/api/colaboradores?limit=200");
      setColaboradores(data.dados);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    carregar();
    carregarColaboradores();
  }, []);

  const defaultForm = {
    colaborador_id: "",
    data_inicio: "",
    data_fim: "",
    dias_solicitados: "",
    motivo: "",
    estado: "Pendente",
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm({ ...defaultForm });
    setShowModal(true);
    setMsg(null);
  };

  const abrirEditar = (f) => {
    setEditando(f);
    setForm({
      colaborador_id: f.colaborador_id || "",
      data_inicio: f.data_inicio ? f.data_inicio.substring(0, 10) : "",
      data_fim: f.data_fim ? f.data_fim.substring(0, 10) : "",
      dias_solicitados: f.dias_solicitados || "",
      motivo: f.motivo || "",
      estado: f.estado || "Pendente",
    });
    setShowModal(true);
    setMsg(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      var body = {
        ...form,
        dias_solicitados: parseInt(form.dias_solicitados) || calcDias(form.data_inicio, form.data_fim),
      };
      if (editando) {
        await api.put(`/api/ferias/${editando.id}`, body);
        setMsg({ tipo: "sucesso", texto: "Ferias actualizadas com sucesso" });
      } else {
        await api.post("/api/ferias", body);
        setMsg({ tipo: "sucesso", texto: "Solicitacao de ferias criada com sucesso" });
      }
      setShowModal(false);
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    try {
      await api.delete(`/api/ferias/${confirmDelete.id}`);
      setMsg({ tipo: "sucesso", texto: "Solicitacao de ferias eliminada com sucesso" });
      setConfirmDelete({ open: false, id: null, nome: "" });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  const handleInput = (e) => {
    var next = { ...form, [e.target.name]: e.target.value };
    if (e.target.name === "data_inicio" || e.target.name === "data_fim") {
      var dias = calcDias(next.data_inicio, next.data_fim);
      next.dias_solicitados = dias !== "" ? String(dias) : "";
    }
    setForm(next);
  };

  const abrirVer = (f) => {
    setFeriasView(f);
    setShowViewModal(true);
  };

  const getColabName = (id) => {
    var c = colaboradores.find(function (c) { return String(c.id) === String(id); });
    return c ? c.nome_completo : "";
  };

  const activeFilters = [];
  if (filtroEstado) activeFilters.push({ label: `Estado: ${filtroEstado}`, onClear: () => setFiltroEstado("") });
  if (filtroColaborador) {
    var nome = getColabName(filtroColaborador);
    activeFilters.push({ label: `Colaborador: ${nome || filtroColaborador}`, onClear: () => setFiltroColaborador("") });
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Solicitacao de Ferias"
        mensagem={`Tem certeza que deseja eliminar as ferias de ${confirmDelete.nome}? Esta ação não pode ser desfeita.`}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={() => setConfirmDelete({ open: false, id: null, nome: "" })}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>{t.tempoPresenca || "Tempo e Presenca"}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">{t.ferias || "Ferias"}</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">{t.gestaoFerias || "Gestao de Ferias"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Nova Solicitacao
          </button>
        </div>
      </section>

      {msg && (
        <div className={`p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 ${msg.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10"}`}>
          <span className="material-symbols-outlined text-[18px]">{msg.tipo === "sucesso" ? "check_circle" : "error"}</span>
          {msg.texto}
          <button onClick={() => setMsg(null)} className="ml-auto hover:opacity-60">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <section className="glass-panel p-5 rounded-xl border border-outline-variant/30 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-grow space-y-2 w-full lg:w-auto">
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Ferias</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Nome do colaborador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregar(1)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {ESTADOS_FERIAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Colaborador</label>
              <select value={filtroColaborador} onChange={(e) => setFiltroColaborador(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {colaboradores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_completo}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <button onClick={() => carregar(1)} className="w-full px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                Filtrar
              </button>
            </div>
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros activos:</span>
            {activeFilters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                {f.label}
                <button onClick={f.onClear} className="hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
              </span>
            ))}
            <button onClick={() => { setFiltroEstado(""); setFiltroColaborador(""); setSearch(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
          </div>
        )}
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse data-grid-tight">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider w-[260px]">Colaborador</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Periodo</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Dias</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Motivo</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                ))
              ) : ferias.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">calendar_month</span>
                  <p className="text-on-surface-variant font-medium">Nenhuma solicitação de ferias encontrada</p>
                  <p className="text-[13px] text-outline mt-1">Clique em &quot;Nova Solicitacao&quot; para adicionar</p>
                </td></tr>
              ) : (
                ferias.map((f) => (
                  <tr key={f.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border border-outline-variant/30 shadow-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[12px] font-bold text-primary">
                            {helpers.getInitials(f.colaborador?.nome_completo)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface">{f.colaborador?.nome_completo || "—"}</span>
                          <span className="text-[12px] text-on-surface-variant/70">{f.colaborador?.numero_colaborador || ""}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-on-surface">{helpers.formatDate(f.data_inicio)}</span>
                        <span className="text-[12px] text-on-surface-variant/70">{helpers.formatDate(f.data_fim)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-on-surface">{f.dias_solicitados}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${getEstadoBadgeClass(f.estado)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getEstadoDotClass(f.estado)}`} />
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-on-surface-variant truncate block max-w-[180px]">{f.motivo || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button onClick={() => abrirVer(f)} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                        </button>
                        <button onClick={() => abrirEditar(f)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button onClick={() => setConfirmDelete({ open: true, id: f.id, nome: f.colaborador?.nome_completo || "" })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
            Exibindo {ferias.length} de {paginacao.total} solicitacoes
          </div>
          {paginacao.total_paginas > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(paginacao.total_paginas, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => carregar(p)} className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-all ${p === paginacao.pagina ? "bg-primary text-white font-bold" : "hover:bg-primary/5 text-on-surface-variant"}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editando ? "Editar Solicitacao" : "Nova Solicitacao de Ferias"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={guardar} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador *</label>
                  <select name="colaborador_id" value={form.colaborador_id || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <option value="">Selecionar colaborador</option>
                    {colaboradores.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Início *</label>
                  <input name="data_inicio" type="date" value={form.data_inicio || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data Fim *</label>
                  <input name="data_fim" type="date" value={form.data_fim || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Dias Solicitados</label>
                  <input name="dias_solicitados" type="number" value={form.dias_solicitados || ""} readOnly className="w-full px-3 py-2.5 bg-surface-container/50 border border-outline-variant/50 rounded-lg text-[14px] text-on-surface-variant cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado *</label>
                  <select name="estado" value={form.estado || "Pendente"} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {ESTADOS_FERIAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Motivo</label>
                  <textarea name="motivo" value={form.motivo || ""} onChange={handleInput} rows={3} placeholder="Descreva o motivo da solicitação de ferias..." className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
                  {saving ? "A guardar..." : editando ? "Actualizar" : "Criar Solicitacao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && feriasView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Detalhes da Solicitacao</h3>
              <button onClick={() => setShowViewModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-outline-variant/30 shadow-md bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary">
                    {helpers.getInitials(feriasView.colaborador?.nome_completo)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">{feriasView.colaborador?.nome_completo || "—"}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[13px] text-on-surface-variant/70">{feriasView.colaborador?.numero_colaborador}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${getEstadoBadgeClass(feriasView.estado)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getEstadoDotClass(feriasView.estado)}`} />
                      {feriasView.estado}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                  Periodo de Ferias
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Data de Início", helpers.formatDate(feriasView.data_inicio)],
                    ["Data Fim", helpers.formatDate(feriasView.data_fim)],
                    ["Dias Solicitados", feriasView.dias_solicitados ? `${feriasView.dias_solicitados} dia(s)` : "—"],
                  ].map(function (pair) {
                    return (
                      <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                  Informacoes Adicionais
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Estado</p>
                    <p className="text-[13px] font-semibold text-on-surface">{feriasView.estado}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Motivo</p>
                    <p className="text-[13px] text-on-surface">{feriasView.motivo || "—"}</p>
                  </div>
                  {feriasView.createdAt && (
                    <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Data de Criacao</p>
                      <p className="text-[13px] text-on-surface">{helpers.formatDate(feriasView.createdAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={() => { setShowViewModal(false); abrirEditar(feriasView); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar
                </button>
                <button onClick={() => { setShowViewModal(false); }} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
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
