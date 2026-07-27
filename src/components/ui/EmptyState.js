"use client";

export default function EmptyState({ icon = "inbox", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[32px] text-outline">{icon}</span>
      </div>
      <h3 className="text-base font-bold text-on-surface mb-1">{title || "Nenhum registo encontrado"}</h3>
      {description && <p className="text-[13px] text-on-surface-variant/70 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
