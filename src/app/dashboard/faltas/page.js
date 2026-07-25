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
  const [justificarModal, setJustificarModal] = useState({ open: false, item: null });
  const [justForm, setJustForm] = useState({ observacoes: "", documento: null });
  const [justSaving, setJustSaving] = useState(false);

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
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleJustificar = async () => {
    if (!justificarModal.item) return;
    setJustSaving(true);
    try {
      var formData = new FormData();
      formData.append("justificacao_observacoes", justForm.observacoes || "");
      if (justForm.documento) {
        formData.append("documento", justForm.documento);
      }
      await api.upload("/api/faltas/justificar/" + justificarModal.item.id, formData);
      setJustificarModal({ open: false, item: null });
      setJustForm({ observacoes: "", documento: null });
      carregarResumo();
      carregarRegistos(pagina);
    } catch (e) {
      alert(e.message);
    } finally {
      setJustSaving(false);
    }
  };

  const handleRemoverJustificacao = async (id) => {
    if (!confirm("Tem certeza que deseja remover esta justificacao?")) return;
    try {
      await api.delete("/api/faltas/justificar/" + id);
      carregarResumo();
      carregarRegistos(pagina);
    } catch (e) {
      alert(e.message);
    }
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
          <nav className="flex items-center gap-2 text-[12px] text-slate-400 font-medium uppercase tracking-wide">
            <span>Tempo e Presenca</span>
            <span>/</span>
            <span className="text-slate-600">Faltas e Atrasos</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-800">Gestao de Faltas e Atrasos</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg hover:bg-primary/90 transition-all">
          Novo Registo
        </button>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Total de Faltas</p>
          <p className="text-[24px] font-bold text-red-600 mt-1">{loading ? "..." : totais.total_faltas}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Total de Atrasos</p>
          <p className="text-[24px] font-bold text-amber-600 mt-1">{loading ? "..." : totais.total_atrasos}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Desconto Previsto</p>
          <p className="text-[24px] font-bold text-slate-800 mt-1">{loading ? "..." : formatCurrency(totais.total_desconto)}</p>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Data Inicio</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Data Fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Colaborador</label>
            <select value={filtroColab} onChange={(e) => setFiltroColab(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50">
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

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-slate-700">Resumo por Colaborador</h2>
          <div className="flex gap-2">
            <button onClick={() => { setFiltroTipo(""); carregarResumo(); carregarRegistos(1); }} className={"text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors " + (!filtroTipo ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100")}>Todos</button>
            <button onClick={() => { setFiltroTipo("faltas"); }} className={"text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors " + (filtroTipo === "faltas" ? "bg-red-100 text-red-700" : "text-slate-500 hover:bg-slate-100")}>Faltas</button>
            <button onClick={() => { setFiltroTipo("atrasos"); }} className={"text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors " + (filtroTipo === "atrasos" ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:bg-slate-100")}>Atrasos</button>
          </div>
        </div>

        {loading ? (
          <p className="text-[12px] text-slate-400">A carregar...</p>
        ) : lista.length === 0 ? (
          <p className="text-[12px] text-slate-400 py-8 text-center">Nenhuma falta ou atraso registado no periodo selecionado</p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Colaborador</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase text-center">Faltas</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase text-center">Justificadas</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase text-center">Atrasos</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase text-center">Horas Desc.</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase text-right">Desconto</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase text-center">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((r) => (
                  <tr key={r.colaborador_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-[13px] font-medium text-slate-700">{r.nome_completo}</p>
                      <p className="text-[11px] text-slate-400">{r.numero_colaborador}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.total_faltas > 0 ? <span className="text-[13px] font-bold text-red-600">{r.total_faltas}</span> : <span className="text-[12px] text-slate-300">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.total_faltas_justificadas > 0 ? <span className="text-[13px] font-bold text-emerald-600">{r.total_faltas_justificadas}</span> : <span className="text-[12px] text-slate-300">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.total_atrasos > 0 ? <span className="text-[13px] font-bold text-amber-600">{r.total_atrasos}</span> : <span className="text-[12px] text-slate-300">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-[12px] text-slate-500">{formatHorasDesconto(r.horas_descontar)}</td>
                    <td className="px-4 py-2.5 text-right text-[13px] font-semibold text-slate-700">{formatCurrency(r.desconto_previsto)}</td>
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

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 mb-4">Registos Individuais</h2>
        {registosLoading ? (
          <p className="text-[12px] text-slate-400">A carregar...</p>
        ) : registos.length === 0 ? (
          <p className="text-[12px] text-slate-400 py-4 text-center">Sem registos</p>
        ) : (
          <>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Colaborador</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Data</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Tipo</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Estado</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Entrada</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Saida</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Observacoes</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase text-center">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registos.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-[13px] font-medium text-slate-700">{r.colaborador ? r.colaborador.nome_completo : "—"}</td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-500">{formatDate(r.data)}</td>
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
                            Nao justificado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-500">{r.hora_entrada || "—"}</td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-500">{r.hora_saida || "—"}</td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-400 max-w-[200px] truncate">{r.observacoes || "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {r.justificado ? (
                            <>
                              {r.documento_justificacao && (
                                <a href={"http://localhost:8000" + r.documento_justificacao} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-emerald-600 hover:underline px-1.5 py-0.5 rounded hover:bg-emerald-50">
                                  Ver Doc
                                </a>
                              )}
                              <button onClick={() => handleRemoverJustificacao(r.id)} className="text-[11px] font-medium text-red-500 hover:underline px-1.5 py-0.5 rounded hover:bg-red-50">
                                Remover
                              </button>
                            </>
                          ) : (
                            <button onClick={() => { setJustificarModal({ open: true, item: r }); setJustForm({ observacoes: "", documento: null }); }} className="text-[11px] font-medium text-primary hover:underline px-1.5 py-0.5 rounded hover:bg-primary/5">
                              Justificar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paginacao.total_paginas > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <p className="text-[12px] text-slate-400">Pagina {pagina} de {paginacao.total_paginas} ({paginacao.total} registos)</p>
                <div className="flex gap-2">
                  <button onClick={() => carregarRegistos(pagina - 1)} disabled={pagina <= 1} className="px-3 py-1.5 text-[12px] font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30">Anterior</button>
                  <button onClick={() => carregarRegistos(pagina + 1)} disabled={pagina >= paginacao.total_paginas} className="px-3 py-1.5 text-[12px] font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30">Proximo</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {detalheOpen && detalhe && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => setDetalheOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-slate-800">{detalhe.nome_completo}</h3>
              <button onClick={() => setDetalheOpen(false)} className="text-[13px] text-slate-400 hover:text-slate-600">Fechar</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[20px] font-bold text-red-600">{detalhe.total_faltas}</p>
                <p className="text-[11px] text-slate-400">Faltas</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[20px] font-bold text-amber-600">{detalhe.total_atrasos}</p>
                <p className="text-[11px] text-slate-400">Atrasos</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[20px] font-bold text-emerald-600">{detalhe.total_faltas_justificadas + detalhe.total_atrasos_justificados}</p>
                <p className="text-[11px] text-slate-400">Justificados</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[20px] font-bold text-primary">{formatCurrency(detalhe.desconto_previsto)}</p>
                <p className="text-[11px] text-slate-400">Desconto Previsto</p>
              </div>
            </div>
            {detalhe.faltas_detalhe.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[12px] font-semibold text-slate-600 mb-2">Faltas</h4>
                <div className="space-y-1">
                  {detalhe.faltas_detalhe.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px] text-slate-500 py-1.5 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(f.data)}</span>
                        {f.justificado && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Justificado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{f.observacoes || ""}</span>
                        {f.justificado && f.documento_justificacao && (
                          <a href={"http://localhost:8000" + f.documento_justificacao} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 hover:underline">Ver Doc</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detalhe.atrasos_detalhe.length > 0 && (
              <div>
                <h4 className="text-[12px] font-semibold text-slate-600 mb-2">Atrasos</h4>
                <div className="space-y-1">
                  {detalhe.atrasos_detalhe.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px] text-slate-500 py-1.5 border-b border-slate-100 last:border-0">
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
                          <a href={"http://localhost:8000" + a.documento_justificacao} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 hover:underline">Ver Doc</a>
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
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-slate-800">Novo Registo de Falta/Atraso</h3>
              <button onClick={() => setShowModal(false)} className="text-[13px] text-slate-400 hover:text-slate-600">Fechar</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Colaborador *</label>
                <select value={form.colaborador_id} onChange={(e) => setForm(Object.assign({}, form, { colaborador_id: e.target.value }))} required className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50">
                  <option value="">Selecionar...</option>
                  {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome_completo}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Data *</label>
                <input type="date" value={form.data} onChange={(e) => setForm(Object.assign({}, form, { data: e.target.value }))} required className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Estado *</label>
                <select value={form.estado} onChange={(e) => setForm(Object.assign({}, form, { estado: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50">
                  <option value="Ausente">Falta (Ausente)</option>
                  <option value="Atrasado">Atraso</option>
                  <option value="Presente">Presente</option>
                  <option value="Licenca">Licenca</option>
                  <option value="Ferias">Ferias</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Hora Entrada</label>
                  <input type="time" value={form.hora_entrada} onChange={(e) => setForm(Object.assign({}, form, { hora_entrada: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Hora Saida</label>
                  <input type="time" value={form.hora_saida} onChange={(e) => setForm(Object.assign({}, form, { hora_saida: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Observacoes</label>
                <textarea value={form.observacoes} onChange={(e) => setForm(Object.assign({}, form, { observacoes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving || !form.colaborador_id || !form.data} className="flex-1 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-40">{saving ? "A guardar..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {justificarModal.open && justificarModal.item && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => setJustificarModal({ open: false, item: null })} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-slate-800">Justificar {justificarModal.item.estado === "Ausente" ? "Falta" : "Atraso"}</h3>
              <button onClick={() => setJustificarModal({ open: false, item: null })} className="text-[13px] text-slate-400 hover:text-slate-600">Fechar</button>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 text-[13px] text-slate-600">
                <p><span className="font-semibold">Data:</span> {formatDate(justificarModal.item.data)}</p>
                {justificarModal.item.hora_entrada && <p><span className="font-semibold">Entrada:</span> {justificarModal.item.hora_entrada}</p>}
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Observacoes da Justificacao</label>
                <textarea value={justForm.observacoes} onChange={(e) => setJustForm(Object.assign({}, justForm, { observacoes: e.target.value }))} rows={3} placeholder="Descreva o motivo da justificacao..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 resize-none" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Documento de Justificacao</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setJustForm(Object.assign({}, justForm, { documento: e.target.files[0] }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                <p className="text-[11px] text-slate-400 mt-1">PDF, imagem ou documento (max 10MB)</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setJustificarModal({ open: false, item: null })} className="flex-1 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleJustificar} disabled={justSaving} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 disabled:opacity-40">
                  {justSaving ? "A guardar..." : "Confirmar Justificacao"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
