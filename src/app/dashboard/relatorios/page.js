"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { getT } from "@/lib/translations";
import { TIPOS_COLABORADOR, TIPOS_CONTRATO } from "@/lib/constants";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

var TIPOS_DEPT = [
  { value: "Direccao", label: "Direccao" },
  { value: "Departamento", label: "Departamento" },
  { value: "Sector", label: "Sector" },
  { value: "Seccao", label: "Secção" },
  { value: "Gabinete", label: "Gabinete" },
];

var CACHE_BUST = Date.now();

var imageUrl = function (path) {
  if (!path) return "";
  var decoded = path.replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
  if (decoded.indexOf("/logos/") !== -1 && decoded.indexOf("?v=") === -1) decoded += "?v=" + CACHE_BUST;
  if (decoded.startsWith("http")) return decoded;
  return api.baseURL + decoded;
};

function carregarLogoDataUrl(url) {
  return fetch(url)
    .then(function (r) { if (!r.ok) throw new Error("falha"); return r.blob(); })
    .then(function (blob) {
      return new Promise(function (resolve, reject) {
        var urlObj = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
          var canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext("2d").drawImage(img, 0, 0);
          URL.revokeObjectURL(urlObj);
          resolve({ dataUrl: canvas.toDataURL("image/png"), width: img.width, height: img.height });
        };
        img.onerror = function () { URL.revokeObjectURL(urlObj); reject(new Error("img")); };
        img.src = urlObj;
      });
    })
    .catch(function () { return null; });
}

async function buildPdfHeader(title, org) {
  var doc = new jsPDF();
  var pw = doc.internal.pageSize.getWidth();
  var logoImg = null;

  if (org && org.logo_url) {
    logoImg = await carregarLogoDataUrl(imageUrl(org.logo_url));
  }

  var xText = 15;
  var y = 18;

  if (logoImg) {
    var lw = 24;
    var lh = (logoImg.height / logoImg.width) * lw;
    try { doc.addImage(logoImg.dataUrl, "PNG", 15, y - 6, lw, lh); } catch (e) {}
    xText = 45;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  var nome = (org && org.nome) ? org.nome : "CENFFOR";
  var nomeLinhas = doc.splitTextToSize(nome, pw - xText - 15);
  doc.text(nomeLinhas, xText, y);
  y += nomeLinhas.length * 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  var subParts = [];
  if (org && org.nif) subParts.push("NIF: " + org.nif);
  if (org && org.cidade) subParts.push(org.cidade);
  var sub = subParts.length ? subParts.join("  |  ") : "Sistema de Gestao de Recursos Humanos";
  var subLinhas = doc.splitTextToSize(sub, pw - xText - 15);
  doc.text(subLinhas, xText, y);
  y += subLinhas.length * 10.5 + 5;

  if (y < 34) y = 34;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 15, y + 1);
  y += 4;

  return { doc: doc, pw: pw, headerY: y };
}

function addPdfFooter(doc, org) {
  var pw = doc.internal.pageSize.getWidth();
  var fY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  var nome = (org && org.nome) ? org.nome : "CENFFOR";
  doc.text(nome + " - SGHR | Gerado em: " + new Date().toLocaleDateString("pt-AO"), pw / 2, fY, { align: "center" });
}

export default function RelatoriosPage() {
  var t = getT();
  var [stats, setStats] = useState({ colaboradores: 0, contratos: 0, departamentos: 0, ferias: 0 });
  var [statsLoading, setStatsLoading] = useState(true);
  var [loadingReport, setLoadingReport] = useState(null);
  var [msg, setMsg] = useState(null);
  var [org, setOrg] = useState(null);

  var carregarStats = async function () {
    setStatsLoading(true);
    try {
      var resCol = await api.get("/api/colaboradores?limit=1");
      var resCon = await api.get("/api/contratos?limit=1");
      var resDep = await api.get("/api/departamentos?limit=1");
      var resFer = await api.get("/api/ferias?limit=1");
      setStats({
        colaboradores: resCol.paginacao ? resCol.paginacao.total : 0,
        contratos: resCon.paginacao ? resCon.paginacao.total : 0,
        departamentos: resDep.paginacao ? resDep.paginacao.total : 0,
        ferias: resFer.paginacao ? resFer.paginacao.total : 0,
      });
    } catch (e) {
      // silent
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(function () { carregarStats(); }, []);

  useEffect(function () {
    api.get("/auth/profile").then(function (data) {
      var o = data && data.utilizador && data.utilizador.organizacao;
      if (o) { setOrg(o); return; }
      api.get("/api/organizacoes").then(function (d) { if (d.dados && d.dados.length) setOrg(d.dados[0]); }).catch(function () {});
    }).catch(function () {
      api.get("/api/organizacoes").then(function (d) { if (d.dados && d.dados.length) setOrg(d.dados[0]); }).catch(function () {});
    });
  }, []);

  var tipoColLabel = function (v) { return (TIPOS_COLABORADOR.find(function (x) { return x.value === v; }) || {}).label || v || "—"; };
  var tipoContratoLabel = function (v) { return (TIPOS_CONTRATO.find(function (x) { return x.value === v; }) || {}).label || v || "—"; };
  var tipoDeptLabel = function (v) { return (TIPOS_DEPT.find(function (x) { return x.value === v; }) || {}).label || v || "—"; };

  var gerarRelatorio = async function (key) {
    setLoadingReport(key);
    setMsg(null);
    try {
      switch (key) {
        case "colaboradores": await genPdfColaboradores(); break;
        case "contratos": await genPdfContratos(); break;
        case "departamentos": await genPdfDepartamentos(); break;
        case "ferias": await genPdfFerias(); break;
        case "assiduidade": await genPdfAssiduidade(); break;
        case "formacao": await genPdfFormacao(); break;
      }
      setMsg({ tipo: "sucesso", texto: "Relatorio gerado com sucesso" });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message || "Erro ao gerar relatorio" });
    } finally {
      setLoadingReport(null);
    }
  };

  var genPdfColaboradores = async function () {
    var res = await api.get("/api/colaboradores?limit=500");
    var dados = res.dados || [];
    var r = await buildPdfHeader("Relatorio de Colaboradores", org);
    var doc = r.doc;
    var pw = r.pw;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Total: " + (res.paginacao ? res.paginacao.total : dados.length) + " colaborador(es)", 15, r.headerY + 8);

    var rows = dados.map(function (c) {
      return [
        c.numero_colaborador || "—",
        c.nome_completo || "—",
        tipoColLabel(c.tipo_colaborador),
        c.estado || "—",
        c.data_admissao ? helpers.formatDate(c.data_admissao) : "—",
      ];
    });

    autoTable(doc, {
      startY: r.headerY + 14,
      head: [["Número", "Nome Completo", "Tipo", "Estado", "Admissão"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, lineWidth: 0 },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", lineWidth: 0 },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
      },
    });

    addPdfFooter(doc, org);
    doc.save("Relatorio_Colaboradores.pdf");
  };

  var genPdfContratos = async function () {
    var res = await api.get("/api/contratos?limit=500");
    var dados = res.dados || [];
    var r = await buildPdfHeader("Relatorio de Contratos", org);
    var doc = r.doc;
    var pw = r.pw;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Total: " + (res.paginacao ? res.paginacao.total : dados.length) + " contrato(s)", 15, r.headerY + 8);

    var rows = dados.map(function (c) {
      return [
        c.numero || "—",
        (c.colaborador && c.colaborador.nome_completo) || "—",
        tipoContratoLabel(c.tipo),
        c.data_inicio ? helpers.formatDate(c.data_inicio) : "—",
        c.data_fim ? helpers.formatDate(c.data_fim) : "—",
        c.salario_base ? helpers.formatCurrency(c.salario_base, c.moeda) : "—",
        c.estado || "—",
      ];
    });

    autoTable(doc, {
      startY: r.headerY + 14,
      head: [["Número", "Colaborador", "Tipo", "Início", "Fim", "Salário", "Estado"]],
      body: rows,
      styles: { fontSize: 7, cellPadding: 2.5, lineWidth: 0 },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", lineWidth: 0 },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 25 },
        6: { cellWidth: 20 },
      },
    });

    addPdfFooter(doc, org);
    doc.save("Relatorio_Contratos.pdf");
  };

  var genPdfDepartamentos = async function () {
    var res = await api.get("/api/departamentos?limit=500");
    var dados = res.dados || [];
    var r = await buildPdfHeader("Relatorio de Departamentos", org);
    var doc = r.doc;
    var pw = r.pw;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Total: " + (res.paginacao ? res.paginacao.total : dados.length) + " departamento(s)", 15, r.headerY + 8);

    var rows = dados.map(function (d) {
      return [
        d.nome || "—",
        d.codigo || "—",
        tipoDeptLabel(d.tipo),
        d.responsavel_nome || "—",
        d.telefone || "—",
        d.email || "—",
      ];
    });

    autoTable(doc, {
      startY: r.headerY + 14,
      head: [["Nome", "Código", "Tipo", "Responsável", "Telefone", "Email"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, lineWidth: 0 },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", lineWidth: 0 },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 20 },
        2: { cellWidth: 28 },
        3: { cellWidth: 35 },
        4: { cellWidth: 28 },
        5: { cellWidth: 35 },
      },
    });

    addPdfFooter(doc, org);
    doc.save("Relatorio_Departamentos.pdf");
  };

  var genPdfFerias = async function () {
    var res = await api.get("/api/ferias?limit=500");
    var dados = res.dados || [];
    var r = await buildPdfHeader("Relatorio de Ferias", org);
    var doc = r.doc;
    var pw = r.pw;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Total: " + (res.paginacao ? res.paginacao.total : dados.length) + " registo(s)", 15, r.headerY + 8);

    var rows = dados.map(function (f) {
      var nome = "—";
      if (f.colaborador && f.colaborador.nome_completo) {
        nome = f.colaborador.nome_completo;
      } else if (f.colaborador_nome) {
        nome = f.colaborador_nome;
      } else if (f.nome_colaborador) {
        nome = f.nome_colaborador;
      }
      return [
        nome,
        f.data_inicio ? helpers.formatDate(f.data_inicio) : "—",
        f.data_fim ? helpers.formatDate(f.data_fim) : "—",
        f.dias || f.numero_dias || "—",
        f.estado || f.status || "—",
      ];
    });

    autoTable(doc, {
      startY: r.headerY + 14,
      head: [["Colaborador", "Data de Início", "Data de Fim", "Dias", "Estado"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, lineWidth: 0 },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", lineWidth: 0 },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 30 },
      },
    });

    addPdfFooter(doc, org);
    doc.save("Relatorio_Ferias.pdf");
  };

  var genPdfAssiduidade = async function () {
    var res = await api.get("/api/assiduidade?limit=500");
    var dados = res.dados || [];
    var r = await buildPdfHeader("Relatorio de Assiduidade", org);
    var doc = r.doc;
    var pw = r.pw;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Total: " + (res.paginacao ? res.paginacao.total : dados.length) + " registo(s)", 15, r.headerY + 8);

    var rows = dados.map(function (a) {
      var nome = "—";
      if (a.colaborador && a.colaborador.nome_completo) {
        nome = a.colaborador.nome_completo;
      } else if (a.colaborador_nome) {
        nome = a.colaborador_nome;
      } else if (a.nome_colaborador) {
        nome = a.nome_colaborador;
      }
      return [
        nome,
        a.data ? helpers.formatDate(a.data) : (a.data_registro ? helpers.formatDate(a.data_registro) : "—"),
        a.horas_trabalhadas || a.horas || "—",
        a.estado || a.status || "—",
      ];
    });

    autoTable(doc, {
      startY: r.headerY + 14,
      head: [["Colaborador", "Data", "Horas", "Estado"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, lineWidth: 0 },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", lineWidth: 0 },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
      },
    });

    addPdfFooter(doc, org);
    doc.save("Relatorio_Assiduidade.pdf");
  };

  var genPdfFormacao = async function () {
    var res = await api.get("/api/formacao/cursos?limit=500");
    var dados = res.dados || [];
    var r = await buildPdfHeader("Relatorio de Formacao", org);
    var doc = r.doc;
    var pw = r.pw;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Total: " + (res.paginacao ? res.paginacao.total : dados.length) + " curso(s)", 15, r.headerY + 8);

    var rows = dados.map(function (f) {
      return [
        f.nome || f.titulo || "—",
        f.tipo || f.categoria || "—",
        f.data_inicio ? helpers.formatDate(f.data_inicio) : "—",
        f.data_fim ? helpers.formatDate(f.data_fim) : "—",
        f.horas || f.carga_horaria || "—",
        f.estado || f.status || "—",
      ];
    });

    autoTable(doc, {
      startY: r.headerY + 14,
      head: [["Nome", "Tipo", "Início", "Fim", "Horas", "Estado"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, lineWidth: 0 },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", lineWidth: 0 },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
      },
    });

    addPdfFooter(doc, org);
    doc.save("Relatorio_Formacao.pdf");
  };

  var statCards = [
    { key: "col", label: "Colaboradores", value: stats.colaboradores, icon: "group", color: "primary" },
    { key: "con", label: "Contratos", value: stats.contratos, icon: "description", color: "success" },
    { key: "dep", label: "Departamentos", value: stats.departamentos, icon: "apartment", color: "info" },
    { key: "fer", label: "Ferias", value: stats.ferias, icon: "calendar_month", color: "warning" },
  ];

  var reportCards = [
    {
      key: "colaboradores",
      title: "Relatorio de Colaboradores",
      desc: "Lista completa de todos os colaboradores com nome, numero, tipo, estado e data de admissao.",
      icon: "group",
    },
    {
      key: "contratos",
      title: "Relatorio de Contratos",
      desc: "Relatorio detalhado dos contratos de trabalho com numero, colaborador, tipo, datas, remuneracao e estado.",
      icon: "description",
    },
    {
      key: "departamentos",
      title: "Relatorio de Departamentos",
      desc: "Estrutura organizacional com todos os departamentos, responsaveis, contactos e tipos.",
      icon: "apartment",
    },
    {
      key: "ferias",
      title: "Relatorio de Ferias",
      desc: "Registo de solicitacoes de ferias com colaborador, periodo, dias e estado de aprovacao.",
      icon: "calendar_month",
    },
    {
      key: "assiduidade",
      title: "Relatorio de Assiduidade",
      desc: "Registo de presencas e assiduidade dos colaboradores com horas trabalhadas e estado.",
      icon: "schedule",
    },
    {
      key: "formacao",
      title: "Relatorio de Formacao",
      desc: "Cursos de formacao realizados e programados com nome, tipo, datas, horas e estado.",
      icon: "school",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>SGHR</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Relatorios</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Centro de Relatorios</h1>
          <p className="text-[13px] text-on-surface-variant/60">Gere e descarrela relatorios detalhados de todos os modulos do sistema.</p>
        </div>
      </section>

      {msg && (
        <div className={"p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 " + (msg.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10")}>
          <span className="material-symbols-outlined text-[18px]">{msg.tipo === "sucesso" ? "check_circle" : "error"}</span>
          {msg.texto}
          <button onClick={function () { setMsg(null); }} className="ml-auto hover:opacity-60">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(function (s) {
          return (
            <div key={s.key} className="glass-panel p-4 rounded-xl border border-outline-variant/30 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[22px] text-primary">{s.icon}</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wide">{s.label}</p>
                  <p className="text-xl font-bold text-on-surface">
                    {statsLoading ? (
                      <span className="inline-block w-8 h-5 bg-surface-container rounded animate-pulse" />
                    ) : (
                      s.value
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {reportCards.map(function (rc) {
          var isLoading = loadingReport === rc.key;
          return (
            <div key={rc.key} className="glass-panel p-6 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 flex-shrink-0">
                <span className="material-symbols-outlined text-[30px] text-primary">{rc.icon}</span>
              </div>
              <h3 className="text-[15px] font-bold text-on-surface mb-1.5">{rc.title}</h3>
              <p className="text-[12px] text-on-surface-variant/70 leading-relaxed mb-5 flex-grow">{rc.desc}</p>
              <button
                onClick={function () { gerarRelatorio(rc.key); }}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    A gerar...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    Gerar Relatorio
                  </>
                )}
              </button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
