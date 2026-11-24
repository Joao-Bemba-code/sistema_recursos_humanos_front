"use client";

import { useEffect } from "react";

// Regista o service worker para permitir "Instalar app" no Chrome
// (Android/Windows). No iOS a instalacao e feita pelo Safari (Partilhar >
// Adicionar ao ecra principal) e nao precisa de service worker.
export default function PwaRegister() {
  useEffect(function () {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;
    var timer = setTimeout(function () {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).catch(function () {
        // Sem service worker a app continua a funcionar normalmente.
      });
    }, 2000);
    return function () { clearTimeout(timer); };
  }, []);

  return null;
}
