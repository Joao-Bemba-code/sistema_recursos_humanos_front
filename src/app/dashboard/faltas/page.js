"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDate } from "@/lib/helpers";

export default function FaltasPage() {
  const [resumo, setResumo] = useState(null);
  const [registos, setRegistos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registosLoading, setRegistosLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroColab, setFiltroColab] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [colaboradores, setColaboradores] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ colaborador_id: "", data: "", estado: "Ausente", hora_entrada: "", hora_saida: "", observacoes: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, titulo: "", mensagem: "", onConfirm: null });

  const carregarResumo = async () => {
    setLoading(true);
    try {
      var url = "/api/faltas/resumo?";
      if (dataInicio) url += "data_inicio=" + dataInicio + "&";
      if (dataFim) url += "data_fim=" + dataFim + "&";
      if (filtroColab) url += "colaborador_id=" + filtroColab + "&";
      var data = await api.get(url);
      setResumo(data.dados);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const carregarRegistos = async (page = 1) => {
    setRegistosLoading(true);
    try {
      var url = "/api/faltas/registos?page=" + page + "&limit=15";
      if (dataInicio) url += "&data_inicio=" + dataInicio;
      if (dataFim) url += "&data_fim=" + dataFim;
      if (filtroColab) url += "&colaborador_id=" + filtroColab;
      if (filtroTipo) url += "&tipo=" + filtroTipo;
      var data = await api.get(url);
      setRegistos(data.dados);
      setPaginacao(data.paginacao);
      setPagina(page);
    } catch (e) {
      console.error(e);
    } finally {
      setRegistosLoading(false);
    }
  };

  const carregarColaboradores = async () => {
    try {
      var data = await api.get("/api/colaboradores?page=1&limit=9999");
      setColaboradores(data.dados || []);
    } catch (e) {}
  };

  useEffect(() => {
    carregarColaboradores();
    carregarResumo();
    carregarRegistos();
  }, []);

  const aplicarFiltros = () => {
    carregarResumo();
    carregarRegistos(1);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.colaborador_id || !form.data) return;
    setSaving(true);
    try {
      var body = {
        colaborador_id: form.colaborador_id,
        data: form.data,
        estado: form.estado,
        hora_entrada: form.hora_entrada || null,
        hora_saida: form.hora_saida || null,
        observacoes: form.observacoes || null,
      };
      await api.post("/api/assiduidade", body);
      setShowModal(false);
      setForm({ colaborador_id: "", data: "", estado: "Ausente", hora_entrada: "", hora_saida: "", observacoes: "" });
      carregarResumo();
      carregarRegistos(1);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
      setTimeout(() => setMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoverJustificacao = async (id) => {
    setConfirmModal({
      open: true,
      titulo: "Remover Justificação",
      mensagem: "Tem certeza que deseja remover esta justificação?",
      onConfirm: async () => {
        try {
          await api.delete("/api/faltas/justificar/" + id);
          carregarResumo();
          carregarRegistos(pagina);
        } catch (e) {
          setMsg({ tipo: "erro", texto: e.message });
          setTimeout(() => setMsg(null), 3000);
        }
      },
    });
  };

  const handleEliminar = async (id) => {
    setConfirmModal({
      open: true,
      titulo: "Eliminar Registo",
      mensagem: "Tem certeza que deseja eliminar este registo de falta/atraso? Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        try {
          await api.delete("/api/faltas/eliminar/" + id);
          carregarResumo();
          carregarRegistos(pagina);
        } catch (e) {
          setMsg({ tipo: "erro", texto: e.message });
          setTimeout(() => setMsg(null), 3000);
        }
      },
    });
  };

  const formatCurrency = (v) => {
    return parseFloat(v || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " AOA";
  };

  const formatHorasDesconto = (horas) => {
    var h = Math.floor(horas);
    var m = Math.round((horas - h) * 60);
    if (h > 0 && m > 0) return h + "h " + m + "min";
    if (h > 0) return h + "h";
    return m + "min";
  };

  const totais = resumo ? resumo.totais : { total_faltas: 0, total_atrasos: 0, total_desconto: 0 };
  const lista = resumo ? resumo.colaboradores.filter(function (r) { return r.total_faltas > 0 || r.total_atrasos > 0; }) : [];

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-outline font-medium uppercase tracking-wide">
            <span>Tempo e Presença</span>
            <span>/</span>
            <span className="text-on-surface-variant">Faltas e Atrasos</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface">Gestão de Faltas e Atrasos</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg hover:bg-primary/90 transition-all">
          Novo Registo
        </button>
      </section>

      {msg && (
        <div className={"text-[13px] font-medium p-3 rounded-lg " + (msg.tipo === "erro" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
          {msg.texto}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-card border border-outline-variant rounded-xl p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Total de Faltas</p>
          <p className="text-[24px] font-bold text-red-600 mt-1">{loading ? "..." : totais.total_faltas}</p>
        </div>
        <div className="bg-surface-card border border-outline-variant rounded-xl p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Total de Atrasos</p>
          <p className="text-[24px] font-bold text-amber-600 mt-1">{loading ? "..." : totais.total_atrasos}</p>
        </div>
        <div className="bg-surface-card border border-outline-variant rounded-xl p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Desconto Previsto</p>
          <p className="text-[24px] font-bold text-on-surface mt-1">{loading ? "..." : formatCurrency(totais.total_desconto)}</p>
        </div>
      </section>

      <section className="glass-panel rounded-xl border border-outline-variant/30 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Data Início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Data Fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Colaborador</label>
            <select value={filtroColab} onChange={(e) => setFiltroColab(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50">
              <option value="">Todos</option>
              {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome_completo}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={aplicarFiltros} className="w-full py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              Filtrar
            </button>
          </div>
        </div>
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-on-surface">Resumo por Colaborador</h2>
            <div className="flex gap-2">
              <button onClick={() => { setFiltroTipo(""); carregarResumo(); carregarRegistos(1); }} className={"text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors " + (!filtroTipo ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-high")}>Todos</button>
              <button onClick={() => { setFiltroTipo("faltas"); }} className={"text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors " + (filtroTipo === "faltas" ? "bg-red-100 text-red-700" : "text-on-surface-variant hover:bg-surface-container-high")}>Faltas</button>
              <button onClick={() => { setFiltroTipo("atrasos"); }} className={"text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors " + (filtroTipo === "atrasos" ? "bg-amber-100 text-amber-700" : "text-on-surface-variant hover:bg-surface-container-high")}>Atrasos</button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-[12px] text-outline p-5">A carregar...</p>
        ) : lista.length === 0 ? (
          <p className="text-[12px] text-outline py-8 text-center">Nenhuma falta ou atraso registado no período selecionado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Colaborador</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Faltas</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Justificadas</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Atrasos</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Horas Desc.</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-right">Desconto</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {lista.map((r) => (
                  <tr key={r.colaborador_id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-[13px] font-medium text-on-surface">{r.nome_completo}</p>
                      <p className="text-[11px] text-outline">{r.numero_colaborador}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.total_faltas > 0 ? <span className="text-[13px] font-bold text-red-600">{r.total_faltas}</span> : <span className="text-[12px] text-outline/50">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.total_faltas_justificadas > 0 ? <span className="text-[13px] font-bold text-emerald-600">{r.total_faltas_justificadas}</span> : <span className="text-[12px] text-outline/50">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.total_atrasos > 0 ? <span className="text-[13px] font-bold text-amber-600">{r.total_atrasos}</span> : <span className="text-[12px] text-outline/50">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-[12px] text-on-surface-variant">{formatHorasDesconto(r.horas_descontar)}</td>
                    <td className="px-4 py-2.5 text-right text-[13px] font-semibold text-on-surface">{formatCurrency(r.desconto_previsto)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => { setDetalhe(r); setDetalheOpen(true); }} className="text-[12px] font-medium text-primary hover:underline">Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-5">
          <h2 className="text-[14px] font-semibold text-on-surface mb-4">Registos Individuais</h2>
        </div>
        {registosLoading ? (
          <p className="text-[12px] text-outline p-5">A carregar...</p>
        ) : registos.length === 0 ? (
          <p className="text-[12px] text-outline py-4 text-center">Sem registos</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Colaborador</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Data</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Tipo</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Estado</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Entrada</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Saída</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Observações</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {registos.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="px-4 py-2.5 text-[13px] font-medium text-on-surface">{r.colaborador ? r.colaborador.nome_completo : "—"}</td>
                      <td className="px-4 py-2.5 text-[12px] text-on-surface-variant">{formatDate(r.data)}</td>
                      <td className="px-4 py-2.5">
                        <span className={"text-[11px] font-semibold px-2 py-0.5 rounded " + (r.estado === "Ausente" ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200")}>
                          {r.estado === "Ausente" ? "Falta" : "Atraso"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {r.justificado ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Justificado
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                            Não justificado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-on-surface-variant">{r.hora_entrada || "—"}</td>
                      <td className="px-4 py-2.5 text-[12px] text-on-surface-variant">{r.hora_saida || "—"}</td>
                      <td className="px-4 py-2.5 text-[12px] text-outline max-w-[200px] truncate">{r.observacoes || "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {r.justificado && r.documento_justificacao && (
                            <a href={r.documento_justificacao} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-emerald-600 hover:underline px-1.5 py-0.5 rounded hover:bg-emerald-50">
                              Ver Doc
                            </a>
                          )}
                          {r.justificado && (
                            <button onClick={() => handleRemoverJustificacao(r.id)} className="text-[11px] font-medium text-amber-600 hover:underline px-1.5 py-0.5 rounded hover:bg-amber-50">
                              Rem. Just.
                            </button>
                          )}
                          <button onClick={() => handleEliminar(r.id)} className="text-[11px] font-medium text-red-500 hover:underline px-1.5 py-0.5 rounded hover:bg-red-50">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paginacao.total_paginas > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/30">
                <p className="text-[12px] text-outline">Página {pagina} de {paginacao.total_paginas} ({paginacao.total} registos)</p>
                <div className="flex gap-2">
                  <button onClick={() => carregarRegistos(pagina - 1)} disabled={pagina <= 1} className="px-3 py-1.5 text-[12px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-30">Anterior</button>
                  <button onClick={() => carregarRegistos(pagina + 1)} disabled={pagina >= paginacao.total_paginas} className="px-3 py-1.5 text-[12px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-30">Próximo</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {detalheOpen && detalhe && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => setDetalheOpen(false)} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-on-surface">{detalhe.nome_completo}</h3>
              <button onClick={() => setDetalheOpen(false)} className="text-[13px] text-outline hover:text-on-surface-variant">Fechar</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="text-[20px] font-bold text-red-600">{detalhe.total_faltas}</p>
                <p className="text-[11px] text-outline">Faltas</p>
              </div>
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="text-[20px] font-bold text-amber-600">{detalhe.total_atrasos}</p>
                <p className="text-[11px] text-outline">Atrasos</p>
              </div>
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="text-[20px] font-bold text-emerald-600">{detalhe.total_faltas_justificadas + detalhe.total_atrasos_justificados}</p>
                <p className="text-[11px] text-outline">Justificados</p>
              </div>
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="text-[20px] font-bold text-primary">{formatCurrency(detalhe.desconto_previsto)}</p>
                <p className="text-[11px] text-outline">Desconto Previsto</p>
              </div>
            </div>
            {detalhe.faltas_detalhe.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[12px] font-semibold text-on-surface-variant mb-2">Faltas</h4>
                <div className="space-y-1">
                  {detalhe.faltas_detalhe.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px] text-on-surface-variant py-1.5 border-b border-outline-variant/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(f.data)}</span>
                        {f.justificado && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Justificado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-outline">{f.observacoes || ""}</span>
                        {f.justificado && f.documento_justificacao && (
                          <a href={f.documento_justificacao} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 hover:underline">Ver Doc</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detalhe.atrasos_detalhe.length > 0 && (
              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant mb-2">Atrasos</h4>
                <div className="space-y-1">
                  {detalhe.atrasos_detalhe.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px] text-on-surface-variant py-1.5 border-b border-outline-variant/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(a.data)}</span>
                        <span>Entrada: {a.hora_entrada}</span>
                        {a.justificado && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Justificado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600 font-medium">+{a.minutos} min</span>
                        {a.justificado && a.documento_justificacao && (
                          <a href={a.documento_justificacao} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 hover:underline">Ver Doc</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-on-surface">Novo Registo de Falta/Atraso</h3>
              <button onClick={() => setShowModal(false)} className="text-[13px] text-outline hover:text-on-surface-variant">Fechar</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Colaborador *</label>
                <select value={form.colaborador_id} onChange={(e) => setForm(Object.assign({}, form, { colaborador_id: e.target.value }))} required className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50">
                  <option value="">Selecionar...</option>
                  {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome_completo}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Data *</label>
                <input type="date" value={form.data} onChange={(e) => setForm(Object.assign({}, form, { data: e.target.value }))} required className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Estado *</label>
                <select value={form.estado} onChange={(e) => setForm(Object.assign({}, form, { estado: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50">
                  <option value="Ausente">Falta (Ausente)</option>
                  <option value="Atrasado">Atraso</option>
                  <option value="Presente">Presente</option>
                  <option value="Licença">Licença</option>
                  <option value="Férias">Férias</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Hora Entrada</label>
                  <input type="time" value={form.hora_entrada} onChange={(e) => setForm(Object.assign({}, form, { hora_entrada: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Hora Saída</label>
                  <input type="time" value={form.hora_saida} onChange={(e) => setForm(Object.assign({}, form, { hora_saida: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm(Object.assign({}, form, { observacoes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-outline-variant text-[13px] font-medium text-on-surface-variant hover:bg-surface-container">Cancelar</button>
                <button type="submit" disabled={saving || !form.colaborador_id || !form.data} className="flex-1 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-40">{saving ? "A guardar..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => setConfirmModal({ open: false, titulo: "", mensagem: "", onConfirm: null })} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-[15px] font-semibold text-on-surface mb-2">{confirmModal.titulo}</h3>
            <p className="text-[13px] text-on-surface-variant mb-5">{confirmModal.mensagem}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmModal({ open: false, titulo: "", mensagem: "", onConfirm: null })} className="flex-1 py-2 rounded-lg border border-outline-variant text-[13px] font-medium text-on-surface-variant hover:bg-surface-container">Cancelar</button>
              <button onClick={async () => { var fn = confirmModal.onConfirm; setConfirmModal({ open: false, titulo: "", mensagem: "", onConfirm: null }); if (fn) await fn(); }} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[13px] font-medium hover:bg-red-600">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}