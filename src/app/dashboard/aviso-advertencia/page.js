"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { getT } from "@/lib/translations";

var API_BASE = api.baseURL;

export default function AvisoAdvertenciaPage() {
  var t = getT();
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const carregarColaboradores = async () => {
    try {
      const data = await api.get("/api/colaboradores?limit=200");
      setColaboradores(data.dados);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  useEffect(() => {
    carregarColaboradores();
  }, []);

  const gerarPdf = async () => {
    if (!colaboradorSelecionado) {
      setMsg({ tipo: "erro", texto: "Selecione um colaborador" });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      var url = API_BASE + `/api/pdf/aviso-advertencia/${colaboradorSelecionado.id}?descricao=${encodeURIComponent(descricao)}`;
      var token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      var headers = {};
      if (token) {
        headers["Authorization"] = "Bearer " + token;
      }
      var response = await fetch(url, { headers: headers });
      if (!response.ok) {
        var errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar PDF");
      }
      var blob = await response.blob();
      var blobUrl = window.URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = blobUrl;
      a.download = `aviso_advertencia_${colaboradorSelecionado.numero_colaborador}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      setMsg({ tipo: "sucesso", texto: "PDF gerado com sucesso" });
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      setMsg({ tipo: "erro", texto: e.message || "Erro ao gerar PDF" });
    } finally {
      setLoading(false);
    }
  };

  const handleDescricaoChange = (e) => {
    setDescricao(e.target.value);
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 ${msg.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10"}`}>
          <span className="material-symbols-outlined text-[18px]">{msg.tipo === "sucesso" ? "check_circle" : "error"}</span>
          {msg.texto}
          <button onClick={() => setMsg(null)} className="ml-auto hover:opacity-60">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <section className="glass-panel p-5 rounded-xl border border-outline-variant/30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
              <span>{t.recursos_humanos || "Recursos Humanos"}</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary/70">{t.aviso_advertencia || "Aviso/Advertência"}</span>
            </nav>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">{t.gestaoColaboradores || "Gestão de Colaboradores"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setColaboradorSelecionado(null)} className="hidden sm:block px-4 py-2 rounded-lg border border-outline-variant/30 text-[13px] hover:bg-primary/5 transition-all">
              <span className="material-symbols-outlined text-[16px]">close</span>
              Cancelar
            </button>
          </div>
        </div>

        <section className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador *</label>
              <select 
                value={colaboradorSelecionado ? colaboradorSelecionado.id : ""} 
                onChange={(e) => setColaboradorSelecionado(colaboradores.find(c => String(c.id) === String(e.target.value)) || null)}
                className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                disabled={loading}
              >
                <option value="">Selecionar colaborador</option>
                {colaboradores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Descrição da Advertência</label>
              <textarea 
                value={descricao} 
                onChange={handleDescricaoChange} 
                rows={3} 
                placeholder="Descreva a falta ou indisciplina (ex: Abandono do posto de trabalho, Insubordinação, etc.)"
                className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                disabled={loading}
              ></textarea>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-outline-variant/20">
            <button 
              onClick={gerarPdf} 
              disabled={!colaboradorSelecionado || loading}
              className="w-full px-6 py-3 bg-primary text-white text-[14px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              {loading ? "A gerar..." : "Gerar PDF da Carta de Advertência"}
            </button>
          </div>
        </section>
      </section>

      {msg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setMsg(null)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-md mx-8 max-h-[80vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{msg.tipo === "sucesso" ? "Sucesso" : "Erro"}</h3>
              <button onClick={() => setMsg(null)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6">
              <p className={msg.tipo === "sucesso" ? "text-[14px] text-[16px] font-medium text-success" : "text-[14px] text-[16px] font-medium text-error"}>
                {msg.texto}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}