"use client";

import { useRef, useState } from "react";
import api from "@/lib/api";

export default function FileUpload({ label, value, onChange, pasta, accept, icone }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState(value ? value.split("/").pop() : "");

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
      const url = result.dados.url;
      setFileName(file.name);
      if (onChange) onChange(url);
    } catch (err) {
      setError(err.message || "Erro ao carregar ficheiro");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFileName("");
    if (onChange) onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block">{label}</label>
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
          ) : fileName ? (
            <span className="text-on-surface truncate">{fileName}</span>
          ) : (
            <span className="text-on-surface-variant/60">Clique para carregar</span>
          )}
        </div>
        {fileName && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors"
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
