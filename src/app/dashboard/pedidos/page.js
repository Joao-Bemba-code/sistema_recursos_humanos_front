"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/helpers";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

var TIPO_LABELS = {
  ferias: "Férias",
  adiantamento: "Adiantamento",
  justificacao: "Justificação",
  aumento: "Aumento",
  outro: "Outro",
};

function estadoClasses(estado) {
  if (estado === "aprovado") return "bg-green-50 text-green-700 border border-green-200";
  if (estado === "pendente") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (estado === "rejeitado") return "bg-red-50 text-red-700 border border-red-200";
  return "bg-surface-container text-on-surface-variant border border-outline-variant";
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return mins + " min";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h";
  var days = Math.floor(hours / 24);
  return days + "d";
}

export default function PedidosPage() {
  var auth = useAuth();
  var utilizador = auth ? auth.utilizador : null;

  var [pedidos, setPedidos] = useState([]);
  var [loading, setLoading] = useState(true);
  var [stats, setStats] = useState({ pendentes: 0, aprovados: 0, rejeitados: 0, total: 0 });
  var [search, setSearch] = useState("");
  var [filtroEstado, setFiltroEstado] = useState("");
  var [filtroTipo, setFiltroTipo] = useState("");
  var [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  var [pedidoDetalhe, setPedidoDetalhe] = useState(null);
  var [showDetalhe, setShowDetalhe] = useState(false);
  var [decidindo, setDecidindo] = useState(false);
  var [comentario, setComentario] = useState("");
  var [msg, setMsg] = useState(null);
  var [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, titulo: "" });

  var carregar = function (page) {
    page = page || 1;
    setLoading(true);
    var url = "/api/pedidos?page=" + page + "&limit=15";
    if (search) url += "&search=" + encodeURIComponent(search);
    if (filtroEstado) url += "&estado=" + encodeURIComponent(filtroEstado);
    if (filtroTipo) url += "&tipo=" + encodeURIComponent(filtroTipo);
    api.get(url).then(function (data) {
      setPedidos(data.dados || []);
      setPaginacao(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    }).catch(function () {}).finally(function () { setLoading(false); });
  };

  var carregarStats = function () {
    api.get("/api/pedidos/stats").then(function (data) {
      if (data && data.dados) setStats(data.dados);
    }).catch(function () {});
  };

  useEffect(function () {
    carregar();
    carregarStats();
  }, []);

  var handleSearch = function (e) {
    e.preventDefault();
    carregar(1);
  };

  var handleVerDetalhe = function (pedido) {
    api.get("/api/pedidos/" + pedido.id).then(function (data) {
      if (data && data.dados) {
        setPedidoDetalhe(data.dados);
        setShowDetalhe(true);
        setComentario("");
      }
    }).catch(function () {});
  };

  var confirmarDecisao = function (estado) {
    if (!pedidoDetalhe) return;
    setMsg(null);
    setDecidindo(true);
    api.put("/api/pedidos/" + pedidoDetalhe.id + "/estado", {
      estado: estado,
      comentario: comentario || null,
    }).then(function () {
      setShowDetalhe(false);
      setPedidoDetalhe(null);
      setMsg({ tipo: "sucesso", texto: "Pedido " + (estado === "aprovado" ? "aprovado" : "rejeitado") + " com sucesso" });
      carregar(paginacao.pagina);
      carregarStats();
      setTimeout(function () { setMsg(null); }, 3000);
    }).catch(function (err) {
      setMsg({ tipo: "erro", texto: err.message || "Erro ao processar" });
    }).finally(function () { setDecidindo(false); });
  };

  var handleEliminar = function () {
    api.delete("/api/pedidos/" + confirmDelete.id).then(function () {
      setConfirmDelete({ open: false, id: null, titulo: "" });
      setMsg({ tipo: "sucesso", texto: "Pedido eliminado com sucesso" });
      carregar(1);
      carregarStats();
      setTimeout(function () { setMsg(null); }, 3000);
    }).catch(function (err) {
      setMsg({ tipo: "erro", texto: err.message || "Erro ao eliminar pedido" });
      setTimeout(function () { setMsg(null); }, 3000);
    });
  };

  var dadosDetalhe = pedidoDetalhe ? (pedidoDetalhe.dados || {}) : {};

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Pedido"
        mensagem={"Tem certeza que deseja eliminar o pedido \"" + confirmDelete.titulo + "\"? Esta acção nao pode ser desfeita."}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={handleEliminar}
        onCancel={function () { setConfirmDelete({ open: false, id: null, titulo: "" }); }}
      />

      <div>
        <h1 className="text-[20px] font-semibold text-on-surface">Pedidos dos Colaboradores</h1>
        <p className="text-[13px] text-outline mt-0.5">Gerir pedidos de férias, adiantamentos e justificações</p>
      </div>

      {msg && (
        <div className={"text-[13px] font-medium p-3 rounded-lg " + (msg.tipo === "sucesso" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
          {msg.texto}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-card rounded-xl border border-outline-variant p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Pendentes</p>
          <p className="text-[22px] font-bold text-amber-600 mt-1">{stats.pendentes}</p>
        </div>
        <div className="bg-surface-card rounded-xl border border-outline-variant p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Aprovados</p>
          <p className="text-[22px] font-bold text-green-600 mt-1">{stats.aprovados}</p>
        </div>
        <div className="bg-surface-card rounded-xl border border-outline-variant p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Rejeitados</p>
          <p className="text-[22px] font-bold text-red-600 mt-1">{stats.rejeitados}</p>
        </div>
        <div className="bg-surface-card rounded-xl border border-outline-variant p-4">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wide">Total</p>
          <p className="text-[22px] font-bold text-on-surface mt-1">{stats.total}</p>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl border border-outline-variant">
        <div className="p-4 border-b border-outline-variant/30">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={function (e) { setSearch(e.target.value); }}
              placeholder="Pesquisar pedidos..."
              className="flex-1 px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors"
            />
            <select
              value={filtroEstado}
              onChange={function (e) { setFiltroEstado(e.target.value); carregar(1); }}
              className="px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors"
            >
              <option value="">Todos os estados</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
            <select
              value={filtroTipo}
              onChange={function (e) { setFiltroTipo(e.target.value); carregar(1); }}
              className="px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors"
            >
              <option value="">Todos os tipos</option>
              <option value="ferias">Férias</option>
              <option value="adiantamento">Adiantamento</option>
              <option value="justificacao">Justificação</option>
              <option value="aumento">Aumento</option>
            </select>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors">
              Pesquisar
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-[13px] text-outline">A carregar...</div>
          ) : pedidos.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-outline">Sem pedidos</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-on-surface-variant uppercase">Colaborador</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-on-surface-variant uppercase">Tipo</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-on-surface-variant uppercase">Título</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-on-surface-variant uppercase">Estado</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-on-surface-variant uppercase">Quando</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-on-surface-variant uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {pedidos.map(function (p) {
                  var colab = p.colaborador || {};
                  return (
                    <tr key={p.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-on-surface">{colab.nome_completo || "—"}</p>
                        <p className="text-[11px] text-outline">{colab.numero_colaborador || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-on-surface-variant">{TIPO_LABELS[p.tipo] || p.tipo}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-on-surface font-medium max-w-[200px] truncate">{p.titulo}</td>
                      <td className="px-4 py-3">
                        <span className={"text-[11px] font-semibold px-2 py-0.5 rounded-full " + estadoClasses(p.estado)}>
                          {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-outline">{timeAgo(p.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={function () { handleVerDetalhe(p); }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                          >
                            Ver
                          </button>
                          <button
                            onClick={function () { setConfirmDelete({ open: true, id: p.id, titulo: p.titulo }); }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Eliminar
                          </button>
                          {p.estado === "pendente" && (
                            <>
                              <button
                                onClick={function () { handleVerDetalhe(p); }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-green-600 hover:bg-green-50 transition-colors"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={function () { handleVerDetalhe(p); }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {paginacao.total_paginas > 1 && (
          <div className="p-4 border-t border-outline-variant/30 flex items-center justify-between">
            <p className="text-[12px] text-outline">
              Página {paginacao.pagina} de {paginacao.total_paginas} ({paginacao.total} pedidos)
            </p>
            <div className="flex gap-1">
              <button
                disabled={paginacao.pagina <= 1}
                onClick={function () { carregar(paginacao.pagina - 1); }}
                className="px-3 py-1 rounded-lg border border-outline-variant text-[12px] text-on-surface-variant hover:bg-surface-container disabled:opacity-30 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={paginacao.pagina >= paginacao.total_paginas}
                onClick={function () { carregar(paginacao.pagina + 1); }}
                className="px-3 py-1 rounded-lg border border-outline-variant text-[12px] text-on-surface-variant hover:bg-surface-container disabled:opacity-30 transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetalhe && pedidoDetalhe && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={function () { setShowDetalhe(false); }} />
          <div className="relative bg-surface-card rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-card border-b border-outline-variant/30 px-5 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-[15px] font-semibold text-on-surface">Detalhe do Pedido</h3>
              <button onClick={function () { setShowDetalhe(false); }} className="text-outline hover:text-on-surface-variant text-[14px]">
                Fechar
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] text-outline uppercase tracking-wide">Título</p>
                <p className="text-[15px] font-semibold text-on-surface mt-0.5">{pedidoDetalhe.titulo}</p>
                <p className="text-[12px] text-outline">{TIPO_LABELS[pedidoDetalhe.tipo] || pedidoDetalhe.tipo}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-outline uppercase tracking-wide">Colaborador</p>
                  <p className="text-[13px] font-medium text-on-surface mt-0.5">{(pedidoDetalhe.colaborador || {}).nome_completo || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-outline uppercase tracking-wide">Estado</p>
                  <span className={"inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 " + estadoClasses(pedidoDetalhe.estado)}>
                    {pedidoDetalhe.estado.charAt(0).toUpperCase() + pedidoDetalhe.estado.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-outline uppercase tracking-wide">Criado em</p>
                  <p className="text-[13px] text-on-surface-variant mt-0.5">{formatDate(pedidoDetalhe.createdAt)}</p>
                </div>
                {pedidoDetalhe.responded_at && (
                  <div>
                    <p className="text-[11px] text-outline uppercase tracking-wide">Respondido em</p>
                    <p className="text-[13px] text-on-surface-variant mt-0.5">{formatDate(pedidoDetalhe.responded_at)}</p>
                  </div>
                )}
              </div>

              {pedidoDetalhe.descricao && (
                <div>
                  <p className="text-[11px] text-outline uppercase tracking-wide">Descrição</p>
                  <p className="text-[13px] text-on-surface-variant mt-0.5">{pedidoDetalhe.descricao}</p>
                </div>
              )}

              {pedidoDetalhe.documento && (
                <div>
                  <p className="text-[11px] text-outline uppercase tracking-wide mb-1">Documento Anexo</p>
                  {pedidoDetalhe.documento.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={pedidoDetalhe.documento} alt="Documento" className="max-w-full max-h-64 rounded-lg border border-outline-variant object-contain" />
                  ) : pedidoDetalhe.documento.match(/\.pdf$/i) ? (
                    <iframe src={pedidoDetalhe.documento} className="w-full h-64 rounded-lg border border-outline-variant" title="Documento" />
                  ) : (
                    <a href={pedidoDetalhe.documento} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline">
                      <span className="material-symbols-outlined text-[16px]">description</span> Abrir documento
                    </a>
                  )}
                </div>
              )}

              {pedidoDetalhe.tipo === "ferias" && dadosDetalhe.data_inicio && (
                <div className="grid grid-cols-2 gap-3">
                  {dadosDetalhe.tipo_ferias && (
                    <div>
                      <p className="text-[11px] text-outline uppercase tracking-wide">Tipo</p>
                      <p className="text-[13px] text-on-surface-variant mt-0.5">{dadosDetalhe.tipo_ferias}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] text-outline uppercase tracking-wide">Data Início</p>
                    <p className="text-[13px] text-on-surface-variant mt-0.5">{formatDate(dadosDetalhe.data_inicio)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-outline uppercase tracking-wide">Data Fim</p>
                    <p className="text-[13px] text-on-surface-variant mt-0.5">{formatDate(dadosDetalhe.data_fim)}</p>
                  </div>
                  {dadosDetalhe.dias && (
                    <div>
                      <p className="text-[11px] text-outline uppercase tracking-wide">Total Dias</p>
                      <p className="text-[13px] text-on-surface-variant mt-0.5">{dadosDetalhe.dias} dia(s)</p>
                    </div>
                  )}
                </div>
              )}

              {pedidoDetalhe.tipo === "adiantamento" && dadosDetalhe.valor && (
                <div>
                  <p className="text-[11px] text-outline uppercase tracking-wide">Valor</p>
                  <p className="text-[15px] font-semibold text-on-surface mt-0.5">{Number(dadosDetalhe.valor).toLocaleString("pt-AO")} AOA</p>
                </div>
              )}

              {pedidoDetalhe.comentario && (
                <div>
                  <p className="text-[11px] text-outline uppercase tracking-wide">Comentário</p>
                  <p className="text-[13px] text-on-surface-variant mt-0.5">{pedidoDetalhe.comentario}</p>
                </div>
              )}

              {pedidoDetalhe.estado === "pendente" && (
                <div className="pt-3 border-t border-outline-variant/30">
                  <textarea
                    value={comentario}
                    onChange={function (e) { setComentario(e.target.value); }}
                    rows={2}
                    placeholder="Comentário (opcional)"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={function () { confirmarDecisao("aprovado"); }}
                      disabled={decidindo}
                      className="flex-1 py-2 rounded-lg bg-green-600 text-white text-[13px] font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
                    >
                      {decidindo ? "..." : "Aprovar"}
                    </button>
                    <button
                      onClick={function () { confirmarDecisao("rejeitado"); }}
                      disabled={decidindo}
                      className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 transition-colors disabled:opacity-40"
                    >
                      {decidindo ? "..." : "Rejeitar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
