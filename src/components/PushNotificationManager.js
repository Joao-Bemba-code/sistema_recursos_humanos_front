"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

var CHAVE_LEMBRETE = "sghr-push-lembrete";
var DIAS_LEMBRETE = 7;

function base64urlParaUint8Array(valor) {
  var texto = String(valor || "").replace(/-/g, "+").replace(/_/g, "/");
  var padding = "=".repeat((4 - (texto.length % 4)) % 4);
  var bruto = window.atob(texto + padding);
  var bytes = new Uint8Array(bruto.length);
  for (var i = 0; i < bruto.length; i += 1) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

function serializarSubscricao(subscricao) {
  if (!subscricao || typeof subscricao !== "object") {
    throw new Error("A subscrição de notificações é inválida. Volte a activar.");
  }

  var dados = subscricao;
  if (typeof dados.toJSON === "function") {
    try {
      dados = dados.toJSON();
    } catch (e) {
      // Alguns navegadores expõem as chaves directamente na subscrição.
    }
  }

  var chaves = dados && dados.keys || subscricao.keys;
  var endpoint = String(dados && dados.endpoint || subscricao.endpoint || "").trim();
  var p256dh = chaves && typeof chaves.p256dh === "string" ? chaves.p256dh.trim() : "";
  var auth = chaves && typeof chaves.auth === "string" ? chaves.auth.trim() : "";

  if (!endpoint || !p256dh || !auth) {
    throw new Error("O navegador não forneceu as chaves desta subscrição. As notificações serão reactivadas.");
  }

  return {
    endpoint: endpoint,
    expirationTime: dados && dados.expirationTime,
    keys: { p256dh: p256dh, auth: auth },
  };
}

function subscricaoValida(subscricao) {
  try {
    serializarSubscricao(subscricao);
    return true;
  } catch (e) {
    return false;
  }
}

function suportaPush() {
  return window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
}

function instrucoesPermissao() {
  if (typeof navigator === "undefined") {
    return "Active as notificações para este site nas definições do navegador e clique em “Já activei, verificar”.";
  }
  var ua = navigator.userAgent || "";
  if (/Firefox\//.test(ua)) {
    return "Clique no ícone de cadeado/escudo na barra de endereço → “Permissões” → “Notificações” → “Permitir”. Depois clique em “Já activei, verificar”.";
  }
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
    return "Abra Safari → Definições → Web sites → Notificações, escolha “Permitir” para este site e clique em “Já activei, verificar”.";
  }
  if (/Edg\//.test(ua)) {
    return "Clique no cadeado à esquerda do endereço → “Notificações” → “Permitir” (ou Definições → Permissões de site → Notificações). Depois clique em “Já activei, verificar”.";
  }
  return "Clique no cadeado à esquerda do endereço → “Notificações” → “Permitir” (ou Definições → Privacidade → Definições do site → Notificações). Depois clique em “Já activei, verificar”.";
}

function iosSemAplicacaoInstalada() {
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var instalada = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  return ios && !instalada;
}

function lembreteDispensado() {
  if (typeof window === "undefined") return false;
  try {
    var valor = Number(localStorage.getItem(CHAVE_LEMBRETE) || 0);
    if (!valor) return false;
    return Date.now() - valor < DIAS_LEMBRETE * 24 * 60 * 60 * 1000;
  } catch (e) {
    return false;
  }
}

export default function PushNotificationManager({ utilizadorId, modo = "prompt" }) {
  var painel = modo === "painel";
  const [suportado, setSuportado] = useState(null);
  const [iosInstalar, setIosInstalar] = useState(false);
  const [permissao, setPermissao] = useState("default");
  const [disponivel, setDisponivel] = useState(false);
  const [chavePublica, setChavePublica] = useState("");
  const [temSubscricao, setTemSubscricao] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [dispensado, setDispensado] = useState(function () { return lembreteDispensado(); });
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let activo = true;

    async function verificar() {
      if (!utilizadorId) return;
      setMensagem("");
      setErro("");
      setTemSubscricao(false);
      setChavePublica("");
      setDisponivel(false);

      if (iosSemAplicacaoInstalada()) {
        setSuportado(true);
        setIosInstalar(true);
        setVerificando(false);
        return;
      }

      if (!suportaPush() || !("Notification" in window)) {
        setSuportado(false);
        setIosInstalar(false);
        setVerificando(false);
        return;
      }

      setSuportado(true);
      setVerificando(true);
      setIosInstalar(false);
      setPermissao(Notification.permission);

      try {
        var config = await api.get("/api/notificacoes/push/config");
        if (!activo) return;
        if (!config || !config.ativo || !config.chave_publica) {
          setErro("O servidor ainda não disponibiliza notificações push.");
          setVerificando(false);
          return;
        }
        setChavePublica(config.chave_publica);
        setDisponivel(true);

        var registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        var subscricao = await registration.pushManager.getSubscription();
        var chaveAnterior = localStorage.getItem("sghr-push-vapid");
        var precisaRecriar = !!subscricao && (
          !chaveAnterior ||
          chaveAnterior !== config.chave_publica ||
          !subscricaoValida(subscricao)
        );

        if (precisaRecriar) {
          try { await subscricao.unsubscribe(); } catch (e) {}
          subscricao = null;
          localStorage.removeItem("sghr-push-vapid");
        }

        // Se a permissão já foi concedida, recupera automaticamente uma
        // subscrição antiga, inválida ou criada com outra chave VAPID.
        if (!subscricao && Notification.permission === "granted") {
          subscricao = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64urlParaUint8Array(config.chave_publica),
          });
          if (!subscricaoValida(subscricao)) {
            try { await subscricao.unsubscribe(); } catch (e) {}
            throw new Error("O navegador criou uma subscrição sem chaves. Feche e volte a abrir o SGHR e tente novamente.");
          }
        }

        if (!activo) return;
        setTemSubscricao(false);

        // Sincroniza sempre que o utilizador entra. Isto tambem transfere a
        // subscricao deste navegador para a conta que acabou de iniciar sessao.
        if (subscricao && Notification.permission === "granted") {
          await api.post("/api/notificacoes/push/subscribe", {
            subscricao: serializarSubscricao(subscricao),
            user_agent: navigator.userAgent,
          });
          if (activo) {
            localStorage.setItem("sghr-push-vapid", config.chave_publica);
            setTemSubscricao(true);
            localStorage.removeItem(CHAVE_LEMBRETE);
          }
        }
      } catch (e) {
        if (activo) setErro(e.message || "Não foi possível verificar as notificações deste dispositivo.");
      } finally {
        if (activo) setVerificando(false);
      }
    }

    verificar();
    return function () { activo = false; };
  }, [utilizadorId, tentativa]);

  function dispensar() {
    try { localStorage.setItem(CHAVE_LEMBRETE, String(Date.now())); } catch (e) {}
    setDispensado(true);
  }

  // O navegador nao volta a pedir permissao depois de "Bloqueada". Esta acao
  // so verifica de novo o estado depois de o utilizador mudar nas definicoes.
  function reverificar() {
    setMensagem("");
    setErro("");
    if (typeof Notification !== "undefined") {
      setPermissao(Notification.permission);
    }
    setTentativa(function (valor) { return valor + 1; });
  }

  async function activar() {
    if (carregando || !disponivel || !suportaPush()) return;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setPermissao("denied");
      setErro("As notificações estão bloqueadas nas definições deste navegador.");
      return;
    }
    setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      var permissaoActual = await Notification.requestPermission();
      setPermissao(permissaoActual);
      if (permissaoActual !== "granted") {
        setErro(permissaoActual === "denied"
          ? "As notificações estão bloqueadas. Active-as nas definições do navegador."
          : "A permissão não foi concedida. Pode tentar novamente.");
        return;
      }

      var registration = await navigator.serviceWorker.ready;
      var subscricao = await registration.pushManager.getSubscription();
      var criada = false;

      if (subscricao && !subscricaoValida(subscricao)) {
        try { await subscricao.unsubscribe(); } catch (e) {}
        subscricao = null;
      }

      if (!subscricao) {
        subscricao = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64urlParaUint8Array(chavePublica),
        });
        criada = true;
      }

      var dadosSubscricao;
      try {
        dadosSubscricao = serializarSubscricao(subscricao);
      } catch (e) {
        try { if (subscricao) await subscricao.unsubscribe(); } catch (erro) {}
        setTemSubscricao(false);
        throw new Error("O navegador não forneceu as chaves de notificação. Feche e volte a abrir o SGHR e tente novamente.");
      }

      try {
        await api.post("/api/notificacoes/push/subscribe", {
          subscricao: dadosSubscricao,
          user_agent: navigator.userAgent,
        });
      } catch (e) {
        if (criada && subscricao) await subscricao.unsubscribe();
        throw e;
      }

      localStorage.setItem("sghr-push-vapid", chavePublica);
      localStorage.removeItem(CHAVE_LEMBRETE);
      setDispensado(false);
      setTemSubscricao(true);
      setMensagem("Notificações activadas. Já pode receber avisos com o site fechado.");
    } catch (e) {
      setErro(e.message || "Não foi possível activar as notificações.");
    } finally {
      setCarregando(false);
    }
  }

  async function desactivar() {
    if (carregando) return;
    setCarregando(true);
    setErro("");
    setMensagem("");
    try {
      var registration = await navigator.serviceWorker.ready;
      var subscricao = await registration.pushManager.getSubscription();
      if (!subscricao) {
        setTemSubscricao(false);
        setMensagem("As notificações já estavam desactivadas neste dispositivo.");
        return;
      }

      await api.delete("/api/notificacoes/push/subscribe", { endpoint: subscricao.endpoint });
      await subscricao.unsubscribe();
      localStorage.removeItem("sghr-push-vapid");
      localStorage.setItem(CHAVE_LEMBRETE, String(Date.now()));
      setDispensado(true);
      setTemSubscricao(false);
      setMensagem("Notificações desactivadas neste dispositivo.");
    } catch (e) {
      setErro(e.message || "Não foi possível desactivar as notificações.");
    } finally {
      setCarregando(false);
    }
  }

  if (!utilizadorId || suportado === null || suportado === false) return null;

  // No menu da conta: apenas estado e acoes, sem pedido automatico de permissão.
  if (painel) {
    return (
      <div className="px-4 py-2 border-t border-outline-variant/20 mt-1">
        <p className="text-[11px] font-bold text-on-surface-variant/70 mb-1.5">
          Notificações neste dispositivo
        </p>
        {verificando ? (
          <p className="text-[11px] text-on-surface-variant/60">A verificar…</p>
        ) : temSubscricao ? (
          <div>
            <p className="text-[11px] text-success">Activadas neste dispositivo.</p>
            <button type="button" onClick={desactivar} disabled={carregando} className="text-[11px] font-bold text-on-surface-variant hover:underline disabled:opacity-50 mt-1.5">
              Desactivar neste dispositivo
            </button>
          </div>
        ) : permissao === "denied" ? (
          <div>
            <p className="text-[11px] text-error">Bloqueadas nas definições do navegador.</p>
            <p className="text-[10px] text-on-surface-variant/80 mt-1 leading-relaxed">{instrucoesPermissao()}</p>
            <button type="button" onClick={reverificar} className="text-[11px] font-bold text-primary hover:underline mt-1.5">
              Já activei, verificar
            </button>
          </div>
        ) : (
          <button type="button" onClick={activar} disabled={carregando || !disponivel || iosInstalar} className="text-[11px] font-bold text-primary hover:underline disabled:opacity-50">
            {carregando ? "A activar…" : "Activar notificações"}
          </button>
        )}
        {mensagem && <p className="text-[11px] text-success mt-1">{mensagem}</p>}
        {erro && <p className="text-[11px] text-error mt-1">{erro}</p>}
      </div>
    );
  }

  // Convite global: aparece ao carregar a pagina, nunca a partir do sino.
  if (verificando || temSubscricao || dispensado) return null;

  if (iosInstalar) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-[60] rounded-xl bg-surface-card shadow-2xl border border-outline-variant/40 p-4" role="dialog" aria-label="Notificações no iPhone">
        <p className="text-[13px] font-bold text-on-surface">Notificações no iPhone</p>
        <p className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
          Para receber avisos, toque em Partilhar e escolha “Adicionar ao ecrã principal”. Depois abra o SGHR pela aplicação instalada e active as notificações.
        </p>
        <button type="button" onClick={dispensar} className="mt-3 text-[12px] font-bold text-primary hover:underline">
          Entendi
        </button>
      </div>
    );
  }

  if (!disponivel) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-[60] rounded-xl bg-surface-card shadow-2xl border border-outline-variant/40 p-4" role="dialog" aria-label="Activar notificações">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-[22px] text-primary flex-shrink-0" aria-hidden="true">notifications</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-on-surface">Receber notificações neste dispositivo?</p>
          <p className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
            Active os avisos para receber pedidos, faltas e comunicações mesmo com o site fechado.
          </p>
          {permissao === "denied" ? (
            <div className="mt-2">
              <p className="text-[11px] font-bold text-error">As notificações estão bloqueadas nas definições deste navegador.</p>
              <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">{instrucoesPermissao()}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button type="button" onClick={reverificar} disabled={carregando} className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  Já activei, verificar
                </button>
                <button type="button" onClick={dispensar} className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  Agora não
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button type="button" onClick={activar} disabled={carregando} className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                {carregando ? "A activar…" : "Activar notificações"}
              </button>
              <button type="button" onClick={dispensar} className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                Agora não
              </button>
            </div>
          )}
          {erro && <p className="text-[11px] text-error mt-2">{erro}</p>}
          {mensagem && <p className="text-[11px] text-success mt-2">{mensagem}</p>}
        </div>
      </div>
    </div>
  );
}
