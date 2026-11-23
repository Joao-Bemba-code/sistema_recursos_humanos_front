"use client";

import { useState, useEffect, useEffectEvent } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

var ROTULOS_ESTADO = {
  Inscrito: "Inscrito",
  Concluido: "Concluído",
  Abandonou: "Abandonou",
  Certificado: "Certificado",
};

var ROTULOS_TIPO = {
  Interno: "Interno",
  Externo: "Externo",
  Online: "Online",
  Seminario: "Seminário",
  Workshop: "Workshop",
};

var rotuloEstado = function (estado) {
  return ROTULOS_ESTADO[estado] || estado || "—";
};

var badgeEstado = function (estado) {
  if (estado === "Certificado" || estado === "Concluido") return "badge-success";
  if (estado === "Abandonou") return "badge-danger";
  if (estado === "Inscrito") return "badge-info";
  return "badge-secondary";
};

// Painel das formações da conta autenticada. O backend limita sempre os dados
// ao próprio colaborador; não existe aqui qualquer modo administrativo.
export default function PainelFormacoesColaborador() {
  var [dados, setDados] = useState(null);
  var [carregando, setCarregando] = useState(false);
  var [erro, setErro] = useState(null);
  var [msg, setMsg] = useState(null);
  var [inscrevendo, setInscrevendo] = useState(null);
  var [descarregando, setDescarregando] = useState(null);

  var carregar = async function () {
    setCarregando(true);
    setErro(null);
    try {
      var resposta = await api.get("/api/formacao/minhas");
      setDados(resposta.dados || null);
    } catch (e) {
      setErro(e.message || "Não foi possível carregar as formações");
    } finally {
      setCarregando(false);
    }
  };

  var carregarEvent = useEffectEvent(function () { carregar(); });

  useEffect(function () {
    // O carregamento inicial actualiza estado após a resposta da API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarEvent();
  }, []);

  var inscrever = async function (curso) {
    setInscrevendo(curso.id);
    setMsg(null);
    setErro(null);
    try {
      await api.post("/api/formacao/minhas/inscricoes", { curso_id: curso.id });
      setMsg({ tipo: "sucesso", texto: "Inscrição efetuada em «" + curso.nome + "»." });
      await carregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message || "Não foi possível efetuar a inscrição" });
    } finally {
      setInscrevendo(null);
    }
  };

  var descarregarCertificado = async function (inscricao) {
    setDescarregando(inscricao.id);
    setMsg(null);
    try {
      var blob = await api.getBlob(
        "/api/formacao/inscricoes/" + inscricao.id + "/certificado",
        "Não foi possível descarregar o certificado"
      );
      var url = window.URL.createObjectURL(blob);
      var ligacao = document.createElement("a");
      ligacao.href = url;
      ligacao.download = inscricao.certificado_nome || "certificado.pdf";
      document.body.appendChild(ligacao);
      ligacao.click();
      document.body.removeChild(ligacao);
      setTimeout(function () { window.URL.revokeObjectURL(url); }, 60000);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message || "Não foi possível descarregar o certificado" });
    } finally {
      setDescarregando(null);
    }
  };

  var inscricoes = dados ? dados.inscricoes || [] : [];
  var avaliacoes = inscricoes.filter(function (i) { return i.avaliacao_registada; });
  var disponiveis = dados ? dados.disponiveis || [] : [];
  var resumo = dados ? dados.resumo || {} : {};

  var cartoes = [
    { rotulo: "Formações inscritas", valor: resumo.total || 0, icon: "school" },
    { rotulo: "Concluídas", valor: resumo.concluidas || 0, icon: "check_circle" },
    { rotulo: "Certificados disponíveis", valor: resumo.com_certificado || 0, icon: "workspace_premium" },
    { rotulo: "Avaliações registadas", valor: resumo.avaliacoes || 0, icon: "grade" },
    { rotulo: "Por regularizar", valor: resumo.em_atraso || 0, icon: "schedule" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="As Minhas Formações"
        subtitulo="Consulte as formações em que está inscrito, o resultado obtido e descarregue os seus certificados."
        acoes={
          <button onClick={carregar} disabled={carregando} className="flex items-center gap-2 px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold transition-colors disabled:opacity-40">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Atualizar
          </button>
        }
      />

      {msg && (
        <div className={"p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 " + (msg.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10")}>
          <span className="material-symbols-outlined text-[18px]">{msg.tipo === "sucesso" ? "check_circle" : "error"}</span>
          {msg.texto}
          <button onClick={function () { setMsg(null); }} className="ml-auto hover:opacity-60">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {erro && (
        <div className="p-3 rounded-lg text-[13px] font-medium badge-danger border border-error/10 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(function (i) {
            return <div key={i} className="bg-surface-card border border-outline-variant rounded-xl p-5"><div className="animate-pulse h-12 bg-surface-container rounded-lg" /></div>;
          })}
        </div>
      ) : dados ? (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {cartoes.map(function (cartao) {
              return <StatCard key={cartao.rotulo} titulo={cartao.rotulo} valor={cartao.valor} icon={cartao.icon} />;
            })}
          </section>

          <section className="bg-surface-card border border-outline-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">badge</span>
              <h2 className="text-[15px] font-bold text-on-surface">Formações inscritas</h2>
              <span className="text-[12px] text-on-surface-variant/70">({inscricoes.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse data-grid-tight">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant/20">
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Curso</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Período</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Progresso</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Resultado</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Certificado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {inscricoes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">school</span>
                        <p className="text-on-surface-variant font-medium">Ainda não existem formações inscritas</p>
                        <p className="text-[13px] text-outline mt-1">Veja as formações disponíveis abaixo e efetue a inscrição.</p>
                      </td>
                    </tr>
                  ) : (
                    inscricoes.map(function (ins) {
                      var curso = ins.curso || {};
                      return (
                        <tr key={ins.id} className="hover:bg-primary/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{curso.nome || "—"}</span>
                              <span className="text-[12px] text-on-surface-variant/70">
                                {ROTULOS_TIPO[curso.tipo] || curso.tipo || ""}
                                {curso.horas ? " · " + curso.horas + " h" : ""}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-on-surface-variant text-[13px]">
                            <span className="block">{helpers.formatDate(curso.data_inicio)} - {helpers.formatDate(curso.data_fim)}</span>
                            {curso.data_fim && (
                              <span className="block text-[11px] text-on-surface-variant/60 mt-1">
                                {ins.concluida ? "Concluída em " : "Conclusão prevista: "}
                                {helpers.formatDate(
                                  ins.concluida
                                    ? (ins.data_conclusao || ins.data_conclusao_prevista || curso.data_fim)
                                    : (ins.data_conclusao_prevista || curso.data_fim)
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + badgeEstado(ins.estado)}>
                              <span className={"w-1.5 h-1.5 rounded-full " + (ins.estado === "Inscrito" ? "bg-info" : ins.estado === "Abandonou" ? "bg-error" : "bg-success")} />
                              {rotuloEstado(ins.estado)}
                            </span>
                            {ins.em_atraso && (
                              <span className="block text-[11px] text-warning font-semibold mt-1">Por regularizar</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-surface-container overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: (ins.progresso || 0) + "%" }} />
                              </div>
                              <span className="text-[12px] font-semibold text-on-surface-variant">{ins.progresso || 0}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-on-surface font-semibold">
                                {ins.nota_avaliacao != null && ins.nota_avaliacao !== "" ? ins.nota_avaliacao + " / 20" : "—"}
                              </span>
                              {ins.resultado && (
                                <span className={"inline-flex items-center w-fit gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider " + (ins.resultado === "Aprovado" ? "badge-success" : ins.resultado === "Reprovado" ? "badge-danger" : "badge-secondary")}>
                                  {ins.resultado}
                                </span>
                              )}
                              {ins.avaliacao_registada && (
                                <span className="inline-flex items-center w-fit gap-1 text-[10px] font-bold text-success uppercase tracking-wide">
                                  <span className="material-symbols-outlined text-[13px]">verified</span>
                                  Registada no percurso
                                </span>
                              )}
                              {ins.data_avaliacao && <span className="text-[11px] text-on-surface-variant/60">Avaliada em {helpers.formatDate(ins.data_avaliacao)}</span>}
                              {ins.data_rececao && <span className="text-[11px] text-on-surface-variant/60">Recebido em {helpers.formatDate(ins.data_rececao)}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {ins.tem_certificado ? (
                              <button
                                onClick={function () { descarregarCertificado(ins); }}
                                disabled={descarregando === ins.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/30 text-success hover:bg-success/10 text-[12px] font-bold transition-colors disabled:opacity-50"
                                title="Descarregar certificado"
                              >
                                <span className="material-symbols-outlined text-[16px]">download</span>
                                {descarregando === ins.id ? "A descarregar..." : "Descarregar"}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase badge-secondary">
                                <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                                Indisponível
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-surface-card border border-outline-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">grade</span>
              <h2 className="text-[15px] font-bold text-on-surface">Avaliações e documentos</h2>
              <span className="text-[12px] text-on-surface-variant/70">({avaliacoes.length})</span>
            </div>
            {avaliacoes.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-[40px] text-outline-variant/40 block mb-2">grade</span>
                <p className="text-[13px] text-on-surface-variant">Ainda não tem avaliações registadas.</p>
                <p className="text-[12px] text-outline mt-1">Quando o RH registar a sua nota e o resultado, aparecem aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
                {avaliacoes.map(function (ins) {
                  var curso = ins.curso || {};
                  return (
                    <div key={ins.id} className="bg-surface-card border border-outline-variant rounded-xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[14px] font-bold text-on-surface">{curso.nome || "—"}</h3>
                        <span className={"inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider " + (ins.resultado === "Aprovado" ? "badge-success" : ins.resultado === "Reprovado" ? "badge-danger" : "badge-secondary")}>
                          {ins.resultado || "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[12px] text-on-surface-variant">
                        <div><span className="material-symbols-outlined text-[14px] align-text-bottom">score</span> Nota: {ins.nota_avaliacao != null ? ins.nota_avaliacao + " / 20" : "—"}</div>
                        <div><span className="material-symbols-outlined text-[14px] align-text-bottom">event</span> {helpers.formatDate(ins.data_avaliacao)}</div>
                        <div className="col-span-2"><span className="material-symbols-outlined text-[14px] align-text-bottom">mark_email_read</span> Recebido em {helpers.formatDate(ins.data_rececao)}</div>
                      </div>
                      {ins.avaliacao_observacoes && (
                        <p className="text-[12px] text-on-surface-variant/80 bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                          {ins.avaliacao_observacoes}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-outline-variant/20">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success uppercase tracking-wide">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          Registada no percurso
                        </span>
                        {ins.tem_certificado ? (
                          <button
                            onClick={function () { descarregarCertificado(ins); }}
                            disabled={descarregando === ins.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-success/30 text-success hover:bg-success/10 text-[11px] font-bold transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[14px]">download</span>
                            {descarregando === ins.id ? "A descarregar..." : "Descarregar"}
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold uppercase badge-secondary px-2 py-0.5 rounded">Documento pendente</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">explore</span>
              <h2 className="text-[15px] font-bold text-on-surface">Formações disponíveis para inscrição</h2>
              <span className="text-[12px] text-on-surface-variant/70">({disponiveis.length})</span>
            </div>
            {disponiveis.length === 0 ? (
              <div className="bg-surface-card border border-outline-variant rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-[40px] text-outline-variant/40 block mb-2">event_available</span>
                <p className="text-[13px] text-on-surface-variant">Neste momento não existem novas formações abertas para si.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {disponiveis.map(function (curso) {
                  var semVagas = curso.vagas != null && Number(curso.vagas_disponiveis) <= 0;
                  return (
                    <div key={curso.id} className="bg-surface-card border border-outline-variant rounded-xl p-5 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[15px] font-bold text-on-surface">{curso.nome}</h3>
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase badge-info">
                          {ROTULOS_TIPO[curso.tipo] || curso.tipo}
                        </span>
                      </div>
                      {curso.descricao && <p className="text-[12px] text-on-surface-variant/80 mt-2 line-clamp-2">{curso.descricao}</p>}
                      <div className="grid grid-cols-2 gap-2 mt-4 text-[12px] text-on-surface-variant">
                        <div><span className="material-symbols-outlined text-[14px] align-text-bottom">calendar_today</span> {helpers.formatDate(curso.data_inicio)}</div>
                        <div><span className="material-symbols-outlined text-[14px] align-text-bottom">event</span> {helpers.formatDate(curso.data_fim)}</div>
                        <div><span className="material-symbols-outlined text-[14px] align-text-bottom">schedule</span> {curso.horas ? curso.horas + " h" : "—"}</div>
                        <div><span className="material-symbols-outlined text-[14px] align-text-bottom">groups</span> {curso.vagas == null ? "Sem limite" : curso.vagas_disponiveis + " vagas"}</div>
                      </div>
                      <button
                        onClick={function () { inscrever(curso); }}
                        disabled={semVagas || inscrevendo === curso.id}
                        className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">{inscrevendo === curso.id ? "hourglass_empty" : "how_to_reg"}</span>
                        {semVagas ? "Sem vagas" : inscrevendo === curso.id ? "A inscrever..." : "Inscrever-me"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
