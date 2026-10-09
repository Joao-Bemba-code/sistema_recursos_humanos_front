"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { getT } from "@/lib/translations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader from "@/components/ui/PageHeader";
import Toolbar from "@/components/ui/Toolbar";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

// Valores iguais aos ENUM da base de dados (sem acentos)
var ESTADOS_ASSIDUIDADE = [
  { value: "Presente", label: "Presente" },
  { value: "Ausente", label: "Ausente" },
  { value: "Atrasado", label: "Atrasado" },
  { value: "Licenca", label: "Licença" },
  { value: "Ferias", label: "Férias" },
  { value: "Fim_semana", label: "Fim de Semana" },
  { value: "Em_Curso", label: "Em Curso" },
];

var METODOS_REGISTO = [
  { value: "Manual", label: "Manual" },
  { value: "Biometrico", label: "Biométrico" },
  { value: "GPS", label: "GPS" },
  { value: "QR_Code", label: "QR Code" },
];

var estadoBadgeClass = function (estado) {
  var map = {
    Presente: "badge-success",
    Atrasado: "badge-warning",
    Ausente: "badge-danger",
    Licenca: "badge-info",
    Ferias: "badge-info",
    Fim_semana: "badge-secondary",
    Em_Curso: "badge-info",
  };
  return map[estado] || "badge-secondary";
};

var estadoDot = function (estado) {
  var map = {
    Presente: "bg-success",
    Atrasado: "bg-warning",
    Ausente: "bg-error",
    Licenca: "bg-info",
    Ferias: "bg-info",
    Fim_semana: "bg-outline",
    Em_Curso: "bg-info",
  };
  return map[estado] || "bg-outline";
};

export default function AssiduidadePage() {
  var t = getT();

  var [registos, setRegistos] = useState([]);
  var [colaboradores, setColaboradores] = useState([]);
  var [loading, setLoading] = useState(true);
  var [aFiltrar, setAFiltrar] = useState(false);
  var [dataInvertida, setDataInvertida] = useState(false);
  var [search, setSearch] = useState("");
  // Texto da pesquisa efectivamente aplicado a consulta (evita um pedido por tecla)
  var [searchAplicado, setSearchAplicado] = useState("");
  var [filtroEstado, setFiltroEstado] = useState("");
  var [filtroColaborador, setFiltroColaborador] = useState("");
  var [filtroDataInicio, setFiltroDataInicio] = useState("");
  var [filtroDataFim, setFiltroDataFim] = useState("");
  var [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  var [showModal, setShowModal] = useState(false);
  var [editando, setEditando] = useState(null);
  var [form, setForm] = useState({});
  var [saving, setSaving] = useState(false);
  var [msg, setMsg] = useState(null);
  var [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "" });
  var [showViewModal, setShowViewModal] = useState(false);
  var [registoView, setRegistoView] = useState(null);

  var defaultForm = {
    colaborador_id: "",
    data: "",
    hora_entrada: "",
    hora_saida: "",
    estado: "Presente",
    metodo: "Manual",
    observacoes: "",
    justificado: false,
    justificacao_observacoes: "",
  };

  var carregarColaboradores = useCallback(async function () {
    try {
      var data = await api.get("/api/colaboradores?limit=200");
      setColaboradores(data.dados || []);
    } catch (e) {
      // silêncio
    }
  }, []);

  // Numero do pedido em curso: uma resposta antiga (pesquisa anterior) nunca
// substitui o resultado do filtro que o utilizador fez depois.
var pedidoEmCurso = useRef(0);

var carregar = useCallback(async function (page, silencioso) {
  page = page || 1;

  // Datas invertidas nao podem ser consultadas: o filtro devolveria sempre 0
  if (filtroDataInicio && filtroDataFim && filtroDataInicio > filtroDataFim) {
    pedidoEmCurso.current++;
    setDataInvertida(true);
    setRegistos([]);
    setPaginacao({ total: 0, pagina: 1, total_paginas: 1 });
    setLoading(false);
    setAFiltrar(false);
    return;
  }
  setDataInvertida(false);

  var meu = ++pedidoEmCurso.current;
  if (!silencioso) setLoading(true);
  else setAFiltrar(true);
  try {
    var url = "/api/assiduidade?page=" + page + "&limit=15";
    if (searchAplicado) url += "&search=" + encodeURIComponent(searchAplicado);
    if (filtroEstado) url += "&estado=" + encodeURIComponent(filtroEstado);
    if (filtroColaborador) url += "&colaborador_id=" + encodeURIComponent(filtroColaborador);
    if (filtroDataInicio) url += "&data_inicio=" + filtroDataInicio;
    if (filtroDataFim) url += "&data_fim=" + filtroDataFim;
    var data = await api.get(url);
    if (meu !== pedidoEmCurso.current) return; // resposta obsoleta: ignora
    setRegistos(data.dados || []);
    setPaginacao(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
  } catch (e) {
    if (meu !== pedidoEmCurso.current) return;
    if (!silencioso) setMsg({ tipo: "erro", texto: e.message });
  } finally {
    if (meu === pedidoEmCurso.current) {
      setLoading(false);
      setAFiltrar(false);
    }
  }
}, [searchAplicado, filtroEstado, filtroColaborador, filtroDataInicio, filtroDataFim]);

// A pesquisa so e aplicada 350 ms depois de parar de escrever
useEffect(function () {
  var t = setTimeout(function () { setSearchAplicado(search.trim()); }, 350);
  return function () { clearTimeout(t); };
}, [search]);

  useEffect(function () {
    carregarColaboradores();
  }, [carregarColaboradores]);

  useEffect(function () {
    carregar(1);
  }, [carregar]);

  // Actualizacao automatica (1 em 1 minuto): a lista reflecte as picagens do
  // biometro assim que a ponte as sincroniza, sem precisar de recarregar a pagina.
  var paginaActual = useRef(1);
  useEffect(function () {
    paginaActual.current = paginacao.pagina;
  }, [paginacao.pagina]);

  useEffect(function () {
    var intervalo = setInterval(function () {
      carregar(paginaActual.current, true);
    }, 60000);
    return function () { clearInterval(intervalo); };
  }, [carregar]);

  var abrirNovo = function () {
    setEditando(null);
    setForm({ ...defaultForm });
    setShowModal(true);
    setMsg(null);
  };

  // Atalho "Este Mês": a assiduidade so conta a partir do dia 1 do mes
  var filtrarMes = function () {
    var agora = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    var primeiroDia = agora.getFullYear() + "-" + p(agora.getMonth() + 1) + "-01";
    var hoje = agora.getFullYear() + "-" + p(agora.getMonth() + 1) + "-" + p(agora.getDate());
    setFiltroDataInicio(primeiroDia);
    setFiltroDataFim(hoje);
    setFiltroEstado("");
    setFiltroColaborador("");
    setSearch("");
    setSearchAplicado("");
  };

  // Limpa todos os filtros (pesquisa, estado, colaborador e datas)
  var limparFiltros = function () {
    setFiltroEstado("");
    setFiltroColaborador("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setSearch("");
    setSearchAplicado("");
  };

  var temFiltros = !!(searchAplicado || filtroEstado || filtroColaborador || filtroDataInicio || filtroDataFim);

  var abrirEditar = function (r) {
    setEditando(r);
    setForm({
      colaborador_id: r.colaborador_id || (r.colaborador ? r.colaborador.id : "") || "",
      data: (r.data || "").slice(0, 10),
      hora_entrada: (r.hora_entrada || "").slice(0, 5),
      hora_saida: (r.hora_saida || "").slice(0, 5),
      estado: r.estado || "Presente",
      metodo: r.metodo || "Manual",
      observacoes: r.observacoes || "",
      justificado: !!r.justificado,
      justificacao_observacoes: r.justificacao_observacoes || "",
    });
    setShowModal(true);
    setMsg(null);
  };

  var calcularHoras = function (entrada, saida) {
    if (!entrada || !saida) return "";
    try {
      var d1 = new Date("2000-01-01T" + entrada);
      var d2 = new Date("2000-01-01T" + saida);
      if (d2 <= d1) d2 = new Date(d2.getTime() + 24 * 3600000);
      var diffMs = d2 - d1;
      var horas = Math.floor(diffMs / 3600000);
      var mins = Math.floor((diffMs % 3600000) / 60000);
      return horas + "h " + (mins < 10 ? "0" : "") + mins + "min";
    } catch (e) {
      return "";
    }
  };

  var calcularHorasTrabalhadas = function () {
    return calcularHoras(form.hora_entrada, form.hora_saida);
  };

  var calcularHorasExtras = function () {
    if (!form.hora_entrada || !form.hora_saida) return "";
    try {
      var d1 = new Date("2000-01-01T" + form.hora_entrada);
      var d2 = new Date("2000-01-01T" + form.hora_saida);
      if (d2 <= d1) d2 = new Date(d2.getTime() + 24 * 3600000);
      var diffMs = d2 - d1;
      var totalHoras = diffMs / 3600000;
      var extras = totalHoras - 8;
      if (extras <= 0) return "0h";
      var h = Math.floor(extras);
      var m = Math.round((extras - h) * 60);
      return h + "h " + (m < 10 ? "0" : "") + m + "min";
    } catch (e) {
      return "";
    }
  };

  var guardar = async function (e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      var payload = {
        colaborador_id: form.colaborador_id,
        data: form.data,
        hora_entrada: form.hora_entrada || null,
        hora_saida: form.hora_saida || null,
        estado: form.estado,
        metodo: form.metodo,
        observacoes: form.observacoes,
        justificado: !!form.justificado,
        justificacao_observacoes: form.justificacao_observacoes || null,
      };
      if (editando) {
        await api.put("/api/assiduidade/" + editando.id, payload);
        setMsg({ tipo: "sucesso", texto: "Registo atualizado com sucesso" });
      } else {
        await api.post("/api/assiduidade", payload);
        setMsg({ tipo: "sucesso", texto: "Registo criado com sucesso" });
      }
      setShowModal(false);
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setSaving(false);
    }
  };

  var eliminar = async function () {
    try {
      await api.delete("/api/assiduidade/" + confirmDelete.id);
      setMsg({ tipo: "sucesso", texto: "Registo eliminado com sucesso" });
      setConfirmDelete({ open: false, id: null, nome: "" });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  var handleInput = function (e) {
    setForm(function (prev) {
      var next = { ...prev, [e.target.name]: e.target.value };
      return next;
    });
  };

  var handleCheck = function (e) {
    setForm(function (prev) {
      var next = { ...prev, [e.target.name]: e.target.checked };
      return next;
    });
  };

  var abrirVer = function (r) {
    setRegistoView(r);
    setShowViewModal(true);
  };

  var nomeColaborador = function (r) {
    if (r.colaborador) return r.colaborador.nome_completo || "—";
    var found = colaboradores.find(function (c) { return c.id === r.colaborador_id; });
    return found ? found.nome_completo : "—";
  };

  var numeroColaborador = function (r) {
    if (r.colaborador) return r.colaborador.numero_colaborador || "";
    var found = colaboradores.find(function (c) { return c.id === r.colaborador_id; });
    return found ? found.numero_colaborador : "";
  };

  var activeFilters = [];
  if (searchAplicado) activeFilters.push({ label: "Pesquisa: " + searchAplicado, onClear: function () { setSearch(""); setSearchAplicado(""); } });
  if (filtroEstado) activeFilters.push({ label: "Estado: " + filtroEstado, onClear: function () { setFiltroEstado(""); } });
  if (filtroColaborador) {
    var fc = colaboradores.find(function (c) { return String(c.id) === String(filtroColaborador); });
    activeFilters.push({ label: "Colaborador: " + (fc ? fc.nome_completo : filtroColaborador), onClear: function () { setFiltroColaborador(""); } });
  }
  if (filtroDataInicio) activeFilters.push({ label: "De: " + filtroDataInicio, onClear: function () { setFiltroDataInicio(""); } });
  if (filtroDataFim) activeFilters.push({ label: "Até: " + filtroDataFim, onClear: function () { setFiltroDataFim(""); } });

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Registo"
        mensagem={"Tem certeza que deseja eliminar o registo de assiduidade de " + confirmDelete.nome + "? Esta ação não pode ser desfeita."}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={function () { setConfirmDelete({ open: false, id: null, nome: "" }); }}
      />

      <PageHeader
        titulo="Gestão de Assiduidade e Presença"
        breadcrumb={[{ label: "SGHR" }, { label: "Assiduidade" }]}
        acoes={
          <>
            <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Novo Registo
            </button>
          </>
        }
      />

      {msg && (
        <div className={"p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 " + (msg.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10")}>
          <span className="material-symbols-outlined text-[18px]">{msg.tipo === "sucesso" ? "check_circle" : "error"}</span>
          {msg.texto}
          <button onClick={function () { setMsg(null); }} className="ml-auto hover:opacity-60">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <Toolbar>
        <div className="w-full">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-grow space-y-2 w-full lg:w-auto">
              <label className="text-[11px] font-medium text-on-surface-variant/70 px-1">Buscar Colaborador</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Nome do colaborador..."
                  value={search}
                  onChange={function (e) { setSearch(e.target.value); }}
                  onKeyDown={function (e) { if (e.key === "Enter") { setSearchAplicado(search.trim()); carregar(1); } }}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
                />
                {aFiltrar && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-primary animate-spin">progress_activity</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-on-surface-variant/70 px-1">Estado</label>
                <select value={filtroEstado} onChange={function (e) { setFiltroEstado(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos</option>
                  {ESTADOS_ASSIDUIDADE.map(function (e) {
                    return <option key={e.value} value={e.value}>{e.label}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-on-surface-variant/70 px-1">Colaborador</label>
                <select value={filtroColaborador} onChange={function (e) { setFiltroColaborador(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos</option>
                  {colaboradores.map(function (c) {
                    return <option key={c.id} value={c.id}>{c.nome_completo}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-on-surface-variant/70 px-1">Data de Início</label>
                <input type="date" value={filtroDataInicio} onChange={function (e) { setFiltroDataInicio(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-on-surface-variant/70 px-1">Data Fim</label>
                <input type="date" value={filtroDataFim} onChange={function (e) { setFiltroDataFim(e.target.value); }} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <button onClick={function () { filtrarMes(); }} title="Mostrar do dia 1 do mês até hoje (a assiduidade só conta a partir do dia 1)" className="px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Este Mês
              </button>
              <button onClick={function () { carregar(1); }} className="px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap">
                <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                Filtrar
              </button>
            </div>
          </div>
          {dataInvertida && (
            <div className="mt-4 p-3 rounded-lg badge-warning border border-warning/20 text-[13px] font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              A data de início é maior do que a data fim — corrija as datas para ver os registos.
            </div>
          )}
          {!loading && !dataInvertida && (
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-3">
              <span className="text-[12px] text-on-surface-variant/70 font-medium">
                {paginacao.total === 0
                  ? "Nenhum registo encontrado"
                  : paginacao.total + (paginacao.total === 1 ? " registo encontrado" : " registos encontrados")}
                {temFiltros ? " com os filtros aplicados" : ""}
              </span>
              {aFiltrar && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-primary font-medium">
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  a filtrar...
                </span>
              )}
            </div>
          )}
          {activeFilters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros ativos:</span>
              {activeFilters.map(function (f, i) {
                return (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-semibold">
                    {f.label}
                    <button onClick={f.onClear} className="hover:text-error">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                );
              })}
              <button onClick={limparFiltros} className="text-[11px] font-medium text-primary hover:underline ml-2">Limpar Tudo</button>
            </div>
          )}
        </div>
      </Toolbar>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse data-grid-tight">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 font-medium text-on-surface-variant/70 w-[260px]">Colaborador</th>
                <th className="px-4 py-4 font-medium text-on-surface-variant/70">Data</th>
                <th className="px-4 py-4 font-medium text-on-surface-variant/70">Entrada</th>
                <th className="px-4 py-4 font-medium text-on-surface-variant/70">Saída</th>
                <th className="px-4 py-4 font-medium text-on-surface-variant/70">Horas</th>
                <th className="px-4 py-4 font-medium text-on-surface-variant/70">Estado</th>
                <th className="px-4 py-4 font-medium text-on-surface-variant/70">Método</th>
                <th className="px-6 py-4 font-medium text-on-surface-variant/70 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                [1, 2, 3, 4, 5, 6, 7].map(function (i) {
                  return (
                    <tr key={i}>
                      <td colSpan={8} className="px-6 py-4">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  );
                })
              ) : registos.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    {dataInvertida ? (
                      <EmptyState
                        icon="event_busy"
                        title="Intervalo de datas inválido"
                        description="A data de início tem de ser anterior à data fim"
                      />
                    ) : temFiltros ? (
                      <EmptyState
                        icon="search_off"
                        title="Nenhum registo corresponde aos filtros aplicados"
                        description="Ajuste a pesquisa ou os filtros para ver os registos"
                        action={
                          <button onClick={limparFiltros} className="px-4 py-2 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-medium">
                            Limpar filtros
                          </button>
                        }
                      />
                    ) : (
                      <EmptyState
                        icon="calendar_month"
                        title="Nenhum registo de assiduidade encontrado"
                        description="Clique em &quot;Novo Registo&quot; para adicionar ou use &quot;Este Mês&quot; para ver as presenças"
                      />
                    )}
                  </td>
                </tr>
              ) : (
                registos.map(function (r) {
                  var horas = parseFloat(r.horas_trabalhadas) > 0 ? r.horas_trabalhadas : calcularHoras(r.hora_entrada, r.hora_saida);
                  var extras = parseFloat(r.horas_extras) || 0;
                  return (
                    <tr key={r.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant/30 shadow-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[12px] font-bold text-primary">{helpers.getInitials(nomeColaborador(r))}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{nomeColaborador(r)}</span>
                            <span className="text-[12px] text-on-surface-variant/70">{numeroColaborador(r)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface-variant">{helpers.formatDate(r.data)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface font-mono text-[13px]">{r.hora_entrada || "—"}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface font-mono text-[13px]">{r.hora_saida || "—"}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-on-surface font-semibold text-[13px]">{horas || "—"}</span>
                          {extras > 0 && (
                            <span className="text-[11px] text-warning font-bold">+{extras} extra</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={"inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold " + estadoBadgeClass(r.estado)}>
                          <span className={"w-1.5 h-1.5 rounded-full " + estadoDot(r.estado)} />
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-on-surface-variant text-[13px]">{r.metodo || "—"}</span>
                          {r.ajustado_manual && (
                            <span className="inline-flex items-center w-fit gap-1 px-1.5 py-0.5 rounded bg-info/10 text-info text-[10px] font-semibold" title="Corrigido manualmente — o biometro não altera este registo">
                              <span className="material-symbols-outlined text-[12px]">edit</span>
                              Ajustado
                            </span>
                          )}
                          {r.justificado && (
                            <span className="inline-flex items-center w-fit gap-1 px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-semibold" title="Falta/Atraso justificado">
                              <span className="material-symbols-outlined text-[12px]">verified</span>
                              Justificado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button onClick={function () { abrirVer(r); }} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                          </button>
                          <button onClick={function () { abrirEditar(r); }} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button onClick={function () { setConfirmDelete({ open: true, id: r.id, nome: nomeColaborador(r) }); }} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
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
          <div className="text-[12px] font-medium text-on-surface-variant/70">
            Exibindo {registos.length} de {paginacao.total} registos
          </div>
          {paginacao.total_paginas > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(paginacao.total_paginas, 5) }, function (_, i) { return i + 1; }).map(function (p) {
                return (
                  <button key={p} onClick={function () { carregar(p); }} className={"w-8 h-8 rounded-lg text-[13px] font-medium transition-all " + (p === paginacao.pagina ? "bg-primary text-white font-bold" : "hover:bg-primary/5 text-on-surface-variant")}>
                    {p}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowModal(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">{editando ? "Editar Registo" : "Novo Registo de Assiduidade"}</h3>
              <button onClick={function () { setShowModal(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={guardar} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-on-surface-variant/70 px-1 block mb-1">Colaborador *</label>
                  <select name="colaborador_id" value={form.colaborador_id || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <option value="">Selecionar colaborador</option>
                    {colaboradores.map(function (c) {
                      return <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant/70 px-1 block mb-1">Data *</label>
                  <input name="data" type="date" value={form.data || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant/70 px-1 block mb-1">Estado *</label>
                  <select name="estado" value={form.estado || "Presente"} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {ESTADOS_ASSIDUIDADE.map(function (e) {
                      return <option key={e.value} value={e.value}>{e.label}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant/70 px-1 block mb-1">Hora Entrada</label>
                  <input name="hora_entrada" type="time" value={form.hora_entrada || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant/70 px-1 block mb-1">Hora Saída</label>
                  <input name="hora_saida" type="time" value={form.hora_saida || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>

                {form.hora_entrada && form.hora_saida && (
                  <div className="sm:col-span-2 bg-primary/5 border border-primary/10 rounded-lg p-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                        <span className="text-[12px] font-medium text-primary">Horas Trabalhadas:</span>
                        <span className="text-[14px] font-bold text-on-surface">{calcularHorasTrabalhadas()}</span>
                      </div>
                      {calcularHorasExtras() && calcularHorasExtras() !== "0h" && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-warning">more_time</span>
                          <span className="text-[12px] font-medium text-warning">Extras:</span>
                          <span className="text-[14px] font-bold text-on-surface">{calcularHorasExtras()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant/70 px-1 block mb-1">Método de Registo</label>
                  <select name="metodo" value={form.metodo || "Manual"} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                    {METODOS_REGISTO.map(function (m) {
                      return <option key={m.value} value={m.value}>{m.label}</option>;
                    })}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none px-1 pb-2.5">
                    <input type="checkbox" name="justificado" checked={!!form.justificado} onChange={handleCheck} className="w-4 h-4 rounded border-outline-variant accent-primary" />
                    <span className="text-[13px] font-semibold text-on-surface">Falta/Atraso justificado</span>
                  </label>
                </div>
                {form.justificado && (
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-on-surface-variant/70 px-1 block mb-1">Motivo da Justificação</label>
                    <textarea name="justificacao_observacoes" value={form.justificacao_observacoes || ""} onChange={handleInput} rows={2} placeholder="Ex.: o colaborador esqueceu-se de passar o dedo no biómetro; entrada confirmada pelo encarregado." className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-on-surface-variant/70 px-1 block mb-1">Observações</label>
                  <textarea name="observacoes" value={form.observacoes || ""} onChange={handleInput} rows={3} placeholder="Notas adicionais sobre a assiduidade..." className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="sm:col-span-2 flex items-start gap-2 bg-info/5 border border-info/20 rounded-lg p-3">
                  <span className="material-symbols-outlined text-[18px] text-info mt-px">info</span>
                  <p className="text-[12px] text-on-surface-variant leading-snug">
                    Ao gravar, este registo fica marcado como <strong>ajustado manualmente</strong>: a ponte do biómetro deixa de alterar a hora e o estado. Use isto quando alguém se esquecer de passar o dedo — ponha a entrada/saída à mão e escolha <strong>Presente</strong> ou <strong>Atrasado</strong> conforme o caso.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={function () { setShowModal(false); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
                  {saving ? "A guardar..." : editando ? "Atualizar" : "Criar Registo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && registoView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={function () { setShowViewModal(false); }} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Detalhe do Registo de Assiduidade</h3>
              <button onClick={function () { setShowViewModal(false); }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-outline-variant/30 shadow-md bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary">{helpers.getInitials(nomeColaborador(registoView))}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">{nomeColaborador(registoView)}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[13px] text-on-surface-variant/70">{numeroColaborador(registoView)}</span>
                    <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold " + estadoBadgeClass(registoView.estado)}>
                      <span className={"w-1.5 h-1.5 rounded-full " + estadoDot(registoView.estado)} />
                      {registoView.estado}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-medium text-on-surface-variant/70 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">event</span>
                  Dados do Registo
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Data", registoView.data ? helpers.formatDate(registoView.data) : null],
                    ["Hora Entrada", registoView.hora_entrada || null],
                    ["Hora Saída", registoView.hora_saida || null],
                    ["Horas Trabalhadas", (parseFloat(registoView.horas_trabalhadas) > 0 ? registoView.horas_trabalhadas : null) || calcularHoras(registoView.hora_entrada, registoView.hora_saida) || null],
                    ["Horas Extras", (parseFloat(registoView.horas_extras) || 0) > 0 ? registoView.horas_extras : null],
                    ["Método", registoView.metodo || null],
                  ].map(function (pair) {
                    return (
                      <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-medium text-on-surface-variant/60 mb-0.5">{pair[0]}</p>
                        <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                      </div>
                    );
                  })}
                </div>
                {(registoView.ajustado_manual || registoView.justificado) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {registoView.ajustado_manual && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-info/10 text-info text-[11px] font-semibold">
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Ajustado manualmente (o biómetro não altera este registo)
                      </span>
                    )}
                    {registoView.justificado && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-semibold">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Falta/Atraso justificado
                      </span>
                    )}
                  </div>
                )}
                {registoView.justificacao_observacoes && (
                  <div className="mt-3 bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-medium text-on-surface-variant/60 mb-0.5">Motivo da Justificação</p>
                    <p className="text-[13px] text-on-surface">{registoView.justificacao_observacoes}</p>
                  </div>
                )}
                {registoView.observacoes && (
                  <div className="mt-3 bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-medium text-on-surface-variant/60 mb-0.5">Observações</p>
                    <p className="text-[13px] text-on-surface">{registoView.observacoes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button onClick={function () { setShowViewModal(false); abrirEditar(registoView); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar
                </button>
                <button onClick={function () { setShowViewModal(false); }} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
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