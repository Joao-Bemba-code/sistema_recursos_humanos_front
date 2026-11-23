"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/helpers";

const TIPO_LABELS = {
  deficit_saida_antecipada: "Saída antecipada",
  compensacao: "Compensação",
};

const ESTADO_LABELS = {
  aberto: "Em aberto",
  justificado: "Justificado",
  descontado: "Descontado",
};

const formatHoras = (horas) => {
  const valor = Number(horas || 0);
  const sinal = valor < 0 ? "-" : "";
  const abs = Math.abs(valor);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  if (h > 0 && m > 0) return `${sinal}${h}h ${m}min`;
  if (h > 0) return `${sinal}${h}h`;
  return `${sinal}${m}min`;
};

export default function BancoHorasPage() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [meuSaldo, setMeuSaldo] = useState(null);
  const [resumo, setResumo] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  const [pagina, setPagina] = useState(1);
  const [colaboradores, setColaboradores] = useState([]);
  const [filtroColab, setFiltroColab] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [msg, setMsg] = useState(null);
  const [justificando, setJustificando] = useState("");

  const ehAdmin = !!(
    auth &&
    ((typeof auth.isAdmin === "function" && auth.isAdmin()) ||
      (typeof auth.hasPermission === "function" && auth.hasPermission("assiduidade", "update")))
  );

  const avisar = useCallback((texto, tipo = "sucesso") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  }, []);

  const carregarMeuSaldo = useCallback(async () => {
    try {
      const data = await api.get("/api/banco-horas/meu-saldo");
      setMeuSaldo(data.dados);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const carregarAdmin = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const url = "/api/banco-horas/resumo?apenas_com_saldo=true";
      const [resumoData, listaData] = await Promise.all([
        api.get(url),
        api.get(
          `/api/banco-horas/movimentos?page=${page}&limit=15` +
            (filtroColab ? `&colaborador_id=${filtroColab}` : "") +
            (filtroEstado ? `&estado=${filtroEstado}` : "") +
            (dataInicio ? `&data_inicio=${dataInicio}` : "") +
            (dataFim ? `&data_fim=${dataFim}` : "")
        ),
      ]);
      setResumo(resumoData.dados || []);
      setMovimentos(listaData.dados || []);
      setPaginacao(listaData.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
      setPagina(page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filtroColab, filtroEstado, dataInicio, dataFim]);

  useEffect(() => {
    let ativo = true;
    // Carrega apos a primeira pintura: as actualizacoes de estado ficam
    // dentro de callbacks assincronos e nao no corpo do efeito.
    Promise.resolve().then(() => {
      carregarMeuSaldo();
      if (!ehAdmin) {
        if (ativo) setLoading(false);
        return;
      }
      api
        .get("/api/colaboradores?page=1&limit=9999")
        .then((data) => { if (ativo) setColaboradores(data.dados || []); })
        .catch(() => {});
      carregarAdmin(1);
    });
    return () => { ativo = false; };
  }, [carregarMeuSaldo, carregarAdmin, ehAdmin]);

  const justificar = async (id) => {
    setJustificando(id);
    try {
      await api.post(`/api/banco-horas/justificar/${id}`, { observacoes: "Justificado manualmente pelo administrador" });
      avisar("Movimento justificado com sucesso");
      await Promise.all([carregarAdmin(pagina), carregarMeuSaldo()]);
    } catch (e) {
      avisar(e.message || "Não foi possível justificar", "erro");
    } finally {
      setJustificando("");
    }
  };

  const totalDevedor = resumo.reduce((acc, r) => acc + Number(r.horas_devidas || 0), 0);
  const totalCredito = resumo.reduce((acc, r) => acc + Number(r.horas_credito || 0), 0);

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <nav className="flex items-center gap-2 text-[12px] text-outline font-medium uppercase tracking-wide">
          <span>Tempo e Presença</span>
          <span>/</span>
          <span className="text-on-surface-variant">Banco de Horas</span>
        </nav>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Banco de Horas</h1>
        <p className="text-[13px] text-on-surface-variant">
          Saídas antes da hora prevista ficam registadas como horas em dívida. Horas feitas a mais compensam
          automaticamente. Pedidos de dispensa aprovados justificam a dívida.
        </p>
      </section>

      {msg && (
        <div
          className={
            "text-[13px] font-medium p-3 rounded-lg " +
            (msg.tipo === "erro" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")
          }
        >
          {msg.texto}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-card border border-outline-variant rounded-xl p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Saldo Actual</p>
          <p className="text-[24px] font-bold text-on-surface mt-1">
            {loading && ehAdmin ? "..." : formatHoras(ehAdmin ? resumo.reduce((a, r) => a + Number(r.saldo || 0), 0) : meuSaldo?.saldo)}
          </p>
        </div>
        <div className="bg-surface-card border border-outline-variant rounded-xl p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Horas em Dívida</p>
          <p className="text-[24px] font-bold text-red-600 mt-1">
            {loading && ehAdmin ? "..." : formatHoras(ehAdmin ? totalDevedor : meuSaldo?.horas_devidas)}
          </p>
        </div>
        <div className="bg-surface-card border border-outline-variant rounded-xl p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Horas a Credito</p>
          <p className="text-[24px] font-bold text-emerald-600 mt-1">
            {loading && ehAdmin ? "..." : formatHoras(ehAdmin ? totalCredito : meuSaldo?.horas_credito)}
          </p>
        </div>
      </section>

      {ehAdmin ? (
        <>
          <section className="glass-panel rounded-xl border border-outline-variant/30 shadow-sm p-5">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Colaborador</label>
                <select
                  value={filtroColab}
                  onChange={(e) => setFiltroColab(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface"
                >
                  <option value="">Todos</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome_completo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Estado</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface"
                >
                  <option value="">Todos</option>
                  <option value="aberto">Em aberto</option>
                  <option value="justificado">Justificado</option>
                  <option value="descontado">Descontado</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Data Início</label>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Data Fim</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface" />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => carregarAdmin(1)}
                  className="w-full py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
                >
                  Filtrar
                </button>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30">
              <h2 className="text-[14px] font-semibold text-on-surface">Movimentos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase text-outline tracking-wide bg-surface-card/60">
                    <th className="text-left px-5 py-3 font-semibold">Colaborador</th>
                    <th className="text-left px-5 py-3 font-semibold">Data</th>
                    <th className="text-left px-5 py-3 font-semibold">Tipo</th>
                    <th className="text-right px-5 py-3 font-semibold">Horas</th>
                    <th className="text-left px-5 py-3 font-semibold">Estado</th>
                    <th className="text-right px-5 py-3 font-semibold">Acção</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-6 text-center text-outline">A carregar...</td></tr>
                  ) : movimentos.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-6 text-center text-outline">Sem movimentos registados</td></tr>
                  ) : (
                    movimentos.map((m) => (
                      <tr key={m.id} className="border-t border-outline-variant/30">
                        <td className="px-5 py-3 text-on-surface">{m.colaborador?.nome_completo || "—"}</td>
                        <td className="px-5 py-3 text-on-surface-variant">{formatDate(m.data)}</td>
                        <td className="px-5 py-3 text-on-surface-variant">{TIPO_LABELS[m.tipo] || m.tipo}</td>
                        <td className={"px-5 py-3 text-right font-semibold " + (Number(m.liquido) < 0 ? "text-red-600" : "text-emerald-600")}>
                          {formatHoras(m.liquido !== undefined ? m.liquido : m.horas)}
                        </td>
                        <td className="px-5 py-3 text-on-surface-variant">{ESTADO_LABELS[m.estado] || m.estado}</td>
                        <td className="px-5 py-3 text-right">
                          {m.estado === "aberto" && Number(m.horas) < 0 ? (
                            <button
                              onClick={() => justificar(m.id)}
                              disabled={justificando === m.id}
                              className="px-3 py-1.5 text-[12px] font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                            >
                              {justificando === m.id ? "..." : "Justificar"}
                            </button>
                          ) : (
                            <span className="text-outline">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {paginacao.total_paginas > 1 && (
              <div className="px-5 py-3 flex items-center justify-between border-t border-outline-variant/30">
                <span className="text-[12px] text-outline">Página {paginacao.pagina} de {paginacao.total_paginas}</span>
                <div className="flex gap-2">
                  <button disabled={pagina <= 1} onClick={() => carregarAdmin(pagina - 1)} className="px-3 py-1.5 text-[12px] border border-outline-variant rounded-lg disabled:opacity-40">Anterior</button>
                  <button disabled={pagina >= paginacao.total_paginas} onClick={() => carregarAdmin(pagina + 1)} className="px-3 py-1.5 text-[12px] border border-outline-variant rounded-lg disabled:opacity-40">Seguinte</button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="glass-panel rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/30">
            <h2 className="text-[14px] font-semibold text-on-surface">Os Meus Movimentos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase text-outline tracking-wide bg-surface-card/60">
                  <th className="text-left px-5 py-3 font-semibold">Data</th>
                  <th className="text-left px-5 py-3 font-semibold">Tipo</th>
                  <th className="text-right px-5 py-3 font-semibold">Horas</th>
                  <th className="text-left px-5 py-3 font-semibold">Estado</th>
                  <th className="text-left px-5 py-3 font-semibold">Observações</th>
                </tr>
              </thead>
              <tbody>
                {(meuSaldo?.movimentos || []).length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-6 text-center text-outline">Sem movimentos registados</td></tr>
                ) : (
                  meuSaldo.movimentos.map((m) => (
                    <tr key={m.id} className="border-t border-outline-variant/30">
                      <td className="px-5 py-3 text-on-surface-variant">{formatDate(m.data)}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{TIPO_LABELS[m.tipo] || m.tipo}</td>
                      <td className={"px-5 py-3 text-right font-semibold " + (Number(m.liquido) < 0 ? "text-red-600" : "text-emerald-600")}>
                        {formatHoras(m.liquido)}
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">{ESTADO_LABELS[m.estado] || m.estado}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{m.observacoes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
