"use client";

import { useState, useEffect, useEffectEvent } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { getT } from "@/lib/translations";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

var TIPOS_CURSO = [
  { value: "Interno", label: "Interno" },
  { value: "Externo", label: "Externo" },
  { value: "Online", label: "Online" },
  { value: "Seminario", label: "Seminário" },
  { value: "Workshop", label: "Workshop" },
];

var ESTADOS_CURSO = [
  { value: "Planeado", label: "Planeado" },
  { value: "Em_curso", label: "Em Curso" },
  { value: "Concluido", label: "Concluído" },
  { value: "Cancelado", label: "Cancelado" },
];

var ESTADOS_INSCRICAO = [
  { value: "Inscrito", label: "Inscrito" },
  { value: "Concluido", label: "Concluído" },
  { value: "Abandonou", label: "Abandonou" },
  { value: "Certificado", label: "Certificado" },
];

var rotuloInscricao = function (estado) {
  var encontrado = ESTADOS_INSCRICAO.filter(function (e) { return e.value === estado; })[0];
  return encontrado ? encontrado.label : estado || "—";
};

var rotuloCurso = function (estado) {
  var encontrado = ESTADOS_CURSO.filter(function (e) { return e.value === estado; })[0];
  return encontrado ? encontrado.label : (estado || "—").replace("_", " ");
};

var rotuloTipo = function (tipo) {
  var encontrado = TIPOS_CURSO.filter(function (t) { return t.value === tipo; })[0];
  return encontrado ? encontrado.label : tipo || "—";
};

var defaultCursoForm = {
  nome: "",
  descricao: "",
  categoria: "",
  tipo: "Interno",
  horas: "",
  data_inicio: "",
  data_fim: "",
  vagas: "",
  local: "",
  nota_minima_aprovacao: 10,
  estado: "Planeado",
};

var defaultInscricaoForm = {
  curso_id: "",
  colaborador_id: "",
  estado: "Inscrito",
  concluida_manualmente: false,
  certificado: false,
  observacoes: "",
};

export default function FormacaoPage() {
  var t = getT();

  var [aba, setAba] = useState("cursos");

  var [cursos, setCursos] = useState([]);
  var [loadingCursos, setLoadingCursos] = useState(true);
  var [searchCurso, setSearchCurso] = useState("");
  var [filtroEstadoCurso, setFiltroEstadoCurso] = useState("");
  var [filtroTipoCurso, setFiltroTipoCurso] = useState("");
  var [paginacaoCursos, setPaginacaoCursos] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  var [inscricoes, setInscricoes] = useState([]);
  var [loadingInscricoes, setLoadingInscricoes] = useState(true);
  var [filtroCursoInsc, setFiltroCursoInsc] = useState("");
  var [filtroColabInsc, setFiltroColabInsc] = useState("");
  var [filtroEstadoInsc, setFiltroEstadoInsc] = useState("");
  var [paginacaoInsc, setPaginacaoInsc] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  var [showCursoModal, setShowCursoModal] = useState(false);
  var [editandoCurso, setEditandoCurso] = useState(null);
  var [cursoForm, setCursoForm] = useState({ ...defaultCursoForm });
  var [savingCurso, setSavingCurso] = useState(false);

  var [showInscricaoModal, setShowInscricaoModal] = useState(false);
  var [editandoInscricao, setEditandoInscricao] = useState(null);
  var [inscricaoForm, setInscricaoForm] = useState({ ...defaultInscricaoForm });
  var [savingInscricao, setSavingInscricao] = useState(false);

  var [showViewCurso, setShowViewCurso] = useState(false);
  var [cursoView, setCursoView] = useState(null);

  var [avaliacoes, setAvaliacoes] = useState([]);
  var [loadingAvaliacoes, setLoadingAvaliacoes] = useState(true);
  var [filtroCursoAv, setFiltroCursoAv] = useState("");
  var [filtroColabAv, setFiltroColabAv] = useState("");
  var [filtroResultadoAv, setFiltroResultadoAv] = useState("");
  var [paginacaoAv, setPaginacaoAv] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  var [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false);
  var [avaliacaoInscricao, setAvaliacaoInscricao] = useState(null);
  var [avaliacaoForm, setAvaliacaoForm] = useState({ nota_avaliacao: "", avaliacao_observacoes: "" });
  var [avaliacaoFile, setAvaliacaoFile] = useState(null);
  var [savingAvaliacao, setSavingAvaliacao] = useState(false);

  var [soComCertificado, setSoComCertificado] = useState(false);
  var [atalhoAplicado, setAtalhoAplicado] = useState(false);
  var [aConcluir, setAConcluir] = useState(null);

  var [msg, setMsg] = useState(null);

  var [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "", tipo: "" });

  var [cursosDropdown, setCursosDropdown] = useState([]);
  var [colaboradoresDropdown, setColaboradoresDropdown] = useState([]);

  var carregarCursos = async function (page) {
    page = page || 1;
    setLoadingCursos(true);
    try {
      var url = "/api/formacao/cursos?page=" + page + "&limit=15";
      if (searchCurso) url += "&search=" + encodeURIComponent(searchCurso);
      if (filtroEstadoCurso) url += "&estado=" + filtroEstadoCurso;
      if (filtroTipoCurso) url += "&tipo=" + filtroTipoCurso;
      var data = await api.get(url);
      setCursos(data.dados || []);
      setPaginacaoCursos(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingCursos(false);
    }
  };

  var carregarInscricoes = async function (page) {
    page = page || 1;
    setLoadingInscricoes(true);
    try {
      var url = "/api/formacao/inscricoes?page=" + page + "&limit=15";
      if (filtroCursoInsc) url += "&curso_id=" + filtroCursoInsc;
      if (filtroColabInsc) url += "&colaborador_id=" + filtroColabInsc;
      if (filtroEstadoInsc) url += "&estado=" + filtroEstadoInsc;
      if (soComCertificado) url += "&com_certificado=1";
      var data = await api.get(url);
      setInscricoes(data.dados || []);
      setPaginacaoInsc(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingInscricoes(false);
    }
  };

  var carregarAvaliacoes = async function (page) {
    page = page || 1;
    setLoadingAvaliacoes(true);
    try {
      var url = "/api/formacao/inscricoes?page=" + page + "&limit=15";
      if (filtroCursoAv) url += "&curso_id=" + encodeURIComponent(filtroCursoAv);
      if (filtroColabAv) url += "&colaborador_id=" + encodeURIComponent(filtroColabAv);
      if (filtroResultadoAv === "com_nota") url += "&com_nota=1";
      else if (filtroResultadoAv === "sem_nota") url += "&sem_nota=1";
      else if (filtroResultadoAv) url += "&resultado=" + encodeURIComponent(filtroResultadoAv);
      var data = await api.get(url);
      setAvaliacoes(data.dados || []);
      setPaginacaoAv(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingAvaliacoes(false);
    }
  };

  var carregarDropdowns = async function () {
    try {
      var cData = await api.get("/api/formacao/cursos?limit=200");
      setCursosDropdown(cData.dados || []);
    } catch (e) { /* ignore */ }
    try {
      var colData = await api.get("/api/colaboradores?limit=200");
      setColaboradoresDropdown(colData.dados || []);
    } catch (e) { /* ignore */ }
  };

  // React 19.2: efeitos só sincronizam; a lógica de carregamento (que actualiza
  // estado) fica em Effect Events, estáveis e fora da lista de dependências.
  var carregarDropdownsEvent = useEffectEvent(function () { carregarDropdowns(); });
  var carregarCursosEvent = useEffectEvent(function (pagina) { carregarCursos(pagina); });
  var carregarInscricoesEvent = useEffectEvent(function (pagina) { carregarInscricoes(pagina); });
  var carregarAvaliacoesEvent = useEffectEvent(function (pagina) { carregarAvaliacoes(pagina); });

  useEffect(function () {
    // Carregamento inicial das listas auxiliares. O Effect Event actualiza
    // estado apenas após a resposta da API; a sinalização de "a carregar" é
    // intencional e não cria cascata de renders (o efeito corre uma vez).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDropdownsEvent();
  }, []);

  // Recarrega os cursos quando a pesquisa/filtros de cursos mudam (debounce)
  useEffect(function () {
    if (aba !== "cursos") return;
    var timer = setTimeout(function () { carregarCursosEvent(1); }, searchCurso ? 400 : 0);
    return function () { clearTimeout(timer); };
  }, [aba, searchCurso, filtroEstadoCurso, filtroTipoCurso]);

  // Recarrega as inscrições quando os filtros de inscrições mudam
  useEffect(function () {
    if (aba !== "inscricoes") return;
    // Recarrega a lista quando os filtros mudam; ver nota no efeito inicial.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarInscricoesEvent(1);
  }, [aba, filtroCursoInsc, filtroColabInsc, filtroEstadoInsc, soComCertificado]);

  // Recarrega as avaliações quando os filtros da aba mudam
  useEffect(function () {
    if (aba !== "avaliacoes") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarAvaliacoesEvent(1);
  }, [aba, filtroCursoAv, filtroColabAv, filtroResultadoAv]);

  var abrirNovoCurso = function () {
    setEditandoCurso(null);
    setCursoForm({ ...defaultCursoForm });
    setShowCursoModal(true);
    setMsg(null);
  };

  var abrirEditarCurso = function (c) {
    setEditandoCurso(c);
    setCursoForm({
      nome: c.nome || "",
      descricao: c.descricao || "",
      categoria: c.categoria || "",
      tipo: c.tipo || "Interno",
      horas: c.horas || "",
      data_inicio: c.data_inicio ? c.data_inicio.substring(0, 10) : "",
      data_fim: c.data_fim ? c.data_fim.substring(0, 10) : "",
      vagas: c.vagas || "",
      local: c.local || "",
      nota_minima_aprovacao: c.nota_minima_aprovacao != null ? c.nota_minima_aprovacao : 10,
      estado: c.estado || "Planeado",
    });
    setShowCursoModal(true);
    setMsg(null);
  };

  var guardarCurso = async function (e) {
    e.preventDefault();
    setSavingCurso(true);
    setMsg(null);
    try {
      if (editandoCurso) {
        await api.put("/api/formacao/cursos/" + editandoCurso.id, cursoForm);
        setMsg({ tipo: "sucesso", texto: "Curso atualizado com sucesso" });
      } else {
        await api.post("/api/formacao/cursos", cursoForm);
        setMsg({ tipo: "sucesso", texto: "Curso criado com sucesso" });
      }
      setShowCursoModal(false);
      carregarCursos(paginacaoCursos.pagina);
      carregarDropdowns();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSavingCurso(false);
    }
  };

  var eliminarCurso = async function () {
    try {
      await api.delete("/api/formacao/cursos/" + confirmDelete.id);
      setMsg({ tipo: "sucesso", texto: "Curso eliminado com sucesso" });
      setConfirmDelete({ open: false, id: null, nome: "", tipo: "" });
      carregarCursos(paginacaoCursos.pagina);
      carregarDropdowns();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  var abrirVerCurso = async function (c) {
    try {
      var data = await api.get("/api/formacao/cursos/" + c.id);
      setCursoView(data.dados || c);
    } catch (e) {
      setCursoView(c);
    }
    setShowViewCurso(true);
  };

  var abrirNovoInscricao = function () {
    setEditandoInscricao(null);
    setInscricaoForm({ ...defaultInscricaoForm });
    setAtalhoAplicado(false);
    setShowInscricaoModal(true);
    setMsg(null);
  };

  var abrirEditarInscricao = function (ins) {
    setEditandoInscricao(ins);
    setInscricaoForm({
      curso_id: ins.curso_id || (ins.curso && ins.curso.id) || "",
      colaborador_id: ins.colaborador_id || (ins.colaborador && ins.colaborador.id) || "",
      estado: ins.estado || "Inscrito",
      concluida_manualmente: !!ins.concluida_manualmente,
      certificado: ins.certificado || false,
      observacoes: ins.observacoes || "",
    });
    setAtalhoAplicado(false);
    setShowInscricaoModal(true);
    setMsg(null);
  };

  var guardarInscricao = async function (e) {
    e.preventDefault();
    setSavingInscricao(true);
    setMsg(null);
    try {
      if (editandoInscricao) {
        await api.put("/api/formacao/inscricoes/" + editandoInscricao.id, inscricaoForm);
      } else {
        await api.post("/api/formacao/inscricoes", inscricaoForm);
      }

      var nomeCurso = cursosDropdown.filter(function (c) { return c.id === inscricaoForm.curso_id; })[0];
      var nomeColab = colaboradoresDropdown.filter(function (c) { return c.id === inscricaoForm.colaborador_id; })[0];
      var descricao = (nomeCurso ? nomeCurso.nome : "Curso") + " · " +
        (nomeColab ? nomeColab.nome_completo : "Colaborador");

      setMsg({
        tipo: "sucesso",
        texto: (editandoInscricao ? "Inscrição atualizada" : "Inscrição criada") + " com sucesso: " + descricao,
      });
      setShowInscricaoModal(false);
      if (!editandoInscricao) setAba("inscricoes");
      carregarInscricoes(editandoInscricao ? paginacaoInsc.pagina : 1);
      carregarAvaliacoes(paginacaoAv.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSavingInscricao(false);
    }
  };

  var eliminarInscricao = async function () {
    try {
      await api.delete("/api/formacao/inscricoes/" + confirmDelete.id);
      setMsg({ tipo: "sucesso", texto: "Inscrição eliminada com sucesso" });
      setConfirmDelete({ open: false, id: null, nome: "", tipo: "" });
      carregarInscricoes(paginacaoInsc.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  var descarregarCertificado = async function (ins) {
    setMsg(null);
    try {
      var blob = await api.getBlob(
        "/api/formacao/inscricoes/" + ins.id + "/certificado",
        "Não foi possível descarregar o certificado"
      );
      var url = window.URL.createObjectURL(blob);
      var ligacao = document.createElement("a");
      ligacao.href = url;
      ligacao.download = ins.certificado_nome || "certificado.pdf";
      document.body.appendChild(ligacao);
      ligacao.click();
      document.body.removeChild(ligacao);
      setTimeout(function () { window.URL.revokeObjectURL(url); }, 60000);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  var removerCertificado = async function (ins) {
    setMsg(null);
    try {
      await api.delete("/api/formacao/inscricoes/" + ins.id + "/certificado");
      setMsg({ tipo: "sucesso", texto: "Documento removido com sucesso" });
      carregarInscricoes(paginacaoInsc.pagina);
      carregarAvaliacoes(paginacaoAv.pagina);
      if (showAvaliacaoModal && avaliacaoInscricao && avaliacaoInscricao.id === ins.id) {
        setAvaliacaoInscricao(Object.assign({}, avaliacaoInscricao, { tem_certificado: false, certificado_nome: null }));
      }
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  var concluirManualmente = async function (ins) {
    setAConcluir(ins.id);
    setMsg(null);
    try {
      await api.put("/api/formacao/inscricoes/" + ins.id, { concluida_manualmente: true });
      setMsg({ tipo: "sucesso", texto: "Formação dada como concluída manualmente" });
      carregarInscricoes(paginacaoInsc.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setAConcluir(null);
    }
  };

  var notaMinimaDe = function (ins) {
    return ins && ins.nota_minima_aprovacao != null ? Number(ins.nota_minima_aprovacao) : 10;
  };

  var resultadoPrevisto = function (nota, ins) {
    if (nota === "" || nota === null || nota === undefined) return null;
    var valor = Number(nota);
    if (isNaN(valor)) return null;
    return valor >= notaMinimaDe(ins) ? "Aprovado" : "Reprovado";
  };

  var abrirAvaliar = function (ins) {
    setAvaliacaoInscricao(ins);
    setAvaliacaoForm({
      nota_avaliacao: ins.nota_avaliacao != null ? ins.nota_avaliacao : "",
      avaliacao_observacoes: ins.avaliacao_observacoes || "",
    });
    setAvaliacaoFile(null);
    setShowAvaliacaoModal(true);
    setMsg(null);
  };

  var guardarAvaliacao = async function (e) {
    e.preventDefault();
    if (!avaliacaoInscricao) return;
    if (avaliacaoFile && !/\.(pdf|png|jpe?g)$/i.test(avaliacaoFile.name)) {
      setMsg({ tipo: "erro", texto: "Formato de documento inválido. Aceita apenas PDF, PNG ou JPG." });
      return;
    }
    if (avaliacaoFile && avaliacaoFile.size > 2 * 1024 * 1024) {
      setMsg({ tipo: "erro", texto: "O documento não pode exceder 2 MB." });
      return;
    }
    setSavingAvaliacao(true);
    setMsg(null);
    try {
      var dados = new FormData();
      dados.append("nota_avaliacao", avaliacaoForm.nota_avaliacao);
      dados.append("avaliacao_observacoes", avaliacaoForm.avaliacao_observacoes || "");
      if (avaliacaoFile) dados.append("certificado", avaliacaoFile);
      var resposta = await api.upload(
        "/api/formacao/inscricoes/" + avaliacaoInscricao.id + "/avaliacao",
        dados,
        "PUT"
      );
      setMsg({
        tipo: resposta.documento_erro ? "aviso" : "sucesso",
        texto: resposta.mensagem || "Avaliação registada com sucesso",
      });
      setShowAvaliacaoModal(false);
      carregarAvaliacoes(paginacaoAv.pagina);
      carregarInscricoes(paginacaoInsc.pagina);
    } catch (erro) {
      setMsg({ tipo: "erro", texto: erro.message });
    } finally {
      setSavingAvaliacao(false);
    }
  };

  // Atalho "concluir e certificar": regista apenas a conclusão e a intenção
  // de certificado. A nota e o resultado são atribuídos na aba «Avaliações»,
  // onde também é anexado o documento.
  var preencherConclusaoECertificado = function () {
    setInscricaoForm(function (prev) {
      return Object.assign({}, prev, {
        estado: "Certificado",
        concluida_manualmente: true,
        certificado: true,
      });
    });
    setAtalhoAplicado(true);
  };

  var handleCursoInput = function (e) {
    setCursoForm(function (prev) {
      var next = {};
      var keys = Object.keys(prev);
      for (var i = 0; i < keys.length; i++) {
        next[keys[i]] = prev[keys[i]];
      }
      next[e.target.name] = e.target.value;
      return next;
    });
  };

  var handleInscricaoInput = function (e) {
    setInscricaoForm(function (prev) {
      var next = {};
      var keys = Object.keys(prev);
      for (var i = 0; i < keys.length; i++) {
        next[keys[i]] = prev[keys[i]];
      }
      next[e.target.name] = e.target.value;
      return next;
    });
  };

  var getTipoBadgeClass = function (tipo) {
    var map = {
      "Interno": "badge-primary",
      "Externo": "badge-warning",
      "Online": "badge-info",
      "Seminario": "badge-secondary",
      "Workshop": "badge-success",
    };
    return map[tipo] || "badge-secondary";
  };

  var getInscricaoEstadoBadge = function (estado) {
    var map = {
      "Inscrito": "badge-info",
      "Concluido": "badge-success",
      "Abandonou": "badge-danger",
      "Certificado": "badge-success",
    };
    return map[estado] || "badge-secondary";
  };

  var cursoFilters = [];
  if (filtroEstadoCurso) cursoFilters.push({ label: "Estado: " + filtroEstadoCurso, onClear: function () { setFiltroEstadoCurso(""); } });
  if (filtroTipoCurso) cursoFilters.push({ label: "Tipo: " + filtroTipoCurso, onClear: function () { setFiltroTipoCurso(""); } });

  var inscFilters = [];
  if (filtroCursoInsc) inscFilters.push({ label: "Curso", onClear: function () { setFiltroCursoInsc(""); } });
  if (filtroColabInsc) inscFilters.push({ label: "Colaborador", onClear: function () { setFiltroColabInsc(""); } });
  if (filtroEstadoInsc) inscFilters.push({ label: "Estado: " + rotuloInscricao(filtroEstadoInsc), onClear: function () { setFiltroEstadoInsc(""); } });
  if (soComCertificado) inscFilters.push({ label: "Com certificado", onClear: function () { setSoComCertificado(false); } });

  var renderPagination = function (pag, carregarFn) {
    if (pag.total_paginas <= 1) return null;
    var pages = [];
    var total = Math.min(pag.total_paginas, 7);
    for (var i = 1; i <= total; i++) {
      pages.push(i);
    }
    return (
      <div className="flex items-center gap-1.5">
        {pages.map(function (p) {
          return (
            <button key={p} onClick={function () { carregarFn(p); }} className={"w-8 h-8 rounded-lg text-[13px] font-medium transition-all " + (p === pag.pagina ? "bg-primary text-white font-bold" : "hover:bg-primary/5 text-on-surface-variant")}>
              {p}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo={confirmDelete.tipo === "curso" ? "Eliminar Curso" : "Eliminar Inscrição"}
        mensagem={confirmDelete.tipo === "curso"
          ? "Tem certeza que deseja eliminar o curso \"" + confirmDelete.nome + "\"?"
          : "Tem certeza que deseja eliminar esta inscrição?"}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={confirmDelete.tipo === "curso" ? eliminarCurso : eliminarInscricao}
        onCancel={function () { setConfirmDelete({ open: false, id: null, nome: "", tipo: "" }); }}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>Desenvolvimento</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Formação</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">Formação e Desenvolvimento</h1>
        </div>
        <div className="flex items-center gap-3">
          {(aba === "cursos" || aba === "inscricoes") && (
            <button onClick={aba === "cursos" ? abrirNovoCurso : abrirNovoInscricao} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              {aba === "cursos" ? "Novo Curso" : "Nova Inscrição"}
            </button>
          )}
        </div>
      </section>

      <div className="flex gap-1 border-b border-outline-variant/20">
        <button onClick={function () { setAba("cursos"); }} className={"flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors border-b-2 " + (aba === "cursos" ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface border-transparent")}>
          <span className="material-symbols-outlined text-[18px]">school</span>
          Cursos
        </button>
        <button onClick={function () { setAba("inscricoes"); }} className={"flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors border-b-2 " + (aba === "inscricoes" ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface border-transparent")}>
          <span className="material-symbols-outlined text-[18px]">badge</span>
          Inscrições
        </button>
        <button onClick={function () { setAba("avaliacoes"); }} className={"flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors border-b-2 " + (aba === "avaliacoes" ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface border-transparent")}>
          <span className="material-symbols-outlined text-[18px]">grade</span>
          Avaliações
        </button>
      </div>

      {msg && (
        <div className={"p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 " + (msg.tipo === "sucesso" ? "badge-success border border-success/10" : msg.tipo === "aviso" ? "badge-warning border border-warning/10" : "badge-danger border border-error/10")}>
          <span className="material-symbols-outlined text-[18px]">{msg.tipo === "sucesso" ? "check_circle" : msg.tipo === "aviso" ? "warning" : "error"}</span>
          {msg.texto}
          <button onClick={function () { setMsg(null); }} className="ml-auto hover:opacity-60">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {aba === "cursos" && (
        <>
          <section className="glass-panel p-5 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-grow space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Curso</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                  <input
                    type="text"
                    placeholder="Nome do curso..."
                    value={searchCurso}
                    onChange={function (e) { setSearchCurso(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter") carregarCursos(1); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
                  <select value={filtroEstadoCurso} onChange={function (e) { setFiltroEstadoCurso(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Todos</option>
                    {ESTADOS_CURSO.map(function (e) { return <option key={e.value} value={e.value}>{e.label}</option>; })}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Tipo</label>
                  <select value={filtroTipoCurso} onChange={function (e) { setFiltroTipoCurso(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Todos</option>
                    {TIPOS_CURSO.map(function (tp) { return <option key={tp.value} value={tp.value}>{tp.label}</option>; })}
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <button onClick={function () { carregarCursos(1); }} className="w-full px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                    Filtrar
                  </button>
                </div>
              </div>
            </div>
            {cursoFilters.length > 0 && (
              <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros activos:</span>
                {cursoFilters.map(function (f, i) {
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                      {f.label}
                      <button onClick={f.onClear} className="hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
                    </span>
                  );
                })}
                <button onClick={function () { setFiltroEstadoCurso(""); setFiltroTipoCurso(""); setSearchCurso(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
              </div>
            )}
          </section>

          <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse data-grid-tight">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant/20">
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Período</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Vagas</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Local</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loadingCursos ? (
                    [1,2,3,4,5].map(function (i) {
                      return (
                        <tr key={i}><td colSpan={7} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                      );
                    })
                  ) : cursos.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">school</span>
                      <p className="text-on-surface-variant font-medium">Nenhum curso encontrado</p>
                      <p className="text-[13px] text-outline mt-1">Clique em &quot;Novo Curso&quot; para adicionar</p>
                    </td></tr>
                  ) : (
                    cursos.map(function (c) {
                      return (
                        <tr key={c.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{c.nome}</span>
                              {c.categoria && <span className="text-[12px] text-on-surface-variant/70">{c.categoria}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + getTipoBadgeClass(c.tipo)}>
                              {c.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface-variant text-[13px]">
                              {helpers.formatDate(c.data_inicio)} - {helpers.formatDate(c.data_fim)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface">
                              {c.vagas == null ? "—" : (c.vagas_ocupadas || 0) + " / " + c.vagas}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface-variant text-[13px]">{c.local || "—"}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + helpers.getEstadoBadgeClass(c.estado)}>
                              <span className={"w-1.5 h-1.5 rounded-full " + (c.estado === "Concluido" ? "bg-success" : c.estado === "Em_curso" ? "bg-info" : c.estado === "Cancelado" ? "bg-error" : "bg-outline")} />
                              {rotuloCurso(c.estado)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end">
                              <button onClick={function () { abrirVerCurso(c); }} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                              </button>
                              <button onClick={function () { abrirEditarCurso(c); }} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button onClick={function () { setConfirmDelete({ open: true, id: c.id, nome: c.nome, tipo: "curso" }); }} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
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
                Exibindo {cursos.length} de {paginacaoCursos.total} cursos
              </div>
              {renderPagination(paginacaoCursos, carregarCursos)}
            </div>
          </section>
        </>
      )}

      {aba === "inscricoes" && (
        <>
          <section className="glass-panel p-5 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-grow space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Curso</label>
                <select value={filtroCursoInsc} onChange={function (e) { setFiltroCursoInsc(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos os cursos</option>
                  {cursosDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome}</option>; })}
                </select>
              </div>
              <div className="flex-grow space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Colaborador</label>
                <select value={filtroColabInsc} onChange={function (e) { setFiltroColabInsc(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos os colaboradores</option>
                  {colaboradoresDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>; })}
                </select>
              </div>
              <div className="space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
                <select value={filtroEstadoInsc} onChange={function (e) { setFiltroEstadoInsc(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos</option>
                  {ESTADOS_INSCRICAO.map(function (e) { return <option key={e.value} value={e.value}>{e.label}</option>; })}
                </select>
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <button
                  onClick={function () { setSoComCertificado(!soComCertificado); }}
                  className={"px-4 py-2.5 border rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors " + (soComCertificado ? "border-success/40 bg-success/10 text-success" : "border-outline-variant/50 text-on-surface-variant hover:bg-primary/5")}
                  title="Mostrar apenas inscrições com certificado carregado"
                >
                  <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                  Com certificado
                </button>
                <button onClick={function () { carregarInscricoes(1); }} className="px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                  Filtrar
                </button>
              </div>
            </div>
            {inscFilters.length > 0 && (
              <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros activos:</span>
                {inscFilters.map(function (f, i) {
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                      {f.label}
                      <button onClick={f.onClear} className="hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
                    </span>
                  );
                })}
                <button onClick={function () { setFiltroCursoInsc(""); setFiltroColabInsc(""); setFiltroEstadoInsc(""); setSoComCertificado(false); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
              </div>
            )}
          </section>

          <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse data-grid-tight">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant/20">
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Colaborador</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Curso</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Data Inscrição</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Progresso</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Resultado</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Certificado</th>
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loadingInscricoes ? (
                    [1,2,3,4,5].map(function (i) {
                      return (
                        <tr key={i}><td colSpan={9} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                      );
                    })
                  ) : inscricoes.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">badge</span>
                      <p className="text-on-surface-variant font-medium">Nenhuma inscrição encontrada</p>
                      <p className="text-[13px] text-outline mt-1">Clique em &quot;Nova Inscrição&quot; para adicionar</p>
                    </td></tr>
                  ) : (
                    inscricoes.map(function (ins) {
                      var colabNome = ins.colaborador ? ins.colaborador.nome_completo : "—";
                      var colabNum = ins.colaborador ? ins.colaborador.numero_colaborador : "";
                      var cursoNome = ins.curso ? ins.curso.nome : "—";
                      return (
                        <tr key={ins.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{colabNome}</span>
                              {colabNum && <span className="text-[12px] text-on-surface-variant/70">{colabNum}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface-variant text-[13px]">{cursoNome}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface-variant text-[13px]">{helpers.formatDate(ins.data_inscricao)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + getInscricaoEstadoBadge(ins.estado)}>
                              <span className={"w-1.5 h-1.5 rounded-full " + (ins.estado === "Concluido" || ins.estado === "Certificado" ? "bg-success" : ins.estado === "Abandonou" ? "bg-error" : "bg-info")} />
                              {rotuloInscricao(ins.estado)}
                            </span>
                            {ins.em_atraso && <span className="block text-[11px] text-warning font-semibold mt-1">Em atraso</span>}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-surface-container overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: (ins.progresso || 0) + "%" }} />
                              </div>
                              <span className="text-[12px] font-semibold text-on-surface-variant">{ins.progresso || 0}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-on-surface font-medium">
                                {ins.nota_avaliacao != null && ins.nota_avaliacao !== "" ? ins.nota_avaliacao + " / 20" : "—"}
                              </span>
                              {ins.resultado && <span className="text-[12px] text-on-surface-variant/70">{ins.resultado}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {ins.tem_certificado ? (
                              <button onClick={function () { descarregarCertificado(ins); }} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-success/30 text-success hover:bg-success/10 text-[11px] font-bold transition-colors" title="Descarregar certificado">
                                <span className="material-symbols-outlined text-[15px]">download</span>
                                Ficheiro
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase badge-secondary px-2 py-0.5 rounded" title={ins.certificado_sem_ficheiro ? "Certificado marcado mas sem ficheiro carregado" : "Ainda sem certificado"}>
                                <span className="material-symbols-outlined text-[14px]">{ins.certificado_sem_ficheiro ? "warning" : "hourglass_empty"}</span>
                                {ins.certificado_sem_ficheiro ? "Sem ficheiro" : "Pendente"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end">
                              {!ins.concluida && ins.estado !== "Abandonou" && (
                                <button onClick={function () { concluirManualmente(ins); }} disabled={aConcluir === ins.id} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all disabled:opacity-50" title="Dar como concluída manualmente">
                                  <span className="material-symbols-outlined text-[15px]">task_alt</span>
                                </button>
                              )}
                              <button onClick={function () { abrirEditarInscricao(ins); }} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button onClick={function () { setConfirmDelete({ open: true, id: ins.id, nome: "", tipo: "inscrição" }); }} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
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
                Exibindo {inscricoes.length} de {paginacaoInsc.total} inscrições
              </div>
              {renderPagination(paginacaoInsc, carregarInscricoes)}
            </div>
          </section>
        </>
      )}

      {aba === "avaliacoes" && (
        <>
          <section className="glass-panel p-5 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-grow space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Curso</label>
                <select value={filtroCursoAv} onChange={function (e) { setFiltroCursoAv(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos os cursos</option>
                  {cursosDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome}</option>; })}
                </select>
              </div>
              <div className="flex-grow space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Colaborador</label>
                <select value={filtroColabAv} onChange={function (e) { setFiltroColabAv(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos os colaboradores</option>
                  {colaboradoresDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>; })}
                </select>
              </div>
              <div className="space-y-2 w-full lg:w-auto">
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Resultado</label>
                <select value={filtroResultadoAv} onChange={function (e) { setFiltroResultadoAv(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todas</option>
                  <option value="sem_nota">Por avaliar</option>
                  <option value="com_nota">Já avaliadas</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Reprovado">Reprovado</option>
                </select>
              </div>
              <div className="flex items-end pb-0.5">
                <button onClick={function () { carregarAvaliacoes(1); }} className="px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                  Filtrar
                </button>
              </div>
            </div>
          </section>

          <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">grade</span>
              <h2 className="text-[15px] font-bold text-on-surface">Avaliações e documentos</h2>
              <span className="text-[12px] text-on-surface-variant/70">({paginacaoAv.total})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse data-grid-tight">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant/20">
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Colaborador</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Curso</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Inscrição</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nota</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Resultado</th>
                    <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Documento</th>
                    <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loadingAvaliacoes ? (
                    [1,2,3,4,5].map(function (i) {
                      return <tr key={i}><td colSpan={7} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>;
                    })
                  ) : avaliacoes.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">grade</span>
                      <p className="text-on-surface-variant font-medium">Nenhuma inscrição encontrada</p>
                      <p className="text-[13px] text-outline mt-1">Crie a inscrição na aba «Inscrições» para poder avaliar.</p>
                    </td></tr>
                  ) : (
                    avaliacoes.map(function (av) {
                      var colab = av.colaborador || {};
                      var curso = av.curso || {};
                      var classeResultado = av.resultado === "Aprovado" ? "badge-success" : av.resultado === "Reprovado" ? "badge-danger" : "badge-secondary";
                      return (
                        <tr key={av.id} className="hover:bg-primary/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{colab.nome_completo || "—"}</span>
                              {colab.numero_colaborador && <span className="text-[12px] text-on-surface-variant/70">{colab.numero_colaborador}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-on-surface-variant text-[13px]">{curso.nome || "—"}</td>
                          <td className="px-4 py-4 text-on-surface-variant text-[13px]">{helpers.formatDate(av.data_inscricao)}</td>
                          <td className="px-4 py-4">
                            <span className="text-on-surface font-bold">
                              {av.nota_avaliacao != null ? av.nota_avaliacao + " / 20" : "—"}
                            </span>
                            <span className="block text-[11px] text-on-surface-variant/60">Mín. {notaMinimaDe(av)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + classeResultado}>
                              {av.resultado || "Por avaliar"}
                            </span>
                            {av.data_avaliacao && <span className="block text-[11px] text-on-surface-variant/60 mt-1">{helpers.formatDate(av.data_avaliacao)}</span>}
                          </td>
                          <td className="px-4 py-4">
                            {av.tem_certificado ? (
                              <div className="flex items-center gap-1.5">
                                <button onClick={function () { descarregarCertificado(av); }} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-success/30 text-success hover:bg-success/10 text-[11px] font-bold transition-colors" title="Descarregar documento">
                                  <span className="material-symbols-outlined text-[15px]">download</span>
                                  Descarregar
                                </button>
                                <button onClick={function () { removerCertificado(av); }} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-error/30 text-error hover:bg-error/10 text-[11px] font-bold transition-colors" title="Remover documento">
                                  <span className="material-symbols-outlined text-[15px]">delete</span>
                                  Remover
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase badge-secondary px-2 py-0.5 rounded">
                                <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={function () { abrirAvaliar(av); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 text-[12px] font-bold transition-colors">
                              <span className="material-symbols-outlined text-[16px]">{av.avaliacao_registada ? "edit" : "grade"}</span>
                              {av.avaliacao_registada ? "Reavaliar" : "Avaliar"}
                            </button>
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
                Exibindo {avaliacoes.length} de {paginacaoAv.total} inscrições
              </div>
              {renderPagination(paginacaoAv, carregarAvaliacoes)}
            </div>
          </section>
        </>
      )}

      {showCursoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowCursoModal(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editandoCurso ? "Editar Curso" : "Novo Curso"}</h3>
              <button onClick={function () { setShowCursoModal(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={guardarCurso} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome *</label>
                  <input name="nome" value={cursoForm.nome} onChange={handleCursoInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Descrição</label>
                  <textarea name="descricao" value={cursoForm.descricao} onChange={handleCursoInput} rows={3} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Categoria</label>
                  <input name="categoria" value={cursoForm.categoria} onChange={handleCursoInput} placeholder="Ex: Seguranca, Gestao, TI" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Tipo</label>
                  <select name="tipo" value={cursoForm.tipo} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {TIPOS_CURSO.map(function (tp) { return <option key={tp.value} value={tp.value}>{tp.label}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Horas</label>
                  <input name="horas" type="number" min="0" value={cursoForm.horas} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Vagas</label>
                  <input name="vagas" type="number" min="0" value={cursoForm.vagas} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Início</label>
                  <input name="data_inicio" type="date" value={cursoForm.data_inicio} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data Fim</label>
                  <input name="data_fim" type="date" value={cursoForm.data_fim} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Local</label>
                  <input name="local" value={cursoForm.local} onChange={handleCursoInput} placeholder="Ex: Sala de Formacao, Online" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nota mínima para aprovação (0-20)</label>
                  <input name="nota_minima_aprovacao" type="number" min="0" max="20" step="0.5" value={cursoForm.nota_minima_aprovacao} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado</label>
                  <select name="estado" value={cursoForm.estado} onChange={handleCursoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {ESTADOS_CURSO.map(function (e) { return <option key={e.value} value={e.value}>{e.label}</option>; })}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={function () { setShowCursoModal(false); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingCurso} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{savingCurso ? "hourglass_empty" : "save"}</span>
                  {savingCurso ? "A guardar..." : editandoCurso ? "Actualizar" : "Criar Curso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInscricaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowInscricaoModal(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editandoInscricao ? "Editar Inscrição" : "Nova Inscrição"}</h3>
              <button onClick={function () { setShowInscricaoModal(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={guardarInscricao} className="p-6">
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[22px]">workspace_premium</span>
                  <div>
                    <p className="text-[13px] font-bold text-on-surface">Conclusão + certificado</p>
                    <p className="text-[12px] text-on-surface-variant">A inscrição fica concluída ao guardar, com a data de fim do curso. A nota, o resultado e o documento são registados na aba «Avaliações».</p>
                    {atalhoAplicado && (
                      <p className="text-[11px] text-success font-semibold mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Aplicado. Guarde a inscrição para registar a conclusão.
                      </p>
                    )}
                  </div>
                </div>
                <button type="button" onClick={preencherConclusaoECertificado} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-[12px] font-bold rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 shrink-0">
                  <span className="material-symbols-outlined text-[17px]">task_alt</span>
                  Concluir e certificar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Curso *</label>
                  <select name="curso_id" value={inscricaoForm.curso_id} onChange={handleInscricaoInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Selecionar curso</option>
                    {cursosDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome}</option>; })}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador *</label>
                  <select name="colaborador_id" value={inscricaoForm.colaborador_id} onChange={handleInscricaoInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Selecionar colaborador</option>
                    {colaboradoresDropdown.map(function (c) { return <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado</label>
                  <select name="estado" value={inscricaoForm.estado} onChange={handleInscricaoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {ESTADOS_INSCRICAO.map(function (e) { return <option key={e.value} value={e.value}>{e.label}</option>; })}
                  </select>
                </div>
                <div className="sm:col-span-2 rounded-lg bg-background/50 border border-outline-variant/20 p-3">
                  <p className="text-[12px] text-on-surface-variant flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                    As horas e a data de conclusão são tomadas do curso (carga horária e data de fim). O progresso é calculado entre a data de início e a data de fim do curso.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Observações</label>
                  <textarea name="observacoes" value={inscricaoForm.observacoes} onChange={handleInscricaoInput} rows={3} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={function () { setShowInscricaoModal(false); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingInscricao} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{savingInscricao ? "hourglass_empty" : "save"}</span>
                  {savingInscricao ? "A guardar..." : editandoInscricao ? "Atualizar" : "Criar Inscrição"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAvaliacaoModal && avaliacaoInscricao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowAvaliacaoModal(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">
                {avaliacaoInscricao.avaliacao_registada ? "Reavaliar Formação" : "Registar Avaliação"}
              </h3>
              <button onClick={function () { setShowAvaliacaoModal(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={guardarAvaliacao} className="p-6 space-y-5">
              <div className="rounded-lg bg-primary/5 border border-primary/15 p-4 space-y-1">
                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">Colaborador</p>
                <p className="text-[14px] font-bold text-on-surface">
                  {avaliacaoInscricao.colaborador ? avaliacaoInscricao.colaborador.nome_completo : "—"}
                </p>
                <p className="text-[12px] text-on-surface-variant">
                  {avaliacaoInscricao.curso ? avaliacaoInscricao.curso.nome : "—"}
                  {" · inscrito em " + helpers.formatDate(avaliacaoInscricao.data_inscricao)}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nota de Avaliação (0-20) *</label>
                <input
                  name="nota_avaliacao"
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  required
                  value={avaliacaoForm.nota_avaliacao}
                  onChange={function (e) { setAvaliacaoForm(function (prev) { return Object.assign({}, prev, { nota_avaliacao: e.target.value }); }); }}
                  className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="text-[11px] text-outline mt-1">Nota mínima para aprovação neste curso: {notaMinimaDe(avaliacaoInscricao)} valores.</p>
              </div>

              <div className={"rounded-lg border p-4 flex items-center justify-between gap-3 " + (resultadoPrevisto(avaliacaoForm.nota_avaliacao, avaliacaoInscricao) === "Aprovado" ? "border-success/20 bg-success/5" : resultadoPrevisto(avaliacaoForm.nota_avaliacao, avaliacaoInscricao) === "Reprovado" ? "border-error/20 bg-error/5" : "border-outline-variant/30 bg-background/40")}>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Resultado automático</p>
                  <p className="text-[16px] font-bold text-on-surface mt-0.5">
                    {resultadoPrevisto(avaliacaoForm.nota_avaliacao, avaliacaoInscricao) || "Introduza a nota"}
                  </p>
                </div>
                <span className="material-symbols-outlined text-[30px] text-primary/60">
                  {resultadoPrevisto(avaliacaoForm.nota_avaliacao, avaliacaoInscricao) === "Aprovado" ? "verified" : "gpp_bad"}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Observações da avaliação</label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={avaliacaoForm.avaliacao_observacoes}
                  onChange={function (e) { setAvaliacaoForm(function (prev) { return Object.assign({}, prev, { avaliacao_observacoes: e.target.value }); }); }}
                  placeholder="Ex.: Demonstrou domínio dos conteúdos, participação activa..."
                  className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Documento / Certificado (PDF, PNG ou JPG)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={function (e) { setAvaliacaoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null); }}
                  className="w-full text-[12px] text-on-surface-variant file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-bold file:cursor-pointer hover:file:bg-primary/20"
                />
                {avaliacaoFile && (
                  <p className="text-[11px] text-success font-semibold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">attach_file</span>
                    {avaliacaoFile.name} — será anexado ao confirmar
                  </p>
                )}
                {avaliacaoInscricao.tem_certificado && !avaliacaoFile && (
                  <p className="text-[11px] text-on-surface-variant/70 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Já existe um documento carregado: {avaliacaoInscricao.certificado_nome || "certificado"}
                  </p>
                )}
                <p className="text-[11px] text-outline mt-1">Aceita PDF, PNG ou JPG até 2 MB. O colaborador poderá ver e descarregar no seu painel.</p>
              </div>

              <div className="rounded-lg bg-background/60 border border-outline-variant/20 p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">visibility</span>
                <p className="text-[12px] text-on-surface-variant">
                  Ao confirmar, a nota, o resultado e a data ficam registados no percurso do colaborador, que poderá consultar quando recebeu e como foi avaliado.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button type="button" onClick={function () { setShowAvaliacaoModal(false); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingAvaliacao} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{savingAvaliacao ? "hourglass_empty" : "check_circle"}</span>
                  {savingAvaliacao ? "A guardar..." : "Confirmar avaliação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewCurso && cursoView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowViewCurso(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Detalhes do Curso</h3>
              <button onClick={function () { setShowViewCurso(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[32px] text-primary">school</span>
                </div>
                <div className="flex-grow">
                  <h2 className="text-xl font-bold text-on-surface">{cursoView.nome}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + getTipoBadgeClass(cursoView.tipo)}>
                      {rotuloTipo(cursoView.tipo)}
                    </span>
                    <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider " + helpers.getEstadoBadgeClass(cursoView.estado)}>
                      {rotuloCurso(cursoView.estado)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                  Informações Gerais
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Categoria", cursoView.categoria],
                    ["Horas", cursoView.horas ? cursoView.horas + " h" : null],
                    ["Vagas", cursoView.vagas == null ? "Sem limite" : (cursoView.vagas_ocupadas || 0) + " / " + cursoView.vagas + " ocupadas"],
                    ["Local", cursoView.local],
                    ["Data de Início", cursoView.data_inicio ? helpers.formatDate(cursoView.data_inicio) : null],
                    ["Data de Fim", cursoView.data_fim ? helpers.formatDate(cursoView.data_fim) : null],
                  ].map(function (pair) {
                    return (
                      <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
                {cursoView.descricao && (
                  <div className="mt-3 bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Descrição</p>
                    <p className="text-[13px] text-on-surface">{cursoView.descricao}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">groups</span>
                  Colaboradores inscritos (população)
                  <span className="text-on-surface-variant/60 normal-case">({(cursoView.inscricoes || []).length})</span>
                </h4>
                {(cursoView.inscricoes || []).length === 0 ? (
                  <div className="bg-background/50 rounded-lg p-5 text-center border border-outline-variant/20">
                    <span className="material-symbols-outlined text-[32px] text-outline-variant/40 block mb-2">person_off</span>
                    <p className="text-[13px] text-on-surface-variant">Ainda não existem colaboradores inscritos neste curso.</p>
                    <p className="text-[12px] text-outline mt-1">Crie a inscrição na aba «Inscrições» para a ver aparecer aqui de imediato.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
                    <table className="w-full text-left border-collapse data-grid-tight">
                      <thead>
                        <tr className="bg-background/60 border-b border-outline-variant/20">
                          <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider text-[10px]">Colaborador</th>
                          <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider text-[10px]">Inscrição</th>
                          <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider text-[10px]">Estado</th>
                          <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider text-[10px]">Resultado</th>
                          <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider text-[10px]">Certificado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {cursoView.inscricoes.map(function (ins) {
                          var colab = ins.colaborador || {};
                          return (
                            <tr key={ins.id} className="hover:bg-primary/[0.02]">
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-bold text-on-surface">{colab.nome_completo || "—"}</span>
                                  {colab.numero_colaborador && <span className="text-[11px] text-on-surface-variant/70">N.º {colab.numero_colaborador}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[12px] text-on-surface-variant">{helpers.formatDate(ins.data_inscricao)}</td>
                              <td className="px-4 py-3">
                                <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider " + getInscricaoEstadoBadge(ins.estado)}>
                                  {rotuloInscricao(ins.estado)}
                                </span>
                                {ins.em_atraso && <span className="block text-[10px] text-warning font-semibold mt-1">Em atraso</span>}
                                {ins.concluida_manualmente && <span className="block text-[10px] text-success font-semibold mt-1">Concluída manualmente</span>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-[12px] font-semibold text-on-surface">
                                    {ins.nota_avaliacao != null && ins.nota_avaliacao !== "" ? ins.nota_avaliacao + " / 20" : "—"}
                                  </span>
                                  {ins.resultado && <span className="text-[11px] text-on-surface-variant/70">{ins.resultado}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {ins.tem_certificado ? (
                                  <button type="button" onClick={function () { descarregarCertificado(ins); }} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-success/30 text-success hover:bg-success/10 text-[11px] font-bold" title="Descarregar certificado">
                                    <span className="material-symbols-outlined text-[14px]">download</span> Descarregar
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded badge-secondary text-[10px] font-bold uppercase">
                                    <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
                                    {ins.certificado_sem_ficheiro ? "Sem ficheiro" : "Pendente"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={function () { setShowViewCurso(false); abrirEditarCurso(cursoView); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar
                </button>
                <button onClick={function () { setShowViewCurso(false); }} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}