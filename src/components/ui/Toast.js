"use client";

import { createContext, useContext, useState, useCallback } from "react";

var ToastContext = createContext();

var icons = {
  success: "check_circle",
  error: "error",
  info: "info",
};

export function ToastProvider({ children }) {
  var [toasts, setToasts] = useState([]);

  var addToast = useCallback(function (type, message, duration) {
    var id = Date.now() + Math.random();
    setToasts(function (prev) { return [...prev, { id, type, message }]; });
    setTimeout(function () {
      setToasts(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
    }, duration || 4000);
  }, []);

  var removeToast = useCallback(function (id) {
    setToasts(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(function (t) {
          return (
            <div key={t.id} className={"toast toast-" + t.type} onClick={function () { removeToast(t.id); }}>
              <span className="material-symbols-outlined text-[18px]">{icons[t.type]}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export var useToast = function () {
  return useContext(ToastContext);
};
