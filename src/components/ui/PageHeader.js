"use client";

import Link from "next/link";

// Cabeçalho de página padronizado (nível SaaS):
// breadcrumb opcional, título + subtítulo à esquerda, acções à direita.
// Responsivo: no telemóvel as acções caem para baixo do título.
export default function PageHeader({ titulo, subtitulo, breadcrumb = [], acoes }) {
  return (
    <div className="mb-5 sm:mb-7">
      {breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-[12px] text-outline mb-2 flex-wrap">
          {breadcrumb.map(function (item, idx) {
            var ultimo = idx === breadcrumb.length - 1;
            return (
              <span key={idx} className="flex items-center gap-1 min-w-0">
                {idx > 0 && (
                  <span className="material-symbols-outlined text-[14px] text-outline/60">chevron_right</span>
                )}
                {item.href && !ultimo ? (
                  <Link href={item.href} className="hover:text-primary transition-colors truncate">
                    {item.label}
                  </Link>
                ) : (
                  <span className={(ultimo ? "text-primary/80 font-medium" : "text-outline") + " truncate"}>
                    {item.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">{titulo}</h1>
          {subtitulo && <p className="text-[13px] text-on-surface-variant/70 mt-1">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex items-center gap-2 flex-wrap shrink-0">{acoes}</div>}
      </div>
    </div>
  );
}
