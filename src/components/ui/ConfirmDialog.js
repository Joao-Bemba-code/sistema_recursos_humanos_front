"use client";

export default function ConfirmDialog({ open, titulo, mensagem, textoConfirmar, textoCancelar, onConfirm, onCancel, variante }) {
  if (!open) return null;

  var isDanger = variante === "perigo";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-scrim/50" onClick={onCancel} />
      <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-[400px] border border-outline-variant/30 overflow-hidden">
        <div className="p-6 text-center">
          <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${isDanger ? "bg-error/10" : "bg-primary/10"}`}>
            <span className={`material-symbols-outlined text-[28px] ${isDanger ? "text-error" : "text-primary"}`}>
              {isDanger ? "warning" : "help"}
            </span>
          </div>
          <h3 className="text-lg font-bold text-on-surface tracking-tight mb-2">{titulo}</h3>
          <p className="text-[13px] text-on-surface-variant/70 max-w-sm mx-auto">{mensagem}</p>
        </div>
        <div className="flex border-t border-outline-variant/20">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors"
          >
            {textoCancelar || "Cancelar"}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-[13px] font-semibold transition-colors border-l border-outline-variant/20 ${
              isDanger ? "text-error hover:bg-error/5" : "text-primary hover:bg-primary/5"
            }`}
          >
            {textoConfirmar || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
