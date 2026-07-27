"use client";

export default function StatCard({ titulo, valor, icon, className = "" }) {
  return (
    <div className={"card p-5 " + className}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-bold text-outline uppercase tracking-wider">{titulo}</p>
          <p className="mt-1.5 text-2xl font-bold text-on-surface tracking-tight">{valor}</p>
        </div>
        {icon && (
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px] text-primary">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
