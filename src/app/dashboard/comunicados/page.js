"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

var FORMATAR_TIPO = {
  Geral: { label: "Geral", cor: "badge-primary" },
  Urgente: { label: "Urgente", cor: "badge-danger" },
  Informativo: { label: "Informativo", cor: "badge-secondary" },
  Evento: { label: "Evento", cor: "badge-warning" },
};

var TIPOS = [
  { value: "Geral", label: "Geral" },
  { value: "Urgente", label: "Urgente" },
  { value: "Informativo", label: "Informativo" },
  { value: "Evento", label: "Evento" },
];

export default function ComunicadosPage() {
  const auth = useAuth();
  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [avisoView, setAvisoView] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, titulo: "" });
  const [departamentos, setDepartamentos] = useState([]);

  var rolesRH = ["Administrador Geral", "Director Geral", "Director de Recursos Humanos", "Técnico de RH"];
  var hasRoleRh = !!auth && !!auth.utilizador && (function () {
    var perfis = Array.isArray(auth.utilizador.perfis) && auth.utilizador.perfis.length > 0
      ? auth.utilizador.perfis
      : (auth.utilizador.perfil ? [auth.utilizador.perfil] : []);
    return perfis.some(function (p) {
      return p && rolesRH.indexOf(p.nome) !== -1;
    });
  })();
  var canManage = !!(auth && (auth.isAdmin() || auth.hasPermission("comunicados", "create") || hasRoleRh));

  const carregar = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/api/comunicados?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filtroTipo) url += `&tipo=${filtroTipo}`;
      const data = await api.get(url);
      setComunicados(data.dados);
      setPaginacao(data.paginacao);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    api.get("/api/departamentos?limit=100").then(function (data) {
      setDepartamentos(data.dados || []);
    }).catch(function () {});
  }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm({
      titulo: "",
      conteudo: "",
      tipo: "Geral",
      visivel_para: "Todos",
      departamento_id: "",
      data_inicio: new Date().toISOString().slice(0, 16),
      data_fim: "",
      publicado: true,
    });
    setShowModal(true);
    setMsg(null);
  };

  const abrirEditar = (d) => {
    setEditando(d);
    setForm({
      titulo: d.titulo || "",
      conteudo: d.conteudo || "",
      tipo: d.tipo || "Geral",
      visivel_para: d.visivel_para || "Todos",
      departamento_id: d.departamento_id || "",
      data_inicio: d.data_inicio ? new Date(d.data_inicio).toISOString().slice(0, 16) : "",
      data_fim: d.data_fim ? new Date(d.data_fim).toISOString().slice(0, 16) : "",
      publicado: d.publicado !== false,
    });
    setShowModal(true);
    setMsg(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      var payload = { ...form };
      if (!payload.departamento_id) delete payload.departamento_id;
      if (!payload.data_fim) delete payload.data_fim;
      if (editando) {
        await api.put(`/api/comunicados/${editando.id}`, payload);
        setMsg({ tipo: "sucesso", texto: "Comunicado atualizado com sucesso" });
      } else {
        await api.post("/api/comunicados", payload);
        setMsg({ tipo: "sucesso", texto: "Comunicado criado com sucesso" });
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
      await api.delete(`/api/comunicados/${confirmDelete.id}`);
      setMsg({ tipo: "sucesso", texto: "Comunicado eliminado" });
      setConfirmDelete({ open: false, id: null, titulo: "" });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  const togglePublicado = async (d) => {
    try {
      await api.put(`/api/comunicados/${d.id}/publicar`);
      setMsg({ tipo: "sucesso", texto: d.publicado ? "Comunicado despublicado" : "Comunicado publicado com sucesso" });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirVer = (d) => {
    setAvisoView(d);
    setShowViewModal(true);
  };

  const formatarData = (v) => {
    if (!v) return "";
    var d = new Date(v);
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      (d.getHours() || d.getMinutes() ? " " + d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "");
  };

  var tipoInfo = function (tipo) {
    return FORMATAR_TIPO[tipo] || { label: tipo, cor: "badge-secondary" };
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Comunicado"
        mensagem={`Tem a certeza que deseja eliminar o comunicado "${confirmDelete.titulo}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={() => setConfirmDelete({ open: false, id: null, titulo: "" })}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>Principal</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Comunicados</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Comunicados RH</h1>
          <p className="text-[13px] text-on-surface-variant/70">Comunicações oficiais do Departamento de Recursos Humanos</p>
        </div>
        {canManage && (
          <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo Comunicado
          </button>
        )}
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
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Pesquisar</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Título ou conteúdo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregar(1)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Tipo</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-8 bg-surface-container rounded-lg mb-3" />
              <div className="h-24 bg-surface rounded-xl border border-outline-variant/30" />
            </div>
          ))}
        </div>
      ) : comunicados.length === 0 ? (
        <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm py-14 text-center">
          <span className="material-symbols-outlined text-[56px] text-outline-variant/40 block mb-4">campaign</span>
          <p className="text-on-surface-variant font-medium text-[15px]">Nenhum comunicado encontrado</p>
          <p className="text-[13px] text-outline mt-1">{canManage ? 'Clique em "Novo Comunicado" para adicionar' : "Aguardando novos comunicados do RH"}</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {comunicados.map((c) => {
            var t = tipoInfo(c.tipo);
            return (
              <article key={c.id} className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-5 flex flex-col gap-3 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${t.cor}`}>{t.label}</span>
                  <div className="flex items-center gap-1.5">
                    {canManage && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${c.publicado ? "badge-success" : "badge-secondary"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.publicado ? "bg-success" : "bg-outline"}`} />
                        {c.publicado ? "Publicado" : "Rascunho"}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-[15px] font-bold text-on-surface leading-snug line-clamp-2">{c.titulo}</h2>
                  <p className="mt-2 text-[13px] text-on-surface-variant/80 leading-relaxed line-clamp-3 whitespace-pre-line break-words">{c.conteudo}</p>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-on-surface-variant/60 mt-auto">
                  {c.departamento && (
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">apartment</span>
                      {c.departamento.nome}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">event</span>
                    {formatarData(c.data_inicio)}
                  </span>
                  {c.criador && (
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">person</span>
                      {c.criador.nome_completo}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-outline-variant/20">
                  <button onClick={() => abrirVer(c)} className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:bg-primary/5 rounded-lg px-3 py-1.5 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    Ver
                  </button>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => togglePublicado(c)} title={c.publicado ? "Despublicar" : "Publicar"} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all">
                        <span className="material-symbols-outlined text-[15px]">{c.publicado ? "visibility_off" : "publish"}</span>
                      </button>
                      <button onClick={() => abrirEditar(c)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button onClick={() => setConfirmDelete({ open: true, id: c.id, titulo: c.titulo })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
          A exibir {comunicados.length} de {paginacao.total} comunicados
        </div>
        {paginacao.total_paginas > 1 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: paginacao.total_paginas }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => carregar(p)} className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-all ${p === paginacao.pagina ? "bg-primary text-white font-bold" : "hover:bg-primary/5 text-on-surface-variant"}`}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editando ? "Editar Comunicado" : "Novo Comunicado"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardar} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Título *</label>
                  <input name="titulo" value={form.titulo || ""} onChange={handleInput} required maxLength={200} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Tipo</label>
                  <select name="tipo" value={form.tipo || "Geral"} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {TIPOS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Visível Para</label>
                  <select name="visivel_para" value={form.visivel_para || "Todos"} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="Todos">Todos</option>
                    <option value="Departamento">Departamento</option>
                    <option value="Cargo">Cargo</option>
                    <option value="Perfil">Perfil</option>
                  </select>
                </div>
                {form.visivel_para === "Departamento" && (
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Departamento *</label>
                    <select name="departamento_id" value={form.departamento_id || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                      <option value="">Selecionar departamento...</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Conteúdo *</label>
                  <textarea name="conteudo" value={form.conteudo || ""} onChange={handleInput} required rows={6} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Início</label>
                  <input name="data_inicio" type="datetime-local" value={form.data_inicio || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Fim (opcional)</label>
                  <input name="data_fim" type="datetime-local" value={form.data_fim || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <input id="publicado" name="publicado" type="checkbox" checked={form.publicado !== false} onChange={(e) => setForm({ ...form, publicado: e.target.checked })} className="w-4 h-4 accent-primary" />
                  <label htmlFor="publicado" className="text-[13px] font-semibold text-on-surface-variant cursor-pointer">Publicar imediatamente</label>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                    <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
                    {saving ? "A guardar..." : editando ? "Atualizar" : "Criar Comunicado"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && avisoView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-on-surface tracking-tight uppercase">Detalhes do Comunicado</h3>
              <button onClick={() => setShowViewModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tipoInfo(avisoView.tipo).cor}`}>
                  <span className="material-symbols-outlined text-[24px]">campaign</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${tipoInfo(avisoView.tipo).cor}`}>{avisoView.tipo}</span>
                    {canManage && (
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${avisoView.publicado ? "badge-success" : "badge-secondary"}`}>
                        {avisoView.publicado ? "Publicado" : "Rascunho"}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-on-surface tracking-tight mt-1 break-words">{avisoView.titulo}</h2>
                </div>
              </div>

              <div className="bg-background/50 rounded-lg p-4 border border-outline-variant/20">
                <p className="text-[14px] text-on-surface leading-relaxed whitespace-pre-line break-words">{avisoView.conteudo}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[["Data de Início", formatarData(avisoView.data_inicio)], ["Data de Fim", formatarData(avisoView.data_fim) || "—"],
                  ["Visível Para", avisoView.visivel_para], ["Criado por", (avisoView.criador && avisoView.criador.nome_completo) || "—"],
                ].map(function (p) {
                  return (
                    <div key={p[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{p[0]}</p>
                      <p className="text-[13px] font-semibold text-on-surface break-words">{p[1] || "—"}</p>
                    </div>
                  );
                })}
              </div>

              {avisoView.departamento && (
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">apartment</span>
                  <span className="text-[13px] font-semibold text-on-surface">Destinado ao departamento: {avisoView.departamento.nome}</span>
                </div>
              )}

              {canManage && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                  <button onClick={() => { setShowViewModal(false); abrirEditar(avisoView); }} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 text-primary text-[12px] font-semibold hover:bg-primary/5 transition-all">
                    <span className="material-symbols-outlined text-[16px]">edit</span> Editar
                  </button>
                  <button onClick={() => { setShowViewModal(false); togglePublicado(avisoView); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[12px] font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all">
                    <span className="material-symbols-outlined text-[16px]">{avisoView.publicado ? "visibility_off" : "publish"}</span>
                    {avisoView.publicado ? "Despublicar" : "Publicar"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}