"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { ESTADOS_COLABORADOR, TIPOS_COLABORADOR, GENEROS, ESTADOS_CIVIS } from "@/lib/constants";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FileUpload from "@/components/ui/FileUpload";

var imageUrl = function (path) {
  if (!path) return "";
  var decoded = path.replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
  if (decoded.startsWith("http")) return decoded;
  return api.baseURL + decoded;
};

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "" });
  const [aba, setAba] = useState("pessoal");
  const [showViewModal, setShowViewModal] = useState(false);
  const [colaboradorView, setColaboradorView] = useState(null);
  const [statusDropdown, setStatusDropdown] = useState({ open: false, id: null });
  const [avaliacoesColab, setAvaliacoesColab] = useState([]);

  const carregar = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/api/colaboradores?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filtroEstado) url += `&estado=${filtroEstado}`;
      if (filtroTipo) url += `&tipo_colaborador=${filtroTipo}`;
      const data = await api.get(url);
      setColaboradores(data.dados);
      setPaginacao(data.paginacao);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    if (!statusDropdown.open) return;
    const fechar = () => setStatusDropdown({ open: false, id: null });
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, [statusDropdown.open]);

  const defaultForm = {
    nome_completo: "", data_admissao: "", genero: "", estado_civil: "",
    nif: "", bi: "", bi_validade: "", telefone: "", email_pessoal: "",
    email_institucional: "", telefone_emergencia: "", tipo_colaborador: "Interno",
    estado: "Activo", endereco: "", cidade: "", provincia: "",
    data_nascimento: "", nome_curto: "",
    habilitacoes: "", formacao_academica: "", conta_bancaria: "", banco: "", iban: "",
    numero_seguranca_social: "", fotografia: "", curriculo: "", observacoes: "",
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm({ ...defaultForm });
    setAba("pessoal");
    setShowModal(true);
    setMsg(null);
  };

  const abrirEditar = (c) => {
    setEditando(c);
    var f = {};
    var keys = Object.keys(defaultForm);
    for (var i = 0; i < keys.length; i++) {
      f[keys[i]] = c[keys[i]] || defaultForm[keys[i]];
    }
    setForm(f);
    setAba("pessoal");
    setShowModal(true);
    setMsg(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (editando) {
        await api.put(`/api/colaboradores/${editando.id}`, form);
        setMsg({ tipo: "sucesso", texto: "Colaborador atualizado com sucesso" });
      } else {
        await api.post("/api/colaboradores", form);
        setMsg({ tipo: "sucesso", texto: "Colaborador criado com sucesso" });
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
      await api.delete(`/api/colaboradores/${confirmDelete.id}`);
      setMsg({ tipo: "sucesso", texto: "Colaborador desligado com sucesso" });
      setConfirmDelete({ open: false, id: null, nome: "" });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  const mudarStatus = async (id, novoEstado) => {
    try {
      await api.put(`/api/colaboradores/${id}/status`, { estado: novoEstado });
      setMsg({ tipo: "sucesso", texto: `Estado alterado para "${novoEstado}" com sucesso` });
      setStatusDropdown({ open: false, id: null });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
      setStatusDropdown({ open: false, id: null });
    }
  };

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirVer = (c) => {
    setColaboradorView(c);
    setShowViewModal(true);
    setAvaliacoesColab([]);
    api.get(`/api/avaliacao/avaliacoes?colaborador_id=${c.id}&limit=100`).then(res => {
      if (res && res.dados) setAvaliacoesColab(res.dados);
    }).catch(() => {});
  };

  const gerarPDF = async () => {
    var c = colaboradorView;
    if (!c) return;
    try {
      await api.downloadPdf("/api/pdf/colaborador/" + c.id, "ficha_" + (c.numero_colaborador || c.nome_completo || "colaborador") + ".pdf");
    } catch (e) {
      alert("Erro ao gerar PDF: " + e.message);
    }
  };

  const activeFilters = [];
  if (filtroEstado) activeFilters.push({ label: `Status: ${filtroEstado}`, onClear: () => setFiltroEstado("") });
  if (filtroTipo) activeFilters.push({ label: `Tipo: ${filtroTipo}`, onClear: () => setFiltroTipo("") });

  const abas = [
    { key: "pessoal", label: "Dados Pessoais", icon: "person" },
    { key: "contacto", label: "Contactos", icon: "contact_phone" },
    { key: "profissional", label: "Profissional", icon: "work" },
    { key: "financeiro", label: "Financeiro", icon: "account_balance" },
    { key: "documentos", label: "Documentos", icon: "folder_open" },
  ];

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Desligar Colaborador"
        mensagem={`Tem certeza que deseja desligar ${confirmDelete.nome}? O colaborador sera marcado como "Desligado".`}
        textoConfirmar="Sim, Desligar"
        textoCancelar="Manter"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={() => setConfirmDelete({ open: false, id: null, nome: "" })}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>SGHR</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Colaboradores</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Gestao Estrategica de Colaboradores</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo Colaborador
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
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Colaborador</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Nome, numero, NIF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregar(1)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {ESTADOS_COLABORADOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Tipo</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {TIPOS_COLABORADOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
            <button onClick={() => { setFiltroEstado(""); setFiltroTipo(""); setSearch(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
          </div>
        )}
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse data-grid-tight">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider w-[280px]">Colaborador</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Contacto</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Admissão</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                ))
              ) : colaboradores.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">group</span>
                  <p className="text-on-surface-variant font-medium">Nenhum colaborador encontrado</p>
                  <p className="text-[13px] text-outline mt-1">Clique em "Novo Colaborador" para adicionar</p>
                </td></tr>
              ) : (
                colaboradores.map((c) => (
                  <tr key={c.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant/30 shadow-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {c.fotografia ? (
                            <img src={imageUrl(c.fotografia)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[12px] font-bold text-primary">{helpers.getInitials(c.nome_completo)}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface">{c.nome_completo}</span>
                          <span className="text-[12px] text-on-surface-variant/70">{c.numero_colaborador}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-on-surface">{c.telefone || "—"}</span>
                        <span className="text-[12px] text-on-surface-variant/70">{c.email_pessoal || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-on-surface">{(TIPOS_COLABORADOR.find(t => t.value === c.tipo_colaborador) || {}).label || c.tipo_colaborador}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${c.estado === "Activo" ? "badge-success" : "badge-secondary"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.estado === "Activo" ? "bg-success" : "bg-outline"}`} />
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-on-surface-variant">{helpers.formatDate(c.data_admissao)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button onClick={() => abrirVer(c)} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                        </button>
                        <button onClick={() => abrirEditar(c)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setStatusDropdown({ open: statusDropdown.open && statusDropdown.id === c.id ? false : true, id: c.id }); }} className="p-[3px] text-on-surface-variant hover:text-amber-600 hover:bg-amber-600/10 rounded transition-all" title="Alterar Status">
                            <span className="material-symbols-outlined text-[15px]">swap_vert</span>
                          </button>
                          {statusDropdown.open && statusDropdown.id === c.id && (
                            <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 bg-surface border border-outline-variant/30 rounded-lg shadow-xl z-50 min-w-[160px] py-1">
                              {["Activo", "Inactivo", "Suspenso", "Aposentado"].map(function(estado) {
                                return (
                                  <button
                                    key={estado}
                                    onClick={() => mudarStatus(c.id, estado)}
                                    className={`w-full text-left px-3 py-1.5 text-[12px] font-medium transition-colors flex items-center gap-2 ${
                                      c.estado === estado
                                        ? "bg-primary/10 text-primary font-bold"
                                        : "text-on-surface hover:bg-on-surface/5"
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      estado === "Activo" ? "bg-green-500" :
                                      estado === "Inactivo" ? "bg-gray-400" :
                                      estado === "Suspenso" ? "bg-amber-500" :
                                      "bg-blue-500"
                                    }`} />
                                    {estado}
                                    {c.estado === estado && <span className="material-symbols-outlined text-[12px] ml-auto">check</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <button onClick={() => setConfirmDelete({ open: true, id: c.id, nome: c.nome_completo })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Desligar">
                          <span className="material-symbols-outlined text-[15px]">person_off</span>
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
            Exibindo {colaboradores.length} de {paginacao.total} colaboradores
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
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editando ? "Editar Colaborador" : "Novo Colaborador"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-6 pt-4 border-b border-outline-variant/20 flex gap-1 overflow-x-auto">
              {abas.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAba(a.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
                    aba === a.key
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>

            <form onSubmit={guardar} className="p-6">
              {aba === "pessoal" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome Completo *</label>
                    <input name="nome_completo" value={form.nome_completo || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome Curto</label>
                    <input name="nome_curto" value={form.nome_curto || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Nascimento</label>
                    <input name="data_nascimento" type="date" value={form.data_nascimento || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Genero</label>
                    <select name="genero" value={form.genero || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                      <option value="">Selecionar</option>
                      {GENEROS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado Civil</label>
                    <select name="estado_civil" value={form.estado_civil || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                      <option value="">Selecionar</option>
                      {ESTADOS_CIVIS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">NIF</label>
                    <input name="nif" value={form.nif || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">BI</label>
                    <input name="bi" value={form.bi || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Validade BI</label>
                    <input name="bi_validade" type="date" value={form.bi_validade || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Habilitacoes</label>
                    <input name="habilitacoes" value={form.habilitacoes || ""} onChange={handleInput} placeholder="Ex: Licenciatura em Engenharia" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Formacao Academica</label>
                    <textarea name="formacao_academica" value={form.formacao_academica || ""} onChange={handleInput} rows={2} placeholder="Historico de formacao academica" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                </div>
              )}

              {aba === "contacto" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Telefone *</label>
                    <input name="telefone" value={form.telefone || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Telefone Emergencia</label>
                    <input name="telefone_emergencia" value={form.telefone_emergencia || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Email Pessoal</label>
                    <input name="email_pessoal" type="email" value={form.email_pessoal || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Email Institucional</label>
                    <input name="email_institucional" type="email" value={form.email_institucional || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Endereco</label>
                    <input name="endereco" value={form.endereco || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Cidade</label>
                    <input name="cidade" value={form.cidade || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Provincia</label>
                    <input name="provincia" value={form.provincia || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                </div>
              )}

              {aba === "profissional" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Admissão *</label>
                    <input name="data_admissao" type="date" value={form.data_admissao || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Tipo de Colaborador</label>
                    <select name="tipo_colaborador" value={form.tipo_colaborador || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                      {TIPOS_COLABORADOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado</label>
                    <select name="estado" value={form.estado || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                      {ESTADOS_COLABORADOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">No. Seguranca Social</label>
                    <input name="numero_seguranca_social" value={form.numero_seguranca_social || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Observacoes</label>
                    <textarea name="observacoes" value={form.observacoes || ""} onChange={handleInput} rows={3} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                </div>
              )}

              {aba === "financeiro" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Banco</label>
                    <input name="banco" value={form.banco || ""} onChange={handleInput} placeholder="Ex: BAI, BFA, Millennium" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Conta Bancaria</label>
                    <input name="conta_bancaria" value={form.conta_bancaria || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">IBAN</label>
                    <input name="iban" value={form.iban || ""} onChange={handleInput} placeholder="AO06 0040 0000 1234 5678 9012 3" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                </div>
              )}

              {aba === "documentos" && (
                <div className="space-y-5">
                  <div className="sm:col-span-2">
                    <FileUpload
                      label="Fotografia"
                      value={form.fotografia || ""}
                      onChange={(url) => setForm({ ...form, fotografia: url })}
                      pasta="fotografias"
                      accept="image/*"
                      icone="photo_camera"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FileUpload
                      label="Curriculo (CV)"
                      value={form.curriculo || ""}
                      onChange={(url) => setForm({ ...form, curriculo: url })}
                      pasta="curriculos"
                      accept=".pdf,.doc,.docx"
                      iconde="description"
                      icone="description"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
                  {saving ? "A guardar..." : editando ? "Actualizar" : "Criar Colaborador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && colaboradorView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Ficha do Colaborador</h3>
              <div className="flex items-center gap-2">
                <button onClick={gerarPDF} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-error/10 text-error text-[12px] font-semibold hover:bg-error/20 transition-all border border-error/10">
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Descarregar PDF
                </button>
                <button onClick={() => setShowViewModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-outline-variant/30 shadow-md bg-primary/10 flex items-center justify-center shrink-0">
                  {colaboradorView.fotografia ? (
                    <img src={imageUrl(colaboradorView.fotografia)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{helpers.getInitials(colaboradorView.nome_completo)}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">{colaboradorView.nome_completo}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[13px] text-on-surface-variant/70">{colaboradorView.numero_colaborador}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${colaboradorView.estado === "Activo" ? "badge-success" : "badge-secondary"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${colaboradorView.estado === "Activo" ? "bg-success" : "bg-outline"}`} />
                      {colaboradorView.estado}
                    </span>
                    <span className="text-[12px] text-on-surface-variant/60 badge-primary px-2 py-0.5 rounded">
                      {(TIPOS_COLABORADOR.find(function(t) { return t.value === colaboradorView.tipo_colaborador; }) || {}).label || colaboradorView.tipo_colaborador}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                  Dados Pessoais
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Nome Completo", colaboradorView.nome_completo],
                    ["Nome Curto", colaboradorView.nome_curto],
                    ["Data de Nascimento", colaboradorView.data_nascimento ? helpers.formatDate(colaboradorView.data_nascimento) : null],
                    ["Genero", colaboradorView.genero === "M" ? "Masculino" : colaboradorView.genero === "F" ? "Feminino" : null],
                    ["Estado Civil", colaboradorView.estado_civil],
                    ["NIF", colaboradorView.nif],
                    ["BI", colaboradorView.bi],
                    ["Validade BI", colaboradorView.bi_validade ? helpers.formatDate(colaboradorView.bi_validade) : null],
                    ["Habilitacoes", colaboradorView.habilitacoes],
                  ].map(function(pair) {
                    return (
                      <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
                {colaboradorView.formacao_academica && (
                  <div className="mt-3 bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Formacao Academica</p>
                    <p className="text-[13px] text-on-surface">{colaboradorView.formacao_academica}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">contact_phone</span>
                  Contactos
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Telefone", colaboradorView.telefone],
                    ["Telefone Emergencia", colaboradorView.telefone_emergencia],
                    ["Email Pessoal", colaboradorView.email_pessoal],
                    ["Email Institucional", colaboradorView.email_institucional],
                    ["Cidade", colaboradorView.cidade],
                    ["Provincia", colaboradorView.provincia],
                  ].map(function(pair) {
                    return (
                      <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
                {colaboradorView.endereco && (
                  <div className="mt-3 bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Endereco</p>
                    <p className="text-[13px] text-on-surface">{colaboradorView.endereco}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">work</span>
                  Dados Profissionais
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Data de Admissão", colaboradorView.data_admissao ? helpers.formatDate(colaboradorView.data_admissao) : null],
                    ["No. Seguranca Social", colaboradorView.numero_seguranca_social],
                  ].map(function(pair) {
                    return (
                      <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
                {colaboradorView.observacoes && (
                  <div className="mt-3 bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Observacoes</p>
                    <p className="text-[13px] text-on-surface">{colaboradorView.observacoes}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">account_balance</span>
                  Dados Financeiros
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Banco", colaboradorView.banco],
                    ["Conta Bancaria", colaboradorView.conta_bancaria],
                    ["IBAN", colaboradorView.iban],
                  ].map(function(pair) {
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
                  <span className="material-symbols-outlined text-[16px] text-primary">folder_open</span>
                  Documentos
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Fotografia</p>
                    {colaboradorView.fotografia ? (
                      <a href={imageUrl(colaboradorView.fotografia)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        Ver Ficheiro
                      </a>
                    ) : (
                      <p className="text-[12px] text-outline">Nenhuma</p>
                    )}
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Curriculo</p>
                    {colaboradorView.curriculo ? (
                      <a href={colaboradorView.curriculo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        Ver Ficheiro
                      </a>
                    ) : (
                      <p className="text-[12px] text-outline">Nenhum</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">star</span>
                  Avaliações de Desempenho
                </h4>
                {avaliacoesColab.length === 0 ? (
                  <p className="text-[13px] text-on-surface-variant/50 bg-background/50 rounded-lg p-4 border border-outline-variant/20">Sem avaliações registadas</p>
                ) : (
                  <div className="space-y-2">
                    {avaliacoesColab.map((av) => (
                      <div key={av.id} className="bg-background/50 rounded-lg p-4 border border-outline-variant/20 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-semibold text-on-surface">{av.ciclo ? av.ciclo.nome : "Ciclo #" + av.ciclo_id}</p>
                          <p className="text-[11px] text-on-surface-variant/60 mt-0.5">{av.data_avaliacao ? helpers.formatDate(av.data_avaliacao) : "Sem data"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[12px] font-bold text-on-surface">{av.nota_final != null ? parseFloat(av.nota_final).toFixed(1) : "—"}</p>
                            <p className="text-[10px] text-on-surface-variant/50 uppercase">Nota Final</p>
                          </div>
                          <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${av.estado === "Concluida" ? "badge-success" : av.estado === "Em Progresso" ? "badge-warning" : "badge-secondary"}`}>
                            {av.estado || "Rascunho"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={() => { setShowViewModal(false); abrirEditar(colaboradorView); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar
                </button>
                <button onClick={gerarPDF} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                  Descarregar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
