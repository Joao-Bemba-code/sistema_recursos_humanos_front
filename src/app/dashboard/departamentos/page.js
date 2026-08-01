"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

var imageUrl = function (path) {
  if (!path) return "";
  var decoded = path.replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
  if (decoded.startsWith("http")) return decoded;
  return api.baseURL + decoded;
};

const TIPOS_DEPT = [
  { value: "Direcção", label: "Direcção" },
  { value: "Departamento", label: "Departamento" },
  { value: "Sector", label: "Sector" },
  { value: "Secção", label: "Secção" },
  { value: "Gabinete", label: "Gabinete" },
];

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "" });
  const [showViewModal, setShowViewModal] = useState(false);
  const [deptView, setDeptView] = useState(null);
  const [org, setOrg] = useState(null);

  const carregar = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/api/departamentos?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filtroTipo) url += `&tipo=${filtroTipo}`;
      const data = await api.get(url);
      setDepartamentos(data.dados);
      setPaginacao(data.paginacao);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    api.get("/api/organizacoes").then(function (data) {
      if (data.dados && data.dados.length > 0) setOrg(data.dados[0]);
    }).catch(function () {});
  }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: "", codigo: "", descricao: "", tipo: "Departamento", responsavel_nome: "", telefone: "", email: "", localizacao: "", activo: true });
    setShowModal(true);
    setMsg(null);
  };

  const abrirEditar = (d) => {
    setEditando(d);
    setForm({
      nome: d.nome || "",
      codigo: d.codigo || "",
      descricao: d.descricao || "",
      tipo: d.tipo || "Departamento",
      responsavel_nome: d.responsavel_nome || "",
      telefone: d.telefone || "",
      email: d.email || "",
      localizacao: d.localizacao || "",
      activo: d.activo !== false,
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
        await api.put(`/api/departamentos/${editando.id}`, form);
        setMsg({ tipo: "sucesso", texto: "Departamento atualizado com sucesso" });
      } else {
        await api.post("/api/departamentos", form);
        setMsg({ tipo: "sucesso", texto: "Departamento criado com sucesso" });
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
      await api.delete(`/api/departamentos/${confirmDelete.id}`);
      setMsg({ tipo: "sucesso", texto: "Departamento eliminado" });
      setConfirmDelete({ open: false, id: null, nome: "" });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirVer = (d) => {
    setDeptView(d);
    setShowViewModal(true);
  };

  const tipoLabel = (v) => (TIPOS_DEPT.find(t => t.value === v) || {}).label || v || "—";

  const gerarPDF = () => {
    var d = deptView;
    if (!d) return;
    var doc = new jsPDF();
    var pw = doc.internal.pageSize.getWidth();

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.text("CENFFOR", 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Ficha do Departamento", 15, 28);

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(d.nome || "Sem Nome", 15, 42);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Código: " + (d.codigo || "—"), 15, 50);

    var y = 58;
    var rows = [
      ["Nome", d.nome], ["Código", d.codigo], ["Tipo", tipoLabel(d.tipo)],
      ["Responsável", d.responsavel_nome], ["Telefone", d.telefone],
      ["Email", d.email], ["Localização", d.localizacao],
      ["Estado", d.activo ? "Ativo" : "Inativo"],
    ];
    if (d.descricao) {
      rows.push(["Descrição", d.descricao]);
    }

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("DADOS DO DEPARTAMENTO", 15, y);
    y += 7;
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    rows.forEach(function(row) {
      doc.setFont(undefined, "bold");
      doc.text(row[0] + ":", 15, y);
      doc.setFont(undefined, "normal");
      doc.text(String(row[1] || "—"), 60, y);
      y += 6;
    });

    var fY = doc.internal.pageSize.getHeight() - 12;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("CENFFOR - SGHR | Gerado: " + new Date().toLocaleDateString("pt-AO"), 15, fY);

    doc.save("Departamento_" + (d.nome || "ficha") + ".pdf");
  };

  const activeFilters = [];
  if (filtroTipo) activeFilters.push({ label: `Tipo: ${filtroTipo}`, onClear: () => setFiltroTipo("") });

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Departamento"
        mensagem={`Tem certeza que deseja eliminar o departamento "${confirmDelete.nome}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={() => setConfirmDelete({ open: false, id: null, nome: "" })}
      />
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>Estrutura</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Departamentos</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Estrutura Organizacional</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo Departamento
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
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Departamento</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Nome do departamento..."
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
                {TIPOS_DEPT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
            <button onClick={() => { setFiltroTipo(""); setSearch(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
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
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Responsável</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Contacto</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="animate-pulse h-10 bg-surface-container rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : departamentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">apartment</span>
                    <p className="text-on-surface-variant font-medium">Nenhum departamento encontrado</p>
                    <p className="text-[13px] text-outline mt-1">Clique em "Novo Departamento" para adicionar</p>
                  </td>
                </tr>
              ) : (
                departamentos.map((d) => (
                  <tr key={d.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{d.nome}</span>
                        <span className="text-[12px] text-on-surface-variant/70">{d.codigo || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider badge-secondary">
                        {(TIPOS_DEPT.find(t => t.value === d.tipo) || {}).label || d.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-on-surface">{d.responsavel_nome || "—"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-on-surface">{d.telefone || "—"}</span>
                        <span className="text-[12px] text-on-surface-variant/70">{d.email || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${d.activo ? "badge-success" : "badge-secondary"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${d.activo ? "bg-success" : "bg-outline"}`} />
                        {d.activo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button onClick={() => abrirVer(d)} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                        </button>
                        <button onClick={() => abrirEditar(d)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button onClick={() => setConfirmDelete({ open: true, id: d.id, nome: d.nome })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
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
            Exibindo {departamentos.length} de {paginacao.total} departamentos
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
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editando ? "Editar Departamento" : "Novo Departamento"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardar} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome *</label>
                  <input name="nome" value={form.nome || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Código</label>
                  <input name="codigo" value={form.codigo || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Tipo</label>
                  <select name="tipo" value={form.tipo || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {TIPOS_DEPT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Descrição</label>
                  <textarea name="descricao" value={form.descricao || ""} onChange={handleInput} rows={3} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Responsável</label>
                  <input name="responsavel_nome" value={form.responsavel_nome || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Telefone</label>
                  <input name="telefone" value={form.telefone || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Email</label>
                  <input name="email" type="email" value={form.email || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Localização</label>
                  <input name="localizacao" value={form.localizacao || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
                  {saving ? "A guardar..." : editando ? "Atualizar" : "Criar Departamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && deptView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-on-surface tracking-tight uppercase">Ficha de Departamento</h3>
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
              <div className="flex flex-col items-center gap-2 pb-5 border-b border-outline-variant/20">
                {org && org.logo_url ? (
                  <img src={imageUrl(org.logo_url)} alt={org.nome || "Logo"} className="h-16 w-auto max-w-full object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[32px]">apartment</span>
                  </div>
                )}
                <p className="text-[13px] font-bold text-on-surface">{org ? org.nome : ""}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[24px]">apartment</span>
                </div>
                <div>
                  <h2 className="text-[12px] font-bold text-on-surface">{deptView.nome}</h2>
                  <p className="text-[12px] font-bold text-on-surface-variant">{tipoLabel(deptView.tipo)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-on-surface-variant/60">{deptView.codigo || "Sem código"}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${deptView.activo ? "badge-success" : "badge-secondary"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${deptView.activo ? "bg-success" : "bg-outline"}`} />
                      {deptView.activo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[["Tipo", tipoLabel(deptView.tipo)], ["Responsável", deptView.responsavel_nome],
                  ["Telefone", deptView.telefone], ["Email", deptView.email],
                  ["Localização", deptView.localizacao],
                ].map(function(p) {
                  return (
                    <div key={p[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{p[0]}</p>
                      <p className="text-[13px] font-semibold text-on-surface">{p[1] || "—"}</p>
                    </div>
                  );
                })}
              </div>

              {deptView.descricao && (
                <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Descrição</p>
                  <p className="text-[13px] text-on-surface whitespace-pre-line break-words">{deptView.descricao}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={() => { setShowViewModal(false); abrirEditar(deptView); }} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 text-primary text-[12px] font-semibold hover:bg-primary/5 transition-all">
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