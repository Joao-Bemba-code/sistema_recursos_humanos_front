// Service worker minimo: so permite instalar a app (Android/Windows).
// Nao guarda nada em cache de proposito - o conteudo e sempre o mais
// recente do servidor (a app trabalha com dados actuais do RH).
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function () {
  // Sem interceptacao: o pedido segue normalmente para a rede.
});
