"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/helpers";

var TIPO_LABELS = { ferias: "Férias", adiantamento: "Adiantamento", justificacao: "Justificação", aumento: "Aumento", outro: "Outro" };

function FeriasWaveChart({ data }) {
  var total = (data.disponiveis || 0) + (data.gozados || 0) + (data.planeados || 0) || 1;
  var segments = [
    { label: "Disponíveis", value: data.disponiveis || 0, color: "#16a34a" },
    { label: "Gozados", value: data.gozados || 0, color: "#002b92" },
    { label: "Planeados", value: data.planeados || 0, color: "#c084fc" },
  ];
  var pct = segments.map(function (s) { return (s.value / total) * 100; });

  var w = 400;
  var h = 80;
  var pts = [];
  for (var i = 0; i <= w; i++) {
    var x = i;
    var base = h - 8;
    var amp = 6;
    var y = base - amp * Math.sin((i / w) * Math.PI * 2.5) * Math.min(total, 22) / 22;
    pts.push(x + "," + y);
  }
  var waveLine = pts.join(" ");
  var waveFill = waveLine + " " + w + "," + h + " 0," + h;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Mapa de Férias</h2>
      <div className="relative mb-3">
        <svg viewBox={"0 0 " + w + " " + h} className="w-full h-16">
          <polygon points={waveFill} fill="url(#portalWave)" opacity="0.12" />
          <polyline points={waveLine} fill="none" stroke="#002b92" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5" />
          <defs>
            <linearGradient id="portalWave" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#002b92" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#002b92" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex gap-4">
        {segments.map(function (s, i) {
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-slate-500">{s.label}</span>
              <span className="text-[11px] font-semibold text-slate-700">{s.value}</span>
              <span className="text-[10px] text-slate-400">({Math.round(pct[i])}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function estadoClasses(estado) {
  if (estado === "aprovado") return "bg-green-50 text-green-700 border border-green-200";
  if (estado === "pendente") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (estado === "rejeitado") return "bg-red-50 text-red-700 border border-red-200";
  return "bg-slate-50 text-slate-500 border border-slate-200";
}

export default function PortalPage() {
  var auth = useAuth();
  var utilizador = auth ? auth.utilizador : null;

  var [portalData, setPortalData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [showFeriasModal, setShowFeriasModal] = useState(false);
  var [showAdiantamentoModal, setShowAdiantamentoModal] = useState(false);
  var [showPasswordModal, setShowPasswordModal] = useState(false);
  var [justificacaoForm, setJustificacaoForm] = useState({ falta: null, tipo: "Atestado_Medico", ficheiro: null });
  var [feriasForm, setFeriasForm] = useState({ titulo: "", descricao: "", data_inicio: "", data_fim: "" });
  var [adiantamentoForm, setAdiantamentoForm] = useState({ titulo: "", descricao: "", valor: "" });
  var [passwordForm, setPasswordForm] = useState({ atual: "", nova: "", confirmar: "" });
  var [passwordMsg, setPasswordMsg] = useState("");
  var [submitting, setSubmitting] = useState(false);
  var [uploadDrag, setUploadDrag] = useState(false);
  var fileInputRef = useRef(null);

  var now = new Date();
  var hora = now.getHours();
  var saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  var nome = "";
  if (utilizador && utilizador.nome_completo) {
    nome = " " + utilizador.nome_completo.split(" ")[0] + ".";
  }
  var dataHoje = now.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(function () {
    var fetchData = function () {
      api.get("/api/portal/stats").then(function (res) {
        if (res && res.dados) setPortalData(res.dados);
      }).catch(function () {}).finally(function () { setLoading(false); });
    };
    fetchData();
    var interval = setInterval(fetchData, 30000);
    return function () { clearInterval(interval); };
  }, []);

  var handleFileDrop = function (e) {
    e.preventDefault();
    setUploadDrag(false);
    var files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (files && files.length > 0) setJustificacaoForm(Object.assign({}, justificacaoForm, { ficheiro: files[0] }));
  };

  var handleFileSelect = function (e) {
    if (e.target.files && e.target.files.length > 0) setJustificacaoForm(Object.assign({}, justificacaoForm, { ficheiro: e.target.files[0] }));
  };

  var handleSubmitFerias = function (e) {
    e.preventDefault();
    setSubmitting(true);
    api.post("/api/pedidos", {
      tipo: "ferias",
      titulo: feriasForm.titulo || "Pedido de Férias",
      descricao: feriasForm.descricao,
      dados: { data_inicio: feriasForm.data_inicio, data_fim: feriasForm.data_fim },
    }).then(function () {
      setShowFeriasModal(false);
      setFeriasForm({ titulo: "", descricao: "", data_inicio: "", data_fim: "" });
      return api.get("/api/portal/stats");
    }).then(function (res) { if (res && res.dados) setPortalData(res.dados); })
      .catch(function () {}).finally(function () { setSubmitting(false); });
  };

  var handleSubmitAdiantamento = function (e) {
    e.preventDefault();
    setSubmitting(true);
    api.post("/api/pedidos", {
      tipo: "adiantamento",
      titulo: adiantamentoForm.titulo || "Pedido de Adiantamento",
      descricao: adiantamentoForm.descricao,
      dados: { valor: adiantamentoForm.valor },
    }).then(function () {
      setShowAdiantamentoModal(false);
      setAdiantamentoForm({ titulo: "", descricao: "", valor: "" });
      return api.get("/api/portal/stats");
    }).then(function (res) { if (res && res.dados) setPortalData(res.dados); })
      .catch(function () {}).finally(function () { setSubmitting(false); });
  };

  var handleSubmitJustificacao = function (e) {
    e.preventDefault();
    if (!justificacaoForm.falta) return;
    setSubmitting(true);
    var formData = new FormData();
    formData.append("tipo", "justificacao");
    formData.append("titulo", "Justificação de Falta");
    formData.append("descricao", "Tipo: " + justificacaoForm.tipo + " - Data: " + justificacaoForm.falta.data);
    formData.append("dados", JSON.stringify({ data: justificacaoForm.falta.data, tipo: justificacaoForm.tipo, registos_presenca_id: justificacaoForm.falta.id }));
    if (justificacaoForm.ficheiro) formData.append("ficheiro", justificacaoForm.ficheiro);
    api.upload("/api/pedidos", formData).then(function () {
      setJustificacaoForm({ falta: null, tipo: "Atestado_Medico", ficheiro: null });
      return api.get("/api/portal/stats");
    }).then(function (res) { if (res && res.dados) setPortalData(res.dados); })
      .catch(function () {}).finally(function () { setSubmitting(false); });
  };

  var handleSubmitPassword = function (e) {
    e.preventDefault();
    setPasswordMsg("");
    if (passwordForm.nova !== passwordForm.confirmar) { setPasswordMsg("As senhas não coincidem"); return; }
    if (passwordForm.nova.length < 6) { setPasswordMsg("Mínimo 6 caracteres"); return; }
    setSubmitting(true);
    api.put("/auth/change-password", { password_atual: passwordForm.atual, password_nova: passwordForm.nova })
      .then(function () { setPasswordMsg("Senha alterada com sucesso!"); setPasswordForm({ atual: "", nova: "", confirmar: "" }); setTimeout(function () { setShowPasswordModal(false); setPasswordMsg(""); }, 2000); })
      .catch(function (err) { setPasswordMsg(err.message || "Erro"); })
      .finally(function () { setSubmitting(false); });
  };

  var ferias = portalData ? portalData.ferias : { disponiveis: 0, gozados: 0, planeados: 0 };
  var avaliacoes = portalData ? portalData.avaliacoes : { pontuacao: 0, ciclos: [] };
  var pedidosRecentes = portalData ? (portalData.pedidos_recentes || []) : [];
  var faltas = portalData ? (portalData.faltas || []) : [];
  var faltasNaoJustificadas = faltas.filter(function (f) { return !f.justificado; });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pt-2">
        <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-1">{dataHoje}</p>
        <h1 className="text-[22px] font-semibold text-slate-800">{saudacao}{nome}</h1>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-slate-700">Férias</h2>
          <button onClick={function () { setShowFeriasModal(true); }} className="text-[12px] font-medium text-primary hover:underline">+ Solicitar</button>
        </div>
        <div className="grid grid-cols-3 gap-px bg-slate-200 rounded-lg overflow-hidden mb-4">
          <div className="bg-white p-4 text-center">
            <p className="text-[20px] font-bold text-slate-800">{ferias.disponiveis}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Disponíveis</p>
          </div>
          <div className="bg-white p-4 text-center">
            <p className="text-[20px] font-bold text-slate-800">{ferias.gozados}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Gozados</p>
          </div>
          <div className="bg-white p-4 text-center">
            <p className="text-[20px] font-bold text-slate-800">{ferias.planeados}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Planeados</p>
          </div>
        </div>
      </section>

      <FeriasWaveChart data={ferias} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Adiantamento Salarial</h2>
          <button onClick={function () { setShowAdiantamentoModal(true); }} className="w-full py-2.5 text-[13px] font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Pedir adiantamento
          </button>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Avaliações</h2>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[28px] font-bold text-slate-800">{avaliacoes.pontuacao > 0 ? avaliacoes.pontuacao.toFixed(1) : "0.0"}</span>
            {avaliacoes.pontuacao > 0 && <span className="text-[12px] text-slate-400">/ 20</span>}
          </div>
          {avaliacoes.ciclos.length > 0 ? (
            <div className="space-y-2">
              {avaliacoes.ciclos.slice(0, 3).map(function (ciclo, i) {
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>{ciclo.nome}</span>
                      <span className="font-medium text-slate-600">{ciclo.progresso}%</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={"h-full rounded-full " + (ciclo.progresso >= 100 ? "bg-green-500" : ciclo.progresso >= 50 ? "bg-amber-500" : "bg-slate-300")} style={{ width: ciclo.progresso + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-slate-400">Sem avaliações registadas</p>
          )}
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Faltas e Atrasos</h2>
        {faltas.length === 0 ? (
          <p className="text-[12px] text-slate-400">Sem faltas ou atrasos registados</p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Data</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase text-center">Acção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faltas.map(function (f, i) {
                  return (
                    <tr key={f.id || i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-[12px] text-slate-600">{formatDate(f.data)}</td>
                      <td className="px-4 py-2.5">
                        <span className={"text-[11px] font-semibold px-2 py-0.5 rounded " + (f.estado === "Ausente" ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200")}>
                          {f.estado === "Ausente" ? "Falta" : "Atraso"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {f.justificado ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Justificado</span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">Não justificado</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {!f.justificado && (
                          <button onClick={function () { setJustificacaoForm({ falta: f, tipo: "Atestado_Medico", ficheiro: null }); }} className="text-[11px] font-medium text-primary hover:underline px-2 py-1 rounded hover:bg-primary/5">
                            Justificar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {justificacaoForm.falta && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setJustificacaoForm({ falta: null, tipo: "Atestado_Medico", ficheiro: null }); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-slate-800">Justificar {justificacaoForm.falta.estado === "Ausente" ? "Falta" : "Atraso"}</h3>
              <button onClick={function () { setJustificacaoForm({ falta: null, tipo: "Atestado_Medico", ficheiro: null }); }} className="text-[13px] text-slate-400 hover:text-slate-600">Fechar</button>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-[13px] text-slate-600 mb-3">
              <p><span className="font-semibold">Data:</span> {formatDate(justificacaoForm.falta.data)}</p>
              {justificacaoForm.falta.hora_entrada && <p><span className="font-semibold">Entrada:</span> {justificacaoForm.falta.hora_entrada}</p>}
              {justificacaoForm.falta.observacoes && <p><span className="font-semibold">Observações:</span> {justificacaoForm.falta.observacoes}</p>}
            </div>
            <form onSubmit={handleSubmitJustificacao} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Tipo de Justificação</label>
                <select value={justificacaoForm.tipo} onChange={function (e) { setJustificacaoForm(Object.assign({}, justificacaoForm, { tipo: e.target.value })); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors">
                  <option value="Atestado_Medico">Atestado Médico</option>
                  <option value="Assuntos_Pessoais">Assuntos Pessoais</option>
                  <option value="Formacao_Externa">Formação Externa</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Comprovativo</label>
                <div
                  className={"border border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors text-[12px] " + (uploadDrag ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-400 hover:border-slate-300")}
                  onDragOver={function (e) { e.preventDefault(); setUploadDrag(true); }}
                  onDragLeave={function () { setUploadDrag(false); }}
                  onDrop={handleFileDrop}
                  onClick={function () { if (fileInputRef.current) fileInputRef.current.click(); }}
                >
                  {justificacaoForm.ficheiro ? justificacaoForm.ficheiro.name : "Anexar comprovativo (PDF, imagem)"}
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={function () { setJustificacaoForm({ falta: null, tipo: "Atestado_Medico", ficheiro: null }); }} className="flex-1 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40">
                  {submitting ? "A enviar..." : "Submeter Justificação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Pedidos Recentes</h2>
        {loading ? (
          <p className="text-[12px] text-slate-400">A carregar...</p>
        ) : pedidosRecentes.length === 0 ? (
          <p className="text-[12px] text-slate-400">Sem pedidos</p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Título</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidosRecentes.map(function (p, i) {
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-[12px] text-slate-500">{TIPO_LABELS[p.tipo] || p.tipo}</td>
                      <td className="px-4 py-2.5 text-[13px] text-slate-700 font-medium">{p.titulo || "—"}</td>
                      <td className="px-4 py-2.5"><span className={"text-[11px] font-semibold px-2 py-0.5 rounded " + estadoClasses(p.estado)}>{p.estado}</span></td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-400">{formatDate(p.createdAt || p.data_criacao)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border-t border-slate-200 pt-6">
        <button onClick={function () { setShowPasswordModal(true); setPasswordMsg(""); }} className="text-[13px] text-slate-500 hover:text-slate-700 transition-colors">
          Alterar senha
        </button>
      </section>

      {showFeriasModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setShowFeriasModal(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-slate-800">Solicitar Férias</h3>
              <button onClick={function () { setShowFeriasModal(false); }} className="text-[13px] text-slate-400 hover:text-slate-600">Fechar</button>
            </div>
            <form onSubmit={handleSubmitFerias} className="space-y-3">
              <input type="text" value={feriasForm.titulo} onChange={function (e) { setFeriasForm(Object.assign({}, feriasForm, { titulo: e.target.value })); }} placeholder="Título" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              <textarea value={feriasForm.descricao} onChange={function (e) { setFeriasForm(Object.assign({}, feriasForm, { descricao: e.target.value })); }} rows={2} placeholder="Descrição (opcional)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={feriasForm.data_inicio} onChange={function (e) { setFeriasForm(Object.assign({}, feriasForm, { data_inicio: e.target.value })); }} required className="px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
                <input type="date" value={feriasForm.data_fim} onChange={function (e) { setFeriasForm(Object.assign({}, feriasForm, { data_fim: e.target.value })); }} required className="px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={function () { setShowFeriasModal(false); }} className="flex-1 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">{submitting ? "..." : "Enviar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdiantamentoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setShowAdiantamentoModal(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-slate-800">Pedir Adiantamento</h3>
              <button onClick={function () { setShowAdiantamentoModal(false); }} className="text-[13px] text-slate-400 hover:text-slate-600">Fechar</button>
            </div>
            <form onSubmit={handleSubmitAdiantamento} className="space-y-3">
              <input type="text" value={adiantamentoForm.titulo} onChange={function (e) { setAdiantamentoForm(Object.assign({}, adiantamentoForm, { titulo: e.target.value })); }} placeholder="Título" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              <input type="number" value={adiantamentoForm.valor} onChange={function (e) { setAdiantamentoForm(Object.assign({}, adiantamentoForm, { valor: e.target.value })); }} placeholder="Valor (AOA)" required className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              <textarea value={adiantamentoForm.descricao} onChange={function (e) { setAdiantamentoForm(Object.assign({}, adiantamentoForm, { descricao: e.target.value })); }} rows={2} placeholder="Motivo (opcional)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none" />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={function () { setShowAdiantamentoModal(false); }} className="flex-1 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-lg bg-slate-800 text-white text-[13px] font-medium hover:bg-slate-700 transition-colors disabled:opacity-40">{submitting ? "..." : "Enviar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setShowPasswordModal(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-slate-800">Alterar Senha</h3>
              <button onClick={function () { setShowPasswordModal(false); }} className="text-[13px] text-slate-400 hover:text-slate-600">Fechar</button>
            </div>
            {passwordMsg && <div className={"text-[12px] font-medium p-2 rounded-lg mb-3 " + (passwordMsg.includes("sucesso") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>{passwordMsg}</div>}
            <form onSubmit={handleSubmitPassword} className="space-y-3">
              <input type="password" value={passwordForm.atual} onChange={function (e) { setPasswordForm(Object.assign({}, passwordForm, { atual: e.target.value })); }} placeholder="Senha atual" required className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              <input type="password" value={passwordForm.nova} onChange={function (e) { setPasswordForm(Object.assign({}, passwordForm, { nova: e.target.value })); }} placeholder="Nova senha" required minLength={6} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              <input type="password" value={passwordForm.confirmar} onChange={function (e) { setPasswordForm(Object.assign({}, passwordForm, { confirmar: e.target.value })); }} placeholder="Confirmar" required minLength={6} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={function () { setShowPasswordModal(false); }} className="flex-1 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">{submitting ? "..." : "Alterar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
