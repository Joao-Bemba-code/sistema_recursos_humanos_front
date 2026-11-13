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

var duracaoCurta = function (segundos) {
  var s = segundos || 0;
  var m = Math.floor(s / 60);
  var r = s % 60;
  return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
};

var rotuloDia = function (v) {
  var d = new Date(v);
  var hoje = new Date();
  var ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
};

var mesmoDia = function (a, b) {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

// Mensagens seguidas do mesmo autor, no mesmo dia e com menos de 3 minutos
// entre elas mostram-se como um grupo (avatar e hora so na primeira).
var grupoContinuo = function (anterior, atual) {
  if (!anterior || !atual) return false;
  if (String(anterior.utilizador_id) !== String(atual.utilizador_id)) return false;
  if (!mesmoDia(anterior.createdAt, atual.createdAt)) return false;
  return new Date(atual.createdAt).getTime() - new Date(anterior.createdAt).getTime() < 3 * 60 * 1000;
};

var carimboFicheiro = function () {
  var d = new Date();
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
};

var tipoAudio = function (tipo) {
  var t = String(tipo || "").toLowerCase();
  return t.indexOf("audio/") === 0 || t.indexOf("video/webm") === 0 || t.indexOf("video/mp4") === 0;
};

var iconeAnexo = function (tipo, nome) {
  var t = String(tipo || "").toLowerCase();
  if (t.indexOf("image/") === 0) return "image";
  if (t.indexOf("audio/") === 0) return "graphic_eq";
  if (t === "application/pdf") return "picture_as_pdf";
  if (t.indexOf("word") !== -1) return "description";
  if (t.indexOf("sheet") !== -1 || t.indexOf("excel") !== -1) return "table_chart";
  if (t.indexOf("presentation") !== -1 || t.indexOf("powerpoint") !== -1) return "slideshow";
  if (t.indexOf("zip") !== -1 || t.indexOf("rar") !== -1) return "folder_zip";
  if ((nome || "").toLowerCase().indexOf(".zip") !== -1) return "folder_zip";
  return "attach_file";
};

var textoAEcrever = function (nomes) {
  if (!nomes || nomes.length === 0) return "";
  if (nomes.length === 1) return nomes[0] + " está a escrever…";
  if (nomes.length === 2) return nomes[0] + " e " + nomes[1] + " estão a escrever…";
  return nomes[0] + " e mais " + (nomes.length - 1) + " estão a escrever…";
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
  const [aEscrever, setAEscrever] = useState([]);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState(null);
  const [anexoPreview, setAnexoPreview] = useState(null);
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
  const [gravando, setGravando] = useState(false);
  const [segundosGravacao, setSegundosGravacao] = useState(0);

  const ativaRef = useRef(null);
  const fimRef = useRef(null);
  const ultimoIdRef = useRef(null);
  const ultimoSinalRef = useRef(0);
  const gravadorRef = useRef(null);
  const gravacaoChunksRef = useRef([]);
  const gravacaoTimerRef = useRef(null);
  const gravacaoStreamRef = useRef(null);
  const gravacaoSegundosRef = useRef(0);
  const cancelarGravacaoRef = useRef(false);
  const anexoPreviewUrlRef = useRef(null);

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
        setAEscrever(data.dados.a_escrever || []);
      }
      carregarConversas();
    } catch (e) {
      if (primeira) setMsg({ tipo: "erro", texto: e.message });
    } finally {
      if (primeira) setLoadingMensagens(false);
    }
  };

  const irParaFim = function (comportamento) {
    setTimeout(function () {
      if (fimRef.current) fimRef.current.scrollIntoView({ behavior: comportamento || "smooth" });
    }, 60);
  };

  const removerAnexo = function () {
    if (anexoPreviewUrlRef.current) {
      URL.revokeObjectURL(anexoPreviewUrlRef.current);
      anexoPreviewUrlRef.current = null;
    }
    setAnexoPreview(null);
    setAnexo(null);
    if (ficheiroRef.current) ficheiroRef.current.value = "";
  };

  const definirAnexo = function (f) {
    if (anexoPreviewUrlRef.current) {
      URL.revokeObjectURL(anexoPreviewUrlRef.current);
      anexoPreviewUrlRef.current = null;
    }
    if (f && f.type && f.type.indexOf("image/") === 0) {
      anexoPreviewUrlRef.current = URL.createObjectURL(f);
      setAnexoPreview(anexoPreviewUrlRef.current);
    } else {
      setAnexoPreview(null);
    }
    setAnexo(f);
  };

  const abrirConversa = function (conversa) {
    setAtiva(conversa);
    ativaRef.current = conversa;
    ultimoIdRef.current = null;
    setVerListaMobile(false);
    setMsg(null);
    setMensagens([]);
    setAEscrever([]);
    removerAnexo();
    carregarMensagens(conversa, true);
  };

  // Envio comum: texto e/ou ficheiro (imagem, documento, nota de voz).
  const postar = async function (t, ficheiro) {
    var conversa = ativaRef.current;
    if (!conversa || enviando) return;
    setEnviando(true);
    try {
      var data;
      if (ficheiro) {
        // Com ficheiro vai em multipart; o texto pode seguir vazio.
        var form = new FormData();
        form.append("texto", t || "");
        if (conversa.tipo === "geral") form.append("geral", "true");
        else form.append("conversa_id", conversa.id);
        form.append("ficheiro", ficheiro);
        data = await api.upload("/api/chat/mensagens", form);
      } else {
        var corpo = { texto: t };
        if (conversa.tipo === "geral") {
          corpo.geral = true;
        } else {
          corpo.conversa_id = conversa.id;
        }
        data = await api.post("/api/chat/mensagens", corpo);
      }
      if (t) setTexto("");
      removerAnexo();
      // Adiciona a mensagem enviada se a conversa activa nao mudou.
      if (ativaRef.current && ativaRef.current.id === conversa.id && data && data.dados) {
        setMensagens(function (prev) { return prev.concat([data.dados]); });
        irParaFim("smooth");
      }
      carregarConversas();
    } catch (err) {
      setMsg({ tipo: "erro", texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const enviar = function (e) {
    if (e) e.preventDefault();
    var t = texto.trim();
    if ((!t && !anexo) || !ativa || enviando || gravando) return;
    postar(t, anexo);
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
    definirAnexo(f);
    e.target.value = "";
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

  // ==================== INDICADOR DE ESCRITA ====================

  // Avisa o servidor de que estamos a escrever (no maximo a cada 2,5s).
  const sinalizarEscrita = function () {
    var conversa = ativaRef.current;
    if (!conversa) return;
    var agora = new Date().getTime();
    if (agora - ultimoSinalRef.current < 2500) return;
    ultimoSinalRef.current = agora;
    api.post("/api/chat/conversas/" + conversa.id + "/a-escrever", {})
      .catch(function () { return null; });
  };

  // ==================== NOTA DE VOZ ====================

  const iniciarGravacao = async function () {
    if (gravando || enviando || !ativa) return;
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined" ||
        !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMsg({ tipo: "erro", texto: "Este navegador não permite gravar notas de voz" });
      setTimeout(function () { setMsg(null); }, 4000);
      return;
    }
    if (typeof window.isSecureContext !== "undefined" && !window.isSecureContext) {
      setMsg({ tipo: "erro", texto: "A gravação de voz precisa de uma ligação segura (HTTPS)" });
      setTimeout(function () { setMsg(null); }, 4000);
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var opcoes = { audioBitsPerSecond: 32000 };
      var tipos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      for (var i = 0; i < tipos.length; i++) {
        if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(tipos[i])) {
          opcoes.mimeType = tipos[i];
          break;
        }
      }
      var gravador = opcoes.mimeType
        ? new window.MediaRecorder(stream, opcoes)
        : new window.MediaRecorder(stream);

      gravacaoChunksRef.current = [];
      cancelarGravacaoRef.current = false;
      gravador.ondataavailable = function (ev) {
        if (ev.data && ev.data.size > 0) gravacaoChunksRef.current.push(ev.data);
      };
      gravador.onstop = function () { finalizarGravacao(); };
      gravadorRef.current = gravador;
      gravacaoStreamRef.current = stream;
      gravacaoSegundosRef.current = 0;
      setSegundosGravacao(0);
      setGravando(true);
      gravador.start();

      gravacaoTimerRef.current = setInterval(function () {
        gravacaoSegundosRef.current += 1;
        setSegundosGravacao(gravacaoSegundosRef.current);
        // Limite de 2 minutos por nota de voz.
        if (gravacaoSegundosRef.current >= 120 &&
            gravadorRef.current && gravadorRef.current.state !== "inactive") {
          gravadorRef.current.stop();
        }
      }, 1000);
    } catch (e) {
      var aviso = "Não foi possível aceder ao microfone";
      if (e && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")) {
        aviso = "Permita o acesso ao microfone nas definições do navegador";
      } else if (e && e.name === "NotFoundError") {
        aviso = "Não foi encontrado nenhum microfone";
      }
      setMsg({ tipo: "erro", texto: aviso });
      setTimeout(function () { setMsg(null); }, 5000);
    }
  };

  const finalizarGravacao = function () {
    var cancelada = cancelarGravacaoRef.current;
    cancelarGravacaoRef.current = false;
    var chunks = gravacaoChunksRef.current || [];
    var tipo = (gravadorRef.current && gravadorRef.current.mimeType) || "audio/webm";
    gravadorRef.current = null;
    gravacaoChunksRef.current = [];
    if (gravacaoTimerRef.current) {
      clearInterval(gravacaoTimerRef.current);
      gravacaoTimerRef.current = null;
    }
    if (gravacaoStreamRef.current) {
      gravacaoStreamRef.current.getTracks().forEach(function (t) { t.stop(); });
      gravacaoStreamRef.current = null;
    }
    setGravando(false);
    setSegundosGravacao(0);
    if (cancelada || chunks.length === 0) return;

    var blob = new Blob(chunks, { type: tipo });
    if (blob.size < 500) {
      setMsg({ tipo: "erro", texto: "A gravação ficou vazia. Tente novamente." });
      setTimeout(function () { setMsg(null); }, 4000);
      return;
    }
    if (blob.size > TAMANHO_MAX_ANEXO) {
      setMsg({ tipo: "erro", texto: "A nota de voz excede 2 MB. Grave uma mensagem mais curta." });
      setTimeout(function () { setMsg(null); }, 4000);
      return;
    }
    var ext = "webm";
    if (tipo.indexOf("mp4") !== -1) ext = "m4a";
    else if (tipo.indexOf("ogg") !== -1) ext = "ogg";
    var ficheiro = new File([blob], "nota-voz-" + carimboFicheiro() + "." + ext, { type: tipo });
    postar("", ficheiro);
  };

  const pararGravacao = function () {
    if (gravadorRef.current && gravadorRef.current.state !== "inactive") {
      try {
        gravadorRef.current.stop();
      } catch (eIgnorado) {
        // O gravador ja tinha parado.
      }
    }
  };

  const cancelarGravacao = function () {
    cancelarGravacaoRef.current = true;
    pararGravacao();
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

  // Liberta o microfone, o gravador e as pre-visualizacoes ao sair do ecra.
  useEffect(function () {
    return function () {
      if (gravacaoTimerRef.current) clearInterval(gravacaoTimerRef.current);
      if (gravacaoStreamRef.current) {
        gravacaoStreamRef.current.getTracks().forEach(function (t) { t.stop(); });
      }
      if (gravadorRef.current && gravadorRef.current.state !== "inactive") {
        try {
          gravadorRef.current.stop();
        } catch (eIgnorado) {
          // O gravador ja tinha parado.
        }
      }
      if (anexoPreviewUrlRef.current) URL.revokeObjectURL(anexoPreviewUrlRef.current);
    };
  }, []);

  var utilizadoresFiltrados = filtroUtilizador
    ? utilizadores.filter(function (u) {
        return (u.nome_completo || "").toLowerCase().indexOf(filtroUtilizador.toLowerCase()) !== -1 ||
               (u.email || "").toLowerCase().indexOf(filtroUtilizador.toLowerCase()) !== -1;
      })
    : utilizadores;

  var totalNaoLidas = conversas.reduce(function (soma, c) {
    return soma + ((c.id === (ativa && ativa.id) ? 0 : (c.nao_lidas || 0)));
  }, 0);

  // ==================== BLOCOS DE MENSAGENS ====================
  // Separa por dia e agrupa mensagens seguidas do mesmo autor.
  var blocos = [];
  var anteriorMsg = null;
  for (let iMsg = 0; iMsg < mensagens.length; iMsg++) {
    const m = mensagens[iMsg];
    const meu = String(m.utilizador_id) === String(meuId);
    const nome = m.remetente && m.remetente.nome_completo ? m.remetente.nome_completo : "Utilizador";
    const foto = m.remetente && m.remetente.fotografia ? m.remetente.fotografia : null;
    const novoDia = !anteriorMsg || !mesmoDia(anteriorMsg.createdAt, m.createdAt);
    const agrupada = grupoContinuo(anteriorMsg, m);
    const anexoImagem = !!(m.anexo_tipo && String(m.anexo_tipo).indexOf("image/") === 0);
    const anexoVoz = tipoAudio(m.anexo_tipo);

    if (novoDia) {
      blocos.push(
        <div key={"dia-" + m.id} className="flex items-center gap-3 py-2">
          <span className="flex-1 h-px bg-outline-variant/30" />
          <span className="px-3 py-1 rounded-full bg-surface-container-high text-[10px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
            {rotuloDia(m.createdAt)}
          </span>
          <span className="flex-1 h-px bg-outline-variant/30" />
        </div>
      );
    }

    blocos.push(
      <div
        key={m.id}
        className={"flex items-end gap-2 " + (meu ? "flex-row-reverse " : "") + (agrupada ? "mt-0.5" : "mt-3")}
      >
        {!meu && (
          agrupada ? (
            <div className="w-8 flex-shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0 ring-1 ring-outline-variant/20">
              {foto ? (
                <img src={foto} alt={nome} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-primary">{iniciaisDe(nome)}</span>
              )}
            </div>
          )
        )}
        <div className={"max-w-[80%] sm:max-w-[65%] flex flex-col " + (meu ? "items-end" : "items-start")}>
          {!meu && ativa.tipo === "geral" && !agrupada && (
            <span className="text-[10px] text-on-surface-variant/60 font-semibold mb-0.5 px-1">{nome}</span>
          )}
          <div
            title={new Date(m.createdAt).toLocaleString("pt-PT")}
            className={
              "px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed break-words whitespace-pre-wrap shadow-sm " +
              (meu
                ? "bg-primary text-white rounded-br-md"
                : "bg-surface-card border border-outline-variant/30 text-on-surface rounded-bl-md")
            }
          >
            {m.texto ? <span>{m.texto}</span> : null}

            {m.anexo_url && anexoImagem && (
              <div className={m.texto ? "mt-2" : ""}>
                <button
                  type="button"
                  onClick={function () { window.open(m.anexo_url, "_blank", "noopener,noreferrer"); }}
                  className="block rounded-xl overflow-hidden border border-black/5 hover:opacity-95 transition-opacity"
                  title="Abrir imagem"
                >
                  <img
                    src={m.anexo_url}
                    alt={m.anexo_nome || "Imagem"}
                    className="rounded-xl max-h-64 max-w-full object-contain bg-black/5"
                  />
                </button>
              </div>
            )}

            {m.anexo_url && anexoVoz && (
              <div className={m.texto ? "mt-2" : ""}>
                <div className={"flex items-center gap-2 rounded-xl px-2 py-1.5 " + (meu ? "bg-white/10" : "bg-surface-container-low")}>
                  <audio
                    controls
                    preload="none"
                    src={m.anexo_url}
                    className="h-9 max-w-[230px]"
                  />
                </div>
              </div>
            )}

            {m.anexo_url && !anexoImagem && !anexoVoz && (
              <div className={m.texto ? "mt-2" : ""}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] opacity-80">
                    {iconeAnexo(m.anexo_tipo, m.anexo_nome)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold truncate">{m.anexo_nome || "Anexo"}</p>
                    {m.anexo_tamanho ? (
                      <p className="text-[10px] opacity-70">{tamanhoLegivel(m.anexo_tamanho)}</p>
                    ) : null}
                  </div>
                </div>
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
          {!agrupada && (
            <span className="text-[10px] text-on-surface-variant/50 mt-1 px-1">
              {horaCurta(m.createdAt)}
            </span>
          )}
        </div>
      </div>
    );

    anteriorMsg = m;
  }

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

      <section className="bg-surface-card rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex h-[calc(100dvh-270px)] md:h-[calc(100vh-280px)] min-h-[460px]">
        {/* ============ LISTA DE CONVERSAS ============ */}
        <div className={`${verListaMobile ? "flex" : "hidden"} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-outline-variant/30 flex-shrink-0`}>
          <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Conversas</span>
            {totalNaoLidas > 0 && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                {totalNaoLidas} por ler
              </span>
            )}
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
                var escrevem = c.a_escrever || [];
                var fotoConversa = c.outro && c.outro.fotografia ? c.outro.fotografia : null;
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
                        {fotoConversa ? (
                          <img src={fotoConversa} alt={nome} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[12px] font-bold text-primary">{iniciaisDe(nome)}</span>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[13px] truncate ${naoLidas > 0 ? "font-bold text-on-surface" : "font-medium text-on-surface"}`}>{nome}</span>
                        <span className="text-[10px] text-on-surface-variant/60 whitespace-nowrap flex-shrink-0">{horaRelativa(c.ultima_em)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        {escrevem.length > 0 && !ativaEsta ? (
                          <span className="text-[12px] truncate text-primary font-semibold italic">
                            {escrevem[0]} está a escrever…
                          </span>
                        ) : (
                          <span className={`text-[12px] truncate ${naoLidas > 0 ? "text-on-surface-variant font-medium" : "text-on-surface-variant/60"}`}>
                            {c.ultima_mensagem ? c.ultima_mensagem : (c.tipo === "geral" ? "Canal partilhado por todos" : "Sem mensagens ainda")}
                          </span>
                        )}
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
              <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/30 bg-surface-card">
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
                    {ativa.outro && ativa.outro.fotografia ? (
                      <img src={ativa.outro.fotografia} alt={ativa.titulo || "Conversa"} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[12px] font-bold text-primary">{iniciaisDe(ativa.titulo || "?")}</span>
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-on-surface truncate">{ativa.tipo === "geral" ? "Geral" : (ativa.titulo || "Conversa")}</p>
                  <p className={"text-[11px] truncate " + (aEscrever.length > 0 ? "text-primary font-semibold" : "text-on-surface-variant/60")}>
                    {aEscrever.length > 0
                      ? textoAEcrever(aEscrever)
                      : (ativa.tipo === "geral" ? "Canal partilhado por todos os utilizadores" : "Conversa direta")}
                  </p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto px-4 py-4 bg-surface-container-lowest/40">
                {loadingMensagens ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-outline-variant border-t-primary rounded-full animate-spin" />
                  </div>
                ) : mensagens.length === 0 && aEscrever.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <span className="material-symbols-outlined text-[36px] text-on-surface-variant/20">mark_chat_unread</span>
                    <p className="text-[12px] text-on-surface-variant/60">Sem mensagens. Escreva a primeira.</p>
                  </div>
                ) : (
                  blocos
                )}

                {aEscrever.length > 0 && (
                  <div className="flex items-end gap-2 mt-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-primary">{iniciaisDe(aEscrever[0])}</span>
                    </div>
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-surface-card border border-outline-variant/30 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50 animate-bounce" style={{ animationDelay: "120ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50 animate-bounce" style={{ animationDelay: "240ms" }} />
                    </div>
                  </div>
                )}
                <div ref={fimRef} />
              </div>

              {/* Envio */}
              <form onSubmit={enviar} className="border-t border-outline-variant/30 p-3 space-y-2 bg-surface-card">
                {anexo && !gravando && (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30">
                    {anexoPreview ? (
                      <img
                        src={anexoPreview}
                        alt="Pré-visualização"
                        className="h-12 w-12 rounded-lg object-cover border border-outline-variant/30 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-primary">
                          {iconeAnexo(anexo.type, anexo.name)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-on-surface truncate">{anexo.name}</p>
                      <p className="text-[10px] text-on-surface-variant/60">{tamanhoLegivel(anexo.size)} · pronto a enviar</p>
                    </div>
                    <button
                      type="button"
                      onClick={removerAnexo}
                      className="p-1 rounded-lg hover:bg-black/5 text-on-surface-variant"
                      title="Remover anexo"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                )}

                {gravando ? (
                  <div className="flex items-center gap-3 px-1 py-1">
                    <button
                      type="button"
                      onClick={cancelarGravacao}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-error/10 text-error hover:bg-error/20 transition-colors flex-shrink-0"
                      title="Cancelar gravação"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                    <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse flex-shrink-0" />
                    <span className="text-[14px] font-bold text-on-surface tabular-nums">{duracaoCurta(segundosGravacao)}</span>
                    <span className="text-[12px] text-on-surface-variant/60 flex-1 truncate">
                      A gravar nota de voz · máx. 2 min
                    </span>
                    <button
                      type="button"
                      onClick={pararGravacao}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 flex-shrink-0"
                      title="Terminar e enviar"
                    >
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      ref={ficheiroRef}
                      type="file"
                      onChange={escolherAnexo}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.png,.jpg,.jpeg,.gif,.webp,.mp3,.m4a,.ogg,.wav,.webm"
                    />
                    <button
                      type="button"
                      onClick={function () { if (ficheiroRef.current) ficheiroRef.current.click(); }}
                      disabled={enviando}
                      className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors flex-shrink-0"
                      title="Anexar imagem ou ficheiro (máx. 2 MB)"
                    >
                      <span className="material-symbols-outlined text-[20px]">attach_file</span>
                    </button>
                    <input
                      type="text"
                      value={texto}
                      onChange={function (e) {
                        setTexto(e.target.value);
                        if (e.target.value.trim()) sinalizarEscrita();
                      }}
                      placeholder={anexo ? "Mensagem (opcional)..." : "Escreva a mensagem..."}
                      maxLength={2000}
                      className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={iniciarGravacao}
                      disabled={enviando}
                      className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors flex-shrink-0"
                      title="Gravar nota de voz"
                    >
                      <span className="material-symbols-outlined text-[20px]">mic</span>
                    </button>
                    <button
                      type="submit"
                      disabled={(!texto.trim() && !anexo) || enviando}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all active:scale-95 flex-shrink-0"
                      title="Enviar"
                    >
                      {enviando ? (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[20px]">send</span>
                      )}
                    </button>
                  </div>
                )}
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
                        {u.fotografia ? (
                          <img src={u.fotografia} alt={u.nome_completo} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[12px] font-bold text-primary">{iniciaisDe(u.nome_completo)}</span>
                        )}
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
