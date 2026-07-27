"use client";

import { useEffect } from "react";

export default function Modal({ isOpen, onClose, title, children, size = "md", footer }) {
  useEffect(function () {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return function () { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(function () {
    function handleEsc(e) { if (e.key === "Escape") onClose(); }
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return function () { document.removeEventListener("keydown", handleEsc); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  var sizeClasses = {
    sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl", full: "max-w-6xl",
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${sizeClasses[size] || "max-w-lg"}`}
        onClick={function (e) { e.stopPropagation(); }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/50">
          <h3 className="text-lg font-bold text-on-surface">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-outline-variant/50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
