"use client";

// Barra de filtros padronizada: cartão com os controlos em linha
// (empilham no telemóvel) e contador de resultados por baixo.
export default function Toolbar({ children, resultados, resultadosLabel = "registos", className = "" }) {
  return (
    <div
      className={
        "bg-surface-card border border-outline-variant rounded-xl shadow-[var(--shadow-card)] px-4 py-3 mb-4 flex flex-col gap-3 " +
        className
      }
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">{children}</div>
      {resultados !== undefined && resultados !== null && (
        <div className="flex items-center gap-2 text-[12px] text-on-surface-variant/70">
          <span className="material-symbols-outlined text-[14px]">format_list_bulleted</span>
          <span>
            {resultados} {resultados === 1 ? resultadosLabel.replace(/s$/, "") : resultadosLabel}
          </span>
        </div>
      )}
    </div>
  );
}
