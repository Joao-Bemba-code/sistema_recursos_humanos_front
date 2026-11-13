"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FileUpload from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";

var ESTADOS_CONV = ["Emitida", "Entregue", "Realizada", "Cancelada"];
var ESTADO_CONV_LABEL = {
  Emitida: "Emitida",
  Entregue: "Entregue",
  Realizada: "Entrevista realizada",
  Cancelada: "Cancelada",
};
var ESTADO_CONV_BADGE = { Emitida: "info", Entregue: "warning", Realizada: "success", Cancelada: "secondary" };

var SITUACOES = ["Em_analise", "Decidida", "Notificada", "Cumprida", "Arquivada", "Recorrida"];
var SITUACAO_LABEL = {
  Em_analise: "Em análise",
  Decidida: "Decidida",
  Notificada: "Notificada",
  Cumprida: "Cumprida",
  Arquivada: "Arquivada",
  Recorrida: "Recorrida",
};
var SITUACAO_BADGE = {
  Em_analise: "warning",
  Decidida: "info",
  Notificada: "info",
  Cumprida: "success",
  Arquivada: "secondary",
  Recorrida: "destructive",
};

var MEDIDAS = ["Advertencia_verbal", "Advertencia_escrita", "Suspensao", "Despedimento", "Multa", "Outra"];
var MEDIDA_LABEL = {
  Advertencia_verbal: "Advertência verbal",
  Advertencia_escrita: "Advertência escrita",
  Suspensao: "Suspensão",
  Despedimento: "Despedimento",
  Multa: "Multa",
  Outra: "Outra",
};

var FORMAS_NOTIFICACAO = ["Presencial", "Email", "Carta registada", "Outra"];

var DIREITOS_PADRAO = "O trabalhador tem direito a ser ouvido(a) sobre os factos imputados, a fazer-se acompanhar por advogado(a) ou representante sindical, a apresentar provas e testemunhas, a responder a todas as perguntas e a exercer o direito de defesa, nos termos da legislação laboral em vigor.";

var hoje = function () { return new Date().toISOString().slice(0, 10); };

var resolverUrl = function (path) {
  if (!path) return "";
  var decoded = path.replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
  if (decoded.startsWith("http")) return decoded;
  return api.baseURL + decoded;
};

var abrirAnexo = function (url) {
  if (!url) return;
  window.open(resolverUrl(url), "_blank");
};

// Dias que faltam até ao prazo (negativo = vencido).
var diasParaPrazo = function (prazo) {
  if (!prazo) return null;
  var alvo = new Date(String(prazo).slice(0, 10) + "T00:00:00");
  var base = new Date();
  base.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - base.getTime()) / 86400000);
};

var textoPrazo = function (m) {
  if (!m.prazo_limite) return { label: "Sem prazo", classe: "" };
  var dias = diasParaPrazo(m.prazo_limite);
  var fechada = m.situacao === "Cumprida" || m.situacao === "Arquivada";
  if (fechada) return { label: helpers.formatDate(m.prazo_limite), classe: "" };
  if (dias < 0) return { label: "Vencido há " + Math.abs(dias) + " dia(s)", classe: "text-error font-bold" };
  if (dias === 0) return { label: "Vence hoje", classe: "text-error font-bold" };
  if (dias <= 7) return { label: "Faltam " + dias + " dia(s)", classe: "text-warning font-bold" };
  return { label: helpers.formatDate(m.prazo_limite), classe: "text-on-surface-variant" };
};

export default function ProcessosDisciplinaresPage() {
  var toast = useToast();
  var { hasPermission } = useAuth();
  var podeCriar = hasPermission("processos_disciplinares", "create");
  var podeEditar = hasPermission("processos_disciplinares", "update") || podeCriar;
  var podeEliminar = hasPermission("processos_disciplinares", "delete");

  var [aba, setAba] = useState("convocatorias");
  var [colaboradores, setColaboradores] = useState([]);

  var [convocatorias, setConvocatorias] = useState([]);
  var [loadingConv, setLoadingConv] = useState(true);
  var [paginacaoConv, setPaginacaoConv] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  var [convSearch, setConvSearch] = useState("");
  var [convSearchAplicado, setConvSearchAplicado] = useState("");
  var [convEstado, setConvEstado] = useState("");
  var [convColab, setConvColab] = useState("");

  var [medidas, setMedidas] = useState([]);
  var [loadingMed, setLoadingMed] = useState(true);
  var [paginacaoMed, setPaginacaoMed] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  var [medSearch, setMedSearch] = useState("");
  var [medSearchAplicado, setMedSearchAplicado] = useState("");
  var [medSituacao, setMedSituacao] = useState("");
  var [medMedida, setMedMedida] = useState("");
  var [medColab, setMedColab] = useState("");
  var [medDe, setMedDe] = useState("");
  var [medAte, setMedAte] = useState("");
  var [resumoMed, setResumoMed] = useState({ total: 0, em_analise: 0, notificadas: 0, cumpridas: 0, prazos_em_risco: 0, vencidos: 0 });
  var [sugestoes, setSugestoes] = useState([]);

  var [showConvForm, setShowConvForm] = useState(false);
  var [editandoConv, setEditandoConv] = useState(null);
  var [convForm, setConvForm] = useState({});
  var [savingConv, setSavingConv] = useState(false);

  var [showConvView, setShowConvView] = useState(false);
  var [convView, setConvView] = useState(null);

  var [showEntrega, setShowEntrega] = useState(false);
  var [entregaAlvo, setEntregaAlvo] = useState(null);
  var [entregaForm, setEntregaForm] = useState({ data_entrega: "", comprovativo_url: "", comprovativo_nome: "" });
  var [savingEntrega, setSavingEntrega] = useState(false);

  var [showEntrevista, setShowEntrevista] = useState(false);
  var [entrevistaAlvo, setEntrevistaAlvo] = useState(null);
  var [entrevistaForm, setEntrevistaForm] = useState({ estado: "Realizada", observacoes_entrevista: "" });
  var [savingEntrevista, setSavingEntrevista] = useState(false);

  var [showMedForm, setShowMedForm] = useState(false);
  var [editandoMed, setEditandoMed] = useState(null);
  var [medForm, setMedForm] = useState({});
  var [savingMed, setSavingMed] = useState(false);

  var [showMedView, setShowMedView] = useState(false);
  var [medView, setMedView] = useState(null);

  var [confirmDelete, setConfirmDelete] = useState({ open: false, tipo: "", id: null, label: "" });
  var [gerandoPdf, setGerandoPdf] = useState(false);

  var carregarColaboradores = useCallback(async function () {
    try {
      var data = await api.get("/api/colaboradores?limit=200");
      setColaboradores(data.dados || []);
    } catch (e) {
      console.log("Erro ao carregar colaboradores:", e.message);
    }
  }, []);

  useEffect(function () { carregarColaboradores(); }, [carregarColaboradores]);

  var carregarConvocatorias = useCallback(async function (page) {
    setLoadingConv(true);
    try {
      var url = "/api/processos-disciplinares/convocatorias?page=" + (page || 1) + "&limit=15";
      if (convSearchAplicado) url += "&search=" + encodeURIComponent(convSearchAplicado);
      if (convEstado) url += "&estado=" + encodeURIComponent(convEstado);
      if (convColab) url += "&colaborador_id=" + encodeURIComponent(convColab);
      var data = await api.get(url);
      setConvocatorias(data.dados || []);
      setPaginacaoConv(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setLoadingConv(false);
    }
  }, [convSearchAplicado, convEstado, convColab, toast]);

  var carregarMedidas = useCallback(async function (page) {
    setLoadingMed(true);
    try {
      var url = "/api/processos-disciplinares/medidas?page=" + (page || 1) + "&limit=15";
      if (medSearchAplicado) url += "&search=" + encodeURIComponent(medSearchAplicado);
      if (medSituacao) url += "&situacao=" + encodeURIComponent(medSituacao);
      if (medMedida) url += "&medida=" + encodeURIComponent(medMedida);
      if (medColab) url += "&colaborador_id=" + encodeURIComponent(medColab);
      if (medDe) url += "&de=" + encodeURIComponent(medDe);
      if (medAte) url += "&ate=" + encodeURIComponent(medAte);
      var data = await api.get(url);
      setMedidas(data.dados || []);
      setPaginacaoMed(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setLoadingMed(false);
    }
  }, [medSearchAplicado, medSituacao, medMedida, medColab, medDe, medAte, toast]);

  var carregarResumo = useCallback(async function () {
    try {
      var data = await api.get("/api/processos-disciplinares/medidas/resumo");
      if (data && data.dados) setResumoMed(data.dados);
    } catch (e) {
      console.log("Erro ao carregar resumo disciplinar:", e.message);
    }
  }, []);

  var carregarSugestoes = useCallback(async function () {
    try {
      var data = await api.get("/api/processos-disciplinares/convocatorias?limit=200");
      setSugestoes(data.dados || []);
    } catch (e) {
      console.log("Erro ao carregar processos sugeridos:", e.message);
    }
  }, []);

  useEffect(function () {
    if (aba === "convocatorias") carregarConvocatorias(1);
  }, [aba, carregarConvocatorias]);

  useEffect(function () {
    if (aba === "medidas") {
      carregarMedidas(1);
      carregarResumo();
      carregarSugestoes();
    }
  }, [aba, carregarMedidas, carregarResumo, carregarSugestoes]);

  useEffect(function () {
    if (!convSearchAplicado && !convSearch) return;
    if (!convSearch) { setConvSearchAplicado(""); return; }
    var t = setTimeout(function () { setConvSearchAplicado(convSearch); }, 350);
    return function () { clearTimeout(t); };
  }, [convSearch]);

  useEffect(function () {
    if (!medSearchAplicado && !medSearch) return;
    if (!medSearch) { setMedSearchAplicado(""); return; }
    var t = setTimeout(function () { setMedSearchAplicado(medSearch); }, 350);
    return function () { clearTimeout(t); };
  }, [medSearch]);

  var nomeColaborador = function (item) {
    if (item && item.colaborador) return item.colaborador.nome_completo;
    var c = colaboradores.filter(function (x) { return String(x.id) === String(item && item.colaborador_id); })[0];
    return c ? c.nome_completo : "Colaborador";
  };
  var numColaborador = function (item) {
    if (item && item.colaborador) return item.colaborador.numero_colaborador || "";
    var c = colaboradores.filter(function (x) { return String(x.id) === String(item && item.colaborador_id); })[0];
    return c ? c.numero_colaborador : "";
  };

  // ---------- Convocatórias ----------

  var defaultConvForm = function () {
    return {
      numero_processo: "",
      colaborador_id: "",
      factos_imputados: "",
      data_entrevista: hoje(),
      hora_entrevista: "09:00",
      local: "",
      direitos_trabalhador: DIREITOS_PADRAO,
      estado: "Emitida",
    };
  };

  var abrirNovaConv = function () {
    setEditandoConv(null);
    setConvForm(defaultConvForm());
    setShowConvForm(true);
  };

  var abrirEditarConv = function (c) {
    setEditandoConv(c);
    setConvForm({
      numero_processo: c.numero_processo || "",
      colaborador_id: c.colaborador_id || "",
      factos_imputados: c.factos_imputados || "",
      data_entrevista: c.data_entrevista ? String(c.data_entrevista).slice(0, 10) : "",
      hora_entrevista: c.hora_entrevista || "",
      local: c.local || "",
      direitos_trabalhador: c.direitos_trabalhador || "",
      estado: c.estado || "Emitida",
    });
    setShowConvForm(true);
  };

  var guardarConv = async function (e) {
    if (e) e.preventDefault();
    if (!convForm.colaborador_id || !convForm.factos_imputados || !convForm.data_entrevista) {
      toast.addToast("error", "Preencha o trabalhador, os factos imputados e a data da entrevista");
      return;
    }
    setSavingConv(true);
    try {
      var payload = Object.assign({}, convForm);
      if (!payload.numero_processo) delete payload.numero_processo;
      if (editandoConv) {
        await api.put("/api/processos-disciplinares/convocatorias/" + editandoConv.id, payload);
        toast.addToast("success", "Convocatória atualizada");
      } else {
        delete payload.estado;
        await api.post("/api/processos-disciplinares/convocatorias", payload);
        toast.addToast("success", "Convocatória emitida");
      }
      setShowConvForm(false);
      carregarConvocatorias(editandoConv ? paginacaoConv.pagina : 1);
    } catch (err) {
      toast.addToast("error", err.message);
    } finally {
      setSavingConv(false);
    }
  };

  var abrirEntregaConv = function (c) {
    setEntregaAlvo(c);
    setEntregaForm({
      data_entrega: c.data_entrega ? String(c.data_entrega).slice(0, 10) : hoje(),
      comprovativo_url: c.comprovativo_url || "",
      comprovativo_nome: c.comprovativo_nome || "",
    });
    setShowEntrega(true);
  };

  var guardarEntrega = async function (e) {
    if (e) e.preventDefault();
    if (!entregaAlvo) return;
    if (!entregaForm.data_entrega) {
      toast.addToast("error", "Indique a data de entrega");
      return;
    }
    setSavingEntrega(true);
    try {
      await api.put("/api/processos-disciplinares/convocatorias/" + entregaAlvo.id, {
        estado: "Entregue",
        data_entrega: entregaForm.data_entrega,
        comprovativo_url: entregaForm.comprovativo_url || null,
        comprovativo_nome: entregaForm.comprovativo_nome || null,
      });
      toast.addToast("success", "Entrega registada");
      setShowEntrega(false);
      carregarConvocatorias(paginacaoConv.pagina);
    } catch (err) {
      toast.addToast("error", err.message);
    } finally {
      setSavingEntrega(false);
    }
  };

  var abrirEntrevistaConv = function (c) {
    setEntrevistaAlvo(c);
    setEntrevistaForm({
      estado: c.estado === "Cancelada" ? "Cancelada" : "Realizada",
      observacoes_entrevista: c.observacoes_entrevista || "",
    });
    setShowEntrevista(true);
  };

  var guardarEntrevista = async function (e) {
    if (e) e.preventDefault();
    if (!entrevistaAlvo) return;
    setSavingEntrevista(true);
    try {
      await api.put("/api/processos-disciplinares/convocatorias/" + entrevistaAlvo.id, {
        estado: entrevistaForm.estado,
        observacoes_entrevista: entrevistaForm.observacoes_entrevista || null,
      });
      toast.addToast("success", "Entrevista atualizada");
      setShowEntrevista(false);
      carregarConvocatorias(paginacaoConv.pagina);
    } catch (err) {
      toast.addToast("error", err.message);
    } finally {
      setSavingEntrevista(false);
    }
  };

  var verConv = async function (c) {
    setConvView(c);
    setShowConvView(true);
    try {
      var data = await api.get("/api/processos-disciplinares/convocatorias/" + c.id);
      if (data && data.dados) setConvView(data.dados);
    } catch (e) {
      // mantem os dados da lista
    }
  };

  var pdfConv = async function (c) {
    if (!c) return;
    setGerandoPdf(true);
    try {
      await api.downloadPdf("/api/pdf/convocatoria-disciplinar/" + c.id, "convocatoria_" + c.numero_processo + ".pdf");
    } catch (err) {
      toast.addToast("error", err.message || "Erro ao gerar a convocatória");
    } finally {
      setGerandoPdf(false);
    }
  };

  // ---------- Medidas ----------

  var defaultMedForm = function () {
    return {
      numero_processo: "",
      colaborador_id: "",
      convocatoria_id: "",
      infracao: "",
      medida: "Advertencia_escrita",
      fundamentacao: "",
      autoridade_decisora: "",
      data_decisao: hoje(),
      data_inicio: "",
      data_fim: "",
      notificacao_data: "",
      notificacao_forma: "",
      comprovativo_url: "",
      comprovativo_nome: "",
      situacao: "Em_analise",
      prazo_limite: "",
      observacoes: "",
    };
  };

  var abrirNovaMedida = function () {
    setEditandoMed(null);
    setMedForm(defaultMedForm());
    setShowMedForm(true);
  };

  var abrirMedidaDeConv = function (c) {
    setEditandoMed(null);
    setMedForm(Object.assign(defaultMedForm(), {
      numero_processo: c.numero_processo || "",
      colaborador_id: c.colaborador_id || "",
      convocatoria_id: c.id || "",
      infracao: c.factos_imputados || "",
    }));
    setShowConvView(false);
    setAba("medidas");
    setShowMedForm(true);
  };

  var abrirEditarMedida = function (m) {
    setEditandoMed(m);
    setMedForm({
      numero_processo: m.numero_processo || "",
      colaborador_id: m.colaborador_id || "",
      convocatoria_id: m.convocatoria_id || "",
      infracao: m.infracao || "",
      medida: m.medida || "Advertencia_escrita",
      fundamentacao: m.fundamentacao || "",
      autoridade_decisora: m.autoridade_decisora || "",
      data_decisao: m.data_decisao ? String(m.data_decisao).slice(0, 10) : "",
      data_inicio: m.data_inicio ? String(m.data_inicio).slice(0, 10) : "",
      data_fim: m.data_fim ? String(m.data_fim).slice(0, 10) : "",
      notificacao_data: m.notificacao_data ? String(m.notificacao_data).slice(0, 10) : "",
      notificacao_forma: m.notificacao_forma || "",
      comprovativo_url: m.comprovativo_url || "",
      comprovativo_nome: m.comprovativo_nome || "",
      situacao: m.situacao || "Em_analise",
      prazo_limite: m.prazo_limite ? String(m.prazo_limite).slice(0, 10) : "",
      observacoes: m.observacoes || "",
    });
    setShowMedForm(true);
  };

  var escolherProcesso = function (numero) {
    var conv = sugestoes.filter(function (c) { return c.numero_processo === numero; })[0];
    if (!conv) return;
    setMedForm(function (actual) {
      return Object.assign({}, actual, {
        numero_processo: numero,
        convocatoria_id: conv.id,
        colaborador_id: actual.colaborador_id || conv.colaborador_id,
        infracao: actual.infracao || conv.factos_imputados || "",
      });
    });
  };

  var guardarMedida = async function (e) {
    if (e) e.preventDefault();
    if (!medForm.numero_processo || !medForm.colaborador_id || !medForm.infracao || !medForm.medida) {
      toast.addToast("error", "Preencha o número do processo, o trabalhador, a infracção e a medida");
      return;
    }
    if (medForm.data_inicio && medForm.data_fim && medForm.data_fim < medForm.data_inicio) {
      toast.addToast("error", "A data de fim não pode ser anterior à data de início");
      return;
    }
    setSavingMed(true);
    try {
      var payload = Object.assign({}, medForm);
      if (!payload.convocatoria_id) delete payload.convocatoria_id;
      if (editandoMed) {
        await api.put("/api/processos-disciplinares/medidas/" + editandoMed.id, payload);
        toast.addToast("success", "Medida disciplinar atualizada");
      } else {
        await api.post("/api/processos-disciplinares/medidas", payload);
        toast.addToast("success", "Medida disciplinar registada");
      }
      setShowMedForm(false);
      carregarMedidas(editandoMed ? paginacaoMed.pagina : 1);
      carregarResumo();
      carregarConvocatorias(1);
    } catch (err) {
      toast.addToast("error", err.message);
    } finally {
      setSavingMed(false);
    }
  };

  var verMedida = async function (m) {
    setMedView(m);
    setShowMedView(true);
    try {
      var data = await api.get("/api/processos-disciplinares/medidas/" + m.id);
      if (data && data.dados) setMedView(data.dados);
    } catch (e) {
      // mantem os dados da lista
    }
  };

  var gerarRelatorio = async function () {
    setGerandoPdf(true);
    try {
      var qs = [];
      if (medSearchAplicado) qs.push("search=" + encodeURIComponent(medSearchAplicado));
      if (medSituacao) qs.push("situacao=" + encodeURIComponent(medSituacao));
      if (medMedida) qs.push("medida=" + encodeURIComponent(medMedida));
      if (medColab) qs.push("colaborador_id=" + encodeURIComponent(medColab));
      if (medDe) qs.push("de=" + encodeURIComponent(medDe));
      if (medAte) qs.push("ate=" + encodeURIComponent(medAte));
      var url = "/api/pdf/medidas-disciplinares" + (qs.length ? "?" + qs.join("&") : "");
      await api.downloadPdf(url, "relatorio_medidas_disciplinares.pdf");
    } catch (err) {
      toast.addToast("error", err.message || "Erro ao gerar o relatório");
    } finally {
      setGerandoPdf(false);
    }
  };

  // ---------- Eliminar ----------

  var eliminar = async function () {
    try {
      if (confirmDelete.tipo === "convocatoria") {
        await api.delete("/api/processos-disciplinares/convocatorias/" + confirmDelete.id);
        toast.addToast("success", "Convocatória removida");
        carregarConvocatorias(1);
      } else {
        await api.delete("/api/processos-disciplinares/medidas/" + confirmDelete.id);
        toast.addToast("success", "Medida disciplinar removida");
        carregarMedidas(1);
        carregarResumo();
      }
      setConfirmDelete({ open: false, tipo: "", id: null, label: "" });
    } catch (e) {
      toast.addToast("error", e.message);
    }
  };

  var inputCls = "w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
  var labelCls = "text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1";
  var pillCls = function (ativo) {
    return "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-colors border " +
      (ativo ? "bg-primary text-white border-primary shadow-sm" : "bg-surface text-on-surface-variant border-outline-variant/40 hover:bg-primary/5 hover:text-primary");
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar registo"
        mensagem={"Tem certeza que deseja eliminar " + confirmDelete.label + "? Esta ação não pode ser desfeita."}
        textoConfirmar="Sim, eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={function () { setConfirmDelete({ open: false, tipo: "", id: null, label: "" }); }}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>SGHR</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Processos Disciplinares</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">Processos Disciplinares</h1>
          <p className="text-[13px] text-on-surface-variant/70">Convocatórias para entrevista, medidas aplicadas, notificações e prazos.</p>
        </div>
        <div className="flex items-center gap-3">
          {aba === "convocatorias" && podeCriar && (
            <Button onClick={abrirNovaConv}>
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Nova convocatória
            </Button>
          )}
          {aba === "medidas" && podeCriar && (
            <Button onClick={abrirNovaMedida}>
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Registar medida
            </Button>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={function () { setAba("convocatorias"); }} className={pillCls(aba === "convocatorias")}>
          <span className="material-symbols-outlined text-[16px]">mail</span>
          Convocatórias
          <span className={"px-1.5 py-0.5 rounded-full text-[10px] " + (aba === "convocatorias" ? "bg-white/20" : "bg-surface-container-high")}>{paginacaoConv.total}</span>
        </button>
        <button type="button" onClick={function () { setAba("medidas"); }} className={pillCls(aba === "medidas")}>
          <span className="material-symbols-outlined text-[16px]">gavel</span>
          Medidas Disciplinares
          <span className={"px-1.5 py-0.5 rounded-full text-[10px] " + (aba === "medidas" ? "bg-white/20" : "bg-surface-container-high")}>{paginacaoMed.total}</span>
        </button>
      </div>

      {aba === "convocatorias" && (
        <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-outline-variant/20">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className={labelCls}>Buscar convocatória</label>
                <div className="relative mt-1.5">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                  <input
                    type="text"
                    placeholder="Nº do processo, factos, local..."
                    value={convSearch}
                    onChange={function (e) { setConvSearch(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter") carregarConvocatorias(1); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Estado</label>
                <select value={convEstado} onChange={function (e) { setConvEstado(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px]">
                  <option value="">Todos</option>
                  {ESTADOS_CONV.map(function (s) { return <option key={s} value={s}>{ESTADO_CONV_LABEL[s]}</option>; })}
                </select>
              </div>
              <div>
                <label className={labelCls}>Trabalhador</label>
                <select value={convColab} onChange={function (e) { setConvColab(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px]">
                  <option value="">Todos</option>
                  {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo}</option>; })}
                </select>
              </div>
            </div>
            {(convSearch || convEstado || convColab) && (
              <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-on-surface-variant/60 font-medium">Filtros ativos:</span>
                {convSearch && <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full text-[11px] font-bold">Pesquisa: {convSearch}</span>}
                {convEstado && <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full text-[11px] font-bold">{ESTADO_CONV_LABEL[convEstado]}</span>}
                {convColab && <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full text-[11px] font-bold">{nomeColaborador({ colaborador_id: convColab })}</span>}
                <button onClick={function () { setConvSearch(""); setConvEstado(""); setConvColab(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar tudo</button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse data-grid-tight">
              <thead>
                <tr className="bg-background/50 border-b border-outline-variant/20">
                  <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Processo</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Trabalhador</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Entrevista</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Local</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loadingConv ? (
                  [1, 2, 3].map(function (i) {
                    return <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>;
                  })
                ) : convocatorias.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">mail</span>
                    <p className="text-on-surface-variant font-medium">Nenhuma convocatória encontrada</p>
                    <p className="text-[13px] text-outline mt-1">Emita a primeira convocatória para entrevista disciplinar.</p>
                  </td></tr>
                ) : (
                  convocatorias.map(function (c) {
                    return (
                      <tr key={c.id} className="hover:bg-primary/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-on-surface font-mono text-[13px]">{c.numero_processo}</p>
                          <p className="text-[11px] text-on-surface-variant/60">Emitida em {helpers.formatDate(c.data_emissao)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border border-outline-variant/30 bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[12px] font-bold text-primary">{helpers.getInitials(nomeColaborador(c))}</span>
                            </div>
                            <div>
                              <p className="font-bold text-on-surface text-[13px]">{nomeColaborador(c)}</p>
                              <p className="text-[11px] text-on-surface-variant/70 font-mono">{numColaborador(c)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[13px] text-on-surface">{helpers.formatDate(c.data_entrevista)}</p>
                          <p className="text-[11px] text-on-surface-variant/70">{c.hora_entrevista || "Hora a confirmar"}</p>
                        </td>
                        <td className="px-4 py-4"><span className="text-[13px] text-on-surface-variant/80">{c.local || "—"}</span></td>
                        <td className="px-4 py-4"><Badge variant={ESTADO_CONV_BADGE[c.estado] || "secondary"}>{ESTADO_CONV_LABEL[c.estado] || c.estado}</Badge></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end">
                            <Button onClick={function () { verConv(c); }} variant="ghost" size="icon-sm" title="Ver detalhe">
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                            </Button>
                            {podeEditar && c.estado !== "Entregue" && c.estado !== "Realizada" && (
                              <Button onClick={function () { abrirEntregaConv(c); }} variant="ghost" size="icon-sm" title="Registar entrega">
                                <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                              </Button>
                            )}
                            {podeEditar && c.estado !== "Cancelada" && (
                              <Button onClick={function () { abrirEntrevistaConv(c); }} variant="ghost" size="icon-sm" title="Acompanhar entrevista">
                                <span className="material-symbols-outlined text-[15px]">record_voice_over</span>
                              </Button>
                            )}
                            <Button onClick={function () { pdfConv(c); }} variant="ghost" size="icon-sm" title="Emitir PDF">
                              <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                            </Button>
                            {podeEditar && (
                              <Button onClick={function () { abrirEditarConv(c); }} variant="ghost" size="icon-sm" title="Editar">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </Button>
                            )}
                            {podeEliminar && (
                              <Button onClick={function () { setConfirmDelete({ open: true, tipo: "convocatoria", id: c.id, label: "a convocatória " + c.numero_processo }); }} variant="ghost" size="icon-sm" title="Eliminar">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
              Exibindo {convocatorias.length} de {paginacaoConv.total} convocatórias
            </div>
            {paginacaoConv.total_paginas > 1 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(paginacaoConv.total_paginas, 5) }, function (_, i) { return i + 1; }).map(function (p) {
                  return (
                    <Button key={p} onClick={function () { carregarConvocatorias(p); }} variant={p === paginacaoConv.pagina ? "default" : "outline"} size="sm" className="min-w-[32px]">
                      {p}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {aba === "medidas" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-surface rounded-xl border border-outline-variant/30 p-4">
              <p className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Em análise</p>
              <p className="text-[24px] font-bold text-on-surface mt-1">{resumoMed.em_analise || 0}</p>
            </div>
            <div className="bg-surface rounded-xl border border-outline-variant/30 p-4">
              <p className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Notificadas</p>
              <p className="text-[24px] font-bold text-on-surface mt-1">{resumoMed.notificadas || 0}</p>
            </div>
            <div className="bg-surface rounded-xl border border-outline-variant/30 p-4">
              <p className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Prazos em risco</p>
              <p className="text-[24px] font-bold text-warning mt-1">{resumoMed.prazos_em_risco || 0}</p>
              <p className="text-[10px] text-on-surface-variant/60">{resumoMed.vencidos || 0} já vencido(s)</p>
            </div>
            <div className="bg-surface rounded-xl border border-outline-variant/30 p-4">
              <p className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Cumpridas</p>
              <p className="text-[24px] font-bold text-success mt-1">{resumoMed.cumpridas || 0}</p>
            </div>
          </div>

          <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-outline-variant/20 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className={labelCls}>Buscar medida</label>
                  <div className="relative mt-1.5">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                    <input
                      type="text"
                      placeholder="Nº processo, infracção, autoridade..."
                      value={medSearch}
                      onChange={function (e) { setMedSearch(e.target.value); }}
                      onKeyDown={function (e) { if (e.key === "Enter") carregarMedidas(1); }}
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Situação</label>
                  <select value={medSituacao} onChange={function (e) { setMedSituacao(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px]">
                    <option value="">Todas</option>
                    {SITUACOES.map(function (s) { return <option key={s} value={s}>{SITUACAO_LABEL[s]}</option>; })}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Medida</label>
                  <select value={medMedida} onChange={function (e) { setMedMedida(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px]">
                    <option value="">Todas</option>
                    {MEDIDAS.map(function (m) { return <option key={m} value={m}>{MEDIDA_LABEL[m]}</option>; })}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Trabalhador</label>
                  <select value={medColab} onChange={function (e) { setMedColab(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px]">
                    <option value="">Todos</option>
                    {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo}</option>; })}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Decisão de</label>
                  <input type="date" value={medDe} onChange={function (e) { setMedDe(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px]" />
                </div>
                <div>
                  <label className={labelCls}>Decisão até</label>
                  <input type="date" value={medAte} onChange={function (e) { setMedAte(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px]" />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={function () { carregarMedidas(1); }} variant="outline" size="sm" className="px-3">
                    <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                    Filtrar
                  </Button>
                  <Button onClick={gerarRelatorio} variant="outline" size="sm" disabled={gerandoPdf}>
                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    Relatório
                  </Button>
                </div>
              </div>
              {(medSearch || medSituacao || medMedida || medColab || medDe || medAte) && (
                <div className="pt-3 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-on-surface-variant/60 font-medium">Filtros ativos:</span>
                  {medSearch && <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full text-[11px] font-bold">Pesquisa: {medSearch}</span>}
                  {medSituacao && <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full text-[11px] font-bold">{SITUACAO_LABEL[medSituacao]}</span>}
                  {medMedida && <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full text-[11px] font-bold">{MEDIDA_LABEL[medMedida]}</span>}
                  {medColab && <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full text-[11px] font-bold">{nomeColaborador({ colaborador_id: medColab })}</span>}
                  {medDe && <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full text-[11px] font-bold">De {helpers.formatDate(medDe)}</span>}
                  {medAte && <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full text-[11px] font-bold">Até {helpers.formatDate(medAte)}</span>}
                  <button onClick={function () { setMedSearch(""); setMedSituacao(""); setMedMedida(""); setMedColab(""); setMedDe(""); setMedAte(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar tudo</button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse data-grid-tight">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant/20">
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Processo</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Trabalhador</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Medida</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Decisão</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Situação</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Prazo</th>
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loadingMed ? (
                    [1, 2, 3].map(function (i) {
                      return <tr key={i}><td colSpan={7} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>;
                    })
                  ) : medidas.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">gavel</span>
                      <p className="text-on-surface-variant font-medium">Nenhuma medida disciplinar encontrada</p>
                      <p className="text-[13px] text-outline mt-1">Registe a primeira medida ou ajuste os filtros.</p>
                    </td></tr>
                  ) : (
                    medidas.map(function (m) {
                      var prazo = textoPrazo(m);
                      return (
                        <tr key={m.id} className="hover:bg-primary/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-on-surface font-mono text-[13px]">{m.numero_processo}</p>
                            <p className="text-[11px] text-on-surface-variant/60">{m.convocatoria_id ? "Com convocatória" : "Sem convocatória"}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full border border-outline-variant/30 bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[12px] font-bold text-primary">{helpers.getInitials(nomeColaborador(m))}</span>
                              </div>
                              <div>
                                <p className="font-bold text-on-surface text-[13px]">{nomeColaborador(m)}</p>
                                <p className="text-[11px] text-on-surface-variant/70 font-mono">{numColaborador(m)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4"><span className="text-[13px] text-on-surface">{MEDIDA_LABEL[m.medida] || m.medida}</span></td>
                          <td className="px-4 py-4">
                            <p className="text-[13px] text-on-surface">{helpers.formatDate(m.data_decisao)}</p>
                            <p className="text-[11px] text-on-surface-variant/70 line-clamp-1">{m.autoridade_decisora || "—"}</p>
                          </td>
                          <td className="px-4 py-4"><Badge variant={SITUACAO_BADGE[m.situacao] || "secondary"}>{SITUACAO_LABEL[m.situacao] || m.situacao}</Badge></td>
                          <td className="px-4 py-4"><span className={"text-[12px] " + prazo.classe}>{prazo.label}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end">
                              <Button onClick={function () { verMedida(m); }} variant="ghost" size="icon-sm" title="Ver detalhe">
                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                              </Button>
                              {podeEditar && (
                                <Button onClick={function () { abrirEditarMedida(m); }} variant="ghost" size="icon-sm" title="Editar">
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                </Button>
                              )}
                              {podeEliminar && (
                                <Button onClick={function () { setConfirmDelete({ open: true, tipo: "medida", id: m.id, label: "a medida do processo " + m.numero_processo }); }} variant="ghost" size="icon-sm" title="Eliminar">
                                  <span className="material-symbols-outlined text-[15px]">delete</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
                Exibindo {medidas.length} de {paginacaoMed.total} medidas
              </div>
              {paginacaoMed.total_paginas > 1 && (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(paginacaoMed.total_paginas, 5) }, function (_, i) { return i + 1; }).map(function (p) {
                    return (
                      <Button key={p} onClick={function () { carregarMedidas(p); }} variant={p === paginacaoMed.pagina ? "default" : "outline"} size="sm" className="min-w-[32px]">
                        {p}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Formulário da convocatória */}
      <Modal
        isOpen={showConvForm}
        onClose={function () { setShowConvForm(false); }}
        title={editandoConv ? "Editar convocatória " + editandoConv.numero_processo : "Nova convocatória"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={function () { setShowConvForm(false); }}>Cancelar</Button>
            <Button onClick={guardarConv} disabled={savingConv}>
              <span className="material-symbols-outlined text-[18px]">{savingConv ? "hourglass_empty" : "save"}</span>
              {savingConv ? "A guardar..." : editandoConv ? "Atualizar" : "Emitir convocatória"}
            </Button>
          </>
        }
      >
        <form onSubmit={guardarConv} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nº do processo</label>
              <input type="text" value={convForm.numero_processo || ""} onChange={function (e) { setConvForm(Object.assign({}, convForm, { numero_processo: e.target.value })); }} placeholder="Gerado automaticamente" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Trabalhador *</label>
              <select value={convForm.colaborador_id || ""} onChange={function (e) { setConvForm(Object.assign({}, convForm, { colaborador_id: e.target.value })); }} className={inputCls}>
                <option value="">Selecionar trabalhador</option>
                {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>; })}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Factos imputados *</label>
              <textarea rows={3} value={convForm.factos_imputados || ""} onChange={function (e) { setConvForm(Object.assign({}, convForm, { factos_imputados: e.target.value })); }} placeholder="Descreva os factos e as normas violadas" className={inputCls + " resize-y"} />
            </div>
            <div>
              <label className={labelCls}>Data da entrevista *</label>
              <input type="date" value={convForm.data_entrevista || ""} onChange={function (e) { setConvForm(Object.assign({}, convForm, { data_entrevista: e.target.value })); }} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Hora</label>
              <input type="time" value={convForm.hora_entrevista || ""} onChange={function (e) { setConvForm(Object.assign({}, convForm, { hora_entrevista: e.target.value })); }} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Local</label>
              <input type="text" value={convForm.local || ""} onChange={function (e) { setConvForm(Object.assign({}, convForm, { local: e.target.value })); }} placeholder="Sala, departamento ou endereço" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Direitos do trabalhador</label>
              <textarea rows={4} value={convForm.direitos_trabalhador || ""} onChange={function (e) { setConvForm(Object.assign({}, convForm, { direitos_trabalhador: e.target.value })); }} className={inputCls + " resize-y"} />
            </div>
            {editandoConv && (
              <div>
                <label className={labelCls}>Estado</label>
                <select value={convForm.estado || "Emitida"} onChange={function (e) { setConvForm(Object.assign({}, convForm, { estado: e.target.value })); }} className={inputCls}>
                  {ESTADOS_CONV.map(function (s) { return <option key={s} value={s}>{ESTADO_CONV_LABEL[s]}</option>; })}
                </select>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Registo de entrega */}
      <Modal
        isOpen={showEntrega}
        onClose={function () { setShowEntrega(false); }}
        title={"Registar entrega — " + (entregaAlvo ? entregaAlvo.numero_processo : "")}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={function () { setShowEntrega(false); }}>Cancelar</Button>
            <Button onClick={guardarEntrega} disabled={savingEntrega}>
              <span className="material-symbols-outlined text-[18px]">{savingEntrega ? "hourglass_empty" : "check"}</span>
              {savingEntrega ? "A guardar..." : "Confirmar entrega"}
            </Button>
          </>
        }
      >
        <form onSubmit={guardarEntrega} className="space-y-4">
          <div>
            <label className={labelCls}>Data de entrega *</label>
            <input type="date" value={entregaForm.data_entrega || ""} onChange={function (e) { setEntregaForm(Object.assign({}, entregaForm, { data_entrega: e.target.value })); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Comprovativo de notificação</label>
            <FileUpload
              hideLabel
              value={entregaForm.comprovativo_url || ""}
              nomeFicheiro={entregaForm.comprovativo_nome}
              onChange={function (url, meta) { setEntregaForm(Object.assign({}, entregaForm, { comprovativo_url: url, comprovativo_nome: (meta && meta.nome_original) || "" })); }}
              pasta="documentos"
              accept=".pdf,.jpg,.jpeg,.png"
              icone="attach_file"
            />
            <p className="text-[11px] text-on-surface-variant/60 px-1 mt-1">Anexe o comprovativo assinado ou a prova de receção.</p>
          </div>
        </form>
      </Modal>

      {/* Acompanhamento da entrevista */}
      <Modal
        isOpen={showEntrevista}
        onClose={function () { setShowEntrevista(false); }}
        title={"Entrevista — " + (entrevistaAlvo ? entrevistaAlvo.numero_processo : "")}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={function () { setShowEntrevista(false); }}>Cancelar</Button>
            <Button onClick={guardarEntrevista} disabled={savingEntrevista}>
              <span className="material-symbols-outlined text-[18px]">{savingEntrevista ? "hourglass_empty" : "save"}</span>
              {savingEntrevista ? "A guardar..." : "Guardar"}
            </Button>
          </>
        }
      >
        <form onSubmit={guardarEntrevista} className="space-y-4">
          <div>
            <label className={labelCls}>Resultado / estado</label>
            <select value={entrevistaForm.estado || "Realizada"} onChange={function (e) { setEntrevistaForm(Object.assign({}, entrevistaForm, { estado: e.target.value })); }} className={inputCls}>
              <option value="Entregue">Convocatória entregue</option>
              <option value="Realizada">Entrevista realizada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Observações da entrevista</label>
            <textarea rows={5} value={entrevistaForm.observacoes_entrevista || ""} onChange={function (e) { setEntrevistaForm(Object.assign({}, entrevistaForm, { observacoes_entrevista: e.target.value })); }} placeholder="Comparecimento, declarações, provas apresentadas..." className={inputCls + " resize-y"} />
          </div>
        </form>
      </Modal>

      {/* Detalhe da convocatória */}
      <Modal
        isOpen={showConvView}
        onClose={function () { setShowConvView(false); }}
        title={"Convocatória " + (convView ? convView.numero_processo : "")}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={function () { setShowConvView(false); }}>Fechar</Button>
            {podeCriar && (
              <Button variant="outline" onClick={function () { abrirMedidaDeConv(convView); }}>
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                Registar medida
              </Button>
            )}
            <Button variant="outline" onClick={function () { pdfConv(convView); }} disabled={gerandoPdf}>
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              Emitir PDF
            </Button>
          </>
        }
      >
        {convView && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wider">Processo</p>
                <p className="text-[16px] font-bold text-on-surface font-mono">{convView.numero_processo}</p>
              </div>
              <Badge variant={ESTADO_CONV_BADGE[convView.estado] || "secondary"}>{ESTADO_CONV_LABEL[convView.estado] || convView.estado}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Trabalhador</p>
                <p className="text-[13px] font-semibold text-on-surface mt-1">{nomeColaborador(convView)}</p>
                <p className="text-[11px] text-on-surface-variant/70 font-mono">{numColaborador(convView)}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Entrevista</p>
                <p className="text-[13px] font-semibold text-on-surface mt-1">{helpers.formatDate(convView.data_entrevista)} · {convView.hora_entrevista || "hora a confirmar"}</p>
                <p className="text-[11px] text-on-surface-variant/70">{convView.local || "Local a confirmar"}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Emissão</p>
                <p className="text-[13px] text-on-surface mt-1">{helpers.formatDate(convView.data_emissao)}</p>
                {convView.emitido_por_nome && <p className="text-[11px] text-on-surface-variant/70">por {convView.emitido_por_nome}</p>}
              </div>
              <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Entrega / notificação</p>
                <p className="text-[13px] text-on-surface mt-1">{convView.data_entrega ? helpers.formatDate(convView.data_entrega) : "Ainda não registada"}</p>
                {convView.entregue_por_nome && <p className="text-[11px] text-on-surface-variant/70">por {convView.entregue_por_nome}</p>}
                {convView.comprovativo_url && (
                  <button onClick={function () { abrirAnexo(convView.comprovativo_url); }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-1">
                    <span className="material-symbols-outlined text-[13px]">attach_file</span>
                    Ver comprovativo
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Factos imputados</p>
              <p className="text-[13px] text-on-surface-variant/90 whitespace-pre-line">{convView.factos_imputados}</p>
            </div>

            {convView.direitos_trabalhador && (
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Direitos do trabalhador</p>
                <p className="text-[13px] text-on-surface-variant/90 whitespace-pre-line">{convView.direitos_trabalhador}</p>
              </div>
            )}

            {convView.observacoes_entrevista && (
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Observações da entrevista</p>
                <p className="text-[13px] text-on-surface-variant/90 whitespace-pre-line">{convView.observacoes_entrevista}</p>
              </div>
            )}

            {podeEditar && (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-outline-variant/20">
                <Button variant="outline" size="sm" onClick={function () { setShowConvView(false); abrirEntregaConv(convView); }}>
                  <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                  Registar entrega
                </Button>
                <Button variant="outline" size="sm" onClick={function () { setShowConvView(false); abrirEntrevistaConv(convView); }}>
                  <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                  Acompanhar entrevista
                </Button>
                <Button variant="ghost" size="sm" onClick={function () { setShowConvView(false); abrirEditarConv(convView); }}>
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Editar
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Formulário da medida */}
      <Modal
        isOpen={showMedForm}
        onClose={function () { setShowMedForm(false); }}
        title={editandoMed ? "Editar medida — processo " + editandoMed.numero_processo : "Registar medida disciplinar"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={function () { setShowMedForm(false); }}>Cancelar</Button>
            <Button onClick={guardarMedida} disabled={savingMed}>
              <span className="material-symbols-outlined text-[18px]">{savingMed ? "hourglass_empty" : "save"}</span>
              {savingMed ? "A guardar..." : editandoMed ? "Atualizar" : "Registar medida"}
            </Button>
          </>
        }
      >
        <form onSubmit={guardarMedida} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nº do processo *</label>
              <input
                type="text"
                list="processos-disciplinares-sugeridos"
                value={medForm.numero_processo || ""}
                onChange={function (e) { setMedForm(Object.assign({}, medForm, { numero_processo: e.target.value })); escolherProcesso(e.target.value); }}
                placeholder="Ex.: PD-2026-0001"
                className={inputCls}
              />
              <datalist id="processos-disciplinares-sugeridos">
                {sugestoes.map(function (s) { return <option key={s.id} value={s.numero_processo}>{nomeColaborador(s)}</option>; })}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Trabalhador *</label>
              <select value={medForm.colaborador_id || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { colaborador_id: e.target.value })); }} className={inputCls}>
                <option value="">Selecionar trabalhador</option>
                {colaboradores.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>; })}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Infracção *</label>
              <textarea rows={3} value={medForm.infracao || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { infracao: e.target.value })); }} placeholder="Descreva a infracção e as normas violadas" className={inputCls + " resize-y"} />
            </div>
            <div>
              <label className={labelCls}>Medida aplicada *</label>
              <select value={medForm.medida || "Advertencia_escrita"} onChange={function (e) { setMedForm(Object.assign({}, medForm, { medida: e.target.value })); }} className={inputCls}>
                {MEDIDAS.map(function (m) { return <option key={m} value={m}>{MEDIDA_LABEL[m]}</option>; })}
              </select>
            </div>
            <div>
              <label className={labelCls}>Autoridade decisora</label>
              <input type="text" value={medForm.autoridade_decisora || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { autoridade_decisora: e.target.value })); }} placeholder="Ex.: Director Geral" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Fundamentação</label>
              <textarea rows={3} value={medForm.fundamentacao || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { fundamentacao: e.target.value })); }} placeholder="Fundamentos de facto e de direito da decisão" className={inputCls + " resize-y"} />
            </div>
            <div>
              <label className={labelCls}>Data da decisão</label>
              <input type="date" value={medForm.data_decisao || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { data_decisao: e.target.value })); }} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prazo limite</label>
              <input type="date" value={medForm.prazo_limite || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { prazo_limite: e.target.value })); }} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Início da medida</label>
              <input type="date" value={medForm.data_inicio || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { data_inicio: e.target.value })); }} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fim da medida</label>
              <input type="date" value={medForm.data_fim || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { data_fim: e.target.value })); }} className={inputCls} />
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant/20 space-y-4">
            <p className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wide">Notificação</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Data da notificação</label>
                <input type="date" value={medForm.notificacao_data || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { notificacao_data: e.target.value })); }} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Forma</label>
                <select value={medForm.notificacao_forma || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { notificacao_forma: e.target.value })); }} className={inputCls}>
                  <option value="">Selecionar</option>
                  {FORMAS_NOTIFICACAO.map(function (f) { return <option key={f} value={f}>{f}</option>; })}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Comprovativo</label>
                <FileUpload
                  hideLabel
                  value={medForm.comprovativo_url || ""}
                  nomeFicheiro={medForm.comprovativo_nome}
                  onChange={function (url, meta) { setMedForm(Object.assign({}, medForm, { comprovativo_url: url, comprovativo_nome: (meta && meta.nome_original) || "" })); }}
                  pasta="documentos"
                  accept=".pdf,.jpg,.jpeg,.png"
                  icone="attach_file"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-outline-variant/20">
            <div>
              <label className={labelCls}>Situação do processo</label>
              <select value={medForm.situacao || "Em_analise"} onChange={function (e) { setMedForm(Object.assign({}, medForm, { situacao: e.target.value })); }} className={inputCls}>
                {SITUACOES.map(function (s) { return <option key={s} value={s}>{SITUACAO_LABEL[s]}</option>; })}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Observações</label>
              <textarea rows={2} value={medForm.observacoes || ""} onChange={function (e) { setMedForm(Object.assign({}, medForm, { observacoes: e.target.value })); }} className={inputCls + " resize-y"} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Detalhe da medida */}
      <Modal
        isOpen={showMedView}
        onClose={function () { setShowMedView(false); }}
        title={"Medida disciplinar — processo " + (medView ? medView.numero_processo : "")}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={function () { setShowMedView(false); }}>Fechar</Button>
            {podeEditar && medView && (
              <Button variant="outline" onClick={function () { setShowMedView(false); abrirEditarMedida(medView); }}>
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Editar
              </Button>
            )}
          </>
        }
      >
        {medView && (function () {
          var prazo = textoPrazo(medView);
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wider">Processo</p>
                  <p className="text-[16px] font-bold text-on-surface font-mono">{medView.numero_processo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={SITUACAO_BADGE[medView.situacao] || "secondary"}>{SITUACAO_LABEL[medView.situacao] || medView.situacao}</Badge>
                  <span className={"text-[12px] " + prazo.classe}>{prazo.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Trabalhador</p>
                  <p className="text-[13px] font-semibold text-on-surface mt-1">{nomeColaborador(medView)}</p>
                  <p className="text-[11px] text-on-surface-variant/70 font-mono">{numColaborador(medView)}</p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Medida aplicada</p>
                  <p className="text-[13px] font-semibold text-on-surface mt-1">{MEDIDA_LABEL[medView.medida] || medView.medida}</p>
                  <p className="text-[11px] text-on-surface-variant/70">{medView.autoridade_decisora || "Autoridade não indicada"}</p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Decisão</p>
                  <p className="text-[13px] text-on-surface mt-1">{helpers.formatDate(medView.data_decisao)}</p>
                  {medView.data_inicio && <p className="text-[11px] text-on-surface-variant/70">Início: {helpers.formatDate(medView.data_inicio)}{medView.data_fim ? " · Fim: " + helpers.formatDate(medView.data_fim) : ""}</p>}
                </div>
                <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Notificação</p>
                  <p className="text-[13px] text-on-surface mt-1">{medView.notificacao_data ? helpers.formatDate(medView.notificacao_data) : "Ainda não registada"}</p>
                  <p className="text-[11px] text-on-surface-variant/70">{medView.notificacao_forma || "Forma não indicada"}</p>
                  {medView.comprovativo_url && (
                    <button onClick={function () { abrirAnexo(medView.comprovativo_url); }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-1">
                      <span className="material-symbols-outlined text-[13px]">attach_file</span>
                      Ver comprovativo
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Infracção</p>
                <p className="text-[13px] text-on-surface-variant/90 whitespace-pre-line">{medView.infracao}</p>
              </div>

              {medView.fundamentacao && (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Fundamentação</p>
                  <p className="text-[13px] text-on-surface-variant/90 whitespace-pre-line">{medView.fundamentacao}</p>
                </div>
              )}

              {medView.observacoes && (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Observações</p>
                  <p className="text-[13px] text-on-surface-variant/90 whitespace-pre-line">{medView.observacoes}</p>
                </div>
              )}

              {medView.registado_por_nome && (
                <p className="text-[11px] text-on-surface-variant/50">Registado por {medView.registado_por_nome} em {helpers.formatDate(medView.createdAt)}</p>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
