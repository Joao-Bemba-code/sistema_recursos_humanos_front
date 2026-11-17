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

// Emojis do seletor do chat, por categoria (estilo WhatsApp).
var EMOJIS = {
  "Sorrisos": [
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
    "😉", "😊", "😇", "😍", "🥰", "😘", "😋", "😛", "🤔", "🤐",
    "😐", "😴", "🥳", "😎", "🤓", "🧐", "😟", "😕", "😢", "😭",
    "😤", "😡", "🤯", "😱", "😨", "🥺", "😳", "🤗", "🤫", "😬",
    "🙄", "😏", "😪", "🥴", "🤤", "😷", "🤒", "🤕", "🤢", "🤮",
  ],
  "Gestos": [
    "👍", "👎", "👌", "🤌", "✌️", "🤞", "🤟", "🤙", "👏", "🙌",
    "🤝", "🙏", "💪", "👋", "🖐️", "✋", "🫶", "🫰", "👉", "👈",
    "👆", "👇", "☝️", "✊", "🤛", "🤜", "🫡", "👀", "🧠", "❤️",
  ],
  "Corações": [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
    "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
  ],
  "Outros": [
    "🎉", "🎊", "🔥", "⭐", "🌟", "💡", "✅", "❌", "⚠️", "📌",
    "📎", "✏️", "📅", "⏰", "☕", "🍕", "🚗", "🏠", "💼", "📞",
    "🐶", "🐱", "🌞", "🌙", "☔", "⚽", "🎯", "🏆", "💯", "🤖",
  ],
};

// Tamanhos de letra do chat (como a opcao de tamanho de texto do WhatsApp).
var ESCALAS_LETRA = [0.9, 1, 1.15, 1.3];

// Anexos antigos ficam como /uploads/... e precisam do endereco da API.
var urlAnexo = function (url) {
  if (!url) return "";
  var u = String(url);
  if (u.charAt(0) === "/") return api.baseURL + u;
  return u;
};

// Leitor de nota de voz proprio: tocar/pausar, ondas com progresso e
// duracao, para caber na bolha em vez do leitor nativo do navegador.
var BARRAS_VOZ = [6, 10, 14, 9, 17, 22, 13, 19, 25, 15, 11, 20, 26, 18, 12, 22, 16, 24, 14, 9, 17, 21, 12, 18, 10, 7];

function NotaVoz({ src, meu, nome }) {
  const audioRef = useRef(null);
  const [aTocar, setATocar] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const [atual, setAtual] = useState(0);
  const [falhou, setFalhou] = useState(false);

  const percent = duracao > 0 ? Math.min(atual / duracao, 1) : 0;

  const alternar = function () {
    var a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      var p = a.play();
      if (p && p.catch) p.catch(function () { setFalhou(true); });
    } else {
      a.pause();
    }
  };

  const procurar = function (ev) {
    var a = audioRef.current;
    if (!a || !duracao) return;
    var caixa = ev.currentTarget.getBoundingClientRect();
    var fracao = Math.min(Math.max((ev.clientX - caixa.left) / caixa.width, 0), 1);
    a.currentTime = fracao * duracao;
    setAtual(fracao * duracao);
  };

  var corCheia = meu ? "bg-white" : "bg-primary";
  var corVazia = meu ? "bg-white/40" : "bg-primary/25";

  return (
    <div className="flex items-center gap-2 w-[220px] max-w-full">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={function (e) {
          var d = e.currentTarget.duration;
          if (d && isFinite(d)) setDuracao(d);
        }}
        onTimeUpdate={function (e) { setAtual(e.currentTarget.currentTime || 0); }}
        onPlay={function () { setATocar(true); setFalhou(false); }}
        onPause={function () { setATocar(false); }}
        onEnded={function () { setATocar(false); setAtual(0); }}
        onError={function () { setFalhou(true); }}
        className="hidden"
      />
      <button
        type="button"
        onClick={alternar}
        title={aTocar ? "Pausar" : "Reproduzir"}
        className={"flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-colors " + (meu ? "bg-white/20 text-white hover:bg-white/30" : "bg-primary text-white hover:bg-primary/90")}
      >
        <span className="material-symbols-outlined text-[20px]">{aTocar ? "pause" : "play_arrow"}</span>
      </button>
      <div className="flex-1 min-w-0">
        <div onClick={procurar} className="flex items-end gap-[2px] h-7 cursor-pointer" title="Avançar no áudio">
          {BARRAS_VOZ.map(function (altura, i) {
            var cheia = (i + 1) / BARRAS_VOZ.length <= percent + 0.0001;
            return (
              <span
                key={i}
                style={{ height: altura + "px" }}
                className={"flex-1 rounded-full " + (cheia ? corCheia : corVazia)}
              />
            );
          })}
        </div>
        <div className={"flex items-center justify-between gap-2 mt-1 text-[10px] font-medium tabular-nums " + (meu ? "text-white/80" : "text-on-surface-variant/70")}>
          <span>{falhou ? "Não foi possível reproduzir" : duracaoCurta(Math.floor(aTocar ? atual : duracao))}</span>
          {falhou ? (
            <a href={src} download={nome || true} className="underline font-semibold whitespace-nowrap">Baixar</a>
          ) : null}
        </div>
      </div>
      <a
        href={src}
        download={nome || true}
        title="Baixar áudio"
        className={"flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 " + (meu ? "text-white/70 hover:bg-white/15" : "text-on-surface-variant/60 hover:bg-black/5")}
      >
        <span className="material-symbols-outlined text-[16px]">download</span>
      </a>
    </div>
  );
}

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
  const [modoNovo, setModoNovo] = useState("direta");
  const [tituloGrupo, setTituloGrupo] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);
  const [criandoGrupo, setCriandoGrupo] = useState(false);
  const [menuConversa, setMenuConversa] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);
  const [membrosAberto, setMembrosAberto] = useState(false);
  const [membrosSel, setMembrosSel] = useState([]);
  const [aAdicionarMembros, setAAdicionarMembros] = useState(false);
  const [utilizadores, setUtilizadores] = useState([]);
  const [filtroUtilizador, setFiltroUtilizador] = useState("");
  const [verListaMobile, setVerListaMobile] = useState(true);
  const [criandoConversa, setCriandoConversa] = useState(false);
  const [carregandoPessoas, setCarregandoPessoas] = useState(false);
  const [erroPessoas, setErroPessoas] = useState("");
  const [gravando, setGravando] = useState(false);
  const [segundosGravacao, setSegundosGravacao] = useState(0);
  const [emojisAberto, setEmojisAberto] = useState(false);
  const [emojiAba, setEmojiAba] = useState("Sorrisos");
  const [chamada, setChamada] = useState(null);
  const [chamadaVer, setChamadaVer] = useState(0);
  const [chamadaEntrante, setChamadaEntrante] = useState(null);
  const [microfoneMudo, setMicrofoneMudo] = useState(false);
  const [cameraLigada, setCameraLigada] = useState(true);
  const [escalaLetra, setEscalaLetra] = useState(1);

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
  const pcsRef = useRef({});
  const streamsRef = useRef({});
  const streamLocalRef = useRef(null);
  const icePendentesRef = useRef({});
  const videoTilesRef = useRef({});
  const audioTilesRef = useRef({});
  const videoLocalRef = useRef(null);
  const chamadaRef = useRef(null);
  const timerChamadaRef = useRef(null);
  const processadoSinaisRef = useRef({});
  const entranteRecusadaRef = useRef(null);

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

  // ==================== EMOJIS ====================

  const inserirEmoji = function (emoji) {
    setTexto(function (prev) { return prev + emoji; });
    sinalizarEscrita();
  };

  // ==================== CONFERENCIA (DIRETAS, GRUPOS E GERAL) ====================
  // O audio/video segue entre os navegadores por WebRTC. Cada par de
  // participantes abre o seu proprio canal (malha); o servidor so troca os
  // sinais e o estado da chamada, a cada 2 segundos.

  var ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  const sendSinal = function (destinatarioId, tipo, corpo) {
    var c = chamadaRef.current;
    if (!c) return Promise.resolve(null);
    return api.post("/api/chat/chamadas/" + c.id + "/sinais", {
      tipo: tipo,
      corpo: corpo,
      destinatario_id: destinatarioId,
    }).catch(function () { return null; });
  };

  const criarPeerPara = function (userId) {
    var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.ontrack = function (ev) {
      var stream = ev.streams && ev.streams[0] ? ev.streams[0] : new MediaStream([ev.track]);
      streamsRef.current[userId] = stream;
      setChamadaVer(function (v) { return v + 1; });
    };
    pc.onicecandidate = function (ev) {
      if (!ev.candidate) return;
      sendSinal(userId, "ice", JSON.stringify(ev.candidate.toJSON ? ev.candidate.toJSON() : ev.candidate));
    };
    pcsRef.current[userId] = pc;
    var stream = streamLocalRef.current;
    if (stream) {
      stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });
    }
    return pc;
  };

  const despejarIce = async function (userId) {
    var pc = pcsRef.current[userId];
    if (!pc) return;
    var pendentes = (icePendentesRef.current[userId] || []).splice(0);
    for (var i = 0; i < pendentes.length; i++) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(pendentes[i]));
      } catch (eIgnorado) {
        // Candidato repetido ou fora de contexto: ignora-se.
      }
    }
  };

  const aplicarSinais = async function () {
    var c = chamadaRef.current;
    if (!c) return;
    var data;
    try {
      data = await api.get("/api/chat/chamadas/" + c.id + "/sinais");
    } catch (e) {
      return;
    }
    var sinais = data.dados || [];
    for (var i = 0; i < sinais.length; i++) {
      var s = sinais[i];
      if (processadoSinaisRef.current[s.id]) continue;
      processadoSinaisRef.current[s.id] = true;
      var origem = String(s.remetente_id);
      var corpo;
      try { corpo = JSON.parse(s.corpo); } catch (e) { continue; }

      if (s.tipo === "offer") {
        // Quem recebe a oferta responde com um answer; cada par tem um so pc.
        if (!pcsRef.current[origem]) {
          var pc = criarPeerPara(origem);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(corpo));
            await despejarIce(origem);
            var answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSinal(origem, "answer", JSON.stringify(answer));
          } catch (e) {
            try { pc.close(); } catch (eFechar) { /* ignora */ }
            delete pcsRef.current[origem];
          }
        }
      } else if (s.tipo === "answer") {
        var pcA = pcsRef.current[origem];
        if (pcA) {
          try {
            await pcA.setRemoteDescription(new RTCSessionDescription(corpo));
            await despejarIce(origem);
          } catch (eIgnorado) {
            // Resposta repetida ou fora de contexto.
          }
        }
      } else if (s.tipo === "ice") {
        var pcI = pcsRef.current[origem];
        if (pcI && pcI.remoteDescription) {
          try {
            await pcI.addIceCandidate(new RTCIceCandidate(corpo));
          } catch (eIgnorado) {
            // Ignora candidatos repetidos.
          }
        } else {
          if (!icePendentesRef.current[origem]) icePendentesRef.current[origem] = [];
          icePendentesRef.current[origem].push(corpo);
        }
      }
    }
  };

  const montarMedia = async function (tipo) {
    var stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: tipo === "video" });
    streamLocalRef.current = stream;
    return stream;
  };

  const limparChamada = function () {
    if (timerChamadaRef.current) {
      clearInterval(timerChamadaRef.current);
      timerChamadaRef.current = null;
    }
    Object.keys(pcsRef.current).forEach(function (id) {
      try { pcsRef.current[id].close(); } catch (eIgnorado) { /* ja fechada */ }
    });
    pcsRef.current = {};
    streamsRef.current = {};
    icePendentesRef.current = {};
    if (streamLocalRef.current) {
      streamLocalRef.current.getTracks().forEach(function (t) { t.stop(); });
      streamLocalRef.current = null;
    }
    chamadaRef.current = null;
    processadoSinaisRef.current = {};
    setChamada(null);
    setMicrofoneMudo(false);
    setCameraLigada(true);
  };

  // Ajusta as pessoas visiveis na chamada e fecha os canais de quem saiu.
  const atualizarMembros = function (c, membros) {
    var novos = {};
    (membros || []).forEach(function (p) {
      novos[String(p.id)] = { nome_completo: p.nome_completo, fotografia: p.fotografia };
    });
    Object.keys(pcsRef.current).forEach(function (id) {
      if (!novos[id]) {
        try { pcsRef.current[id].close(); } catch (eIgnorado) { /* ignora */ }
        delete pcsRef.current[id];
        delete streamsRef.current[id];
      }
    });
    c.membros = novos;
  };

  const iniciarTimersChamada = function () {
    if (timerChamadaRef.current) clearInterval(timerChamadaRef.current);
    timerChamadaRef.current = setInterval(async function () {
      var c = chamadaRef.current;
      if (!c) return;
      await aplicarSinais();
      if (chamadaRef.current !== c) return;
      var data;
      try {
        data = await api.get("/api/chat/chamadas/" + c.id);
      } catch (e) {
        return;
      }
      var d = data.dados || {};
      if (c.estado === "a_terminar") return;

      if (["terminada", "recusada", "sem_resposta"].indexOf(d.estado) !== -1) {
        var aviso = d.estado === "recusada" ? "A chamada foi recusada"
          : (d.estado === "sem_resposta" ? "A chamada não foi atendida" : "Chamada terminada");
        limparChamada();
        setMsg({ tipo: "erro", texto: aviso });
        setTimeout(function () { setMsg(null); }, 4000);
        return;
      }

      // Se sairmos noutro aparelho, este ecra acompanha e sai tambem.
      if ((d.saiu || []).indexOf(String(meuId)) !== -1) {
        limparChamada();
        return;
      }

      atualizarMembros(c, d.membros);
      if (d.estado === "aceite") c.estado = "activa";
      if (c.papel === "iniciador" && d.estado === "a_tocar") {
        c.tempoToque = (c.tempoToque || 0) + 2;
        if (c.tempoToque >= 60) {
          api.post("/api/chat/chamadas/" + c.id + "/terminar", {}).catch(function () { return null; });
          limparChamada();
          setMsg({ tipo: "erro", texto: "A chamada não foi atendida" });
          setTimeout(function () { setMsg(null); }, 4000);
          return;
        }
      }
      setChamada(Object.assign({}, c));
      setChamadaVer(function (v) { return v + 1; });
    }, 2000);
  };

  const iniciarChamada = async function (tipo) {
    if (chamadaRef.current) return;
    var conversa = ativaRef.current;
    if (!conversa) return;
    if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined" ||
        !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMsg({ tipo: "erro", texto: "Este navegador não permite chamadas" });
      return;
    }
    try {
      var data = await api.post("/api/chat/chamadas", { conversa_id: conversa.id, tipo: tipo });
      var c = {
        id: data.dados.id,
        tipo: tipo,
        papel: "iniciador",
        estado: "a_tocar",
        conversaId: conversa.id,
        conversaTitulo: conversa.tipo === "geral" ? "Geral" : (conversa.titulo || "Conversa"),
        membros: {},
        tempoToque: 0,
      };
      processadoSinaisRef.current = {};
      icePendentesRef.current = {};
      chamadaRef.current = c;
      await montarMedia(tipo);
      setChamada(c);
      setChamadaVer(function (v) { return v + 1; });
      iniciarTimersChamada();
    } catch (e) {
      limparChamada();
      setMsg({ tipo: "erro", texto: e.message || "Não foi possível iniciar a chamada" });
      setTimeout(function () { setMsg(null); }, 5000);
    }
  };

  const aceitarEntrante = async function () {
    var e = chamadaEntrante;
    if (!e || chamadaRef.current) return;
    var c = {
      id: e.id,
      tipo: e.tipo,
      papel: "recebido",
      estado: "activa",
      conversaId: e.conversa_id,
      conversaTitulo: e.conversa_titulo,
      membros: {},
      tempoToque: 0,
    };
    setChamadaEntrante(null);
    processadoSinaisRef.current = {};
    icePendentesRef.current = {};
    chamadaRef.current = c;
    setChamada(c);
    try {
      var aceita = await api.post("/api/chat/chamadas/" + e.id + "/aceitar", {});
      await montarMedia(e.tipo);
      setChamadaVer(function (v) { return v + 1; });
      // Oferta para cada pessoa que ja esta dentro da chamada.
      var vivos = (aceita && aceita.dados && aceita.dados.vivos) || [];
      var outros = vivos.filter(function (id) { return String(id) !== String(meuId); });
      for (var i = 0; i < outros.length; i++) {
        var pc = criarPeerPara(String(outros[i]));
        var offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSinal(String(outros[i]), "offer", JSON.stringify(offer));
      }
      iniciarTimersChamada();
    } catch (err) {
      limparChamada();
      setMsg({ tipo: "erro", texto: err.message || "Não foi possível atender a chamada" });
      setTimeout(function () { setMsg(null); }, 5000);
    }
  };

  const recusarEntrante = function () {
    var e = chamadaEntrante;
    if (!e) return;
    entranteRecusadaRef.current = e.id;
    setChamadaEntrante(null);
    api.post("/api/chat/chamadas/" + e.id + "/recusar", {}).catch(function () { return null; });
  };

  const terminarChamada = async function () {
    var c = chamadaRef.current;
    if (c) {
      c.estado = "a_terminar";
      try {
        await api.post("/api/chat/chamadas/" + c.id + "/terminar", {});
      } catch (eIgnorado) {
        // Se falhar, limpa-se na mesma localmente.
      }
    }
    limparChamada();
  };

  const alternarMicrofone = function () {
    var stream = streamLocalRef.current;
    if (!stream) return;
    var novo = !microfoneMudo;
    stream.getAudioTracks().forEach(function (t) { t.enabled = !novo; });
    setMicrofoneMudo(novo);
  };

  const alternarCamera = function () {
    var stream = streamLocalRef.current;
    if (!stream) return;
    var novo = !cameraLigada;
    stream.getVideoTracks().forEach(function (t) { t.enabled = novo; });
    setCameraLigada(novo);
  };

  // Liga os streams aos elementos do ecra de chamada quando ele e pintado.
  useEffect(function () {
    if (!chamada) return;
    var timer = setTimeout(function () {
      if (videoLocalRef.current && streamLocalRef.current) videoLocalRef.current.srcObject = streamLocalRef.current;
      Object.keys(streamsRef.current).forEach(function (id) {
        var el = videoTilesRef.current[id] || audioTilesRef.current[id];
        if (el) el.srcObject = streamsRef.current[id];
      });
    }, 60);
    return function () { clearTimeout(timer); };
  }, [chamada, chamadaVer]);

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
    setModoNovo("direta");
    setTituloGrupo("");
    setSeleccionados([]);
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

  // Marca/desmarca uma pessoa para o grupo (so quem tem conta de acesso).
  const alternarSeleccionado = function (utilizador) {
    if (!utilizador.tem_acesso || criandoGrupo) return;
    setSeleccionados(function (prev) {
      var id = utilizador.id;
      if (prev.indexOf(id) === -1) return prev.concat([id]);
      return prev.filter(function (x) { return x !== id; });
    });
  };

  const criarGrupo = async function () {
    if (criandoGrupo) return;
    var nome = tituloGrupo.trim();
    if (!nome) {
      setMsg({ tipo: "erro", texto: "Indique o nome do grupo" });
      return;
    }
    if (seleccionados.length === 0) {
      setMsg({ tipo: "erro", texto: "Escolha pelo menos uma pessoa para o grupo" });
      return;
    }
    setCriandoGrupo(true);
    try {
      const data = await api.post("/api/chat/grupos", { titulo: nome, utilizador_ids: seleccionados });
      setMostrarNova(false);
      setMsg(null);
      carregarConversas();
      if (data && data.dados) {
        abrirConversa({
          id: data.dados.id,
          tipo: "grupo",
          titulo: data.dados.titulo,
          participantes: data.dados.participantes,
        });
      }
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setCriandoGrupo(false);
    }
  };

  // ==================== GESTAO DE GRUPOS E CONVERSAS ====================

  const carregarPessoasParaGrupos = function () {
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

  const abrirAdicionarMembros = function () {
    setMenuConversa(false);
    if (!ativa || ativa.tipo !== "grupo") return;
    setMembrosSel([]);
    setFiltroUtilizador("");
    setMembrosAberto(true);
    carregarPessoasParaGrupos();
  };

  const alternarMembro = function (utilizador) {
    if (!utilizador.tem_acesso || aAdicionarMembros) return;
    setMembrosSel(function (prev) {
      var id = utilizador.id;
      if (prev.indexOf(id) === -1) return prev.concat([id]);
      return prev.filter(function (x) { return x !== id; });
    });
  };

  const adicionarMembros = async function () {
    if (!ativa || ativa.tipo !== "grupo" || membrosSel.length === 0 || aAdicionarMembros) return;
    setAAdicionarMembros(true);
    try {
      const data = await api.post("/api/chat/grupos/" + ativa.id + "/membros", { utilizador_ids: membrosSel });
      setMembrosAberto(false);
      var n = data && data.dados ? data.dados.adicionados : 0;
      setMsg({
        tipo: "sucesso",
        texto: n > 0 ? n + (n === 1 ? " pessoa adicionada ao grupo" : " pessoas adicionadas ao grupo")
                     : "Essas pessoas já pertencem ao grupo",
      });
      setTimeout(function () { setMsg(null); }, 4000);
      carregarConversas();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setAAdicionarMembros(false);
    }
  };

  const confirmarRemoverConversa = function () {
    setMenuConversa(false);
    if (!ativa) return;
    var c = ativa;
    setConfirmacao({
      titulo: "Remover conversa",
      texto: "A conversa sai da sua lista e volta a aparecer quando receber uma mensagem nova.",
      botao: "Remover",
      acao: async function () {
        try {
          await api.post("/api/chat/conversas/" + c.id + "/eliminar", {});
          setAtiva(null);
          ativaRef.current = null;
          setMensagens([]);
          setVerListaMobile(true);
          carregarConversas();
        } catch (e) {
          setMsg({ tipo: "erro", texto: e.message });
        }
      },
    });
  };

  const confirmarEliminarGrupo = function () {
    setMenuConversa(false);
    if (!ativa || ativa.tipo !== "grupo") return;
    var c = ativa;
    setConfirmacao({
      titulo: "Eliminar grupo",
      texto: "O grupo e todas as mensagens deixam de existir para todos os membros. Não pode ser anulado.",
      botao: "Eliminar grupo",
      perigoso: true,
      acao: async function () {
        try {
          await api.delete("/api/chat/grupos/" + c.id);
          setAtiva(null);
          ativaRef.current = null;
          setMensagens([]);
          setVerListaMobile(true);
          carregarConversas();
        } catch (e) {
          setMsg({ tipo: "erro", texto: e.message });
        }
      },
    });
  };

  // ==================== TAMANHO DA LETRA ====================

  // Le o tamanho guardado depois da primeira pintura, para nao haver
  // diferencas entre servidor e navegador.
  useEffect(function () {
    var timer = setTimeout(function () {
      try {
        var guardado = parseInt(localStorage.getItem("chat_escala_letra"), 10);
        if (!isNaN(guardado) && guardado >= 0 && guardado < ESCALAS_LETRA.length) {
          setEscalaLetra(guardado);
        }
      } catch (e) {
        // Sem armazenamento local: fica o tamanho normal.
      }
    }, 0);
    return function () { clearTimeout(timer); };
  }, []);

  const mudarEscala = function (delta) {
    var novo = Math.min(Math.max(escalaLetra + delta, 0), ESCALAS_LETRA.length - 1);
    setEscalaLetra(novo);
    try {
      localStorage.setItem("chat_escala_letra", String(novo));
    } catch (e) {
      // Sem armazenamento local: so vale para esta sessao.
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
      // Chamadas a chegar (so quando nao estamos ja em chamada).
      if (!chamadaRef.current) {
        api.get("/api/chat/chamadas/pendentes")
          .then(function (data) {
            var lista = (data && data.dados) || [];
            if (lista.length === 0) {
              entranteRecusadaRef.current = null;
              setChamadaEntrante(null);
              return;
            }
            var e = lista[0];
            if (entranteRecusadaRef.current === e.id) return;
            if (!chamadaRef.current) setChamadaEntrante(e);
          })
          .catch(function () { return null; });
      }
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
      if (timerChamadaRef.current) clearInterval(timerChamadaRef.current);
      Object.keys(pcsRef.current).forEach(function (id) {
        try { pcsRef.current[id].close(); } catch (eIgnorado) { /* ja fechada */ }
      });
      if (streamLocalRef.current) {
        streamLocalRef.current.getTracks().forEach(function (t) { t.stop(); });
      }
    };
  }, []);

  var utilizadoresFiltrados = filtroUtilizador
    ? utilizadores.filter(function (u) {
        return (u.nome_completo || "").toLowerCase().indexOf(filtroUtilizador.toLowerCase()) !== -1 ||
               (u.email || "").toLowerCase().indexOf(filtroUtilizador.toLowerCase()) !== -1;
      })
    : utilizadores;

  // Pessoas que ainda não estão no grupo aberto no modal "Adicionar membros".
  var membrosDoGrupo = (ativa && ativa.membros_ids) || [];
  var candidatosGrupo = utilizadoresFiltrados.filter(function (u) {
    return membrosDoGrupo.map(String).indexOf(String(u.id)) === -1 && String(u.id) !== String(meuId);
  });

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
          {!meu && (ativa.tipo === "geral" || ativa.tipo === "grupo") && !agrupada && (
            <span className="text-[10px] text-on-surface-variant/60 font-semibold mb-0.5 px-1">{nome}</span>
          )}
          <div
            title={new Date(m.createdAt).toLocaleString("pt-PT")}
            style={{ fontSize: (13 * ESCALAS_LETRA[escalaLetra]).toFixed(1) + "px" }}
            className={
              "px-3.5 py-2 rounded-2xl leading-relaxed break-words whitespace-pre-wrap shadow-sm " +
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
                  onClick={function () { window.open(urlAnexo(m.anexo_url), "_blank", "noopener,noreferrer"); }}
                  className="block rounded-xl overflow-hidden border border-black/5 hover:opacity-95 transition-opacity"
                  title="Abrir imagem"
                >
                  <img
                    src={urlAnexo(m.anexo_url)}
                    alt={m.anexo_nome || "Imagem"}
                    className="rounded-xl max-h-64 max-w-full object-contain bg-black/5"
                  />
                </button>
              </div>
            )}

            {m.anexo_url && anexoVoz && (
              <div className={m.texto ? "mt-2" : ""}>
                <NotaVoz src={urlAnexo(m.anexo_url)} meu={meu} nome={m.anexo_nome} />
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
                var nome = c.tipo === "geral" ? "Geral" : (c.titulo || (c.tipo === "grupo" ? "Grupo" : "Conversa"));
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
                    {c.tipo === "geral" || c.tipo === "grupo" ? (
                      <div className="p-2.5 rounded-full bg-primary/10 flex-shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-primary">{c.tipo === "grupo" ? "groups" : "forum"}</span>
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
                            {c.ultima_mensagem
                              ? c.ultima_mensagem
                              : (c.tipo === "geral"
                                ? "Canal partilhado por todos"
                                : (c.tipo === "grupo" ? "Grupo · " + (c.participantes || 0) + " pessoas" : "Sem mensagens ainda"))}
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
                {ativa.tipo === "geral" || ativa.tipo === "grupo" ? (
                  <div className="p-2 rounded-full bg-primary/10">
                    <span className="material-symbols-outlined text-[20px] text-primary">{ativa.tipo === "grupo" ? "groups" : "forum"}</span>
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
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-on-surface truncate">{ativa.tipo === "geral" ? "Geral" : (ativa.titulo || (ativa.tipo === "grupo" ? "Grupo" : "Conversa"))}</p>
                  <p className={"text-[11px] truncate " + (aEscrever.length > 0 ? "text-primary font-semibold" : "text-on-surface-variant/60")}>
                    {aEscrever.length > 0
                      ? textoAEcrever(aEscrever)
                      : (ativa.tipo === "geral"
                        ? "Canal partilhado por todos os utilizadores"
                        : (ativa.tipo === "grupo" ? "Grupo · " + (ativa.participantes || 0) + " pessoas" : "Conversa direta"))}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-0.5 rounded-full border border-outline-variant/30 bg-surface-container-low px-1 py-0.5 flex-shrink-0" title="Tamanho da letra das mensagens">
                  <button
                    type="button"
                    onClick={function () { mudarEscala(-1); }}
                    disabled={escalaLetra === 0}
                    className="flex items-center justify-center w-6 h-6 rounded-full text-on-surface-variant hover:bg-surface-card disabled:opacity-30 transition-colors"
                    title="Letra menor"
                  >
                    <span className="material-symbols-outlined text-[15px]">remove</span>
                  </button>
                  <span className="text-[10px] font-bold text-on-surface-variant/70 w-6 text-center select-none">Aa</span>
                  <button
                    type="button"
                    onClick={function () { mudarEscala(1); }}
                    disabled={escalaLetra === ESCALAS_LETRA.length - 1}
                    className="flex items-center justify-center w-6 h-6 rounded-full text-on-surface-variant hover:bg-surface-card disabled:opacity-30 transition-colors"
                    title="Letra maior"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                  </button>
                </div>
                <div className="relative flex items-center gap-0.5 flex-shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={function () { iniciarChamada("audio"); }}
                    className="flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    title="Chamada de voz"
                  >
                    <span className="material-symbols-outlined text-[19px]">call</span>
                  </button>
                  <button
                    type="button"
                    onClick={function () { iniciarChamada("video"); }}
                    className="flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    title="Chamada de vídeo"
                  >
                    <span className="material-symbols-outlined text-[19px]">videocam</span>
                  </button>
                  <button
                    type="button"
                    onClick={function () { setMenuConversa(function (v) { return !v; }); }}
                    className={"flex items-center justify-center w-8 h-8 rounded-full transition-colors " + (menuConversa ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:bg-surface-container-low")}
                    title="Mais opções"
                  >
                    <span className="material-symbols-outlined text-[19px]">more_vert</span>
                  </button>

                  {menuConversa && (
                    <>
                      <button
                        type="button"
                        aria-label="Fechar menu"
                        onClick={function () { setMenuConversa(false); }}
                        className="fixed inset-0 z-[70] cursor-default"
                      />
                      <div className="absolute right-0 top-9 z-[71] w-56 rounded-xl bg-surface-card border border-outline-variant/30 shadow-xl py-1.5">
                        {ativa.tipo === "grupo" && (
                          <button
                            type="button"
                            onClick={abrirAdicionarMembros}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">group_add</span>
                            Adicionar membros
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={confirmarRemoverConversa}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">delete_sweep</span>
                          Remover conversa
                        </button>
                        {ativa.tipo === "grupo" && (!ativa.criador_id || String(ativa.criador_id) === String(meuId)) && (
                          <button
                            type="button"
                            onClick={confirmarEliminarGrupo}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-error hover:bg-error/10 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Eliminar grupo
                          </button>
                        )}
                      </div>
                    </>
                  )}
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
                {emojisAberto && !gravando && (
                  <div className="rounded-xl bg-surface-container-low border border-outline-variant/30 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-2 pt-2">
                      {Object.keys(EMOJIS).map(function (cat) {
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={function () { setEmojiAba(cat); }}
                            className={"px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors " + (emojiAba === cat
                              ? "bg-primary text-white"
                              : "bg-surface-card text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-high")}
                          >
                            {cat}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={function () { setEmojisAberto(false); }}
                        className="ml-auto p-1 rounded-lg hover:bg-black/5 text-on-surface-variant"
                        title="Fechar emojis"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-8 sm:grid-cols-10 gap-0.5 p-2 max-h-40 overflow-y-auto">
                      {EMOJIS[emojiAba].map(function (em) {
                        return (
                          <button
                            key={em}
                            type="button"
                            onClick={function () { inserirEmoji(em); }}
                            className="h-8 w-8 flex items-center justify-center text-[20px] rounded-lg hover:bg-surface-container-high transition-colors"
                          >
                            {em}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                      onClick={function () { setEmojisAberto(function (v) { return !v; }); }}
                      disabled={enviando}
                      className={"flex items-center justify-center w-10 h-10 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 " + (emojisAberto ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-container-low")}
                      title="Emojis"
                    >
                      <span className="material-symbols-outlined text-[20px]">mood</span>
                    </button>
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

      {/* ============ ECRA DE CHAMADA ============ */}
      {chamada && (
        <div className="fixed inset-0 z-[95] bg-black flex flex-col">
          <div className="relative flex-1 min-h-0 overflow-y-auto">
            <div className="sticky top-0 z-10 -mb-16 flex flex-col items-center gap-1 py-4 pointer-events-none">
              <p className="text-[16px] font-bold text-white">{chamada.conversaTitulo || "Chamada"}</p>
              <p className="text-[12px] text-white/70">
                {chamada.papel === "iniciador" && chamada.estado !== "activa"
                  ? "A chamar…"
                  : "Em chamada · " + (Object.keys(chamada.membros).length + 1) + " pessoas"}
              </p>
            </div>
            <div className={"grid gap-2 p-3 pt-16 " + (Object.keys(chamada.membros).length <= 1 ? "grid-cols-1 max-w-sm mx-auto w-full" : "grid-cols-2")}>
              {chamada.tipo === "video" && (
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-900 border border-white/10">
                  <video
                    ref={videoLocalRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1.5 left-2 text-[11px] font-semibold text-white/90">Tu</span>
                </div>
              )}
              {Object.keys(chamada.membros).map(function (id) {
                var p = chamada.membros[id];
                return (
                  <div
                    key={id}
                    className="relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-900 border border-white/10 flex items-center justify-center"
                  >
                    {chamada.tipo === "video" ? (
                      <video
                        ref={function (el) { videoTilesRef.current[id] = el; }}
                        autoPlay
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-20 w-20 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                          {p.fotografia ? (
                            <img src={p.fotografia} alt={p.nome_completo || "Participante"} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[22px] font-bold text-white">{iniciaisDe(p.nome_completo)}</span>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-white/40">graphic_eq</span>
                      </div>
                    )}
                    {chamada.tipo === "audio" && (
                      <audio ref={function (el) { audioTilesRef.current[id] = el; }} autoPlay className="hidden" />
                    )}
                    <span className="absolute bottom-1.5 left-2 text-[11px] font-semibold text-white/90">{p.nome_completo || "Participante"}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-center gap-5 py-6">
            <button
              type="button"
              onClick={alternarMicrofone}
              title={microfoneMudo ? "Reativar microfone" : "Silenciar microfone"}
              className={"w-14 h-14 rounded-full flex items-center justify-center transition-colors " + (microfoneMudo ? "bg-white/30 text-white" : "bg-white/10 text-white hover:bg-white/20")}
            >
              <span className="material-symbols-outlined text-[24px]">{microfoneMudo ? "mic_off" : "mic"}</span>
            </button>
            {chamada.tipo === "video" && (
              <button
                type="button"
                onClick={alternarCamera}
                title={cameraLigada ? "Desligar câmara" : "Ligar câmara"}
                className={"w-14 h-14 rounded-full flex items-center justify-center transition-colors " + (!cameraLigada ? "bg-white/30 text-white" : "bg-white/10 text-white hover:bg-white/20")}
              >
                <span className="material-symbols-outlined text-[24px]">{cameraLigada ? "videocam" : "videocam_off"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={terminarChamada}
              title="Terminar chamada"
              className="w-16 h-16 rounded-full bg-error text-white flex items-center justify-center hover:bg-error/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[28px]">call_end</span>
            </button>
          </div>
        </div>
      )}

      {/* ============ CHAMADA A CHEGAR ============ */}
      {chamadaEntrante && !chamada && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface-card w-full max-w-sm rounded-2xl shadow-2xl border border-outline-variant/30 p-6 flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
              {chamadaEntrante.iniciador && chamadaEntrante.iniciador.fotografia ? (
                <img src={chamadaEntrante.iniciador.fotografia} alt={chamadaEntrante.iniciador.nome_completo || "Chamada"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[20px] font-bold text-primary">{iniciaisDe(chamadaEntrante.iniciador && chamadaEntrante.iniciador.nome_completo)}</span>
              )}
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-on-surface">{(chamadaEntrante.iniciador && chamadaEntrante.iniciador.nome_completo) || "Chamada"}</p>
              <p className="text-[12px] text-on-surface-variant/70 mt-0.5">
                {(chamadaEntrante.conversa_titulo ? chamadaEntrante.conversa_titulo + " · " : "") +
                  (chamadaEntrante.tipo === "video" ? "Chamada de vídeo a chegar…" : "Chamada de voz a chegar…")}
              </p>
            </div>
            <div className="flex items-center gap-8 mt-2">
              <button
                type="button"
                onClick={recusarEntrante}
                title="Recusar"
                className="w-14 h-14 rounded-full bg-error text-white flex items-center justify-center hover:bg-error/90 transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">call_end</span>
              </button>
              <button
                type="button"
                onClick={aceitarEntrante}
                title="Aceitar"
                className="w-14 h-14 rounded-full bg-success text-white flex items-center justify-center hover:bg-success/90 transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">{chamadaEntrante.tipo === "video" ? "videocam" : "call"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL NOVA CONVERSA ============ */}
      {mostrarNova && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface-card w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-bold text-on-surface">{modoNovo === "grupo" ? "Novo grupo" : "Nova conversa"}</h2>
                <p className="text-[12px] text-on-surface-variant/60">
                  {modoNovo === "grupo" ? "Dê um nome ao grupo e escolha as pessoas" : "Escolha a pessoa com quem quer falar"}
                </p>
              </div>
              <button onClick={function () { setMostrarNova(false); }} className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="px-5 pt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={function () { setModoNovo("direta"); }}
                className={
                  "px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors " +
                  (modoNovo === "direta"
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-high")
                }
              >
                Conversa direta
              </button>
              <button
                type="button"
                onClick={function () { setModoNovo("grupo"); }}
                className={
                  "px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors " +
                  (modoNovo === "grupo"
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-high")
                }
              >
                Grupo
              </button>
            </div>
            {modoNovo === "grupo" && (
              <div className="px-5 pt-3">
                <div className="relative">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant/50 absolute left-3 top-1/2 -translate-y-1/2">groups</span>
                  <input
                    type="text"
                    value={tituloGrupo}
                    onChange={function (e) { setTituloGrupo(e.target.value); }}
                    placeholder="Nome do grupo"
                    maxLength={150}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            )}
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
                  var marcado = seleccionados.indexOf(u.id) !== -1;
                  if (modoNovo === "grupo") {
                    return (
                      <button
                        key={u.colaborador_id || u.id}
                        onClick={function () { alternarSeleccionado(u); }}
                        disabled={!u.tem_acesso || criandoGrupo}
                        className={"w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed " + (marcado ? "bg-primary/10" : "hover:bg-primary/5")}
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
                        <span className={"material-symbols-outlined text-[20px] ml-auto " + (marcado ? "text-primary" : "text-on-surface-variant/40")}>
                          {!u.tem_acesso ? "block" : (marcado ? "check_circle" : "radio_button_unchecked")}
                        </span>
                      </button>
                    );
                  }
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
            {modoNovo === "grupo" && (
              <div className="px-5 py-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={criarGrupo}
                  disabled={criandoGrupo || !tituloGrupo.trim() || seleccionados.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {criandoGrupo ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">group_add</span>
                  )}
                  {criandoGrupo
                    ? "A criar..."
                    : "Criar grupo" + (seleccionados.length > 0 ? " · " + (seleccionados.length + 1) + " pessoas" : "")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ MODAL ADICIONAR MEMBROS ============ */}
      {membrosAberto && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface-card w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold text-on-surface">Adicionar membros</h2>
                <p className="text-[12px] text-on-surface-variant/60 truncate">Grupo «{ativa && ativa.titulo ? ativa.titulo : "Grupo"}»</p>
              </div>
              <button onClick={function () { setMembrosAberto(false); }} className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant">
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
              ) : candidatosGrupo.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <span className="material-symbols-outlined text-[32px] text-on-surface-variant/20 block mb-2">person_search</span>
                  <p className="text-[12px] text-on-surface-variant/60">
                    {utilizadores.length === 0
                      ? "Sem colaboradores activos"
                      : (filtroUtilizador ? "Sem resultados para a procura" : "Todas as pessoas já estão no grupo")}
                  </p>
                </div>
              ) : (
                candidatosGrupo.map(function (u) {
                  var marcado = membrosSel.indexOf(u.id) !== -1;
                  return (
                    <button
                      key={u.colaborador_id || u.id}
                      onClick={function () { alternarMembro(u); }}
                      disabled={!u.tem_acesso || aAdicionarMembros}
                      className={"w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed " + (marcado ? "bg-primary/10" : "hover:bg-primary/5")}
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
                      <span className={"material-symbols-outlined text-[20px] ml-auto " + (marcado ? "text-primary" : "text-on-surface-variant/40")}>
                        {!u.tem_acesso ? "block" : (marcado ? "check_circle" : "radio_button_unchecked")}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-5 py-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={adicionarMembros}
                disabled={aAdicionarMembros || membrosSel.length === 0}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {aAdicionarMembros ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">group_add</span>
                )}
                {aAdicionarMembros
                  ? "A adicionar..."
                  : "Adicionar" + (membrosSel.length > 0 ? " · " + membrosSel.length + (membrosSel.length === 1 ? " pessoa" : " pessoas") : "")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL DE CONFIRMAÇÃO ============ */}
      {confirmacao && (
        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface-card w-full max-w-sm rounded-2xl shadow-2xl border border-outline-variant/30 p-5">
            <div className="flex items-start gap-3">
              <div className={"h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 " + (confirmacao.perigoso ? "bg-error/10" : "bg-primary/10")}>
                <span className={"material-symbols-outlined text-[20px] " + (confirmacao.perigoso ? "text-error" : "text-primary")}>
                  {confirmacao.perigoso ? "warning" : "help"}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-[14px] font-bold text-on-surface">{confirmacao.titulo}</h2>
                <p className="text-[12px] text-on-surface-variant/70 mt-1">{confirmacao.texto}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={function () { setConfirmacao(null); }}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={function () {
                  var ac = confirmacao.acao;
                  setConfirmacao(null);
                  if (ac) ac();
                }}
                className={"px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors " + (confirmacao.perigoso ? "bg-error hover:bg-error/90" : "bg-primary hover:bg-primary/90")}
              >
                {confirmacao.botao}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
