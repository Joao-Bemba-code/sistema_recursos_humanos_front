"use client";

import { useState, useEffect, Fragment } from "react";
import api from "@/lib/api";
import { agruparUnidadesPorDepartamento } from "@/lib/unidades";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

var CACHE_BUST = Date.now();

var imageUrl = function (path) {
  if (!path) return "";
  var decoded = path.replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
  if (decoded.indexOf("/logos/") !== -1 && decoded.indexOf("?v=") === -1) decoded += "?v=" + CACHE_BUST;
  if (decoded.startsWith("http")) return decoded;
  return api.baseURL + decoded;
};

const TIPOS_DEPT = [
  { value: "Direcção", label: "Direcção" },
  { value: "Departamento", label: "Departamento" },
  { value: "Sector", label: "Sector" },
  { value: "Secção", label: "Secção" },
  { value: "Gabinete", label: "Gabinete" },
];

// Sectores e Secções que ficam dentro de um departamento (mesmo nivel).
const TIPOS_ESTRUTURA = [
  { value: "Sector", label: "Sector" },
  { value: "Secção", label: "Secção" },
  { value: "Gabinete", label: "Gabinete" },
  { value: "Direcção", label: "Direcção" },
];

// O ENUM dos departamentos guarda os valores sem cedilha.
var normalizarTipo = function (v) {
  var t = String(v || "");
  if (t === "Direccao") return "Direcção";
  if (t === "Seccao") return "Secção";
  return t;
};

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDepartamentoId, setFiltroDepartamentoId] = useState("");
  const [filtroSeccaoId, setFiltroSeccaoId] = useState("");
  const [filtroUnidadeId, setFiltroUnidadeId] = useState("");
  const [todosDepartamentos, setTodosDepartamentos] = useState([]);
  const [todasUnidades, setTodasUnidades] = useState([]);
  const [expandidos, setExpandidos] = useState({});
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "" });
  const [showViewModal, setShowViewModal] = useState(false);
  const [deptView, setDeptView] = useState(null);
  const [secView, setSecView] = useState([]);
  const [membrosView, setMembrosView] = useState({});
  const [org, setOrg] = useState(null);

  const [showSeccoesModal, setShowSeccoesModal] = useState(false);
  const [deptSeccoes, setDeptSeccoes] = useState(null);
  const [seccoes, setSeccoes] = useState([]);
  const [loadingSeccoes, setLoadingSeccoes] = useState(false);
  const [editandoSeccao, setEditandoSeccao] = useState(null);
  const [formSeccao, setFormSeccao] = useState({});
  const [showFormSeccao, setShowFormSeccao] = useState(false);
  const [savingSeccao, setSavingSeccao] = useState(false);
  const [msgSeccao, setMsgSeccao] = useState(null);
  const [confirmDeleteSeccao, setConfirmDeleteSeccao] = useState({ open: false, id: null, nome: "" });
  const [colaboradores, setColaboradores] = useState([]);

  const [showMembrosModal, setShowMembrosModal] = useState(false);
  const [seccaoMembros, setSeccaoMembros] = useState(null);
  const [membros, setMembros] = useState([]);
  const [loadingMembros, setLoadingMembros] = useState(false);
  const [formMembro, setFormMembro] = useState({ colaborador_id: "", funcao: "" });
  const [savingMembro, setSavingMembro] = useState(false);
  const [msgMembro, setMsgMembro] = useState(null);

  // Unidades organizacionais (dentro do sector/secção, partilháveis).
  const [showUnidadesModal, setShowUnidadesModal] = useState(false);
  const [seccaoUnidades, setSeccaoUnidades] = useState(null);
  const [unidadesSeccao, setUnidadesSeccao] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [showFormUnidade, setShowFormUnidade] = useState(false);
  const [editandoUnidade, setEditandoUnidade] = useState(null);
  const [formUnidade, setFormUnidade] = useState({});
  const [savingUnidade, setSavingUnidade] = useState(false);
  const [msgUnidade, setMsgUnidade] = useState(null);
  const [confirmDeleteUnidade, setConfirmDeleteUnidade] = useState({ open: false, id: null, nome: "" });
  const [todasSeccoes, setTodasSeccoes] = useState([]);

  const [showPessoasUnidade, setShowPessoasUnidade] = useState(false);
  const [unidadePessoas, setUnidadePessoas] = useState(null);
  const [pessoasUnidade, setPessoasUnidade] = useState([]);
  const [loadingPessoasUnidade, setLoadingPessoasUnidade] = useState(false);
  const [formPessoaUnidade, setFormPessoaUnidade] = useState({ colaborador_id: "" });
  const [savingPessoaUnidade, setSavingPessoaUnidade] = useState(false);
  const [msgPessoaUnidade, setMsgPessoaUnidade] = useState(null);

  const carregar = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/api/departamentos?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filtroTipo) url += `&tipo=${filtroTipo}`;
      if (filtroDepartamentoId) url += `&departamento_id=${filtroDepartamentoId}`;
      if (filtroSeccaoId) url += `&seccao_id=${filtroSeccaoId}`;
      if (filtroUnidadeId) url += `&unidade_id=${filtroUnidadeId}`;
      const data = await api.get(url);
      setDepartamentos(data.dados);
      setPaginacao(data.paginacao);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Recarrega sempre que a pesquisa ou os filtros mudam (debounce na pesquisa)
  useEffect(() => {
    const timer = setTimeout(() => { carregar(1); }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [search, filtroTipo, filtroDepartamentoId, filtroSeccaoId, filtroUnidadeId]);

  // Opções dos filtros em cascata: departamento -> secção -> unidade.
  useEffect(() => {
    api.get("/api/departamentos?limit=9999").then(function (data) {
      setTodosDepartamentos(data.dados || []);
    }).catch(function () {});
    api.get("/api/seccoes?limit=9999").then(function (data) {
      setTodasSeccoes(data.dados || []);
    }).catch(function () {});
    api.get("/api/unidades?limit=9999").then(function (data) {
      setTodasUnidades(data.dados || []);
    }).catch(function () {});
  }, []);

  var seccoesDoFiltro = todasSeccoes.filter(function (s) {
    if (!filtroDepartamentoId) return true;
    return s.departamento_id === filtroDepartamentoId || (s.departamento && s.departamento.id === filtroDepartamentoId);
  });

  var unidadesDoFiltro = todasUnidades.filter(function (u) {
    var seccoesU = Array.isArray(u.seccoes) ? u.seccoes : [];
    if (filtroSeccaoId) return seccoesU.some(function (s) { return s.id === filtroSeccaoId; });
    if (filtroDepartamentoId) return seccoesU.some(function (s) { return s.departamento_id === filtroDepartamentoId; });
    return true;
  });

  const escolherDepartamentoFiltro = (id) => {
    setFiltroDepartamentoId(id);
    setFiltroSeccaoId("");
    setFiltroUnidadeId("");
  };

  const escolherSeccaoFiltro = (id) => {
    setFiltroSeccaoId(id);
    setFiltroUnidadeId("");
    if (id) {
      var sec = todasSeccoes.find(function (s) { return s.id === id; });
      var deptId = sec ? (sec.departamento_id || (sec.departamento && sec.departamento.id)) : null;
      if (deptId) setFiltroDepartamentoId(deptId);
    }
  };

  const alternarExpandido = async (d) => {
    if (expandidos[d.id] && !expandidos[d.id].loading) {
      setExpandidos(function (prev) {
        var copia = Object.assign({}, prev);
        delete copia[d.id];
        return copia;
      });
      return;
    }
    setExpandidos(function (prev) {
      return Object.assign({}, prev, { [d.id]: { loading: true, seccoes: [], unidades: [] } });
    });
    try {
      var resultados = await Promise.all([
        api.get(`/api/seccoes?departamento_id=${d.id}&limit=100`),
        api.get(`/api/unidades?departamento_id=${d.id}&limit=500`),
      ]);
      setExpandidos(function (prev) {
        return Object.assign({}, prev, {
          [d.id]: { loading: false, seccoes: resultados[0].dados || [], unidades: resultados[1].dados || [] },
        });
      });
    } catch (e) {
      setExpandidos(function (prev) {
        return Object.assign({}, prev, { [d.id]: { loading: false, erro: e.message, seccoes: [], unidades: [] } });
      });
    }
  };

  useEffect(() => {
    api.get("/api/organizacoes").then(function (data) {
      if (data.dados && data.dados.length > 0) setOrg(data.dados[0]);
    }).catch(function () {});
  }, []);

  useEffect(() => {
    api.get("/api/colaboradores?limit=200").then(function (data) {
      setColaboradores(data.dados || []);
    }).catch(function () {});
  }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: "", codigo: "", descricao: "", tipo: "Departamento", responsavel_nome: "", telefone: "", email: "", localizacao: "", activo: true });
    setShowModal(true);
    setMsg(null);
  };

  const abrirEditar = (d) => {
    setEditando(d);
    setForm({
      nome: d.nome || "",
      codigo: d.codigo || "",
      descricao: d.descricao || "",
      tipo: normalizarTipo(d.tipo) || "Departamento",
      responsavel_nome: d.responsavel_nome || "",
      telefone: d.telefone || "",
      email: d.email || "",
      localizacao: d.localizacao || "",
      activo: d.activo !== false,
    });
    setShowModal(true);
    setMsg(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (editando) {
        await api.put(`/api/departamentos/${editando.id}`, form);
        setMsg({ tipo: "sucesso", texto: "Departamento atualizado com sucesso" });
      } else {
        await api.post("/api/departamentos", form);
        setMsg({ tipo: "sucesso", texto: "Departamento criado com sucesso" });
      }
      setShowModal(false);
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    try {
      await api.delete(`/api/departamentos/${confirmDelete.id}`);
      setMsg({ tipo: "sucesso", texto: "Departamento eliminado" });
      setConfirmDelete({ open: false, id: null, nome: "" });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirVer = async (d) => {
    setDeptView(d);
    setShowViewModal(true);
    setSecView([]);
    setMembrosView({});
    try {
      const data = await api.get(`/api/seccoes?departamento_id=${d.id}&limit=100`);
      const secs = data.dados || [];
      setSecView(secs);
      const membros = {};
      await Promise.all(secs.map(async (s) => {
        try {
          const r = await api.get(`/api/seccoes/${s.id}/membros`);
          membros[s.id] = r.dados || [];
        } catch (e) {
          membros[s.id] = [];
        }
      }));
      setMembrosView(membros);
    } catch (e) {
      setSecView([]);
      setMembrosView({});
    }
  };

  const carregarSeccoes = async (deptId) => {
    setLoadingSeccoes(true);
    try {
      const data = await api.get(`/api/seccoes?departamento_id=${deptId}&limit=100`);
      setSeccoes(data.dados);
    } catch (e) {
      setMsgSeccao({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingSeccoes(false);
    }
  };

  const abrirSeccoes = async (d) => {
    setDeptSeccoes(d);
    setShowSeccoesModal(true);
    setMsgSeccao(null);
    await carregarSeccoes(d.id);
  };

  const abrirNovaSeccao = () => {
    setEditandoSeccao(null);
    setFormSeccao({ nome: "", tipo: "Secção", codigo: "", descricao: "", responsavel_id: "", responsavel_nome: "", telefone: "", email: "", localizacao: "", nivel: 1, activo: true });
    setShowFormSeccao(true);
    setMsgSeccao(null);
  };

  const abrirEditarSeccao = (s) => {
    setEditandoSeccao(s);
    var colResponsavel = colaboradores.find(c => c.nome_completo === (s.responsavel_nome || ""));
    setFormSeccao({
      nome: s.nome || "",
      tipo: normalizarTipo(s.tipo) || "Secção",
      codigo: s.codigo || "",
      descricao: s.descricao || "",
      responsavel_id: colResponsavel ? colResponsavel.id : "",
      responsavel_nome: s.responsavel_nome || "",
      telefone: s.telefone || "",
      email: s.email || "",
      localizacao: s.localizacao || "",
      nivel: s.nivel || 1,
      activo: s.activo !== false,
    });
    setShowFormSeccao(true);
    setMsgSeccao(null);
  };

  const guardarSeccao = async (e) => {
    e.preventDefault();
    setSavingSeccao(true);
    setMsgSeccao(null);
    try {
      const { responsavel_id, ...dadosSec } = formSeccao;
      const payload = { ...dadosSec, departamento_id: deptSeccoes.id };
      if (editandoSeccao) {
        await api.put(`/api/seccoes/${editandoSeccao.id}`, payload);
      } else {
        await api.post("/api/seccoes", payload);
      }
      setShowFormSeccao(false);
      await carregarSeccoes(deptSeccoes.id);
    } catch (e) {
      setMsgSeccao({ tipo: "erro", texto: e.message });
    } finally {
      setSavingSeccao(false);
    }
  };

  const eliminarSeccao = async () => {
    try {
      await api.delete(`/api/seccoes/${confirmDeleteSeccao.id}`);
      setConfirmDeleteSeccao({ open: false, id: null, nome: "" });
      await carregarSeccoes(deptSeccoes.id);
    } catch (e) {
      setMsgSeccao({ tipo: "erro", texto: e.message });
    }
  };

  const handleSeccaoInput = (e) => {
    setFormSeccao({ ...formSeccao, [e.target.name]: e.target.value });
  };

  const handleResponsavelChange = (e) => {
    var id = e.target.value;
    var col = colaboradores.find(c => c.id === id);
    setFormSeccao({ ...formSeccao, responsavel_id: id, responsavel_nome: col ? col.nome_completo : "" });
  };

  const carregarMembros = async (secId) => {
    setLoadingMembros(true);
    try {
      const data = await api.get(`/api/seccoes/${secId}/membros`);
      setMembros(data.dados || []);
    } catch (e) {
      setMsgMembro({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingMembros(false);
    }
  };

  const abrirMembros = async (s) => {
    setSeccaoMembros(s);
    setFormMembro({ colaborador_id: "", funcao: "" });
    setShowMembrosModal(true);
    setMsgMembro(null);
    await carregarMembros(s.id);
  };

  const handleMembroInput = (e) => {
    setFormMembro({ ...formMembro, [e.target.name]: e.target.value });
  };

  const adicionarMembro = async (e) => {
    e.preventDefault();
    if (!formMembro.colaborador_id) {
      setMsgMembro({ tipo: "erro", texto: "Selecione um colaborador" });
      return;
    }
    setSavingMembro(true);
    setMsgMembro(null);
    try {
      await api.post(`/api/seccoes/${seccaoMembros.id}/membros`, formMembro);
      setFormMembro({ colaborador_id: "", funcao: "" });
      await carregarMembros(seccaoMembros.id);
    } catch (e) {
      setMsgMembro({ tipo: "erro", texto: e.message });
    } finally {
      setSavingMembro(false);
    }
  };

  const removerMembro = async (m) => {
    try {
      await api.delete(`/api/seccoes/${seccaoMembros.id}/membros/${m.colaborador_id}`);
      await carregarMembros(seccaoMembros.id);
    } catch (e) {
      setMsgMembro({ tipo: "erro", texto: e.message });
    }
  };

  const membrosDisponiveis = colaboradores.filter(c => !membros.some(m => m.colaborador_id === c.id));

  // ==================== UNIDADES ====================
  const carregarUnidadesDaSeccao = async (seccaoId) => {
    setLoadingUnidades(true);
    try {
      const data = await api.get(`/api/unidades?seccao_id=${seccaoId}&limit=200`);
      setUnidadesSeccao(data.dados || []);
    } catch (e) {
      setMsgUnidade({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingUnidades(false);
    }
  };

  const abrirUnidades = async (s) => {
    setSeccaoUnidades(s);
    setShowUnidadesModal(true);
    setMsgUnidade(null);
    if (todasSeccoes.length === 0) {
      try {
        const data = await api.get("/api/seccoes?limit=9999");
        setTodasSeccoes(data.dados || []);
      } catch (e) { /* usa a lista vazia */ }
    }
    await carregarUnidadesDaSeccao(s.id);
  };

  const abrirNovaUnidade = () => {
    setEditandoUnidade(null);
    setFormUnidade({
      nome: "",
      codigo: "",
      descricao: "",
      responsavel_nome: "",
      telefone: "",
      email: "",
      activo: true,
      seccao_ids: seccaoUnidades ? [seccaoUnidades.id] : [],
    });
    setShowFormUnidade(true);
    setMsgUnidade(null);
  };

  const abrirEditarUnidade = (u) => {
    setEditandoUnidade(u);
    var ids = Array.isArray(u.seccoes) ? u.seccoes.map(function (s) { return s.id; }) : [];
    if (ids.length === 0 && seccaoUnidades) ids = [seccaoUnidades.id];
    setFormUnidade({
      nome: u.nome || "",
      codigo: u.codigo || "",
      descricao: u.descricao || "",
      responsavel_nome: u.responsavel_nome || "",
      telefone: u.telefone || "",
      email: u.email || "",
      activo: u.activo !== false,
      seccao_ids: ids,
    });
    setShowFormUnidade(true);
    setMsgUnidade(null);
  };

  const handleUnidadeInput = (e) => {
    setFormUnidade({ ...formUnidade, [e.target.name]: e.target.value });
  };

  const alternarSeccaoUnidade = (id) => {
    setFormUnidade(function (f) {
      var ids = Array.isArray(f.seccao_ids) ? f.seccao_ids.slice() : [];
      var pos = ids.indexOf(id);
      if (pos === -1) ids.push(id);
      else ids.splice(pos, 1);
      return Object.assign({}, f, { seccao_ids: ids });
    });
  };

  const guardarUnidade = async (e) => {
    e.preventDefault();
    if (!formUnidade.nome || !formUnidade.nome.trim()) {
      setMsgUnidade({ tipo: "erro", texto: "Indique o nome da unidade" });
      return;
    }
    if (!Array.isArray(formUnidade.seccao_ids) || formUnidade.seccao_ids.length === 0) {
      setMsgUnidade({ tipo: "erro", texto: "Escolha pelo menos um sector/secção" });
      return;
    }
    setSavingUnidade(true);
    setMsgUnidade(null);
    try {
      if (editandoUnidade) {
        await api.put(`/api/unidades/${editandoUnidade.id}`, formUnidade);
      } else {
        await api.post("/api/unidades", formUnidade);
      }
      setShowFormUnidade(false);
      if (seccaoUnidades) await carregarUnidadesDaSeccao(seccaoUnidades.id);
    } catch (e) {
      setMsgUnidade({ tipo: "erro", texto: e.message });
    } finally {
      setSavingUnidade(false);
    }
  };

  const eliminarUnidade = async () => {
    try {
      await api.delete(`/api/unidades/${confirmDeleteUnidade.id}`);
      setConfirmDeleteUnidade({ open: false, id: null, nome: "" });
      if (seccaoUnidades) await carregarUnidadesDaSeccao(seccaoUnidades.id);
    } catch (e) {
      setMsgUnidade({ tipo: "erro", texto: e.message });
    }
  };

  const carregarPessoasUnidade = async (unidadeId) => {
    setLoadingPessoasUnidade(true);
    try {
      const data = await api.get(`/api/unidades/${unidadeId}/colaboradores`);
      setPessoasUnidade(data.dados || []);
    } catch (e) {
      setMsgPessoaUnidade({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingPessoasUnidade(false);
    }
  };

  const abrirPessoasUnidade = async (u) => {
    setUnidadePessoas(u);
    setFormPessoaUnidade({ colaborador_id: "" });
    setShowPessoasUnidade(true);
    setMsgPessoaUnidade(null);
    await carregarPessoasUnidade(u.id);
  };

  const adicionarPessoaUnidade = async (e) => {
    e.preventDefault();
    if (!formPessoaUnidade.colaborador_id) {
      setMsgPessoaUnidade({ tipo: "erro", texto: "Selecione um colaborador" });
      return;
    }
    setSavingPessoaUnidade(true);
    setMsgPessoaUnidade(null);
    try {
      await api.post(`/api/unidades/${unidadePessoas.id}/colaboradores`, formPessoaUnidade);
      setFormPessoaUnidade({ colaborador_id: "" });
      await carregarPessoasUnidade(unidadePessoas.id);
      if (seccaoUnidades) await carregarUnidadesDaSeccao(seccaoUnidades.id);
    } catch (e) {
      setMsgPessoaUnidade({ tipo: "erro", texto: e.message });
    } finally {
      setSavingPessoaUnidade(false);
    }
  };

  const removerPessoaUnidade = async (p) => {
    try {
      await api.delete(`/api/unidades/${unidadePessoas.id}/colaboradores/${p.id}`);
      await carregarPessoasUnidade(unidadePessoas.id);
      if (seccaoUnidades) await carregarUnidadesDaSeccao(seccaoUnidades.id);
    } catch (e) {
      setMsgPessoaUnidade({ tipo: "erro", texto: e.message });
    }
  };

  const pessoasUnidadeDisponiveis = colaboradores.filter(function (c) {
    return !pessoasUnidade.some(function (p) { return p.id === c.id; });
  });

  const seccoesAgrupadas = function () {
    var grupos = {};
    todasSeccoes.forEach(function (s) {
      var nomeDep = s.departamento ? s.departamento.nome : "Sem departamento";
      if (!grupos[nomeDep]) grupos[nomeDep] = [];
      grupos[nomeDep].push(s);
    });
    return grupos;
  };

  const tipoLabel = (v) => (TIPOS_DEPT.find(t => t.value === normalizarTipo(v)) || {}).label || v || "—";

  const gerarPDF = async () => {
    var d = deptView;
    if (!d) return;
    var doc = new jsPDF();
    var pw = doc.internal.pageSize.getWidth();
    var ph = doc.internal.pageSize.getHeight();

    var logoImg = null;
    var logoUrl = org && org.logo_url ? imageUrl(org.logo_url) : "";

    var seccoes = [];
    var membrosMap = {};
    try {
      var resSec = await api.get(`/api/seccoes?departamento_id=${d.id}&limit=100`);
      seccoes = resSec.dados || [];
      await Promise.all(seccoes.map(async function(s) {
        try {
          var r = await api.get(`/api/seccoes/${s.id}/membros`);
          membrosMap[s.id] = r.dados || [];
        } catch (e) {
          membrosMap[s.id] = [];
        }
      }));
    } catch (e) {
      seccoes = [];
    }

    var desenhar = function () {
      var y = 20;

      if (logoImg) {
        var lw = 40;
        var lh = (logoImg.height / logoImg.width) * lw;
        try { doc.addImage(logoImg.dataUrl, "PNG", pw / 2 - lw / 2, y, lw, lh); } catch (e) {}
        y += lh + 5;
      }

      if (org && org.nome && org.nome !== d.nome) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text(org.nome, pw / 2, y, { align: "center" });
        y += 11;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      doc.text("FICHA DE DEPARTAMENTO", pw / 2, y, { align: "center" });
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text(d.nome || "Sem Nome", pw / 2, y, { align: "center" });
      y += 6;
      doc.setTextColor(100, 100, 100);
      doc.text(tipoLabel(d.tipo) || "", pw / 2, y, { align: "center" });
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      if (d.codigo && d.codigo !== d.nome) {
        doc.text("Código: " + d.codigo, pw / 2, y, { align: "center" });
      }
      y += 11;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(15, y, pw - 15, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text("DADOS DO DEPARTAMENTO", 15, y);
      y += 7;

      var rows = [
        ["Nome", d.nome], ["Código", d.codigo], ["Tipo", tipoLabel(d.tipo)],
        ["Responsável", d.responsavel_nome], ["Telefone", d.telefone],
        ["Email", d.email], ["Localização", d.localizacao],
        ["Estado", d.activo ? "Ativo" : "Inativo"],
      ].filter(function (row) {
        return !(row[0] === "Código" && (!row[1] || row[1] === d.nome));
      });
      if (d.descricao) {
        rows.push(["Descrição", d.descricao]);
      }

      doc.setFontSize(9);
      rows.forEach(function(row) {
        var label = row[0] + ":";
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(label, 15, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        var xVal = 15 + doc.getTextWidth(label) + 4;
        var lines = doc.splitTextToSize(String(row[1] || "—"), pw - xVal - 15);
        doc.text(lines, xVal, y);
        y += lines.length * 5 + 4;
        if (y > ph - 20) { doc.addPage(); y = 20; }
      });

      if (seccoes.length > 0) {
        if (y > ph - 45) { doc.addPage(); y = 20; }
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(15, y, pw - 15, y);
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text("SECÇÕES DO DEPARTAMENTO", pw / 2, y, { align: "center" });
        y += 3;

        var colW = [45, 12, 32, 22, 28, 25];
        var totalW = colW.reduce(function(a, b) { return a + b; }, 0);
        var margemL = Math.max(8, (pw - totalW) / 2);

        autoTable(doc, {
          startY: y + 3,
          margin: { left: margemL, right: margemL, bottom: 18 },
          tableWidth: 'wrap',
          head: [["Nome", "Nível", "Responsável", "Telefone", "Email", "Localização"]],
          body: seccoes.map(function(s) {
            return [s.nome || "—", s.nivel || 1, s.responsavel_nome || "—", s.telefone || "—", s.email || "—", s.localizacao || "—"];
          }),
          styles: { fontSize: 7.5, cellPadding: 2.2, lineWidth: 0 },
          headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", lineWidth: 0 },
          alternateRowStyles: { fillColor: [245, 247, 252] },
          columnStyles: {
            0: { cellWidth: colW[0] },
            1: { cellWidth: colW[1], halign: "center" },
            2: { cellWidth: colW[2] },
            3: { cellWidth: colW[3] },
            4: { cellWidth: colW[4] },
            5: { cellWidth: colW[5] },
          },
        });

        var yApos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : y + 8;
        var comPessoas = seccoes.some(function(s) { return (membrosMap[s.id] || []).length > 0; });
        if (comPessoas) {
          if (yApos > ph - 30) { doc.addPage(); yApos = 20; }
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(15, yApos, pw - 15, yApos);
          yApos += 7;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.text("PESSOAS NAS SECÇÕES", pw / 2, yApos, { align: "center" });
          yApos += 6;
          doc.setFontSize(8.5);
          seccoes.forEach(function(s) {
            var lista = membrosMap[s.id] || [];
            if (lista.length === 0) return;
            var pessoas = lista.map(function(m) {
              return "[" + (m.funcao || "Membro") + "] " + ((m.colaborador && m.colaborador.nome_completo) || "—");
            }).join("; ");
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 40);
            doc.text(s.nome + ":", 17, yApos);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(70, 70, 70);
            var xP = 17 + doc.getTextWidth(s.nome + ":") + 3;
            var linhas = doc.splitTextToSize(pessoas, pw - xP - 17);
            doc.text(linhas, xP, yApos);
            yApos += linhas.length * 4.5 + 3;
            if (yApos > ph - 20) { doc.addPage(); yApos = 20; }
          });
        }
      }

      var fY = ph - 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text((org && org.nome ? org.nome : "SGHR") + " - SGHR | Gerado: " + new Date().toLocaleDateString("pt-AO"), pw / 2, fY, { align: "center" });

      doc.save("Departamento_" + (d.nome || "ficha") + ".pdf");
    };

    var carregarLogo = function (cb) {
      if (!logoUrl) { cb(); return; }
      fetch(logoUrl)
        .then(function (r) { if (!r.ok) throw new Error("falha ao carregar logo"); return r.blob(); })
        .then(function (blob) {
          var urlObj = URL.createObjectURL(blob);
          var img = new Image();
          img.onload = function () {
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(urlObj);
            logoImg = { dataUrl: canvas.toDataURL("image/png"), width: img.width, height: img.height };
            cb();
          };
          img.onerror = function () { URL.revokeObjectURL(urlObj); cb(); };
          img.src = urlObj;
        })
        .catch(function () { cb(); });
    };

    carregarLogo(desenhar);
  };

  const activeFilters = [];
  if (filtroTipo) activeFilters.push({ label: `Tipo: ${filtroTipo}`, onClear: () => setFiltroTipo("") });
  if (filtroDepartamentoId) {
    var deptFiltro = todosDepartamentos.find(function (d) { return d.id === filtroDepartamentoId; });
    activeFilters.push({ label: `Departamento: ${deptFiltro ? deptFiltro.nome : filtroDepartamentoId}`, onClear: escolherDepartamentoFiltro.bind(null, "") });
  }
  if (filtroSeccaoId) {
    var secFiltro = todasSeccoes.find(function (s) { return s.id === filtroSeccaoId; });
    activeFilters.push({ label: `Secção: ${secFiltro ? secFiltro.nome : filtroSeccaoId}`, onClear: escolherSeccaoFiltro.bind(null, "") });
  }
  if (filtroUnidadeId) {
    var uniFiltro = todasUnidades.find(function (u) { return u.id === filtroUnidadeId; });
    activeFilters.push({ label: `Unidade: ${uniFiltro ? uniFiltro.nome : filtroUnidadeId}`, onClear: () => setFiltroUnidadeId("") });
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Departamento"
        mensagem={`Tem certeza que deseja eliminar o departamento "${confirmDelete.nome}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={() => setConfirmDelete({ open: false, id: null, nome: "" })}
      />
      <ConfirmDialog
        open={confirmDeleteSeccao.open}
        titulo="Eliminar Sector/Secção"
        mensagem={`Tem certeza que deseja eliminar o sector/secção "${confirmDeleteSeccao.nome}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminarSeccao}
        onCancel={() => setConfirmDeleteSeccao({ open: false, id: null, nome: "" })}
      />
      <ConfirmDialog
        open={confirmDeleteUnidade.open}
        titulo="Eliminar Unidade"
        mensagem={`Tem certeza que deseja eliminar a unidade "${confirmDeleteUnidade.nome}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminarUnidade}
        onCancel={() => setConfirmDeleteUnidade({ open: false, id: null, nome: "" })}
      />
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>Estrutura</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Departamentos</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">Estrutura Organizacional</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo Departamento
          </button>
        </div>
      </section>

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
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-grow space-y-2 w-full lg:w-auto">
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Departamento</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Nome do departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregar(1)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Tipo</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {TIPOS_DEPT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Departamento</label>
              <select value={filtroDepartamentoId} onChange={(e) => escolherDepartamentoFiltro(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {todosDepartamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Secção</label>
              <select value={filtroSeccaoId} onChange={(e) => escolherSeccaoFiltro(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todas</option>
                {seccoesDoFiltro.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Unidade</label>
              <select value={filtroUnidadeId} onChange={(e) => setFiltroUnidadeId(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todas</option>
                {agruparUnidadesPorDepartamento(unidadesDoFiltro).map(function (g) {
                  return (
                    <optgroup key={g.id} label={g.nome}>
                      {g.unidades.map(u => <option key={g.id + "_" + u.id} value={u.id}>{u.nome}</option>)}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="flex items-end pb-0.5 w-full lg:w-auto">
            <button onClick={() => carregar(1)} className="w-full px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
              Filtrar
            </button>
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros ativos:</span>
            {activeFilters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                {f.label}
                <button onClick={f.onClear} className="hover:text-error">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
            <button onClick={() => { setFiltroTipo(""); setSearch(""); escolherDepartamentoFiltro(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
          </div>
        )}
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse data-grid-tight">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nome</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Responsável</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Contacto</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}>
                    <td colSpan={5} className="px-6 py-4">
                      <div className="animate-pulse h-10 bg-surface-container rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : departamentos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">apartment</span>
                    <p className="text-on-surface-variant font-medium">Nenhum departamento encontrado</p>
                    <p className="text-[13px] text-outline mt-1">Clique em &quot;Novo Departamento&quot; para adicionar</p>
                  </td>
                </tr>
              ) : (
                departamentos.map((d) => (
                  <Fragment key={d.id}>
                    <tr className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-1.5">
                          <button
                            onClick={() => alternarExpandido(d)}
                            className="p-[2px] mt-0.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all"
                            title="Ver sectores/secções e unidades"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {expandidos[d.id] ? "expand_less" : "expand_more"}
                            </span>
                          </button>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{d.nome}</span>
                            {d.codigo && d.codigo !== d.nome ? (
                              <span className="text-[12px] text-on-surface-variant/70">{d.codigo}</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface">{d.responsavel_nome || "—"}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-on-surface">{d.telefone || "—"}</span>
                          <span className="text-[12px] text-on-surface-variant/70">{d.email || ""}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${d.activo ? "badge-success" : "badge-secondary"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${d.activo ? "bg-success" : "bg-outline"}`} />
                          {d.activo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button onClick={() => abrirSeccoes(d)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Secções">
                            <span className="material-symbols-outlined text-[15px]">layers</span>
                          </button>
                          <button onClick={() => abrirVer(d)} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                          </button>
                          <button onClick={() => abrirEditar(d)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button onClick={() => setConfirmDelete({ open: true, id: d.id, nome: d.nome })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandidos[d.id] && (
                      <tr className="bg-background/40">
                        <td colSpan={5} className="px-6 py-4">
                          {expandidos[d.id].loading ? (
                            <div className="animate-pulse h-16 bg-surface-container rounded-lg" />
                          ) : expandidos[d.id].erro ? (
                            <p className="text-[13px] text-error">{expandidos[d.id].erro}</p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                                  {expandidos[d.id].seccoes.length} sector(es)/secção(ões) · {expandidos[d.id].unidades.length} unidade(s)
                                </p>
                                <span className="text-[11px] text-on-surface-variant/50">Departamento → sector/secção → unidade</span>
                              </div>
                              {expandidos[d.id].seccoes.length === 0 ? (
                                <p className="text-[13px] text-on-surface-variant/70">Ainda não há sectores/secções neste departamento.</p>
                              ) : (
                                expandidos[d.id].seccoes.map(function (s) {
                                  var unidadesDaSeccao = expandidos[d.id].unidades.filter(function (u) {
                                    return (u.seccoes || []).some(function (x) { return x.id === s.id; });
                                  });
                                  return (
                                    <div key={s.id} className="border border-outline-variant/30 rounded-lg bg-surface p-3">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="material-symbols-outlined text-[16px] text-primary">account_tree</span>
                                        <span className="font-bold text-[13px] text-on-surface">{s.nome}</span>
                                        <span className="badge-secondary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">{tipoLabel(s.tipo)}</span>
                                        <span className="text-[11px] text-on-surface-variant/60 ml-auto">{unidadesDaSeccao.length} unidade(s)</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {unidadesDaSeccao.length === 0 ? (
                                          <span className="text-[12px] text-on-surface-variant/60">Sem unidades</span>
                                        ) : (
                                          unidadesDaSeccao.map(function (u) {
                                            return (
                                              <button
                                                key={u.id}
                                                onClick={() => abrirPessoasUnidade(u)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold hover:bg-primary/10 transition-colors"
                                                title="Gerir pessoas da unidade"
                                              >
                                                <span className="material-symbols-outlined text-[14px]">groups</span>
                                                {u.nome}
                                              </button>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
            Exibindo {departamentos.length} de {paginacao.total} departamentos
          </div>
          {paginacao.total_paginas > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(paginacao.total_paginas, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => carregar(p)} className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-all ${p === paginacao.pagina ? "bg-primary text-white font-bold" : "hover:bg-primary/5 text-on-surface-variant"}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>


      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editando ? "Editar Departamento" : "Novo Departamento"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardar} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome *</label>
                  <input name="nome" value={form.nome || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Código</label>
                  <input name="codigo" value={form.codigo || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Tipo</label>
                  <select name="tipo" value={form.tipo || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {TIPOS_DEPT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Descrição</label>
                  <textarea name="descricao" value={form.descricao || ""} onChange={handleInput} rows={3} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Responsável</label>
                  <input name="responsavel_nome" value={form.responsavel_nome || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Telefone</label>
                  <input name="telefone" value={form.telefone || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Email</label>
                  <input name="email" type="email" value={form.email || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Localização</label>
                  <input name="localizacao" value={form.localizacao || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
                  {saving ? "A guardar..." : editando ? "Atualizar" : "Criar Departamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && deptView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-on-surface tracking-tight uppercase">Ficha de Departamento</h3>
              <div className="flex items-center gap-2">
                <button onClick={gerarPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 text-error text-[12px] font-semibold hover:bg-error/20 transition-all border border-error/10">
                  <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                  PDF
                </button>
                <button onClick={() => setShowViewModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center gap-2 pb-5 border-b border-outline-variant/20">
                {org && org.logo_url ? (
                  <img src={imageUrl(org.logo_url)} alt={org.nome || "Logo"} className="h-16 w-auto max-w-full object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[32px]">apartment</span>
                  </div>
                )}
                {org && org.nome && org.nome !== deptView.nome ? (
                  <p className="text-[13px] font-bold text-on-surface">{org.nome}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[24px]">apartment</span>
                </div>
                <div>
                  <h2 className="text-[12px] font-bold text-on-surface">{deptView.nome}</h2>
                  <p className="text-[12px] font-bold text-on-surface-variant">{tipoLabel(deptView.tipo)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-on-surface-variant/60">{deptView.codigo || "Sem código"}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${deptView.activo ? "badge-success" : "badge-secondary"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${deptView.activo ? "bg-success" : "bg-outline"}`} />
                      {deptView.activo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[["Tipo", tipoLabel(deptView.tipo)], ["Responsável", deptView.responsavel_nome],
                  ["Telefone", deptView.telefone], ["Email", deptView.email],
                  ["Localização", deptView.localizacao],
                ].map(function(p) {
                  return (
                    <div key={p[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{p[0]}</p>
                      <p className="text-[13px] font-semibold text-on-surface">{p[1] || "—"}</p>
                    </div>
                  );
                })}
              </div>

              {deptView.descricao && (
                <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Descrição</p>
                  <p className="text-[13px] text-on-surface whitespace-pre-line break-words">{deptView.descricao}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-2">Secções do Departamento</p>
                {secView.length === 0 ? (
                  <p className="text-[12px] text-on-surface-variant/60 bg-background/50 rounded-lg p-3 border border-outline-variant/20">Nenhum sector/secção registado.</p>
                ) : (
                  <div className="space-y-3">
                    {secView.map(function(s) {
                      var pessoas = membrosView[s.id] || [];
                      return (
                        <div key={s.id} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[16px]">account_tree</span>
                              <p className="text-[13px] font-bold text-on-surface">{s.nome || "—"}</p>
                              <span className="text-[11px] text-on-surface-variant/60">Nível {s.nivel || 1}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.activo ? "badge-success" : "badge-secondary"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.activo ? "bg-success" : "bg-outline"}`} />
                              {s.activo ? "Ativa" : "Inativa"}
                            </span>
                          </div>
                          {s.descricao && <p className="text-[12px] text-on-surface-variant mb-1.5 whitespace-pre-line break-words">{s.descricao}</p>}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {[["Código", s.codigo], ["Responsável", s.responsavel_nome], ["Telefone", s.telefone], ["Email", s.email], ["Localização", s.localizacao]].filter(function(p) {
                              return !(p[0] === "Código" && p[1] === s.nome);
                            }).map(function(p) {
                              return (
                                <div key={p[0]} className="bg-surface rounded-md px-2.5 py-1.5 border border-outline-variant/20">
                                  <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-wide">{p[0]}</p>
                                  <p className="text-[12px] font-semibold text-on-surface truncate">{p[1] || "—"}</p>
                                </div>
                              );
                            })}
                          </div>
                          <div className="bg-surface rounded-md px-2.5 py-1.5 border border-outline-variant/20">
                            <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Pessoas</p>
                            {pessoas.length === 0 ? (
                              <p className="text-[12px] text-on-surface-variant/60">Nenhuma pessoa atribuída.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {pessoas.map(function(m, i) {
                                  var nome = (m.colaborador && m.colaborador.nome_completo) || "—";
                                  return (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-background/60 text-on-surface-variant border border-outline-variant/20">
                                      {m.funcao && <span className="text-[10px] uppercase font-bold text-primary">{m.funcao}:</span>}
                                      {nome}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={() => { setShowViewModal(false); abrirEditar(deptView); }} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 text-primary text-[12px] font-semibold hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[16px]">edit</span> Editar
                </button>
                <button onClick={gerarPDF} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[12px] font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all">
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> Descarregar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSeccoesModal && deptSeccoes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowSeccoesModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface tracking-tight">Sectores e Secções</h3>
                <p className="text-[13px] text-on-surface-variant/70">{deptSeccoes.nome}{deptSeccoes.codigo && deptSeccoes.codigo !== deptSeccoes.nome ? " · " + deptSeccoes.codigo : ""}</p>
              </div>
              <button onClick={() => setShowSeccoesModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {msgSeccao && (
                <div className={`p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 ${msgSeccao.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10"}`}>
                  <span className="material-symbols-outlined text-[18px]">{msgSeccao.tipo === "sucesso" ? "check_circle" : "error"}</span>
                  {msgSeccao.texto}
                  <button onClick={() => setMsgSeccao(null)} className="ml-auto hover:opacity-60">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
                  {seccoes.length} definido(s)
                </p>
                <button onClick={abrirNovaSeccao} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Novo Sector/Secção
                </button>
              </div>

              <div className="overflow-x-auto border border-outline-variant/30 rounded-xl">
                <table className="w-full text-left border-collapse data-grid-tight">
                  <thead>
                    <tr className="bg-background/50 border-b border-outline-variant/20">
                      <th className="px-5 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nome</th>
                      <th className="px-3 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nível</th>
                      <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Responsável</th>
                      <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                      <th className="px-5 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {loadingSeccoes ? (
                      [1,2,3].map(i => (
                        <tr key={i}>
                          <td colSpan={5} className="px-5 py-4">
                            <div className="animate-pulse h-8 bg-surface-container rounded-lg" />
                          </td>
                        </tr>
                      ))
                    ) : seccoes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center">
                          <span className="material-symbols-outlined text-[40px] text-outline-variant/40 block mb-2">layers</span>
                          <p className="text-on-surface-variant font-medium">Nenhum sector/secção definido</p>
                          <p className="text-[13px] text-outline mt-1">Clique em &quot;Novo Sector/Secção&quot; para adicionar</p>
                        </td>
                      </tr>
                    ) : (
                      seccoes.map((s) => (
                        <tr key={s.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-5 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{s.nome}</span>
                              <span className="text-[12px] text-on-surface-variant/70">{[normalizarTipo(s.tipo) || "Secção", s.codigo].filter(Boolean).join(" · ")}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-[13px] font-bold">{s.nivel || 1}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-on-surface">{s.responsavel_nome || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${s.activo ? "badge-success" : "badge-secondary"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.activo ? "bg-success" : "bg-outline"}`} />
                              {s.activo ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end">
                              <button onClick={() => abrirMembros(s)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Pessoas no sector/secção">
                                <span className="material-symbols-outlined text-[15px]">groups</span>
                              </button>
                              <button onClick={() => abrirUnidades(s)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Unidades do sector/secção">
                                <span className="material-symbols-outlined text-[15px]">workspaces</span>
                              </button>
                              <button onClick={() => abrirEditarSeccao(s)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button onClick={() => setConfirmDeleteSeccao({ open: true, id: s.id, nome: s.nome })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSeccoesModal && showFormSeccao && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowFormSeccao(false)} />
          <div className="relative bg-surface shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-outline-variant/30 rounded-t-2xl sm:rounded-xl">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-2xl sm:rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editandoSeccao ? "Editar Sector/Secção" : "Novo Sector/Secção"}</h3>
              <button onClick={() => setShowFormSeccao(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardarSeccao} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome *</label>
                  <input name="nome" value={formSeccao.nome || ""} onChange={handleSeccaoInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Tipo *</label>
                  <select name="tipo" value={formSeccao.tipo || "Secção"} onChange={handleSeccaoInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {TIPOS_ESTRUTURA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Código</label>
                  <input name="codigo" value={formSeccao.codigo || ""} onChange={handleSeccaoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nível *</label>
                  <input name="nivel" type="number" min="1" value={formSeccao.nivel || ""} onChange={handleSeccaoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Responsável</label>
                  <select name="responsavel_id" value={formSeccao.responsavel_id || ""} onChange={handleResponsavelChange} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Selecionar colaborador</option>
                    {colaboradores.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_completo}{c.numero_colaborador ? " (" + c.numero_colaborador + ")" : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Telefone</label>
                  <input name="telefone" value={formSeccao.telefone || ""} onChange={handleSeccaoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Email</label>
                  <input name="email" type="email" value={formSeccao.email || ""} onChange={handleSeccaoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Localização</label>
                  <input name="localizacao" value={formSeccao.localizacao || ""} onChange={handleSeccaoInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Descrição</label>
                  <textarea name="descricao" value={formSeccao.descricao || ""} onChange={handleSeccaoInput} rows={3} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button type="button" onClick={() => setShowFormSeccao(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingSeccao} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{savingSeccao ? "hourglass_empty" : "save"}</span>
                  {savingSeccao ? "A guardar..." : editandoSeccao ? "Atualizar" : "Criar Sector/Secção"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUnidadesModal && seccaoUnidades && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowUnidadesModal(false)} />
          <div className="relative bg-surface shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30 rounded-t-2xl sm:rounded-xl">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-2xl sm:rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface tracking-tight">Unidades</h3>
                <p className="text-[13px] text-on-surface-variant/70">{seccaoUnidades.nome}{deptSeccoes ? " · " + deptSeccoes.nome : ""}</p>
              </div>
              <button onClick={() => setShowUnidadesModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {msgUnidade && (
                <div className={`p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 ${msgUnidade.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10"}`}>
                  <span className="material-symbols-outlined text-[18px]">{msgUnidade.tipo === "sucesso" ? "check_circle" : "error"}</span>
                  {msgUnidade.texto}
                  <button onClick={() => setMsgUnidade(null)} className="ml-auto hover:opacity-60">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
                  {unidadesSeccao.length} unidade(s)
                </p>
                <button onClick={abrirNovaUnidade} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Nova Unidade
                </button>
              </div>

              {loadingUnidades ? (
                <div className="space-y-2">
                  {[1, 2].map(function (i) {
                    return <div key={i} className="animate-pulse h-16 bg-surface-container rounded-lg" />;
                  })}
                </div>
              ) : unidadesSeccao.length === 0 ? (
                <div className="border border-dashed border-outline-variant/40 rounded-xl py-10 text-center">
                  <span className="material-symbols-outlined text-[40px] text-outline-variant/40 block mb-2">workspaces</span>
                  <p className="text-on-surface-variant font-medium">Nenhuma unidade definida</p>
                  <p className="text-[13px] text-outline mt-1">Crie uma unidade dentro deste sector/secção</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unidadesSeccao.map(function (u) {
                    var nomesSeccoes = (u.seccoes || []).map(function (s) {
                      return s.nome + (s.departamento && s.departamento.nome ? " (" + s.departamento.nome + ")" : "");
                    });
                    return (
                      <div key={u.id} className="border border-outline-variant/30 rounded-xl p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-on-surface">{u.nome}</span>
                            {u.codigo && u.codigo !== u.nome ? <span className="text-[12px] text-on-surface-variant/70">{u.codigo}</span> : null}
                            {u.activo === false ? <span className="badge-secondary text-[10px] font-bold uppercase px-2 py-0.5 rounded">Inativa</span> : null}
                          </div>
                          <p className="text-[12px] text-on-surface-variant/70 mt-0.5">
                            {[u.responsavel_nome, u.telefone, u.email].filter(Boolean).join(" · ") || "Sem responsável definido"}
                          </p>
                          <p className="text-[11px] text-on-surface-variant/60 mt-1">
                            Sectores: {nomesSeccoes.length > 0 ? nomesSeccoes.join(", ") : "—"}
                          </p>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                          <button onClick={() => abrirPessoasUnidade(u)} className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Pessoas na unidade">
                            <span className="material-symbols-outlined text-[16px]">groups</span>
                          </button>
                          <button onClick={() => abrirEditarUnidade(u)} className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button onClick={() => setConfirmDeleteUnidade({ open: true, id: u.id, nome: u.nome })} className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showUnidadesModal && showFormUnidade && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowFormUnidade(false)} />
          <div className="relative bg-surface shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-outline-variant/30 rounded-t-2xl sm:rounded-xl">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-2xl sm:rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editandoUnidade ? "Editar Unidade" : "Nova Unidade"}</h3>
              <button onClick={() => setShowFormUnidade(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardarUnidade} className="p-6 space-y-4">
              {msgUnidade && (
                <div className={`p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 ${msgUnidade.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10"}`}>
                  <span className="material-symbols-outlined text-[18px]">{msgUnidade.tipo === "sucesso" ? "check_circle" : "error"}</span>
                  {msgUnidade.texto}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome *</label>
                  <input name="nome" value={formUnidade.nome || ""} onChange={handleUnidadeInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Código</label>
                  <input name="codigo" value={formUnidade.codigo || ""} onChange={handleUnidadeInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Responsável</label>
                  <input name="responsavel_nome" value={formUnidade.responsavel_nome || ""} onChange={handleUnidadeInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Telefone</label>
                  <input name="telefone" value={formUnidade.telefone || ""} onChange={handleUnidadeInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Email</label>
                  <input name="email" type="email" value={formUnidade.email || ""} onChange={handleUnidadeInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Descrição</label>
                  <textarea name="descricao" value={formUnidade.descricao || ""} onChange={handleUnidadeInput} rows={2} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Sectores/Secções *</label>
                  <p className="text-[11px] text-on-surface-variant/60 px-1 mb-2">A mesma unidade pode pertencer a sectores de vários departamentos.</p>
                  <div className="max-h-52 overflow-y-auto border border-outline-variant/30 rounded-lg p-3 space-y-3">
                    {Object.keys(seccoesAgrupadas()).sort().map(function (nomeDep) {
                      return (
                        <div key={nomeDep}>
                          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">{nomeDep}</p>
                          <div className="space-y-1">
                            {seccoesAgrupadas()[nomeDep].map(function (s) {
                              var marcada = Array.isArray(formUnidade.seccao_ids) && formUnidade.seccao_ids.indexOf(s.id) !== -1;
                              return (
                                <label key={s.id} className="flex items-center gap-2 text-[13px] text-on-surface cursor-pointer">
                                  <input type="checkbox" checked={marcada} onChange={function () { alternarSeccaoUnidade(s.id); }} className="rounded border-outline-variant text-primary focus:ring-primary/30" />
                                  <span>{s.nome}</span>
                                  <span className="text-[11px] text-on-surface-variant/60">{normalizarTipo(s.tipo) || "Secção"}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button type="button" onClick={() => setShowFormUnidade(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingUnidade} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{savingUnidade ? "hourglass_empty" : "save"}</span>
                  {savingUnidade ? "A guardar..." : editandoUnidade ? "Atualizar" : "Criar Unidade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPessoasUnidade && unidadePessoas && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowPessoasUnidade(false)} />
          <div className="relative bg-surface shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-outline-variant/30 rounded-t-2xl sm:rounded-xl">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-2xl sm:rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface tracking-tight">Pessoas na Unidade</h3>
                <p className="text-[13px] text-on-surface-variant/70">{unidadePessoas.nome}</p>
              </div>
              <button onClick={() => setShowPessoasUnidade(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {msgPessoaUnidade && (
                <div className={`p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 ${msgPessoaUnidade.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10"}`}>
                  <span className="material-symbols-outlined text-[18px]">{msgPessoaUnidade.tipo === "sucesso" ? "check_circle" : "error"}</span>
                  {msgPessoaUnidade.texto}
                </div>
              )}
              <form onSubmit={adicionarPessoaUnidade} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                <div className="flex-grow space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block">Colaborador</label>
                  <select name="colaborador_id" value={formPessoaUnidade.colaborador_id} onChange={function (e) { setFormPessoaUnidade({ colaborador_id: e.target.value }); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Selecionar colaborador...</option>
                    {pessoasUnidadeDisponiveis.map(function (c) {
                      return <option key={c.id} value={c.id}>{c.nome_completo}</option>;
                    })}
                  </select>
                </div>
                <button type="submit" disabled={savingPessoaUnidade} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Adicionar
                </button>
              </form>
              <div className="border border-outline-variant/30 rounded-xl divide-y divide-outline-variant/10">
                {loadingPessoasUnidade ? (
                  <div className="p-4 animate-pulse h-14 bg-surface-container rounded-lg" />
                ) : pessoasUnidade.length === 0 ? (
                  <div className="py-8 text-center">
                    <span className="material-symbols-outlined text-[36px] text-outline-variant/40 block mb-1">person_off</span>
                    <p className="text-[13px] text-on-surface-variant/70">Sem colaboradores nesta unidade</p>
                  </div>
                ) : (
                  pessoasUnidade.map(function (p) {
                    return (
                      <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-on-surface truncate">{p.nome_completo}</p>
                          <p className="text-[11px] text-on-surface-variant/60">{[p.numero_colaborador, p.estado].filter(Boolean).join(" · ")}</p>
                        </div>
                        <button onClick={function () { removerPessoaUnidade(p); }} className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Remover da unidade">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showMembrosModal && seccaoMembros && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowMembrosModal(false)} />
          <div className="relative bg-surface shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30 rounded-t-2xl sm:rounded-xl">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-2xl sm:rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface tracking-tight">Pessoas no Sector/Secção</h3>
                <p className="text-[13px] text-on-surface-variant/70">{seccaoMembros.nome}</p>
              </div>
              <button onClick={() => setShowMembrosModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {msgMembro && (
                <div className={`p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 ${msgMembro.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10"}`}>
                  <span className="material-symbols-outlined text-[18px]">{msgMembro.tipo === "sucesso" ? "check_circle" : "error"}</span>
                  {msgMembro.texto}
                  <button onClick={() => setMsgMembro(null)} className="ml-auto hover:opacity-60">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              <form onSubmit={adicionarMembro} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-grow space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador</label>
                  <select name="colaborador_id" value={formMembro.colaborador_id || ""} onChange={handleMembroInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Selecionar colaborador</option>
                    {membrosDisponiveis.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_completo}{c.numero_colaborador ? " (" + c.numero_colaborador + ")" : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-44 space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Função</label>
                  <input
                    type="text"
                    name="funcao"
                    value={formMembro.funcao || ""}
                    onChange={handleMembroInput}
                    placeholder="Ex: Responsável, Operador, Técnico..."
                    className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <button type="submit" disabled={savingMembro} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                    <span className="material-symbols-outlined text-[18px]">{savingMembro ? "hourglass_empty" : "person_add"}</span>
                    {savingMembro ? "A adicionar..." : "Adicionar"}
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto border border-outline-variant/30 rounded-xl">
                <table className="w-full text-left border-collapse data-grid-tight">
                  <thead>
                    <tr className="bg-background/50 border-b border-outline-variant/20">
                      <th className="px-5 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Colaborador</th>
                      <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Função</th>
                      <th className="px-5 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {loadingMembros ? (
                      [1,2,3].map(i => (
                        <tr key={i}>
                          <td colSpan={3} className="px-5 py-4">
                            <div className="animate-pulse h-8 bg-surface-container rounded-lg" />
                          </td>
                        </tr>
                      ))
                    ) : membros.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-10 text-center">
                          <span className="material-symbols-outlined text-[40px] text-outline-variant/40 block mb-2">groups</span>
                          <p className="text-on-surface-variant font-medium">Nenhuma pessoa atribuída</p>
                          <p className="text-[13px] text-outline mt-1">Adicione responsáveis e membros deste sector/secção</p>
                        </td>
                      </tr>
                    ) : (
                      membros.map((m) => (
                        <tr key={m.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-5 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{(m.colaborador && m.colaborador.nome_completo) || "—"}</span>
                              <span className="text-[12px] text-on-surface-variant/70">{(m.colaborador && m.colaborador.numero_colaborador) || ""}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider badge-secondary">
                              <span className="material-symbols-outlined text-[13px]">person</span>
                              {m.funcao || "Membro"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end">
                              <button onClick={() => removerMembro(m)} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Remover">
                                <span className="material-symbols-outlined text-[15px]">person_remove</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}