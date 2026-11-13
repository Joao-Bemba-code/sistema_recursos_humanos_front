"use client";

import { useRef, useState } from "react";
import api from "@/lib/api";

var resolverUrl = function (path) {
  if (!path) return "";
  var decoded = path.replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
  if (decoded.startsWith("http")) return decoded;
  return api.baseURL + decoded;
};

export default function FileUpload({ label, value, onChange, pasta, accept, icone, preview, nomeFicheiro, hideLabel, permitirRemover }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("ficheiro", file);
      formData.append("pasta", pasta || "geral");

      const result = await api.upload("/api/upload", formData);
      const dados = result.dados || {};
      const novoMeta = {
        id: dados.id,
        nome_original: dados.nome_original || file.name,
        tipo: dados.tipo || file.type,
        tamanho: dados.tamanho || file.size,
      };
      setMeta(novoMeta);
      if (onChange) onChange(dados.url, novoMeta);
    } catch (err) {
      setError(err.message || "Erro ao carregar ficheiro");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleClear = () => {
    setMeta(null);
    if (onChange) onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const nomeMostrar = (meta && meta.nome_original) || nomeFicheiro || (value ? value.split("/").pop() : "");
  const src = preview && value ? resolverUrl(value) : "";

  return (
    <div className="space-y-2">
      {!hideLabel && label && (
        <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block">{label}</label>
      )}

      {preview && value && (
        <div className="flex items-center gap-3">
          <div className="w-20 h-24 rounded-lg overflow-hidden border border-outline-variant/30 bg-primary/10 flex items-center justify-center shrink-0">
            <img src={src} alt="Pré-visualização" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-on-surface truncate">{nomeMostrar || "Fotografia"}</p>
            <p className="text-[11px] text-on-surface-variant/60 mt-0.5">Pré-visualização</p>
            <button
              type="button"
              onClick={() => !uploading && inputRef.current.click()}
              className="text-[12px] font-semibold text-primary hover:underline mt-1"
            >
              Substituir fotografia
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div
          onClick={() => !uploading && inputRef.current.click()}
          className={`flex-1 flex items-center gap-2 px-3 py-2.5 bg-background border border-dashed border-outline-variant/60 rounded-lg text-[13px] transition-all ${
            uploading ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px] text-outline">{icone || "upload_file"}</span>
          {uploading ? (
            <span className="text-on-surface-variant/60">A carregar...</span>
          ) : nomeMostrar ? (
            <span className="text-on-surface truncate">{preview ? "Substituir: " : ""}{nomeMostrar}</span>
          ) : (
            <span className="text-on-surface-variant/60">Clique para carregar</span>
          )}
        </div>
        {nomeMostrar && !preview && permitirRemover !== false && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors"
            title="Remover ficheiro"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {error && (
        <p className="text-[11px] text-error font-medium px-1">{error}</p>
      )}
    </div>
  );
}
