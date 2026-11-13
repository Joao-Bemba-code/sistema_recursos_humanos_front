"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

var iniciaisDe = function (nome) {
  if (!nome) return "?";
  var partes = String(nome).trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

var horaCurta = function (v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
};

var horaRelativa = function (v) {
  if (!v) return "";
  var d = new Date(v);
  var agora = new Date();
  var mesmoDia = d.toDateString() === agora.toDateString();
  if (mesmoDia) return horaCurta(v);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
};

var tamanhoLegivel = function (bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (Math.round((bytes / (1024 * 1024)) * 10) / 10) + " MB";
};

// 2 MB e o limite do resto do sistema (guardarFicheiro no backend).
var TAMANHO_MAX_ANEXO = 2 * 1024 * 1024;

export default function MensagensPage() {
  const auth = useAuth();
  const eu = auth && auth.utilizador ? auth.utilizador : null;
  const meuId = eu ? eu.id : null;

  const [conversas, setConversas] = useState([]);
  const [ativa, setAtiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState(null);
  const [baixandoAnexo, setBaixandoAnexo] = useState("");
  const ficheiroRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [mostrarNova, setMostrarNova] = useState(false);
  const [utilizadores, setUtilizadores] = useState([]);
  const [filtroUtilizador, setFiltroUtilizador] = useState("");
  const [verListaMobile, setVerListaMobile] = useState(true);
  const [criandoConversa, setCriandoConversa] = useState(false);
  const [carregandoPessoas, setCarregandoPessoas] = useState(false);
  const [erroPessoas, setErroPessoas] = useState("");

  const ativaRef = useRef(null);
  const fimRef = useRef(null);
  const ultimoIdRef = useRef(null);

  // ==================== CONVERSAS ====================

  // Carrega a lista de conversas. O estado inicial de loading e true, por
  // isso aqui so se desliga quando a resposta chega (sem setState sincrono).
  const carregarConversas = async function () {
    try {
      const data = await api.get("/api/chat/conversas");
      setConversas(data.dados || []);
    } catch (e) {
      // Erros de polling ficam silenciosos para nao incomodar.
    } finally {
      setLoading(false);
    }
  };

  // ==================== MENSAGENS ====================

  const carregarMensagens = async function (conversa, primeira) {
    if (!conversa) return;
    if (primeira) setLoadingMensagens(true);
    try {
      const data = await api.get("/api/chat/conversas/" + conversa.id + "/mensagens");
      if (ativaRef.current && ativaRef.current.id === conversa.id) {
        setMensagens(data.dados.mensagens || []);
      }
      carregarConversas();
    } catch (e) {
      if (primeira) setMsg({ tipo: "erro", texto: e.message });
    } finally {
      if (primeira) setLoadingMensagens(false);
    }
  };

  const abrirConversa = function (conversa) {
    setAtiva(conversa);
    ativaRef.current = conversa;
    ultimoIdRef.current = null;
    setVerListaMobile(false);
    setMsg(null);
    setMensagens([]);
    carregarMensagens(conversa, true);
  };

  const enviar = async function (e) {
    if (e) e.preventDefault();
    var t = texto.trim();
    if ((!t && !anexo) || !ativa || enviando) return;

    setEnviando(true);
    try {
      var data;
      if (anexo) {
        // Com ficheiro vai em multipart; o texto pode seguir vazio.
        var form = new FormData();
        form.append("texto", t);
        if (ativa.tipo === "geral") form.append("geral", "true");
        else form.append("conversa_id", ativa.id);
        form.append("ficheiro", anexo);
        data = await api.upload("/api/chat/mensagens", form);
      } else {
        var corpo = { texto: t };
        if (ativa.tipo === "geral") {
          corpo.geral = true;
        } else {
          corpo.conversa_id = ativa.id;
        }
        data = await api.post("/api/chat/mensagens", corpo);
      }
      setTexto("");
      setAnexo(null);
      if (ficheiroRef.current) ficheiroRef.current.value = "";
      // Adiciona a mensagem enviada se a conversa activa nao mudou.
      if (ativaRef.current && ativaRef.current.id === ativa.id && data && data.dados) {
        setMensagens(function (prev) { return prev.concat([data.dados]); });
        setTimeout(function () {
          if (fimRef.current) fimRef.current.scrollIntoView({ behavior: "smooth" });
        }, 60);
      }
      carregarConversas();
    } catch (err) {
      setMsg({ tipo: "erro", texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const escolherAnexo = function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > TAMANHO_MAX_ANEXO) {
      setMsg({ tipo: "erro", texto: "O ficheiro excede o limite de 2 MB" });
      setTimeout(function () { setMsg(null); }, 4000);
      e.target.value = "";
      return;
    }
    setAnexo(f);
  };

  const baixarAnexoMensagem = function (m) {
    if (!m || !m.anexo_url) return;
    setBaixandoAnexo(m.id);
    api.downloadFile("/api/chat/mensagens/" + m.id + "/anexo", m.anexo_nome || "anexo")
      .catch(function (err) {
        setMsg({ tipo: "erro", texto: err.message || "Erro ao descarregar o anexo" });
        setTimeout(function () { setMsg(null); }, 4000);
      })
      .finally(function () { setBaixandoAnexo(""); });
  };

  // ==================== NOVA CONVERSA ====================

  const abrirNovaConversa = function () {
    setMostrarNova(true);
    setFiltroUtilizador("");
    setMsg(null);
    setErroPessoas("");
    setCarregandoPessoas(true);
    api.get("/api/chat/utilizadores")
      .then(function (data) { setUtilizadores(data.dados || []); })
      .catch(function (e) {
        setUtilizadores([]);
        setErroPessoas(e.message || "Não foi possível carregar os colaboradores");
      })
      .finally(function () { setCarregandoPessoas(false); });
  };

  const escolherUtilizador = async function (utilizador) {
    if (criandoConversa) return;
    setCriandoConversa(true);
    try {
      const data = await api.post("/api/chat/conversas", { utilizador_id: utilizador.id });
      setMostrarNova(false);
      carregarConversas();
      if (data && data.dados) {
        abrirConversa({ id: data.dados.id, tipo: "direta", titulo: data.dados.titulo, outro: data.dados.outro });
      }
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setCriandoConversa(false);
    }
  };

  // ==================== POLLING ====================

  useEffect(function () {
    // Primeira carga fora do corpo do efeito (padrao dos restantes ecras).
    var timer = setTimeout(function () { carregarConversas(); }, 0);
    var intervalo = setInterval(function () {
      carregarConversas();
      var a = ativaRef.current;
      if (a) carregarMensagens(a, false);
    }, 5000);
    return function () {
      clearTimeout(timer);
      clearInterval(intervalo);
    };
  }, []);

  // Auto-scroll para o fim quando chegam mensagens novas de outros.
  useEffect(function () {
    if (!mensagens || mensagens.length === 0) return;
    var ultima = mensagens[mensagens.length - 1];
    var mudou = ultima.id !== ultimoIdRef.current;
    var primeiraVez = ultimoIdRef.current === null;
    ultimoIdRef.current = ultima.id;
    if (primeiraVez || (mudou && ultima.utilizador_id !== meuId)) {
      if (fimRef.current) {
        fimRef.current.scrollIntoView({ behavior: primeiraVez ? "auto" : "smooth" });
      }
    }
  }, [mensagens, meuId]);

  var utilizadoresFiltrados = filtroUtilizador
    ? utilizadores.filter(function (u) {
        return (u.nome_completo || "").toLowerCase().indexOf(filtroUtilizador.toLowerCase()) !== -1 ||
               (u.email || "").toLowerCase().indexOf(filtroUtilizador.toLowerCase()) !== -1;
      })
    : utilizadores;

  var totalNaoLidas = conversas.reduce(function (soma, c) {
    return soma + ((c.id === (ativa && ativa.id) ? 0 : (c.nao_lidas || 0)));
  }, 0);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>Principal</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Mensagens</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">Mensagens</h1>
          <p className="text-[13px] text-on-surface-variant/70">
            Comunicação interna entre colaboradores e administração
            {totalNaoLidas > 0 ? " · " + totalNaoLidas + " por ler" : ""}
          </p>
        </div>
        <button
          onClick={abrirNovaConversa}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Nova Conversa
        </button>
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

      <section className="glass-panel rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex h-[calc(100vh-280px)] min-h-[480px]">
        {/* ============ LISTA DE CONVERSAS ============ */}
        <div className={`${verListaMobile ? "flex" : "hidden"} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-outline-variant/30 flex-shrink-0`}>
          <div className="px-4 py-3 border-b border-outline-variant/30">
            <span className="text-[11px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Conversas</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-outline-variant border-t-primary rounded-full animate-spin" />
              </div>
            ) : conversas.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant/20 block mb-2">forum</span>
                <p className="text-[12px] text-on-surface-variant/60">Sem conversas</p>
              </div>
            ) : (
              conversas.map(function (c) {
                var ativaEsta = ativa && ativa.id === c.id;
                var nome = c.tipo === "geral" ? "Geral" : (c.titulo || "Conversa");
                var naoLidas = ativaEsta ? 0 : (c.nao_lidas || 0);
                return (
                  <button
                    key={c.id}
                    onClick={function () { abrirConversa(c); }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-outline-variant/20 transition-colors ${
                      ativaEsta ? "bg-primary/10 border-l-[3px] border-l-primary" : "hover:bg-surface-container-low border-l-[3px] border-l-transparent"
                    }`}
                  >
                    {c.tipo === "geral" ? (
                      <div className="p-2.5 rounded-full bg-primary/10 flex-shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-primary">forum</span>
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[12px] font-bold text-primary">{iniciaisDe(nome)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[13px] truncate ${naoLidas > 0 ? "font-bold text-on-surface" : "font-medium text-on-surface"}`}>{nome}</span>
                        <span className="text-[10px] text-on-surface-variant/60 whitespace-nowrap flex-shrink-0">{horaRelativa(c.ultima_em)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className={`text-[12px] truncate ${naoLidas > 0 ? "text-on-surface-variant font-medium" : "text-on-surface-variant/60"}`}>
                          {c.ultima_mensagem ? c.ultima_mensagem : (c.tipo === "geral" ? "Canal partilhado por todos" : "Sem mensagens ainda")}
                        </span>
                        {naoLidas > 0 && (
                          <span className="min-w-[20px] h-[20px] flex items-center justify-center bg-error text-white text-[11px] font-bold rounded-full px-1.5 flex-shrink-0">
                            {naoLidas > 99 ? "99+" : naoLidas}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============ JANELA DE CHAT ============ */}
        <div className={`${verListaMobile ? "hidden" : "flex"} md:flex flex-col flex-1 min-w-0`}>
          {!ativa ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">chat</span>
              <p className="text-[14px] font-semibold text-on-surface-variant">Escolha uma conversa</p>
              <p className="text-[12px] text-on-surface-variant/60">Selecione uma conversa na lista ou comece uma nova para falar com alguém da organização.</p>
            </div>
          ) : (
            <>
              {/* Cabeçalho da conversa */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/30">
                <button
                  onClick={function () { setVerListaMobile(true); }}
                  className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                {ativa.tipo === "geral" ? (
                  <div className="p-2 rounded-full bg-primary/10">
                    <span className="material-symbols-outlined text-[20px] text-primary">forum</span>
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                    <span className="text-[12px] font-bold text-primary">{iniciaisDe(ativa.titulo || "?")}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-on-surface truncate">{ativa.tipo === "geral" ? "Geral" : (ativa.titulo || "Conversa")}</p>
                  <p className="text-[11px] text-on-surface-variant/60 truncate">
                    {ativa.tipo === "geral" ? "Canal partilhado por todos os utilizadores" : "Conversa direta"}
                  </p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface-container-lowest/40">
                {loadingMensagens ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-outline-variant border-t-primary rounded-full animate-spin" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <span className="material-symbols-outlined text-[36px] text-on-surface-variant/20">mark_chat_unread</span>
                    <p className="text-[12px] text-on-surface-variant/60">Sem mensagens. Escreva a primeira.</p>
                  </div>
                ) : (
                  mensagens.map(function (m) {
                    var meu = String(m.utilizador_id) === String(meuId);
                    var nome = m.remetente && m.remetente.nome_completo ? m.remetente.nome_completo : "Utilizador";
                    var anexoImagem = !!(m.anexo_tipo && m.anexo_tipo.indexOf("image/") === 0);
                    var iconeAnexo = "attach_file";
                    if (anexoImagem) iconeAnexo = "image";
                    else if (m.anexo_tipo === "application/pdf") iconeAnexo = "picture_as_pdf";
                    else if ((m.anexo_tipo || "").indexOf("word") !== -1) iconeAnexo = "description";
                    else if ((m.anexo_tipo || "").indexOf("sheet") !== -1 || (m.anexo_tipo || "").indexOf("excel") !== -1) iconeAnexo = "table_chart";
                    return (
                      <div key={m.id} className={`flex items-end gap-2 ${meu ? "flex-row-reverse" : ""}`}>
                        {!meu && (
                          <div className="h-7 w-7 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-primary">{iniciaisDe(nome)}</span>
                          </div>
                        )}
                        <div className={`max-w-[75%] sm:max-w-[65%] ${meu ? "items-end" : "items-start"}`}>
                          {!meu && ativa.tipo === "geral" && (
                            <span className="text-[10px] text-on-surface-variant/60 font-semibold mb-0.5 block">{nome}</span>
                          )}
                          <div className={`px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed break-words whitespace-pre-wrap ${
                            meu
                              ? "bg-primary text-white rounded-br-md"
                              : "bg-surface-container-high text-on-surface rounded-bl-md"
                          }`}>
                            {m.texto ? <span>{m.texto}</span> : null}
                            {m.anexo_url && (
                              <div className={m.texto ? "mt-2" : ""}>
                                {anexoImagem ? (
                                  <img
                                    src={m.anexo_url}
                                    alt={m.anexo_nome || "Imagem"}
                                    className="rounded-xl max-h-56 max-w-full object-contain"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px] opacity-80">{iconeAnexo}</span>
                                    <div className="min-w-0">
                                      <p className="text-[12px] font-semibold truncate">{m.anexo_nome || "Anexo"}</p>
                                      {m.anexo_tamanho ? (
                                        <p className="text-[10px] opacity-70">{tamanhoLegivel(m.anexo_tamanho)}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={function () { baixarAnexoMensagem(m); }}
                                  disabled={baixandoAnexo === m.id}
                                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold underline-offset-2 hover:underline disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {baixandoAnexo === m.id ? "hourglass_empty" : "download"}
                                  </span>
                                  {baixandoAnexo === m.id ? "A baixar..." : "Baixar"}
                                </button>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-on-surface-variant/50 mt-1 block">{horaCurta(m.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={fimRef} />
              </div>

              {/* Envio */}
              <form onSubmit={enviar} className="border-t border-outline-variant/30 p-3 space-y-2">
                {anexo && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[18px] text-primary">attach_file</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-on-surface truncate">{anexo.name}</p>
                      <p className="text-[10px] text-on-surface-variant/60">{tamanhoLegivel(anexo.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={function () {
                        setAnexo(null);
                        if (ficheiroRef.current) ficheiroRef.current.value = "";
                      }}
                      className="p-1 rounded-lg hover:bg-black/5 text-on-surface-variant"
                      title="Remover anexo"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={ficheiroRef}
                    type="file"
                    onChange={escolherAnexo}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.png,.jpg,.jpeg,.gif,.webp"
                  />
                  <button
                    type="button"
                    onClick={function () { if (ficheiroRef.current) ficheiroRef.current.click(); }}
                    disabled={enviando}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors flex-shrink-0"
                    title="Anexar ficheiro (max. 2 MB)"
                  >
                    <span className="material-symbols-outlined text-[20px]">attach_file</span>
                  </button>
                  <input
                    type="text"
                    value={texto}
                    onChange={function (e) { setTexto(e.target.value); }}
                    placeholder={anexo ? "Mensagem (opcional)..." : "Escreva a mensagem..."}
                    maxLength={2000}
                    className="flex-1 px-4 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={(!texto.trim() && !anexo) || enviando}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all active:scale-95 flex-shrink-0"
                  >
                    {enviando ? (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ============ MODAL NOVA CONVERSA ============ */}
      {mostrarNova && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface-card w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-bold text-on-surface">Nova conversa</h2>
                <p className="text-[12px] text-on-surface-variant/60">Escolha a pessoa com quem quer falar</p>
              </div>
              <button onClick={function () { setMostrarNova(false); }} className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="px-5 py-3 border-b border-outline-variant/20">
              <div className="relative">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/50 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                <input
                  type="text"
                  value={filtroUtilizador}
                  onChange={function (e) { setFiltroUtilizador(e.target.value); }}
                  placeholder="Procurar por nome ou email..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {carregandoPessoas ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-7 h-7 border-4 border-outline-variant border-t-primary rounded-full animate-spin" />
                </div>
              ) : erroPessoas ? (
                <div className="px-5 py-8 text-center">
                  <span className="material-symbols-outlined text-[32px] text-error/40 block mb-2">error</span>
                  <p className="text-[12px] text-error">{erroPessoas}</p>
                </div>
              ) : utilizadoresFiltrados.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <span className="material-symbols-outlined text-[32px] text-on-surface-variant/20 block mb-2">person_search</span>
                  <p className="text-[12px] text-on-surface-variant/60">
                    {utilizadores.length === 0 ? "Sem colaboradores activos" : "Sem resultados para a procura"}
                  </p>
                </div>
              ) : (
                utilizadoresFiltrados.map(function (u) {
                  return (
                    <button
                      key={u.colaborador_id || u.id}
                      onClick={function () { escolherUtilizador(u); }}
                      disabled={criandoConversa || !u.tem_acesso}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="h-9 w-9 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[12px] font-bold text-primary">{iniciaisDe(u.nome_completo)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-on-surface truncate">{u.nome_completo}</p>
                        <p className="text-[11px] text-on-surface-variant/60 truncate">
                          {!u.tem_acesso ? "Sem acesso ao sistema" : (u.email || "Utilizador")}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant/40 ml-auto">
                        {u.tem_acesso ? "chat_bubble" : "block"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
