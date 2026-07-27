"use client";

export default function Card({ children, title, subtitle, className = "", headerRight, noPadding = false, hover = false }) {
  return (
    <div className={`card ${hover ? "cursor-pointer" : ""} ${className}`}>
      {(title || headerRight) && (
        <div className="card-header flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-base font-bold text-on-surface">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[13px] text-on-surface-variant/70">{subtitle}</p>}
          </div>
          {headerRight || null}
        </div>
      )}
      <div className={noPadding ? "" : "card-body"}>{children}</div>
    </div>
  );
}
