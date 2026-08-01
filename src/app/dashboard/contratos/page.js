"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { TIPOS_CONTRATO } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const ESTADOS_CONTRATO = [
  { value: "Activo", label: "Activo" },
  { value: "Suspenso", label: "Suspenso" },
  { value: "Rescindido", label: "Rescindido" },
  { value: "Expirado", label: "Expirado" },
  { value: "Renovado", label: "Renovado" },
];

export default function ContratosPage() {
  const [contratos, setContratos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, numero: "" });
  const [showViewModal, setShowViewModal] = useState(false);
  const [contratoView, setContratoView] = useState(null);

  const carregar = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/api/contratos?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filtroTipo) url += `&tipo=${filtroTipo}`;
      if (filtroEstado) url += `&estado=${filtroEstado}`;
      const data = await api.get(url);
      setContratos(data.dados);
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
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { carregar(); carregarColaboradores(); }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm({
      numero: "", tipo: "Indeterminado", data_inicio: "", data_fim: "",
      salario_base: "", moeda: "AOA", funcao: "", local_trabalho: "",
      horario_trabalho: "", estado: "Activo", colaborador_id: "",
      periodo_experimentacao: "", observacoes: "",
    });
    setShowModal(true);
    setMsg(null);
  };

  const abrirEditar = (c) => {
    setEditando(c);
    setForm({
      numero: c.numero || "",
      tipo: c.tipo || "Indeterminado",
      data_inicio: c.data_inicio || "",
      data_fim: c.data_fim || "",
      salario_base: c.salario_base || "",
      moeda: c.moeda || "AOA",
      funcao: c.funcao || "",
      local_trabalho: c.local_trabalho || "",
      horario_trabalho: c.horario_trabalho || "",
      estado: c.estado || "Activo",
      colaborador_id: c.colaborador_id || "",
      periodo_experimentacao: c.periodo_experimentacao || "",
      observacoes: c.observacoes || "",
    });
    setShowModal(true);
    setMsg(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (editando) {
        await api.put(`/api/contratos/${editando.id}`, form);
        setMsg({ tipo: "sucesso", texto: "Contrato atualizado com sucesso" });
      } else {
        await api.post("/api/contratos", form);
        setMsg({ tipo: "sucesso", texto: "Contrato criado com sucesso" });
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
      await api.delete(`/api/contratos/${confirmDelete.id}`);
      setMsg({ tipo: "sucesso", texto: "Contrato eliminado" });
      setConfirmDelete({ open: false, id: null, numero: "" });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirVer = (c) => {
    setContratoView(c);
    setShowViewModal(true);
  };

  const tipoLabel = (v) => (TIPOS_CONTRATO.find(t => t.value === v) || {}).label || v || "—";

  const gerarPDF = async () => {
    var c = contratoView;
    if (!c) return;
    try {
      await api.downloadPdf("/api/pdf/contrato/" + c.id, "contrato_" + (c.numero || "documento") + ".pdf");
    } catch (e) {
      alert("Erro ao gerar PDF: " + e.message);
    }
  };

  const activeFilters = [];
  if (filtroTipo) activeFilters.push({ label: `Tipo: ${filtroTipo}`, onClear: () => setFiltroTipo("") });
  if (filtroEstado) activeFilters.push({ label: `Status: ${filtroEstado}`, onClear: () => setFiltroEstado("") });

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Contrato"
        mensagem={`Tem certeza que deseja eliminar o contrato ${confirmDelete.numero}? Esta ação não pode ser desfeita.`}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={() => setConfirmDelete({ open: false, id: null, numero: "" })}
      />
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>Colaboradores</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Gestão de Contratos</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Gestão Estratégica de Contratos</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo Contrato
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
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Contrato</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Número, função..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregar(1)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Tipo</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Qualquer</option>
                {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {ESTADOS_CONTRATO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
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
            <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros ativos:</span>
            {activeFilters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                {f.label}
                <button onClick={f.onClear} className="hover:text-error">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
            <button onClick={() => { setFiltroTipo(""); setFiltroEstado(""); setSearch(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
          </div>
        )}
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse data-grid-tight">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Número</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Colaborador</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Período</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Remuneração</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-4">
                      <div className="animate-pulse h-10 bg-surface-container rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : contratos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">description</span>
                    <p className="text-on-surface-variant font-medium">Nenhum contrato encontrado</p>
                    <p className="text-[13px] text-outline mt-1">Clique em "Novo Contrato" para adicionar</p>
                  </td>
                </tr>
              ) : (
                contratos.map((c) => (
                  <tr key={c.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-bold text-on-surface">{c.numero}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-on-surface">{c.colaborador?.nome_completo || "—"}</span>
                        <span className="text-[12px] text-primary font-medium">{c.funcao || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-on-surface">{(TIPOS_CONTRATO.find(t => t.value === c.tipo) || {}).label || c.tipo}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-on-surface">{helpers.formatDate(c.data_inicio)}</span>
                        <span className="text-[11px] text-on-surface-variant/60 italic">até {helpers.formatDate(c.data_fim) || "Indefinido"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-on-surface">{helpers.formatCurrency(c.salario_base, c.moeda)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        c.estado === "Activo" ? "badge-success" : c.estado === "Expirado" ? "badge-danger" : "badge-warning"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.estado === "Activo" ? "bg-success" : c.estado === "Expirado" ? "bg-error" : "bg-warning"}`} />
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button onClick={() => abrirVer(c)} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                        </button>
                        <button onClick={() => abrirEditar(c)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button onClick={() => setConfirmDelete({ open: true, id: c.id, numero: c.numero })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
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
            Exibindo {contratos.length} de {paginacao.total} contratos
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
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editando ? "Editar Contrato" : "Novo Contrato"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardar} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Número do Contrato *</label>
                  <input name="numero" value={form.numero || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador</label>
                  <select name="colaborador_id" value={form.colaborador_id || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Selecionar colaborador</option>
                    {colaboradores.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Tipo *</label>
                  <select name="tipo" value={form.tipo || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Função</label>
                  <input name="funcao" value={form.funcao || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Início *</label>
                  <input name="data_inicio" type="date" value={form.data_inicio || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Fim</label>
                  <input name="data_fim" type="date" value={form.data_fim || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Salário Base *</label>
                  <input name="salario_base" type="number" step="0.01" value={form.salario_base || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Moeda</label>
                  <select name="moeda" value={form.moeda || "AOA"} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="AOA">AOA (Kwanza)</option>
                    <option value="USD">USD (Dólar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado</label>
                  <select name="estado" value={form.estado || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {ESTADOS_CONTRATO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Dias de Experimentação</label>
                  <input name="periodo_experimentacao" type="number" value={form.periodo_experimentacao || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Local de Trabalho</label>
                  <input name="local_trabalho" value={form.local_trabalho || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Observações</label>
                  <textarea name="observacoes" value={form.observacoes || ""} onChange={handleInput} rows={3} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
                  {saving ? "A guardar..." : editando ? "Atualizar" : "Criar Contrato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && contratoView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Detalhes do Contrato</h3>
              <div className="flex items-center gap-2">
                <button onClick={gerarPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 text-error text-[12px] font-semibold hover:bg-error/20 transition-all border border-error/10">
                  <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                  PDF
                </button>
                <button onClick={() => setShowViewModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[24px]">description</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">{contratoView.numero}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                      contratoView.estado === "Activo" ? "badge-success" : contratoView.estado === "Expirado" ? "badge-danger" : "badge-warning"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${contratoView.estado === "Activo" ? "bg-success" : contratoView.estado === "Expirado" ? "bg-error" : "bg-warning"}`} />
                      {contratoView.estado}
                    </span>
                    <span className="text-[12px] text-on-surface-variant/60 badge-primary px-2 py-0.5 rounded">{tipoLabel(contratoView.tipo)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3">Dados do Contrato</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[["Número", contratoView.numero], ["Função", contratoView.funcao], ["Tipo", tipoLabel(contratoView.tipo)],
                    ["Data de Início", contratoView.data_inicio ? helpers.formatDate(contratoView.data_inicio) : null],
                    ["Data Fim", contratoView.data_fim ? helpers.formatDate(contratoView.data_fim) : null],
                    ["Assinatura", contratoView.data_assinatura ? helpers.formatDate(contratoView.data_assinatura) : null],
                  ].map(function(p) {
                    return (
                      <div key={p[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{p[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{p[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3">Condições</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[["Salário", contratoView.salario_base ? Number(contratoView.salario_base).toLocaleString("pt-AO") + " " + (contratoView.moeda || "AOA") : null],
                    ["Experimentação", contratoView.periodo_experimentacao ? contratoView.periodo_experimentacao + " dias" : null],
                    ["Local", contratoView.local_trabalho], ["Horário", contratoView.horario_trabalho],
                  ].map(function(p) {
                    return (
                      <div key={p[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{p[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{p[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(contratoView.observacoes || contratoView.motivo_rescisao) && (
                <div>
                  <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3">Observações</h4>
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20 space-y-2">
                    {contratoView.motivo_rescisao && <p className="text-[13px] text-on-surface"><span className="font-semibold">Motivo Rescisão:</span> {contratoView.motivo_rescisao}</p>}
                    {contratoView.observacoes && <p className="text-[13px] text-on-surface">{contratoView.observacoes}</p>}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={() => { setShowViewModal(false); abrirEditar(contratoView); }} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 text-primary text-[12px] font-semibold hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[16px]">edit</span> Editar
                </button>
                <button onClick={gerarPDF} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[12px] font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all">
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> Descarregar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}