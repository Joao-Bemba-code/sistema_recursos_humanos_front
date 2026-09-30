"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { useAuth } from "@/context/AuthContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const arredondar = (v) => Math.round(v * 100) / 100;
const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

const formatarData = (iso) => {
  if (!iso) return "";
  const partes = String(iso).substring(0, 10).split("-");
  if (partes.length !== 3) return iso;
  return partes[2] + "/" + partes[1] + "/" + partes[0];
};

export default function CreditosPage() {
  const auth = useAuth();

  const [colaboradores, setColaboradores] = useState([]);
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  const [resumo, setResumo] = useState({ creditos_ativos: 0, total_emprestado: 0, divida_total: 0, total_pago: 0 });

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState({ open: false, id: null, nome: "" });
  const [confirmCancelar, setConfirmCancelar] = useState({ open: false, id: null, nome: "" });

  const hoje = new Date();
  const hojeISO = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0") + "-" + String(hoje.getDate()).padStart(2, "0");

  const defaultForm = {
    colaborador_id: "",
    valor: "",
    desconto_mensal: "",
    data_concessao: hojeISO,
    motivo: "",
  };

  const [form, setForm] = useState({ ...defaultForm });

  const pronto = !!(auth && !auth.loading && auth.isAuthenticated && auth.isAdmin());

  const loadColaboradores = async () => {
    try {
      const data = await api.get("/api/colaboradores?limit=200");
      setColaboradores(data.dados || []);
    } catch (e) {
      // silencio
    }
  };

  const carregarResumo = async () => {
    try {
      const data = await api.get("/api/creditos/resumo");
      setResumo(data.dados || {});
    } catch (e) {
      // silencio
    }
  };

  const carregar = async (page = 1) => {
    setLoading(true);
    setMsg(null);
    try {
      let url = `/api/creditos?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filtroEstado) url += `&estado=${filtroEstado}`;
      const data = await api.get(url);
      setDados(data.dados || []);
      setPaginacao(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pronto) return;
    loadColaboradores();
    carregarResumo();
  }, [pronto]);

  useEffect(() => {
    if (!pronto) return;
    carregar(1);
  }, [pronto]);

  if (auth && auth.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-outline-variant border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth || !auth.isAuthenticated) {
    return null;
  }

  if (!auth.isAdmin()) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block">lock</span>
          <p className="text-on-surface-variant font-medium">Sem permissão para aceder a este módulo</p>
          <p className="text-[13px] text-outline">A gestão de créditos é exclusiva da administração do sistema.</p>
        </div>
      </div>
    );
  }

  const handleInput = (e) => {
    const nome = e.target.name;
    const valor = e.target.value;
    setForm((prev) => ({ ...prev, [nome]: valor }));
  };

  const restanteDe = (item) => Math.max(0, arredondar(toNum(item.valor) - toNum(item.valor_pago)));

  const percentagemPago = (item) => {
    const valor = toNum(item.valor);
    if (valor <= 0) return 0;
    return Math.min(100, Math.round((toNum(item.valor_pago) / valor) * 100));
  };

  const mesesEstimados = () => {
    const v = toNum(form.valor);
    const d = toNum(form.desconto_mensal);
    if (v <= 0 || d <= 0) return null;
    return Math.ceil(v / d);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm({ ...defaultForm, data_concessao: hojeISO });
    setShowModal(true);
    setMsg(null);
  };

  const abrirEditar = (item) => {
    setEditando(item);
    setForm({
      colaborador_id: item.colaborador_id || item.colaborador?.id || "",
      valor: item.valor || "",
      desconto_mensal: item.desconto_mensal || "",
      data_concessao: item.data_concessao ? String(item.data_concessao).substring(0, 10) : hojeISO,
      motivo: item.motivo || "",
    });
    setShowModal(true);
    setMsg(null);
  };

  const abrirVer = async (item) => {
    setViewItem(item);
    setShowViewModal(true);
    setCarregandoDetalhe(true);
    try {
      const data = await api.get(`/api/creditos/${item.id}`);
      setViewItem(data.dados || item);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    if (!form.colaborador_id) { setMsg({ tipo: "erro", texto: "Seleccione o colaborador" }); setSaving(false); return; }
    if (toNum(form.valor) <= 0) { setMsg({ tipo: "erro", texto: "O valor do crédito deve ser maior que zero" }); setSaving(false); return; }
    if (toNum(form.desconto_mensal) <= 0) { setMsg({ tipo: "erro", texto: "O desconto mensal deve ser maior que zero" }); setSaving(false); return; }
    if (!form.data_concessao) { setMsg({ tipo: "erro", texto: "A data de concessão é obrigatória" }); setSaving(false); return; }

    try {
      if (editando) {
        await api.put(`/api/creditos/${editando.id}`, form);
        setMsg({ tipo: "sucesso", texto: "Crédito atualizado com sucesso" });
      } else {
        await api.post("/api/creditos", form);
        setMsg({ tipo: "sucesso", texto: "Crédito criado com sucesso. O desconto será aplicado na próxima folha processada." });
      }
      setShowModal(false);
      carregar(paginacao.pagina);
      carregarResumo();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSaving(false);
    }
  };

  const cancelarCredito = async () => {
    setSaving(true);
    try {
      await api.post(`/api/creditos/${confirmCancelar.id}/cancelar`);
      setMsg({ tipo: "sucesso", texto: "Crédito cancelado. Não serão feitos mais descontos." });
      setConfirmCancelar({ open: false, id: null, nome: "" });
      carregar(paginacao.pagina);
      carregarResumo();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSaving(false);
    }
  };

  const eliminarCredito = async () => {
    setSaving(true);
    try {
      await api.delete(`/api/creditos/${confirmEliminar.id}`);
      setMsg({ tipo: "sucesso", texto: "Crédito eliminado com sucesso" });
      setConfirmEliminar({ open: false, id: null, nome: "" });
      carregar(paginacao.pagina);
      carregarResumo();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSaving(false);
    }
  };

  const nomeColab = (item) => {
    if (item.colaborador && item.colaborador.nome_completo) return item.colaborador.nome_completo;
    const c = colaboradores.find((x) => String(x.id) === String(item.colaborador_id));
    return c ? c.nome_completo : "";
  };

  const renderBadgeEstado = (estado) => {
    const mapa = {
      Ativo: "badge-success border border-success/10",
      Pago: "badge-primary border border-primary/10",
      Cancelado: "badge-danger border border-error/10",
    };
    const cls = mapa[estado] || "badge-secondary border border-outline-variant/10";
    return (
      <span className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${cls}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
        {estado}
      </span>
    );
  };

  const renderPagination = () => (
    <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
        Exibindo {dados.length} de {paginacao.total} registos
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
  );

  const activeFilters = [];
  if (filtroEstado) activeFilters.push({ label: `Estado: ${filtroEstado}`, onClear: () => setFiltroEstado("") });

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmEliminar.open}
        titulo="Eliminar Crédito"
        mensagem={`Tem certeza que deseja eliminar o crédito de ${confirmEliminar.nome}? Esta ação não pode ser desfeita.`}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminarCredito}
        onCancel={() => setConfirmEliminar({ open: false, id: null, nome: "" })}
      />

      <ConfirmDialog
        open={confirmCancelar.open}
        titulo="Cancelar Crédito"
        mensagem={`Deseja cancelar o crédito de ${confirmCancelar.nome}? O valor já descontado mantém-se, mas não haverá mais descontos na folha salarial.`}
        textoConfirmar="Sim, Cancelar"
        textoCancelar="Voltar"
        variante="perigo"
        onConfirm={cancelarCredito}
        onCancel={() => setConfirmCancelar({ open: false, id: null, nome: "" })}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>SGHR</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Financeiro</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Créditos</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Gestão de Créditos</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo Crédito
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <span className="material-symbols-outlined text-[22px] text-primary">savings</span>
            </div>
            <span className="badge badge-primary text-[10px]">ATIVOS</span>
          </div>
          <p className="text-[11px] font-bold text-outline uppercase tracking-wider mb-0.5">Créditos Ativos</p>
          <p className="text-[26px] font-bold text-on-surface tracking-tight">{resumo.creditos_ativos}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-warning/10">
              <span className="material-symbols-outlined text-[22px] text-warning">account_balance_wallet</span>
            </div>
            <span className="badge badge-warning text-[10px]">EM DÍVIDA</span>
          </div>
          <p className="text-[11px] font-bold text-outline uppercase tracking-wider mb-0.5">Total em Dívida</p>
          <p className="text-[26px] font-bold text-on-surface tracking-tight">{helpers.formatCurrency(resumo.divida_total)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-success/10">
              <span className="material-symbols-outlined text-[22px] text-success">paid</span>
            </div>
            <span className="badge badge-success text-[10px]">PAGO</span>
          </div>
          <p className="text-[11px] font-bold text-outline uppercase tracking-wider mb-0.5">Total Já Pago</p>
          <p className="text-[26px] font-bold text-on-surface tracking-tight">{helpers.formatCurrency(resumo.total_pago)}</p>
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
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar</label>
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
          <div className="grid gap-3 w-full lg:w-auto grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Pago">Pago</option>
                <option value="Cancelado">Cancelado</option>
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
                <button onClick={f.onClear} className="hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse data-grid-tight">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider w-[240px]">Colaborador</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Valor</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Desconto Mensal</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Restante</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                ))
              ) : dados.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">savings</span>
                  <p className="text-on-surface-variant font-medium">Nenhum crédito encontrado</p>
                  <p className="text-[13px] text-outline mt-1">Clique em &quot;Novo Crédito&quot; para conceder um crédito a um colaborador</p>
                </td></tr>
              ) : (
                dados.map((item) => (
                  <tr key={item.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-on-surface font-medium text-[14px]">{nomeColab(item) || "—"}</span>
                        <span className="text-[12px] text-on-surface-variant/60">{item.colaborador && item.colaborador.numero_colaborador ? `Nº ${item.colaborador.numero_colaborador}` : ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-on-surface font-bold">{helpers.formatCurrency(item.valor)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-on-surface-variant">{helpers.formatCurrency(item.desconto_mensal)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5 min-w-[140px]">
                        <span className={`text-[14px] font-bold ${restanteDe(item) > 0 ? "text-warning" : "text-success"}`}>{helpers.formatCurrency(restanteDe(item))}</span>
                        <div className="w-full h-1.5 bg-outline-variant/20 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${percentagemPago(item) >= 100 ? "bg-success" : "bg-primary"}`} style={{ width: percentagemPago(item) + "%" }} />
                        </div>
                        <span className="text-[11px] text-on-surface-variant/60">Pago: {helpers.formatCurrency(item.valor_pago)} ({percentagemPago(item)}%)</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {renderBadgeEstado(item.estado)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button onClick={() => abrirVer(item)} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver detalhes">
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                        </button>
                        {item.estado === "Ativo" && (
                          <button onClick={() => abrirEditar(item)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                        )}
                        {item.estado === "Ativo" && (
                          <button onClick={() => setConfirmCancelar({ open: true, id: item.id, nome: nomeColab(item) })} className="p-[3px] text-on-surface-variant hover:text-warning hover:bg-warning/10 rounded transition-all" title="Cancelar crédito">
                            <span className="material-symbols-outlined text-[15px]">block</span>
                          </button>
                        )}
                        {toNum(item.valor_pago) <= 0 && (
                          <button onClick={() => setConfirmEliminar({ open: true, id: item.id, nome: nomeColab(item) })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editando ? "Editar Crédito" : "Novo Crédito"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={guardar} className="p-6 space-y-4">
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] text-primary mt-0.5">info</span>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  O desconto mensal é aplicado <strong>automaticamente</strong> em cada folha salarial processada, até o crédito ficar totalmente pago.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador *</label>
                <select name="colaborador_id" value={form.colaborador_id} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                  <option value="">Seleccione o colaborador...</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Valor do Crédito *</label>
                  <input type="number" step="0.01" min="0" name="valor" value={form.valor} onChange={handleInput} placeholder="0.00" required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Desconto Mensal *</label>
                  <input type="number" step="0.01" min="0" name="desconto_mensal" value={form.desconto_mensal} onChange={handleInput} placeholder="0.00" required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>

              {mesesEstimados() !== null && mesesEstimados() > 0 && (
                <div className="bg-secondary/5 border border-secondary/10 rounded-lg p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">schedule</span>
                  <p className="text-[13px] text-on-surface-variant">
                    Estimativa: <strong>{mesesEstimados()} {mesesEstimados() === 1 ? "mês" : "meses"}</strong> de descontos para pagar o crédito.
                  </p>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Concessão *</label>
                <input type="date" name="data_concessao" value={form.data_concessao} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Motivo (opcional)</label>
                <textarea name="motivo" value={form.motivo} onChange={handleInput} rows={2} placeholder="Ex: emergência familiar, adiantamento..." className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
                  {saving ? "A guardar..." : editando ? "Atualizar" : "Conceder Crédito"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && viewItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-surface rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-lg md:max-w-2xl max-h-[92vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Detalhes do Crédito</h3>
              <div className="flex items-center gap-2">
                {viewItem.estado === "Ativo" && (
                  <button onClick={() => { setShowViewModal(false); abrirEditar(viewItem); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-all border border-primary/10">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                )}
                <button onClick={() => setShowViewModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {carregandoDetalhe ? (
              <div className="p-10 flex justify-center">
                <div className="w-8 h-8 border-4 border-outline-variant border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <span className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant/30 shadow-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[16px] font-bold text-primary">{helpers.getInitials(nomeColab(viewItem) || "?")}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface font-bold text-[16px]">{nomeColab(viewItem) || "—"}</p>
                    <p className="text-[13px] text-on-surface-variant/60">
                      {viewItem.colaborador && viewItem.colaborador.numero_colaborador ? `Nº ${viewItem.colaborador.numero_colaborador}` : ""} · Concedido em {formatarData(viewItem.data_concessao)}
                    </p>
                  </div>
                  {renderBadgeEstado(viewItem.estado)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Valor</p>
                    <p className="text-[15px] font-bold text-on-surface mt-0.5">{helpers.formatCurrency(viewItem.valor)}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Desconto Mensal</p>
                    <p className="text-[15px] font-bold text-on-surface mt-0.5">{helpers.formatCurrency(viewItem.desconto_mensal)}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Já Pago</p>
                    <p className="text-[15px] font-bold text-success mt-0.5">{helpers.formatCurrency(viewItem.valor_pago)}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Restante</p>
                    <p className={`text-[15px] font-bold mt-0.5 ${restanteDe(viewItem) > 0 ? "text-warning" : "text-success"}`}>{helpers.formatCurrency(restanteDe(viewItem))}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Progresso</span>
                    <span className="text-[12px] font-semibold text-on-surface-variant">{percentagemPago(viewItem)}% pago</span>
                  </div>
                  <div className="w-full h-2 bg-outline-variant/20 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${percentagemPago(viewItem) >= 100 ? "bg-success" : "bg-primary"}`} style={{ width: percentagemPago(viewItem) + "%" }} />
                  </div>
                </div>

                {viewItem.motivo && (
                  <div>
                    <p className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-1">Motivo</p>
                    <p className="text-[13px] text-on-surface-variant leading-relaxed">{viewItem.motivo}</p>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-2">Histórico de Descontos</p>
                  {viewItem.movimentos && viewItem.movimentos.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
                      <table className="w-full text-left data-grid-tight">
                        <thead>
                          <tr className="bg-background/50 border-b border-outline-variant/20">
                            <th className="px-4 py-2.5 text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Mês</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Valor Descontado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {viewItem.movimentos.map((m) => (
                            <tr key={m.id}>
                              <td className="px-4 py-2.5 text-[13px] text-on-surface-variant">{MESES[parseInt(m.mes) - 1] || m.mes} de {m.ano}</td>
                              <td className="px-4 py-2.5 text-[13px] font-semibold text-on-surface text-right">{helpers.formatCurrency(m.valor_descontado)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[13px] text-outline bg-background/40 border border-outline-variant/20 rounded-lg p-3">
                      Ainda não há descontos. O primeiro desconto será aplicado na próxima folha salarial processada.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
