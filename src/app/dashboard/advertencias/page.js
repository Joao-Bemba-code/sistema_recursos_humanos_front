"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

var API_BASE = api.baseURL;

var TIPOS_ADVERTENCIA = [
  { value: "Advertencia", label: "Advertência", icon: "warning", color: "var(--color-warning)" },
  { value: "Suspenso", label: "Suspensão", icon: "block", color: "#f59e0b" },
  { value: "Reprovacao", label: "Reprovação", icon: "thumb_down", color: "#0ea5e9" },
  { value: "Despedimento", label: "Despedimento", icon: "person_remove", color: "#ef4444" },
  { value: "Outra", label: "Outra", icon: "more_horiz", color: "#64748b" },
];

var ESTADOS_ADVERTENCIA = [
  { value: "Registada", label: "Registada" },
  { value: "Em_analise", label: "Em Análise" },
  { value: "Resolvida", label: "Resolvida" },
  { value: "Arquivada", label: "Arquivada" },
];

var ESTADO_BADGES = {
  "Registada": "info",
  "Em_analise": "warning",
  "Resolvida": "success",
  "Arquivada": "secondary",
};

function tipoInfo(tipo) {
  return TIPOS_ADVERTENCIA.filter(function (t) { return t.value === tipo; })[0] || TIPOS_ADVERTENCIA[4];
}

export default function AdvertenciasPage() {
  var toast = useToast();

  var [ocorrencias, setOcorrencias] = useState([]);
  var [colaboradores, setColaboradores] = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState("");
  var [filtroTipo, setFiltroTipo] = useState("");
  var [filtroEstado, setFiltroEstado] = useState("");
  var [filtroColaborador, setFiltroColaborador] = useState("");
  var [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  var [showModal, setShowModal] = useState(false);
  var [editando, setEditando] = useState(null);
  var [form, setForm] = useState({});
  var [saving, setSaving] = useState(false);
  var [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "" });
  var [showView, setShowView] = useState(false);
  var [viewItem, setViewItem] = useState(null);
  var [gerandoPdf, setGerandoPdf] = useState(false);

  var carregarOcorrencias = useCallback(async function (page) {
    setLoading(true);
    try {
      var url = "/api/ocorrencias?page=" + (page || 1) + "&limit=15";
      if (search) url += "&search=" + encodeURIComponent(search);
      if (filtroTipo) url += "&tipo=" + encodeURIComponent(filtroTipo);
      if (filtroEstado) url += "&estado=" + encodeURIComponent(filtroEstado);
      if (filtroColaborador) url += "&colaborador_id=" + encodeURIComponent(filtroColaborador);
      var data = await api.get(url);
      setOcorrencias(data.dados || []);
      setPaginacao(data.paginacao);
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filtroTipo, filtroEstado, filtroColaborador, toast]);

  var carregarColaboradores = useCallback(async function () {
    try {
      var data = await api.get("/api/colaboradores?limit=200");
      setColaboradores(data.dados || []);
    } catch (e) {
      console.log("Erro ao carregar colaboradores:", e.message);
    }
  }, []);

  useEffect(function () {
    carregarColaboradores();
  }, [carregarColaboradores]);

  useEffect(function () {
    carregarOcorrencias(1);
  }, [carregarOcorrencias]);

  var defaultForm = {
    colaborador_id: "", tipo: "Advertencia", data_ocorrencia: "",
    descricao: "", testemunhas: "", providencias: "",
    penalidade: "", duracao_suspensao: "", estado: "Registada",
  };

  var abrirNovo = function () {
    setEditando(null);
    setForm({
      ...defaultForm,
      data_ocorrencia: new Date().toISOString().slice(0, 10),
    });
    setShowModal(true);
  };

  var abrirEditar = function (o) {
    setEditando(o);
    var f = {
      colaborador_id: o.colaborador_id || "",
      tipo: o.tipo || "Advertencia",
      data_ocorrencia: o.data_ocorrencia || "",
      descricao: o.descricao || "",
      testemunhas: o.testemunhas || "",
      providencias: o.providencias || "",
      penalidade: o.penalidade || "",
      duracao_suspensao: o.duracao_suspensao || "",
      estado: o.estado || "Registada",
    };
    setForm(f);
    setShowModal(true);
  };

  var abrirVer = function (o) {
    setViewItem(o);
    setShowView(true);
  };

  var guardar = async function (e) {
    e.preventDefault();
    if (!form.colaborador_id || !form.tipo || !form.data_ocorrencia || !form.descricao) {
      toast.addToast("error", "Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    try {
      var payload = { ...form };
      if (!payload.duracao_suspensao) delete payload.duracao_suspensao;
      if (editando) {
        await api.put("/api/ocorrencias/" + editando.id, payload);
        toast.addToast("success", "Ocorrência atualizada com sucesso");
      } else {
        delete payload.estado;
        await api.post("/api/ocorrencias", payload);
        toast.addToast("success", "Ocorrência registada com sucesso");
      }
      setShowModal(false);
      carregarOcorrencias(paginacao.pagina);
    } catch (err) {
      toast.addToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  var eliminar = async function () {
    try {
      await api.delete("/api/ocorrencias/" + confirmDelete.id);
      toast.addToast("success", "Ocorrência eliminada com sucesso");
      setConfirmDelete({ open: false, id: null, nome: "" });
      carregarOcorrencias(1);
    } catch (e) {
      toast.addToast("error", e.message);
    }
  };

  var gerarPdf = async function (o) {
    if (!o) return;
    setGerandoPdf(true);
    try {
      var url = API_BASE + "/api/pdf/aviso-advertencia/" + o.colaborador_id + "?descricao=" + encodeURIComponent(o.descricao || "") + "&numero=" + encodeURIComponent(o.numero || "");
      var token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      var headers = {};
      if (token) headers["Authorization"] = "Bearer " + token;
      var response = await fetch(url, { headers: headers });
      if (!response.ok) {
        var errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar PDF");
      }
      var blob = await response.blob();
      var blobUrl = window.URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = blobUrl;
      a.download = "advertencia_" + (o.numero || "ocorrencia") + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.addToast("success", "PDF gerado com sucesso");
    } catch (err) {
      toast.addToast("error", err.message || "Erro ao gerar PDF");
    } finally {
      setGerandoPdf(false);
    }
  };

  var nomeColaborador = function (id) {
    if (!id) return "—";
    var c = colaboradores.filter(function (x) { return String(x.id) === String(id); })[0];
    return c ? c.nome_completo : "Colaborador";
  };

  var numColaborador = function (id) {
    var c = colaboradores.filter(function (x) { return String(x.id) === String(id); })[0];
    return c ? c.numero_colaborador : "";
  };

  var activeFilters = [];
  if (filtroTipo) activeFilters.push({ label: "Tipo: " + (tipoInfo(filtroTipo).label), onClear: function () { setFiltroTipo(""); } });
  if (filtroEstado) activeFilters.push({ label: "Estado: " + (ESTADOS_ADVERTENCIA.filter(function (s) { return s.value === filtroEstado; })[0] || {}).label, onClear: function () { setFiltroEstado(""); } });
  if (filtroColaborador) activeFilters.push({ label: "Colaborador: " + nomeColaborador(filtroColaborador), onClear: function () { setFiltroColaborador(""); } });

  var inputCls = "w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
  var labelCls = "text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1";

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Ocorrência"
        mensagem={"Tem certeza que deseja eliminar a ocorrência #" + confirmDelete.nome + "? Esta ação não pode ser desfeita."}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={function () { setConfirmDelete({ open: false, id: null, nome: "" }); }}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>SGHR</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Advertências</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Gestão de Advertências</h1>
          <p className="text-[13px] text-on-surface-variant/70">Registe e acompanhe ocorrências disciplinares dos colaboradores.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={abrirNovo}>
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Nova Advertência
          </Button>
        </div>
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Ocorrência</label>
              <div className="relative mt-1.5">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Número, descrição..."
                  value={search}
                  onChange={function (e) { setSearch(e.target.value); }}
                  onKeyDown={function (e) { if (e.key === "Enter") carregarOcorrencias(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={filtroTipo} onChange={function (e) { setFiltroTipo(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {TIPOS_ADVERTENCIA.map(function (t) { return <option key={t.value} value={t.value}>{t.label}</option>; })}
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select value={filtroEstado} onChange={function (e) { setFiltroEstado(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {ESTADOS_ADVERTENCIA.map(function (s) { return <option key={s.value} value={s.value}>{s.label}</option>; })}
              </select>
            </div>
            <div>
              <label className={labelCls}>Colaborador</label>
              <div className="flex gap-2 mt-1.5">
                <select value={filtroColaborador} onChange={function (e) { setFiltroColaborador(e.target.value); }} className="flex-1 px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos</option>
                  {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo}</option>; })}
                </select>
                <Button onClick={function () { carregarOcorrencias(1); }} variant="outline" size="sm" className="px-3">
                  <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                </Button>
              </div>
            </div>
          </div>
          {activeFilters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros ativos:</span>
              {activeFilters.map(function (f, i) {
                return (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                    {f.label}
                    <button onClick={f.onClear} className="hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
                  </span>
                );
              })}
              <button onClick={function () { setFiltroTipo(""); setFiltroEstado(""); setFiltroColaborador(""); setSearch(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse data-grid-tight">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider w-[260px]">Colaborador</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nº</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Data</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Descrição</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                [1,2,3,4,5].map(function (i) {
                  return (
                    <tr key={i}><td colSpan={7} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                  );
                })
              ) : ocorrencias.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">warning</span>
                  <p className="text-on-surface-variant font-medium">Nenhuma ocorrência encontrada</p>
                  <p className="text-[13px] text-outline mt-1">Clique em &quot;Nova Advertência&quot; para registar</p>
                </td></tr>
              ) : (
                ocorrencias.map(function (o) {
                  var tipo = tipoInfo(o.tipo);
                  return (
                    <tr key={o.id} className="hover:bg-primary/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full border border-outline-variant/30 shadow-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[12px] font-bold text-primary">{helpers.getInitials(o.colaborador ? o.colaborador.nome_completo : nomeColaborador(o.colaborador_id))}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{o.colaborador ? o.colaborador.nome_completo : nomeColaborador(o.colaborador_id)}</span>
                            <span className="text-[12px] text-on-surface-variant/70">{o.numero}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[12px] font-mono text-on-surface-variant">{o.colaborador ? o.colaborador.numero_colaborador : numColaborador(o.colaborador_id)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ backgroundColor: tipo.color + "14", color: tipo.color, borderColor: tipo.color + "30" }}>
                          <span className="material-symbols-outlined text-[13px]">{tipo.icon}</span>
                          {tipo.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface-variant">{helpers.formatDate(o.data_ocorrencia)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[13px] text-on-surface-variant/80 line-clamp-1">{o.descricao}</span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={ESTADO_BADGES[o.estado] || "secondary"}>
                          {(ESTADOS_ADVERTENCIA.filter(function (s) { return s.value === o.estado; })[0] || {}).label || o.estado}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <Button onClick={function () { abrirVer(o); }} variant="ghost" size="icon-sm" title="Ver">
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                          </Button>
                          <Button onClick={function () { abrirEditar(o); }} variant="ghost" size="icon-sm" title="Editar">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </Button>
                          <Button onClick={function () { gerarPdf(o); }} variant="ghost" size="icon-sm" title="Gerar PDF">
                            <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                          </Button>
                          <Button onClick={function () { setConfirmDelete({ open: true, id: o.id, nome: o.numero }); }} variant="ghost" size="icon-sm" title="Eliminar">
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </Button>
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
            Exibindo {ocorrencias.length} de {paginacao.total} ocorrências
          </div>
          {paginacao.total_paginas > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(paginacao.total_paginas, 5) }, function (_, i) { return i + 1; }).map(function (p) {
                return (
                  <Button key={p} onClick={function () { carregarOcorrencias(p); }} variant={p === paginacao.pagina ? "default" : "outline"} size="sm" className="min-w-[32px]">
                    {p}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Modal
        isOpen={showModal}
        onClose={function () { setShowModal(false); }}
        title={editando ? "Editar Advertência #" + editando.numero : "Nova Advertência"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={function () { setShowModal(false); }}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving}>
              <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
              {saving ? "A guardar..." : editando ? "Atualizar" : "Registar Ocorrência"}
            </Button>
          </>
        }
      >
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Colaborador *</label>
              <select value={form.colaborador_id || ""} onChange={function (e) { setForm({ ...form, colaborador_id: e.target.value }); }} className={inputCls}>
                <option value="">Selecionar colaborador</option>
                {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>; })}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo de Ocorrência *</label>
              <select value={form.tipo || "Advertencia"} onChange={function (e) { setForm({ ...form, tipo: e.target.value }); }} className={inputCls}>
                {TIPOS_ADVERTENCIA.map(function (t) { return <option key={t.value} value={t.value}>{t.label}</option>; })}
              </select>
            </div>
            <div>
              <label className={labelCls}>Data da Ocorrência *</label>
              <input type="date" value={form.data_ocorrencia || ""} onChange={function (e) { setForm({ ...form, data_ocorrencia: e.target.value }); }} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Descrição *</label>
              <textarea rows={3} value={form.descricao || ""} onChange={function (e) { setForm({ ...form, descricao: e.target.value }); }} placeholder="Descreva a falta ou indisciplina (ex: Abandono do posto de trabalho, Insubordinação...)" className={inputCls + " resize-y"} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Testemunhas</label>
              <input type="text" value={form.testemunhas || ""} onChange={function (e) { setForm({ ...form, testemunhas: e.target.value }); }} placeholder="Nomes das testemunhas, se houver" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Providências Tomadas</label>
              <textarea rows={2} value={form.providencias || ""} onChange={function (e) { setForm({ ...form, providencias: e.target.value }); }} placeholder="Medidas imediatas tomadas" className={inputCls + " resize-y"} />
            </div>
            <div>
              <label className={labelCls}>Penalidade</label>
              <input type="text" value={form.penalidade || ""} onChange={function (e) { setForm({ ...form, penalidade: e.target.value }); }} placeholder="Ex: Repreensão escrita" className={inputCls} />
            </div>
            {form.tipo === "Suspenso" && (
              <div>
                <label className={labelCls}>Duração da Suspensão (dias)</label>
                <input type="number" min="1" value={form.duracao_suspensao || ""} onChange={function (e) { setForm({ ...form, duracao_suspensao: e.target.value }); }} className={inputCls} />
              </div>
            )}
            {editando && (
              <div>
                <label className={labelCls}>Estado</label>
                <select value={form.estado || "Registada"} onChange={function (e) { setForm({ ...form, estado: e.target.value }); }} className={inputCls}>
                  {ESTADOS_ADVERTENCIA.map(function (s) { return <option key={s.value} value={s.value}>{s.label}</option>; })}
                </select>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {showView && viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowView(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface tracking-tight">Ocorrência #{viewItem.numero}</h3>
                <p className="text-[12px] text-on-surface-variant/70">Registada em {helpers.formatDate(viewItem.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={function () { gerarPdf(viewItem); }} variant="ghost" size="sm" disabled={gerandoPdf}>
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  PDF
                </Button>
                <Button onClick={function () { setShowView(false); }} variant="ghost" size="icon-sm">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wider mb-1">Colaborador</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-outline-variant/30 flex items-center justify-center">
                      <span className="text-[13px] font-bold text-primary">{helpers.getInitials(viewItem.colaborador ? viewItem.colaborador.nome_completo : nomeColaborador(viewItem.colaborador_id))}</span>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-on-surface">{viewItem.colaborador ? viewItem.colaborador.nome_completo : nomeColaborador(viewItem.colaborador_id)}</p>
                      <p className="text-[12px] text-on-surface-variant/70">{viewItem.colaborador ? viewItem.colaborador.numero_colaborador : numColaborador(viewItem.colaborador_id)}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ backgroundColor: tipoInfo(viewItem.tipo).color + "14", color: tipoInfo(viewItem.tipo).color, borderColor: tipoInfo(viewItem.tipo).color + "30" }}>
                    <span className="material-symbols-outlined text-[13px]">{tipoInfo(viewItem.tipo).icon}</span>
                    {tipoInfo(viewItem.tipo).label}
                  </span>
                  <div className="mt-2">
                    <Badge variant={ESTADO_BADGES[viewItem.estado] || "secondary"}>
                      {(ESTADOS_ADVERTENCIA.filter(function (s) { return s.value === viewItem.estado; })[0] || {}).label || viewItem.estado}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Data da Ocorrência</p>
                  <p className="text-[13px] font-semibold text-on-surface">{helpers.formatDate(viewItem.data_ocorrencia)}</p>
                </div>
                {viewItem.duracao_suspensao ? (
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Duração da Suspensão</p>
                    <p className="text-[13px] font-semibold text-on-surface">{viewItem.duracao_suspensao} dia(s)</p>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Descrição</p>
                <div className="bg-background/50 rounded-lg p-4 border border-outline-variant/20">
                  <p className="text-[13px] text-on-surface leading-relaxed whitespace-pre-line">{viewItem.descricao}</p>
                </div>
              </div>

              {viewItem.testemunhas && (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Testemunhas</p>
                  <p className="text-[13px] text-on-surface">{viewItem.testemunhas}</p>
                </div>
              )}

              {viewItem.providencias && (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Providências Tomadas</p>
                  <p className="text-[13px] text-on-surface">{viewItem.providencias}</p>
                </div>
              )}

              {viewItem.penalidade && (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Penalidade</p>
                  <p className="text-[13px] text-on-surface">{viewItem.penalidade}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}