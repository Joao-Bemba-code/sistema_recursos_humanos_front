var LS_KEY = "cenffor_config";

function getConfig() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch (e) { return {}; }
}

var DATE_FORMAT_MAP = {
  "DD/MM/AAAA": { day: "2-digit", month: "2-digit", year: "numeric" },
  "MM/DD/AAAA": { day: "2-digit", month: "2-digit", year: "numeric" },
  "AAAA-MM-DD": { year: "numeric", month: "2-digit", day: "2-digit" },
};

var LOCALE_MAP = {
  "Portugues": "pt-AO",
  "English": "en-US",
};

var CURRENCY_MAP = {
  "Kwanza (AOA)": "AOA",
  "Euro (EUR)": "EUR",
  "Dolar (USD)": "USD",
};

var formatCurrency = function (value, moeda) {
  if (value === null || value === undefined) return "—";
  var cfg = getConfig();
  if (!moeda && cfg.sistema && cfg.sistema.moeda) {
    moeda = CURRENCY_MAP[cfg.sistema.moeda] || "AOA";
  } else {
    moeda = moeda || "AOA";
  }
  var locale = "pt-AO";
  if (cfg.sistema && cfg.sistema.idioma) {
    locale = LOCALE_MAP[cfg.sistema.idioma] || "pt-AO";
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: moeda,
      minimumFractionDigits: 0,
    }).format(value);
  } catch (e) {
    return value + " " + moeda;
  }
};

var formatDate = function (date) {
  if (!date) return "—";
  var cfg = getConfig();
  var locale = "pt-AO";
  var formatKey = "DD/MM/AAAA";
  if (cfg.sistema) {
    if (cfg.sistema.idioma) locale = LOCALE_MAP[cfg.sistema.idioma] || "pt-AO";
    if (cfg.sistema.formatoData) formatKey = cfg.sistema.formatoData;
  }
  var opts = DATE_FORMAT_MAP[formatKey] || { day: "2-digit", month: "2-digit", year: "numeric" };
  try {
    return new Date(date).toLocaleDateString(locale, opts);
  } catch (e) {
    return date;
  }
};

var formatDateTime = function (date) {
  if (!date) return "—";
  var cfg = getConfig();
  var locale = "pt-AO";
  var formatKey = "DD/MM/AAAA";
  if (cfg.sistema) {
    if (cfg.sistema.idioma) locale = LOCALE_MAP[cfg.sistema.idioma] || "pt-AO";
    if (cfg.sistema.formatoData) formatKey = cfg.sistema.formatoData;
  }
  var opts = DATE_FORMAT_MAP[formatKey] || { day: "2-digit", month: "2-digit", year: "numeric" };
  opts.hour = "2-digit";
  opts.minute = "2-digit";
  try {
    return new Date(date).toLocaleDateString(locale, opts);
  } catch (e) {
    return date;
  }
};

var formatPhone = function (phone) {
  if (!phone) return "—";
  return phone;
};

var getInitials = function (name) {
  if (!name) return "??";
  var parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

var getEstadoBadgeClass = function (estado) {
  var classes = {
    "Activo": "badge-success",
    "Ativo": "badge-success",
    "Activa": "badge-success",
    "Ativa": "badge-success",
    "Aprovado": "badge-success",
    "Aprovada": "badge-success",
    "Pago": "badge-success",
    "Concluido": "badge-success",
    "Concluído": "badge-success",
    "Concluida": "badge-success",
    "Concluída": "badge-success",
    "Em_curso": "badge-info",
    "Em curso": "badge-info",
    "Pendente": "badge-warning",
    "Inactivo": "badge-danger",
    "Inativo": "badge-danger",
    "Inactiva": "badge-danger",
    "Inativa": "badge-danger",
    "Suspenso": "badge-warning",
    "Rescindido": "badge-danger",
    "Cancelado": "badge-danger",
    "Cancelada": "badge-danger",
    "Rejeitado": "badge-danger",
    "Rejeitada": "badge-danger",
    "Desligado": "badge-danger",
    "Aposentado": "badge-info",
    "Rascunho": "badge-secondary",
    "Registada": "badge-info",
    "Arquivada": "badge-secondary",
    "Planeado": "badge-info",
  };
  return classes[estado] || "badge-secondary";
};

var truncate = function (str, len) {
  if (!str) return "";
  len = len || 50;
  if (str.length <= len) return str;
  return str.substring(0, len) + "...";
};

var debounce = function (fn, delay) {
  var timer;
  return function () {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(ctx, args);
    }, delay);
  };
};

export {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  getInitials,
  getEstadoBadgeClass,
  truncate,
  debounce,
};

var helpers = {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  getInitials,
  getEstadoBadgeClass,
  truncate,
  debounce,
};

export default helpers;
