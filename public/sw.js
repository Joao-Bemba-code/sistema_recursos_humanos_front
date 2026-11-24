// Service worker do SGHR. Nao guarda conteudo em cache: os dados do RH devem
// vir sempre da rede. Aqui sao tratados apenas os avisos push do sistema.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function () {
  // Sem interceptacao: o pedido segue normalmente para a rede.
});

function linkInterno(valor) {
  var caminho = String(valor || "").trim();
  if (!caminho || caminho.charAt(0) !== "/" || caminho.charAt(1) === "/" || caminho.indexOf("\\") !== -1) {
    return "/dashboard";
  }
  try {
    var url = new URL(caminho, self.location.origin);
    if (url.origin !== self.location.origin) return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch (e) {
    return "/dashboard";
  }
}

self.addEventListener("push", function (event) {
  var dados = {};
  if (event.data) {
    try {
      dados = event.data.json();
    } catch (e) {
      try {
        dados = { titulo: "Nova notificacao", mensagem: event.data.text() };
      } catch (erroTexto) {
        dados = {};
      }
    }
  }

  var titulo = String(dados.titulo || "Nova notificacao").slice(0, 120);
  var mensagem = String(dados.mensagem || "").slice(0, 240);
  var detalhes = dados.dados && typeof dados.dados === "object" ? dados.dados : {};
  var tag = String(dados.tag || ("sghr-notificacao-" + Date.now())).slice(0, 160);

  event.waitUntil(self.registration.showNotification(titulo, {
    body: mensagem,
    icon: dados.icone || "/icon-192.png",
    badge: dados.insignia || "/icon-192.png",
    tag: tag,
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      notificacao_id: detalhes.notificacao_id || null,
      url: linkInterno(detalhes.url),
      tipo: detalhes.tipo || "info",
      modulo: detalhes.modulo || null,
    },
  }));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var destino = linkInterno(event.notification.data && event.notification.data.url);

  event.waitUntil((async function () {
    try {
      var janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (var i = 0; i < janelas.length; i += 1) {
        var janela = janelas[i];
        if (new URL(janela.url).origin !== self.location.origin) continue;
        try {
          if (typeof janela.navigate === "function") {
            await janela.navigate(destino);
          } else {
            janela.postMessage({ type: "SGHR_ABRIR_NOTIFICACAO", url: destino });
          }
          await janela.focus();
          return;
        } catch (e) {
          // Se esta janela nao puder ser usada, tenta abrir uma nova.
        }
      }
    } catch (e) {
      // Em alguns navegadores matchAll pode falhar; openWindow ainda funciona.
    }

    await self.clients.openWindow(destino);
  })());
});

// Se o navegador trocar a subscricao, avisa as janelas abertas para que a app
// volte a sincronizar o novo endpoint quando estiver visivel.
self.addEventListener("pushsubscriptionchange", function (event) {
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (janelas) {
    janelas.forEach(function (janela) {
      janela.postMessage({ type: "SGHR_REACTIVAR_PUSH" });
    });
  }).catch(function () {}));
});
