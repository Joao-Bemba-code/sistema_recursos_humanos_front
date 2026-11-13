"use client";

import { useState } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import Badge from "@/components/ui/Badge";
import FileUpload from "@/components/ui/FileUpload";

var DOCUMENTOS_FIXOS = [
  { chave: "fotografia", nome: "Fotografia", icone: "photo_camera", accept: "image/*", pasta: "fotografias", preview: true },
  { chave: "curriculo", nome: "Currículo (CV)", icone: "description", accept: ".pdf,.doc,.docx", pasta: "curriculos" },
  { chave: "bi", nome: "Bilhete de Identidade ou equivalente", icone: "badge", accept: ".pdf,.jpg,.jpeg,.png", pasta: "documentos" },
  { chave: "certificado", nome: "Certificado de habilitações ou formação", icone: "workspace_premium", accept: ".pdf,.jpg,.jpeg,.png", pasta: "documentos" },
  { chave: "contrato", nome: "Contrato de trabalho assinado", icone: "history_edu", accept: ".pdf,.jpg,.jpeg,.png", pasta: "documentos" },
];

var VARIANTE_ESTADO = {
  "Validado": "success",
  "Por conferir": "warning",
  "A corrigir": "destructive",
  "Em falta": "secondary",
};

var ACAO_LABEL = {
  carregado: "Carregado",
  substituido: "Substituído",
  validado: "Validado",
  corrigir: "Marcado A corrigir",
  removido: "Removido",
  estado: "Estado alterado",
};

var resolverUrl = function (path) {
  if (!path) return "";
  var decoded = path.replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
  if (decoded.startsWith("http")) return decoded;
  return api.baseURL + decoded;
};

var listaSegura = function (lista) {
  return Array.isArray(lista) ? lista : [];
};

export default function DocumentosTab({ documentos, onChange, podeEditar, colaboradorId, onRemoverDoc, onErro }) {
  var docs = listaSegura(documentos);
  var [corrigir, setCorrigir] = useState(null);
  var [aAdicionarOutro, setAAdicionarOutro] = useState(false);
  var [novoTipo, setNovoTipo] = useState("");
  var [novaDescricao, setNovaDescricao] = useState("");
  var [novoFicheiro, setNovoFicheiro] = useState(null);
  var [erroOutro, setErroOutro] = useState("");

  var emitir = function (lista) {
    if (onChange) onChange(lista);
  };

  var encontrar = function (categoria) {
    for (var i = 0; i < docs.length; i++) {
      if (docs[i].categoria === categoria) return docs[i];
    }
    return null;
  };

  var indiceDe = function (doc) {
    for (var i = 0; i < docs.length; i++) {
      if (doc.id && docs[i].id === doc.id) return i;
      if (!doc.id && docs[i] === doc) return i;
    }
    return -1;
  };

  var actualizarFicheiro = function (categoria, url, meta) {
    if (!url) return;
    var lista = docs.slice();
    var idx = -1;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].categoria === categoria) { idx = i; break; }
    }
    var base = idx >= 0 ? Object.assign({}, lista[idx]) : { categoria: categoria };
    var novo = Object.assign(base, {
      categoria: categoria,
      ficheiro_url: url,
      ficheiro_nome: (meta && meta.nome_original) || url.split("/").pop(),
      ficheiro_tipo: (meta && meta.tipo) || base.ficheiro_tipo || null,
      ficheiro_tamanho: (meta && meta.tamanho) || base.ficheiro_tamanho || null,
      estado: "Por conferir",
      motivo_correcao: null,
      validado_por: null,
      validado_em: null,
      carregado_em: new Date().toISOString(),
      carregado_por_nome: base.carregado_por_nome || null,
    });
    if (idx >= 0) lista[idx] = novo;
    else lista.push(novo);
    emitir(lista);
  };

  var actualizarEstado = function (doc, estado, motivo) {
    var lista = docs.slice();
    var idx = indiceDe(doc);
    if (idx === -1) return;
    var novo = Object.assign({}, lista[idx], {
      estado: estado,
      motivo_correcao: estado === "A corrigir" ? (motivo || "") : null,
      validado_em: estado === "Validado" ? new Date().toISOString() : null,
      validado_por_nome: estado === "Validado" ? (lista[idx].validado_por_nome || null) : null,
    });
    lista[idx] = novo;
    emitir(lista);
  };

  var actualizarCampoOutro = function (doc, campo, valor) {
    var lista = docs.slice();
    var idx = indiceDe(doc);
    if (idx === -1) return;
    var novo = Object.assign({}, lista[idx]);
    novo[campo] = valor;
    lista[idx] = novo;
    emitir(lista);
  };

  var abrirFicheiro = async function (doc) {
    try {
      if (doc.id && colaboradorId) {
        var blob = await api.getBlob("/api/colaboradores/" + colaboradorId + "/documentos/" + doc.id + "/ficheiro", "Não foi possível abrir o documento");
        var url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(function () { window.URL.revokeObjectURL(url); }, 60000);
      } else if (doc.ficheiro_url) {
        window.open(resolverUrl(doc.ficheiro_url), "_blank");
      }
    } catch (e) {
      if (onErro) onErro(e.message || "Não foi possível abrir o documento");
    }
  };

  var removerOutro = async function (doc) {
    if (doc.id && onRemoverDoc) {
      var ok = await onRemoverDoc(doc);
      if (!ok) return;
    }
    var lista = docs.filter(function (d) {
      if (doc.id) return d.id !== doc.id;
      return d !== doc;
    });
    emitir(lista);
  };

  var adicionarOutro = function () {
    if (!novoFicheiro || !novoFicheiro.url) {
      setErroOutro("Carregue o ficheiro do documento");
      return;
    }
    if (!novoTipo.trim()) {
      setErroOutro("Indique o tipo de documento");
      return;
    }
    var lista = docs.slice();
    lista.push({
      categoria: "outro",
      tipo_documento: novoTipo.trim(),
      descricao: novaDescricao.trim() || null,
      ficheiro_url: novoFicheiro.url,
      ficheiro_nome: (novoFicheiro.meta && novoFicheiro.meta.nome_original) || novoFicheiro.url.split("/").pop(),
      ficheiro_tipo: (novoFicheiro.meta && novoFicheiro.meta.tipo) || null,
      ficheiro_tamanho: (novoFicheiro.meta && novoFicheiro.meta.tamanho) || null,
      estado: "Por conferir",
      carregado_em: new Date().toISOString(),
    });
    emitir(lista);
    setNovoTipo("");
    setNovaDescricao("");
    setNovoFicheiro(null);
    setErroOutro("");
    setAAdicionarOutro(false);
  };

  var renderEstado = function (doc) {
    var estado = (doc && doc.estado) || "Em falta";
    return <Badge variant={VARIANTE_ESTADO[estado] || "secondary"}>{estado}</Badge>;
  };

  var renderDatas = function (doc) {
    if (!doc || !doc.ficheiro_url) return null;
    return (
      <div className="space-y-0.5 text-[11px] text-on-surface-variant/70">
        {doc.carregado_em && (
          <p>Carregado em {helpers.formatDate(doc.carregado_em)}{doc.carregado_por_nome ? " por " + doc.carregado_por_nome : ""}</p>
        )}
        {doc.validado_em && (
          <p className="text-success">Validado em {helpers.formatDate(doc.validado_em)}{doc.validado_por_nome ? " por " + doc.validado_por_nome : ""}</p>
        )}
        {doc.estado === "A corrigir" && doc.motivo_correcao && (
          <p className="text-error font-medium">Motivo: {doc.motivo_correcao}</p>
        )}
      </div>
    );
  };

  var renderAcoes = function (doc) {
    if (!doc || !doc.ficheiro_url) return null;
    var botoes = [];
    if (podeEditar) {
      if (doc.estado !== "Validado") {
        botoes.push(
          <button key="validar" type="button" onClick={function () { actualizarEstado(doc, "Validado", null); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 text-success text-[11px] font-bold hover:bg-success/20 transition-colors">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Validar
          </button>
        );
      }
      if (doc.estado !== "A corrigir") {
        botoes.push(
          <button key="corrigir" type="button"
            onClick={function () { setCorrigir({ doc: doc, motivo: doc.motivo_correcao || "" }); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-error/10 text-error text-[11px] font-bold hover:bg-error/20 transition-colors">
            <span className="material-symbols-outlined text-[14px]">error</span>
            A corrigir
          </button>
        );
      }
    }
    botoes.push(
      <button key="ver" type="button" onClick={function () { abrirFicheiro(doc); }}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/5 text-primary text-[11px] font-bold hover:bg-primary/10 transition-colors">
        <span className="material-symbols-outlined text-[14px]">visibility</span>
        Ver
      </button>
    );
    return <div className="flex flex-wrap items-center gap-1.5">{botoes}</div>;
  };

  var renderCorrecao = function (doc) {
    if (!corrigir || corrigir.doc !== doc) return null;
    return (
      <div className="mt-2 p-2.5 rounded-lg bg-error/5 border border-error/20 space-y-2">
        <input
          type="text"
          value={corrigir.motivo}
          onChange={function (e) { setCorrigir(Object.assign({}, corrigir, { motivo: e.target.value })); }}
          placeholder="Motivo da correção (obrigatório)"
          className="w-full px-2.5 py-2 bg-surface border border-error/30 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-error/20"
        />
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={function () { setCorrigir(null); }} className="px-2 py-1 text-[11px] font-semibold text-on-surface-variant hover:underline">Cancelar</button>
          <button
            type="button"
            disabled={!corrigir.motivo.trim()}
            onClick={function () { actualizarEstado(doc, "A corrigir", corrigir.motivo.trim()); setCorrigir(null); }}
            className="px-2.5 py-1 rounded-lg bg-error text-white text-[11px] font-bold disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    );
  };

  var renderHistorico = function (doc) {
    if (!doc || !Array.isArray(doc.eventos) || doc.eventos.length === 0) return null;
    return (
      <details className="mt-2">
        <summary className="text-[11px] font-semibold text-on-surface-variant/70 cursor-pointer">Histórico</summary>
        <div className="mt-1.5 space-y-1">
          {doc.eventos.map(function (ev) {
            return (
              <p key={ev.id} className="text-[10px] text-on-surface-variant/60">
                {helpers.formatDate(ev.createdAt)} · {ACAO_LABEL[ev.acao] || ev.acao}
                {ev.utilizador_nome ? " por " + ev.utilizador_nome : ""}
                {ev.motivo ? " — " + ev.motivo : ""}
              </p>
            );
          })}
        </div>
      </details>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 text-[11px] text-on-surface-variant">
        Cada documento segue <strong>Em falta → Por conferir → Validado</strong>. Se estiver ilegível ou incorreto, marque <strong>A corrigir</strong> e indique o motivo.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DOCUMENTOS_FIXOS.map(function (def) {
          var doc = encontrar(def.chave);
          var temFicheiro = !!(doc && doc.ficheiro_url);
          return (
            <div key={def.chave} className="rounded-xl border border-outline-variant/30 bg-background/40 p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-primary">{def.icone}</span>
                  <p className="text-[12px] font-bold text-on-surface leading-tight">{def.nome}</p>
                </div>
                {renderEstado(doc)}
              </div>

              {temFicheiro && (
                <p className="text-[11px] text-on-surface-variant/80 truncate">{doc.ficheiro_nome || "Ficheiro carregado"}</p>
              )}

              {renderDatas(doc)}

              {podeEditar ? (
                <div className="space-y-2">
                  <FileUpload
                    hideLabel
                    permitirRemover={false}
                    preview={!!def.preview}
                    value={(doc && doc.ficheiro_url) || ""}
                    nomeFicheiro={doc && doc.ficheiro_nome}
                    onChange={function (url, meta) { actualizarFicheiro(def.chave, url, meta); }}
                    pasta={def.pasta}
                    accept={def.accept}
                    icone={def.icone}
                  />
                  {renderAcoes(doc)}
                  {renderCorrecao(doc)}
                </div>
              ) : (
                temFicheiro && renderAcoes(doc)
              )}

              {renderHistorico(doc)}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-outline-variant/30 bg-background/40 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">attach_file</span>
            <p className="text-[12px] font-bold text-on-surface">Outros documentos</p>
          </div>
          {podeEditar && !aAdicionarOutro && (
            <button type="button" onClick={function () { setAAdicionarOutro(true); setErroOutro(""); }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/5 text-primary text-[11px] font-bold hover:bg-primary/10">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Adicionar documento
            </button>
          )}
        </div>

        {docs.filter(function (d) { return d.categoria === "outro"; }).length === 0 && !aAdicionarOutro && (
          <p className="text-[11px] text-on-surface-variant/50">Nenhum documento adicional.</p>
        )}

        <div className="space-y-2">
          {docs.filter(function (d) { return d.categoria === "outro"; }).map(function (doc, idx) {
            var temFicheiro = !!doc.ficheiro_url;
            return (
              <div key={doc.id || "novo-" + idx} className="rounded-lg border border-outline-variant/25 bg-surface p-2.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {podeEditar ? (
                      <input
                        type="text"
                        value={doc.tipo_documento || ""}
                        onChange={function (e) { actualizarCampoOutro(doc, "tipo_documento", e.target.value); }}
                        placeholder="Tipo de documento"
                        className="w-full px-2.5 py-1.5 bg-background border border-outline-variant/40 rounded-lg text-[12px] font-semibold"
                      />
                    ) : (
                      <p className="text-[12px] font-bold text-on-surface">{doc.tipo_documento || "Outro documento"}</p>
                    )}
                    {podeEditar ? (
                      <input
                        type="text"
                        value={doc.descricao || ""}
                        onChange={function (e) { actualizarCampoOutro(doc, "descricao", e.target.value); }}
                        placeholder="Descrição (opcional)"
                        className="w-full px-2.5 py-1.5 bg-background border border-outline-variant/40 rounded-lg text-[11px]"
                      />
                    ) : (
                      doc.descricao && <p className="text-[11px] text-on-surface-variant/70">{doc.descricao}</p>
                    )}
                    {temFicheiro && <p className="text-[11px] text-on-surface-variant/70 truncate">{doc.ficheiro_nome}</p>}
                    {renderDatas(doc)}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {renderEstado(doc)}
                    {podeEditar && (
                      <button type="button" onClick={function () { removerOutro(doc); }} title="Remover"
                        className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error/5">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {podeEditar && (
                  <FileUpload
                    hideLabel
                    permitirRemover={false}
                    value={doc.ficheiro_url || ""}
                    nomeFicheiro={doc.ficheiro_nome}
                    onChange={function (url, meta) {
                      var lista = docs.slice();
                      var alvo = lista.indexOf(doc);
                      if (alvo === -1) return;
                      lista[alvo] = Object.assign({}, doc, {
                        ficheiro_url: url,
                        ficheiro_nome: (meta && meta.nome_original) || url.split("/").pop(),
                        ficheiro_tipo: (meta && meta.tipo) || doc.ficheiro_tipo || null,
                        ficheiro_tamanho: (meta && meta.tamanho) || doc.ficheiro_tamanho || null,
                        estado: "Por conferir",
                        motivo_correcao: null,
                        validado_por: null,
                        validado_em: null,
                        carregado_em: new Date().toISOString(),
                      });
                      emitir(lista);
                    }}
                    pasta="documentos"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    icone="attach_file"
                  />
                )}

                {renderAcoes(doc)}
                {renderCorrecao(doc)}
                {renderHistorico(doc)}
              </div>
            );
          })}
        </div>

        {podeEditar && aAdicionarOutro && (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-3 space-y-2.5">
            <input
              type="text"
              value={novoTipo}
              onChange={function (e) { setNovoTipo(e.target.value); }}
              placeholder="Tipo de documento * (ex.: Certificado médico)"
              className="w-full px-2.5 py-2 bg-surface border border-outline-variant/40 rounded-lg text-[12px]"
            />
            <input
              type="text"
              value={novaDescricao}
              onChange={function (e) { setNovaDescricao(e.target.value); }}
              placeholder="Descrição (opcional)"
              className="w-full px-2.5 py-2 bg-surface border border-outline-variant/40 rounded-lg text-[12px]"
            />
            <FileUpload
              hideLabel
              permitirRemover={false}
              value={(novoFicheiro && novoFicheiro.url) || ""}
              nomeFicheiro={novoFicheiro && novoFicheiro.meta && novoFicheiro.meta.nome_original}
              onChange={function (url, meta) { setNovoFicheiro({ url: url, meta: meta }); }}
              pasta="documentos"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              icone="attach_file"
            />
            {erroOutro && <p className="text-[11px] text-error font-medium">{erroOutro}</p>}
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={function () { setAAdicionarOutro(false); setErroOutro(""); setNovoFicheiro(null); }}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-on-surface-variant hover:underline">Cancelar</button>
              <button type="button" onClick={adicionarOutro}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold">Adicionar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
