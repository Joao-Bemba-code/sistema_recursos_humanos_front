var API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

var api = {
  baseURL: API_BASE,

  getHeaders: function () {
    if (typeof window !== "undefined") {
      var token = localStorage.getItem("token");
      var headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = "Bearer " + token;
      }
      return headers;
    }
    return { "Content-Type": "application/json" };
  },

  request: async function (method, endpoint, data) {
    var url = this.baseURL + endpoint;
    var options = {
      method: method,
      headers: this.getHeaders(),
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options.body = JSON.stringify(data);
    }

    try {
      var response = await fetch(url, options);
      var json = await response.json();

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("utilizador");
          window.location.href = "/login";
        }
        throw new Error(json.error || "Sessão expirada");
      }

      if (!response.ok) {
        throw new Error(json.error || (json.detalhes ? json.detalhes.join(", ") : "Erro na requisição"));
      }

      return json;
    } catch (e) {
      if (e.message === "Failed to fetch") {
        throw new Error("Erro de conexão com o servidor");
      }
      throw e;
    }
  },

  get: function (endpoint) {
    return this.request("GET", endpoint);
  },

  post: function (endpoint, data) {
    return this.request("POST", endpoint, data);
  },

  put: function (endpoint, data) {
    return this.request("PUT", endpoint, data);
  },

  patch: function (endpoint, data) {
    return this.request("PATCH", endpoint, data);
  },

  delete: function (endpoint) {
    return this.request("DELETE", endpoint);
  },

  upload: async function (endpoint, formData) {
    var url = this.baseURL + endpoint;
    var token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    var headers = {};
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }

    try {
      var response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: formData,
      });
      var json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Erro no upload");
      }

      return json;
    } catch (e) {
      if (e.message === "Failed to fetch") {
        throw new Error("Erro de conexão com o servidor");
      }
      throw e;
    }
  },

  downloadPdf: async function (endpoint, filename) {
    var url = this.baseURL + endpoint;
    var token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    var headers = {};
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }

    var response = await fetch(url, { headers: headers });
    if (!response.ok) throw new Error("Erro ao gerar PDF");

    var blob = await response.blob();
    var blobUrl = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "documento.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },
};

module.exports = api;
