"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

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

function iosSemAplicacaoInstalada() {
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var instalada = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  return ios && !instalada;
}

export default function PushNotificationManager({ utilizadorId }) {
  const [suportado, setSuportado] = useState(null);
  const [iosInstalar, setIosInstalar] = useState(false);
  const [permissao, setPermissao] = useState("default");
  const [disponivel, setDisponivel] = useState(false);
  const [chavePublica, setChavePublica] = useState("");
  const [temSubscricao, setTemSubscricao] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

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

      if (!suportaPush()) {
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
  }, [utilizadorId]);

  async function activar() {
    if (carregando || !disponivel) return;
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
      setTemSubscricao(false);
      setMensagem("Notificações desactivadas neste dispositivo.");
    } catch (e) {
      setErro(e.message || "Não foi possível desactivar as notificações.");
    } finally {
      setCarregando(false);
    }
  }

  async function testar() {
    if (carregando || !temSubscricao) return;
    setCarregando(true);
    setErro("");
    setMensagem("");
    try {
      await api.post("/api/notificacoes/push/test");
      setMensagem("Notificação de teste enviada. Verifique o telemóvel ou o computador.");
    } catch (e) {
      setErro(e.message || "Não foi possível enviar a notificação de teste.");
    } finally {
      setCarregando(false);
    }
  }

  if (!utilizadorId || suportado === null || verificando && !iosInstalar) return null;
  if (suportado === false) return null;

  if (iosInstalar) {
    return (
      <div className="px-4 py-3 border-b border-outline-variant/30 bg-primary/5">
        <p className="text-[12px] font-bold text-on-surface">Notificações no iPhone</p>
        <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
          Para receber avisos, toque em Partilhar e escolha “Adicionar ao ecrã principal”. Depois abra o SGHR pela aplicação instalada e active as notificações.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-outline-variant/30 bg-primary/5">
      <div className="flex items-start gap-2.5">
        <span className={"material-symbols-outlined text-[20px] flex-shrink-0 " + (temSubscricao ? "text-success" : "text-primary")}>
          {temSubscricao ? "notifications_active" : "notifications"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-on-surface">
            {temSubscricao ? "Notificações activas neste dispositivo" : "Receber notificações no telemóvel ou computador"}
          </p>
          <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
            {temSubscricao ? "Os avisos podem aparecer mesmo com o site fechado." : "O SGHR vai pedir permissão ao navegador."}
          </p>

          {!disponivel ? (
            <p className="text-[11px] text-error mt-2">{erro || "A verificar disponibilidade…"}</p>
          ) : permissao === "denied" && !temSubscricao ? (
            <p className="text-[11px] text-error mt-2">As notificações estão bloqueadas nas definições deste navegador.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {!temSubscricao && (
                <button
                  type="button"
                  onClick={activar}
                  disabled={carregando}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {carregando ? "A activar…" : "Activar notificações"}
                </button>
              )}
              {temSubscricao && (
                <>
                  <button
                    type="button"
                    onClick={testar}
                    disabled={carregando}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/15 disabled:opacity-50"
                  >
                    {carregando ? "A enviar…" : "Enviar teste"}
                  </button>
                  <button
                    type="button"
                    onClick={desactivar}
                    disabled={carregando}
                    className="px-3 py-1.5 rounded-lg text-on-surface-variant text-[11px] font-bold hover:bg-surface-container-high disabled:opacity-50"
                  >
                    Desactivar
                  </button>
                </>
              )}
            </div>
          )}

          {mensagem && <p className="text-[11px] text-success mt-2 leading-relaxed">{mensagem}</p>}
          {erro && disponivel && !(permissao === "denied" && !temSubscricao) && (
            <p className="text-[11px] text-error mt-2 leading-relaxed">{erro}</p>
          )}
        </div>
      </div>
    </div>
  );
}
