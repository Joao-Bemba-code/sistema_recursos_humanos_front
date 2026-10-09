"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatDateTime } from "@/lib/helpers";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Toolbar from "@/components/ui/Toolbar";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

var ESTADOS_TAREFA = ["Pendente", "Em_curso", "Atrasada", "Concluida", "Validada", "Cancelada"];
var ESTADOS_ALOC = ["Pendente", "Em_curso", "Reaberta", "Justificativa", "Atrasada", "Concluida", "Validada", "Cancelada"];
var EM_JANELA = ["Pendente", "Em_curso", "Reaberta"];
var PRIORIDADES = ["Baixa", "Media", "Alta", "Urgente"];

var LABEL_ESTADO = {
  Pendente: "Pendente",
  Em_curso: "Em Curso",
  Reaberta: "Reaberta",
  Justificativa: "Justificativa",
  Atrasada: "Atrasada",
  Concluida: "Concluída",
  Validada: "Validada",
  Cancelada: "Cancelada",
};

var COR_ESTADO = {
  Pendente: "bg-amber-50 text-amber-700 border-amber-200",
  Em_curso: "bg-sky-50 text-sky-700 border-sky-200",
  Reaberta: "bg-violet-50 text-violet-700 border-violet-200",
  Justificativa: "bg-orange-50 text-orange-700 border-orange-200",
  Atrasada: "bg-red-50 text-red-700 border-red-200",
  Concluida: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Validada: "bg-green-50 text-green-700 border-green-200",
  Cancelada: "bg-slate-100 text-slate-500 border-slate-200",
};

var COR_PRIORIDADE = {
  Baixa: "bg-slate-100 text-slate-600",
  Media: "bg-sky-100 text-sky-700",
  Alta: "bg-amber-100 text-amber-700",
  Urgente: "bg-red-100 text-red-700",
};

// Colunas do Kanban. Cada cartao e uma ALOCACAO (colaborador numa tarefa);
// Em_curso/Reaberta/Justificativa convivem na coluna "Em Curso".
var COLUNAS_KANBAN = [
  { chave: "Pendente", rotulo: "Pendente", icone: "pending_actions", dot: "bg-amber-500" },
  { chave: "EmCurso", rotulo: "Em Curso", icone: "play_circle", dot: "bg-sky-500" },
  { chave: "Atrasada", rotulo: "Atrasada", icone: "alarm", dot: "bg-red-500" },
  { chave: "Concluida", rotulo: "Concluída", icone: "task_alt", dot: "bg-emerald-500" },
  { chave: "Validada", rotulo: "Validada", icone: "verified", dot: "bg-green-600" },
  { chave: "Cancelada", rotulo: "Cancelada", icone: "block", dot: "bg-slate-400" },
];

var LABEL_COLUNA_KANBAN = {
  Pendente: "Pendente",
  EmCurso: "Em Curso",
  Atrasada: "Atrasada",
  Concluida: "Concluída",
  Validada: "Validada",
  Cancelada: "Cancelada",
};

function colunaDeAlocacao(a) {
  if (!a) return "Cancelada";
  if (a.estado === "Em_curso" || a.estado === "Reaberta" || a.estado === "Justificativa") return "EmCurso";
  if (COLUNAS_KANBAN.some(function (c) { return c.chave === a.estado; })) return a.estado;
  return "EmCurso";
}

// Transicoes validas por coluna de origem. "EmCurso" do colaborador permite
// terminar (arrastar para Concluida); o gestor reabre/avalia/cancela.
function transicoesPermitidas(origem, ehGestor) {
  if (ehGestor) {
    if (origem === "Pendente") return ["EmCurso", "Cancelada"];
    if (origem === "EmCurso") return ["Cancelada"];
    if (origem === "Atrasada") return ["EmCurso", "Validada", "Cancelada"];
    if (origem === "Concluida") return ["EmCurso", "Validada", "Cancelada"];
    if (origem === "Validada") return ["EmCurso"];
    return [];
  }
  if (origem === "Pendente") return ["EmCurso"];
  if (origem === "EmCurso") return ["Concluida"];
  return [];
}

// Rotulo da accao ao arrastar de uma coluna para outra (para o menu tactil).
function rotuloTransicao(origem, destino, ehGestor) {
  if (destino === "Cancelada") return "Cancelar participação";
  if (destino === "EmCurso" && origem === "Pendente") return "Iniciar";
  if (destino === "EmCurso") return "Reabrir";
  if (destino === "Validada") return "Avaliar";
  if (destino === "Concluida" && !ehGestor) return "Terminar";
  return "Mover";
}

var NOMES_GESTOR = [
  "administrador geral",
  "director geral",
  "director de recursos humanos",
  "técnico de rh",
  "tecnico de rh",
];

var FILTROS_VAZIOS = { search: "", estado: "", prioridade: "", colaborador_id: "", atrasadas: false };

var CAMPO =
  "w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30 focus:bring-primary/50 focus:border-primary/50";

function pad(n) {
  return (n < 10 ? "0" : "") + n;
}

function janelaInput(valor) {
  if (!valor) return "";
  var d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return "";
  return (
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
    "T" + pad(d.getHours()) + ":" + pad(d.getMinutes())
  );
}

function progressoAoVivo(aloc, agora) {
  if (!aloc) return 0;
  if (aloc.estado === "Cancelada") return Math.max(0, Math.min(100, aloc.progresso || 0));
  if (aloc.estado === "Concluida" || aloc.estado === "Validada" || aloc.estado === "Atrasada") return 100;
  if (aloc.estado === "Pendente") return 0;
  var inicio = new Date(aloc.janela_inicio).getTime();
  var fim = new Date(aloc.janela_fim).getTime();
  if (isNaN(inicio) || isNaN(fim) || fim <= inicio) return 0;
  if (agora <= inicio) return 0;
  if (agora >= fim) return 100;
  return Math.min(99, Math.floor(((agora - inicio) / (fim - inicio)) * 100));
}

function progressoTarefa(t, agora) {
  if (!t) return 0;
  var soma = 0;
  var activas = 0;
  (t.alocacoes || []).forEach(function (a) {
    if (a.estado === "Cancelada") return;
    soma += progressoAoVivo(a, agora);
    activas++;
  });
  if (activas > 0) return Math.round(soma / activas);
  return t.progresso || 0;
}

function minhaAlocacao(t, colaboradorId) {
  if (!t || !t.alocacoes) return null;
  return t.alocacoes.find(function (a) {
    return String(a.colaborador_id) === String(colaboradorId);
  }) || null;
}

function alocAtrasada(a, agora) {
  if (!a) return false;
  if (a.estado === "Atrasada") return true;
  return EM_JANELA.indexOf(a.estado) !== -1 && new Date(a.janela_fim).getTime() < agora;
}

function tarefaAtrasada(t, agora) {
  if (!t || !t.alocacoes) return false;
  return t.alocacoes.some(function (a) { return alocAtrasada(a, agora); });
}

// Tempo restante da janela em milissegundos (negativo = esgotado).
function restanteMs(aloc, agora) {
  if (!aloc || !aloc.janela_fim) return null;
  var fim = new Date(aloc.janela_fim).getTime();
  if (isNaN(fim)) return null;
  return fim - agora;
}

// Contagem decrescente legivel: "02h 14m 33s". null quando nao se aplica.
function textoRestante(aloc, agora) {
  var resto = restanteMs(aloc, agora);
  if (resto === null) return null;
  var sinal = resto < 0 ? "-" : "";
  var total = Math.abs(resto);
  var dias = Math.floor(total / 86400000);
  var horas = Math.floor((total % 86400000) / 3600000);
  var mins = Math.floor((total % 3600000) / 60000);
  var segs = Math.floor((total % 60000) / 1000);
  if (dias > 0) return sinal + dias + "d " + pad(horas) + "h " + pad(mins) + "m";
  return sinal + pad(horas) + "h " + pad(mins) + "m " + pad(segs) + "s";
}

// Urgencia para a cor da contagem: 0 normal, 1 breve (<4h), 2 critica (<1h/esgotado).
function urgenciaRestante(aloc, agora) {
  var resto = restanteMs(aloc, agora);
  if (resto === null) return 0;
  if (resto < 0) return 2;
  if (resto < 3600000) return 2;
  if (resto < 14400000) return 1;
  return 0;
}

function contagemTarefa(t, agora) {
  if (!t || !t.alocacoes) return null;
  var melhor = null;
  (t.alocacoes || []).forEach(function (a) {
    if (EM_JANELA.indexOf(a.estado) === -1) return;
    var resto = restanteMs(a, agora);
    if (resto === null) return;
    if (melhor === null || resto < melhor.resto) melhor = { resto: resto, aloc: a };
  });
  if (!melhor) return null;
  return melhor.aloc;
}

function textoJanela(aloc) {
  if (!aloc) return "—";
  return formatDateTime(aloc.janela_inicio) + " → " + formatDateTime(aloc.janela_fim);
}

function rotuloDia(chave) {
  if (!chave) return "Sem prazo";
  var partes = chave.split("-");
  var dia = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  var diff = Math.round((dia.getTime() - hoje.getTime()) / 86400000);
  var detalhe = dia.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" });
  if (diff === 0) return "Hoje · " + detalhe;
  if (diff === 1) return "Amanhã · " + detalhe;
  if (diff === -1) return "Ontem · " + detalhe;
  return detalhe.charAt(0).toUpperCase() + detalhe.slice(1);
}

function agruparPorDia(lista, chaveFn) {
  var ordem = [];
  var mapa = {};
  lista.forEach(function (t) {
    var chave = chaveFn(t) || "";
    if (!mapa[chave]) {
      mapa[chave] = [];
      ordem.push(chave);
    }
    mapa[chave].push(t);
  });
  ordem.sort(function (a, b) {
    if (!a) return 1;
    if (!b) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return ordem.map(function (chave) {
    return { chave: chave, itens: mapa[chave] };
  });
}

function linhaJanelaVazia() {
  var agora = new Date();
  var fim = new Date(agora.getTime() + 8 * 60 * 60 * 1000);
  return { colaborador_id: "", descricao: "", janela_inicio: janelaInput(agora), janela_fim: janelaInput(fim) };
}

function EstadoBadge({ estado }) {
  return (
    <span
      className={
        "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border " +
        (COR_ESTADO[estado] || "bg-slate-100 text-slate-600 border-slate-200")
      }
    >
      {LABEL_ESTADO[estado] || estado}
    </span>
  );
}

function BarraProgresso({ valor }) {
  var v = Math.max(0, Math.min(100, valor || 0));
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-outline-variant/60 rounded-full overflow-hidden">
        <div
          className={"h-full rounded-full transition-all " + (v >= 100 ? "bg-emerald-500" : v >= 50 ? "bg-primary" : "bg-amber-500")}
          style={{ width: v + "%" }}
        />
      </div>
      <span className="text-[11px] font-semibold text-on-surface-variant w-9 text-right">{v}%</span>
    </div>
  );
}

// Tempo restante em contagem decrescente, visivel para o colaborador e para
// o gestor. Actualiza a cada segundo gracas ao tick do estado 'agora'.
function ContagemRegressiva({ aloc, agora, prefixo }) {
  if (!aloc) return null;
  if (EM_JANELA.indexOf(aloc.estado) === -1) return null;
  var texto = textoRestante(aloc, agora);
  if (texto === null) return null;
  var urg = urgenciaRestante(aloc, agora);
  var cor = urg === 2 ? "text-red-600" : urg === 1 ? "text-amber-600" : "text-on-surface-variant";
  var esgotado = restanteMs(aloc, agora) < 0;
  return (
    <span className={"inline-flex items-center gap-1 text-[11px] font-medium tabular-nums " + cor}>
      <span className="material-symbols-outlined text-[13px]">{esgotado ? "hourglass_bottom" : "timer"}</span>
      {esgotado ? "Esgotado " : (prefixo || "Restam ")}
      {texto}
    </span>
  );
}

function BotaoAcao({ onClick, disabled, children, perigo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors disabled:opacity-40 " +
        (perigo
          ? "text-red-600 border-red-200 hover:bg-red-50"
          : "text-on-surface-variant border-outline-variant hover:bg-surface-container")
      }
    >
      {children}
    </button>
  );
}

export default function TarefasPage() {
  var auth = useAuth();
  var utilizador = auth ? auth.utilizador : null;
  var toast = useToast();

  var perfis = [];
  if (utilizador) {
    perfis = Array.isArray(utilizador.perfis) && utilizador.perfis.length > 0
      ? utilizador.perfis
      : (utilizador.perfil ? [utilizador.perfil] : []);
  }
  var ehGestor = !!(auth && auth.hasPermission("tarefas", "create")) ||
    perfis.some(function (p) {
      return p && ((p.nivel || 0) >= 2 || NOMES_GESTOR.indexOf(String(p.nome).toLowerCase()) !== -1);
    });

  var [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  var [tarefas, setTarefas] = useState([]);
  var [stats, setStats] = useState(null);
  var [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, limite: 20, total_paginas: 1 });
  var [pagina, setPagina] = useState(1);
  var [loading, setLoading] = useState(true);
  var [colaboradores, setColaboradores] = useState([]);
  var [agora, setAgora] = useState(function () { return Date.now(); });
  var [visualizacao, setVisualizacao] = useState("tabela");
  var [arrastando, setArrastando] = useState(null); // cartao do kanban em arrasto {t, aloc, de}
  var [sobreColuna, setSobreColuna] = useState(null); // coluna sob o arrasto
  var [menuMover, setMenuMover] = useState(null); // menu tactil de movimentacao {t, aloc, de}

  var [formTarefa, setFormTarefa] = useState(null);
  var [formLinhas, setFormLinhas] = useState([]);
  var [detalhe, setDetalhe] = useState(null);
  var [detalheLoading, setDetalheLoading] = useState(false);
  var [saving, setSaving] = useState(false);
  var [confirmar, setConfirmar] = useState(null);

  var [avaliar, setAvaliar] = useState(null);
  var [reabrir, setReabrir] = useState(null);
  var [decidir, setDecidir] = useState(null);
  var [justificar, setJustificar] = useState(null);
  var [janelaEdicao, setJanelaEdicao] = useState(null);
  var [reatribuir, setReatribuir] = useState(null);
  var [adicionar, setAdicionar] = useState(null);

  var meuColaboradorId = utilizador && utilizador.colaborador ? utilizador.colaborador.id : null;

  useEffect(function () {
    var intervalo = setInterval(function () {
      if (typeof document !== "undefined" && document.hidden) return;
      setAgora(Date.now());
    }, 1000);
    return function () { clearInterval(intervalo); };
  }, []);

  var carregarStats = async function () {
    try {
      var data = await api.get("/api/tarefas/estatisticas");
      if (data && data.dados) setStats(data.dados);
    } catch (e) { /* manter estatisticas anteriores */ }
  };

  var carregar = async function (pag, silencioso) {
    if (!silencioso) setLoading(true);
    try {
      var url = "/api/tarefas?page=" + (pag || 1) + "&limit=20";
      if (filtros.search) url += "&search=" + encodeURIComponent(filtros.search);
      if (filtros.estado) url += "&estado=" + filtros.estado;
      if (filtros.prioridade) url += "&prioridade=" + filtros.prioridade;
      if (filtros.colaborador_id) url += "&colaborador_id=" + filtros.colaborador_id;
      if (filtros.atrasadas) url += "&atrasadas=true";
      var data = await api.get(url);
      setTarefas((data && data.dados) || []);
      setPaginacao((data && data.paginacao) || { total: 0, pagina: 1, limite: 20, total_paginas: 1 });
      setPagina(pag || 1);
    } catch (e) {
      if (!silencioso) toast.addToast("error", e.message);
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  var carregarColaboradores = async function () {
    try {
      var data = await api.get("/api/colaboradores?page=1&limit=9999");
      setColaboradores((data && data.dados) || []);
    } catch (e) { /* lista vazia */ }
  };

  useEffect(function () {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ehGestor) carregarColaboradores();
  }, [ehGestor]);

  useEffect(function () {
    var timer = setTimeout(function () {
      carregar(1);
      carregarStats();
    }, filtros.search ? 400 : 0);
    return function () { clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  useEffect(function () {
    var intervalo = setInterval(function () {
      if (formTarefa || detalhe || avaliar || reabrir || decidir || justificar || adicionar) return;
      if (typeof document !== "undefined" && document.hidden) return;
      carregar(pagina, true);
      carregarStats();
    }, 10000);
    return function () { clearInterval(intervalo); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, pagina, formTarefa, detalhe, avaliar, reabrir, decidir, justificar, adicionar]);

  var alterarFiltro = function (campo, valor) {
    setFiltros(function (actual) { return Object.assign({}, actual, { [campo]: valor }); });
  };

  var abrirDetalhe = async function (t) {
    setDetalhe(t);
    setJanelaEdicao(null);
    setReatribuir(null);
    setDetalheLoading(true);
    try {
      var data = await api.get("/api/tarefas/" + t.id);
      if (data && data.dados) setDetalhe(data.dados);
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setDetalheLoading(false);
    }
  };

  var actualizarDetalhe = async function (id) {
    if (!id) return;
    try {
      var data = await api.get("/api/tarefas/" + id);
      if (data && data.dados) setDetalhe(data.dados);
    } catch (e) { /* manter detalhe actual */ }
  };

  var fecharDetalhe = function () {
    setDetalhe(null);
    setJanelaEdicao(null);
    setReatribuir(null);
  };

  var acao = async function (metodo, endpoint, body, apos) {
    setSaving(true);
    try {
      var data = await api[metodo](endpoint, body);
      if (data && data.mensagem) toast.addToast("success", data.mensagem);
      if (apos) await apos(data);
      if (detalhe) await actualizarDetalhe(detalhe.id);
      await carregar(pagina, true);
      await carregarStats();
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  var abrirNovo = function () {
    setFormTarefa({ titulo: "", descricao: "", prioridade: "Media" });
    setFormLinhas([linhaJanelaVazia()]);
  };

  var editarTarefa = function (t) {
    setFormTarefa({
      id: t.id,
      titulo: t.titulo || "",
      descricao: t.descricao || "",
      prioridade: t.prioridade || "Media",
    });
  };

  var mudarLinha = function (indice, campo, valor) {
    setFormLinhas(function (actual) {
      var novo = actual.slice();
      novo[indice] = Object.assign({}, novo[indice], { [campo]: valor });
      return novo;
    });
  };

  var validarLinhas = function (linhas) {
    if (linhas.length === 0) return "Indique pelo menos um colaborador";
    var vistas = {};
    for (var i = 0; i < linhas.length; i++) {
      var l = linhas[i];
      if (!l.colaborador_id) return "Seleccione o colaborador de todas as linhas";
      if (vistas[l.colaborador_id]) return "O mesmo colaborador aparece mais do que uma vez";
      vistas[l.colaborador_id] = true;
      if (!l.janela_inicio || !l.janela_fim) return "Preencha a janela (data/hora) de todos os colaboradores";
      if (new Date(l.janela_inicio).getTime() >= new Date(l.janela_fim).getTime()) {
        return "O fim da janela tem de ser posterior ao inicio";
      }
    }
    return null;
  };

  var guardarForm = async function (e) {
    e.preventDefault();
    if (!formTarefa || !String(formTarefa.titulo || "").trim()) {
      toast.addToast("error", "O titulo da tarefa e obrigatorio");
      return;
    }
    setSaving(true);
    try {
      if (formTarefa.id) {
        var dados = {
          titulo: formTarefa.titulo,
          descricao: formTarefa.descricao,
          prioridade: formTarefa.prioridade,
        };
        var r = await api.put("/api/tarefas/" + formTarefa.id, dados);
        toast.addToast("success", r.mensagem || "Tarefa actualizada com sucesso");
      } else {
        var erro = validarLinhas(formLinhas);
        if (erro) {
          toast.addToast("error", erro);
          setSaving(false);
          return;
        }
        var corpo = {
          titulo: formTarefa.titulo,
          descricao: formTarefa.descricao,
          prioridade: formTarefa.prioridade,
          alocacoes: formLinhas.map(function (l) {
            return {
              colaborador_id: l.colaborador_id,
              janela_inicio: l.janela_inicio,
              janela_fim: l.janela_fim,
              descricao: (l.descricao || "").trim() || null,
            };
          }),
        };
        var r2 = await api.post("/api/tarefas", corpo);
        toast.addToast("success", r2.mensagem || "Tarefa atribuida com sucesso");
      }
      setFormTarefa(null);
      if (detalhe) await actualizarDetalhe(detalhe.id);
      await carregar(1);
      await carregarStats();
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  var iniciarAlocacao = function (aloc, tarefa) {
    var tarefaId = tarefa && tarefa.id ? tarefa.id : detalhe.id;
    acao("put", "/api/tarefas/" + tarefaId + "/iniciar", { alocacao_id: aloc.id });
  };

  var terminarAlocacao = function (aloc, tarefa) {
    var tarefaId = tarefa && tarefa.id ? tarefa.id : detalhe.id;
    var nome = aloc.colaborador ? aloc.colaborador.nome_completo : "";
    setConfirmar({
      titulo: "Terminar tarefa",
      mensagem:
        "Marcar o trabalho como terminado? A avaliacao e automatica, com base na rapidez: " +
        "1a metade da janela = 20, 2a metade = 16, ultimos 10% = 12, fora do prazo = 5. " +
        "O gestor pode reavaliar depois.",
      textoConfirmar: "Sim, terminar",
      executar: function () {
        return acao("put", "/api/tarefas/" + tarefaId + "/alocacoes/" + aloc.id + "/terminar", {});
      },
    });
  };

  var abrirJustificar = function (aloc, tarefa) {
    setJustificar({
      tarefa_id: tarefa && tarefa.id ? tarefa.id : detalhe.id,
      alocacao_id: aloc.id,
      nome: aloc.colaborador ? aloc.colaborador.nome_completo : "",
      motivo: "",
    });
  };

  var enviarJustificativa = async function () {
    var motivo = (justificar.motivo || "").trim();
    if (motivo.length < 10) {
      toast.addToast("error", "A justificativa e demasiado curta - detalhe o motivo (minimo 10 caracteres)");
      return;
    }
    setSaving(true);
    try {
      var r = await api.put(
        "/api/tarefas/" + (justificar.tarefa_id || detalhe.id) + "/alocacoes/" + justificar.alocacao_id + "/justificar",
        { motivo: motivo }
      );
      toast.addToast("success", r.mensagem || "Justificativa enviada");
      setJustificar(null);
      await actualizarDetalhe(detalhe.id);
      await carregar(pagina, true);
      await carregarStats();
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  var decidirJustificativa = async function () {
    setSaving(true);
    try {
      var r = await api.put(
        "/api/tarefas/" + detalhe.id + "/alocacoes/" + decidir.alocacao_id + "/decisao",
        { decisao: decidir.tipo, observacoes: (decidir.observacoes || "").trim() || undefined }
      );
      toast.addToast("success", r.mensagem || "Decisao registada");
      setDecidir(null);
      await actualizarDetalhe(detalhe.id);
      await carregar(pagina, true);
      await carregarStats();
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  var abrirAvaliar = function (alocacoes, tarefa) {
    setAvaliar({
      tarefa_id: tarefa && tarefa.id ? tarefa.id : (detalhe ? detalhe.id : null),
      titulo: tarefa ? tarefa.titulo : "",
      linhas: alocacoes.map(function (a) {
        return {
          alocacao_id: a.id,
          nome: a.colaborador ? a.colaborador.nome_completo : "Colaborador",
          desempenho: a.desempenho !== null && a.desempenho !== undefined ? a.desempenho : "",
          produtividade: a.produtividade !== null && a.produtividade !== undefined ? a.produtividade : "",
          cumprimento_prazo: a.cumprimento_prazo !== null && a.cumprimento_prazo !== undefined ? a.cumprimento_prazo : "",
          observacoes: a.observacoes || "",
        };
      }),
    });
  };

  var mudarAvaliacao = function (indice, campo, valor) {
    setAvaliar(function (actual) {
      var novo = actual.linhas.slice();
      novo[indice] = Object.assign({}, novo[indice], { [campo]: valor });
      return { linhas: novo };
    });
  };

  // Nota final de uma linha: media dos tres indicadores (0-20).
  var notaDaLinha = function (l) {
    var d = String(l.desempenho || "").trim().replace(",", ".");
    var p = String(l.produtividade || "").trim().replace(",", ".");
    var c = String(l.cumprimento_prazo || "").trim().replace(",", ".");
    if (d === "" || p === "" || c === "") return null;
    var vd = parseFloat(d);
    var vp = parseFloat(p);
    var vc = parseFloat(c);
    if (isNaN(vd) || isNaN(vp) || isNaN(vc)) return null;
    return Math.round(((vd + vp + vc) / 3) * 100) / 100;
  };

  var classificarNotaLocal = function (nota) {
    if (nota >= 18) return "Excelente";
    if (nota >= 15) return "Bom";
    if (nota >= 10) return "Suficiente";
    if (nota >= 5) return "Insuficiente";
    return "Mau";
  };

  var enviarAvaliacao = async function () {
    var avaliacoes = [];
    for (var i = 0; i < avaliar.linhas.length; i++) {
      var l = avaliar.linhas[i];
      var indicadores = [
        { campo: "desempenho", valor: String(l.desempenho || "").trim().replace(",", ".") },
        { campo: "produtividade", valor: String(l.produtividade || "").trim().replace(",", ".") },
        { campo: "cumprimento_prazo", valor: String(l.cumprimento_prazo || "").trim().replace(",", ".") },
      ];
      var entrada = { alocacao_id: l.alocacao_id };
      for (var j = 0; j < indicadores.length; j++) {
        var texto = indicadores[j].valor;
        var valor = texto === "" ? NaN : parseFloat(texto);
        if (isNaN(valor) || valor < 0 || valor > 20) {
          toast.addToast("error", "Indicador " + indicadores[j].campo.replace("_", " ") +
            " invalido para " + l.nome + " (de 0 a 20)");
          return;
        }
        entrada[indicadores[j].campo] = Math.round(valor * 100) / 100;
      }
      entrada.observacoes = (l.observacoes || "").trim() || undefined;
      avaliacoes.push(entrada);
    }
    if (avaliacoes.length === 0) {
      toast.addToast("error", "Indique os indicadores de cada colaborador a avaliar");
      return;
    }
    setSaving(true);
    try {
      var r = await api.put("/api/tarefas/" + (avaliar.tarefa_id || detalhe.id) + "/validar", { avaliacoes: avaliacoes });
      toast.addToast("success", r.mensagem || "Avaliacao registada");
      setAvaliar(null);
      await actualizarDetalhe(detalhe.id);
      await carregar(pagina, true);
      await carregarStats();
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  var abrirReabrir = function (alocacoes, tarefa) {
    var inicio = new Date();
    var duracao = 60 * 60 * 1000;
    var primeira = alocacoes[0];
    if (primeira && primeira.janela_inicio && primeira.janela_fim) {
      var original = new Date(primeira.janela_fim).getTime() - new Date(primeira.janela_inicio).getTime();
      if (original > 0) duracao = original;
    }
    var fim = new Date(inicio.getTime() + duracao);
    if (fim.getTime() <= inicio.getTime()) fim = new Date(inicio.getTime() + 60 * 60 * 1000);
    setReabrir({
      tarefa_id: tarefa && tarefa.id ? tarefa.id : (detalhe ? detalhe.id : null),
      titulo: tarefa ? tarefa.titulo : "",
      alocacao_ids: alocacoes.map(function (a) { return a.id; }),
      nomes: alocacoes.map(function (a) { return a.colaborador ? a.colaborador.nome_completo : "Colaborador"; }),
      janela_inicio: janelaInput(inicio),
      janela_fim: janelaInput(fim),
    });
  };

  var enviarReabertura = async function () {
    if (!reabrir.janela_inicio || !reabrir.janela_fim) {
      toast.addToast("error", "Preencha a nova janela");
      return;
    }
    if (new Date(reabrir.janela_inicio).getTime() >= new Date(reabrir.janela_fim).getTime()) {
      toast.addToast("error", "O fim da janela tem de ser posterior ao inicio");
      return;
    }
    setSaving(true);
    try {
      var r = await api.put("/api/tarefas/" + (reabrir.tarefa_id || detalhe.id) + "/reabrir", {
        alocacao_ids: reabrir.alocacao_ids,
        janela_inicio: reabrir.janela_inicio,
        janela_fim: reabrir.janela_fim,
      });
      toast.addToast("success", r.mensagem || "Tarefa reaberta");
      setReabrir(null);
      await actualizarDetalhe(detalhe.id);
      await carregar(pagina, true);
      await carregarStats();
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  var guardarJanela = async function () {
    if (!janelaEdicao.janela_inicio || !janelaEdicao.janela_fim) {
      toast.addToast("error", "Preencha a janela");
      return;
    }
    if (new Date(janelaEdicao.janela_inicio).getTime() >= new Date(janelaEdicao.janela_fim).getTime()) {
      toast.addToast("error", "O fim da janela tem de ser posterior ao inicio");
      return;
    }
    await acao(
      "put",
      "/api/tarefas/" + detalhe.id + "/alocacoes/" + janelaEdicao.alocacao_id,
      {
        janela_inicio: janelaEdicao.janela_inicio,
        janela_fim: janelaEdicao.janela_fim,
        descricao: (janelaEdicao.descricao || "").trim() || null,
      },
      function () { setJanelaEdicao(null); }
    );
  };

  var guardarReatribuicao = function () {
    if (!reatribuir.colaborador_id) {
      toast.addToast("error", "Seleccione o novo colaborador");
      return;
    }
    acao(
      "put",
      "/api/tarefas/" + detalhe.id + "/alocacoes/" + reatribuir.alocacao_id,
      { colaborador_id: reatribuir.colaborador_id },
      function () { setReatribuir(null); }
    );
  };

  var removerParticipacao = function (aloc, tarefa) {
    var tarefaId = tarefa && tarefa.id ? tarefa.id : detalhe.id;
    setConfirmar({
      titulo: "Remover Participacao",
      mensagem:
        "Remover " + (aloc.colaborador ? aloc.colaborador.nome_completo : "este colaborador") +
        " desta tarefa? A participacao sera cancelada sem penalizacao.",
      variante: "perigo",
      textoConfirmar: "Remover",
      executar: function () {
        return acao("delete", "/api/tarefas/" + tarefaId + "/alocacoes/" + aloc.id, undefined, function () {
          setJanelaEdicao(null);
          setReatribuir(null);
        });
      },
    });
  };

  // ==================== KANBAN: movimentos ====================

  // Executa a transicao correspondente ao arrasto/menu tactil. Devolve true
  // se a accao foi lancada (API/modal) e false se o movimento nao e valido.
  var executarMovimento = function (t, aloc, de, para) {
    if (!t || !aloc || de === para) return true;
    var permitidas = transicoesPermitidas(de, ehGestor);
    if (permitidas.indexOf(para) === -1) {
      toast.addToast("error", "Não é possível mover de '" + (LABEL_COLUNA_KANBAN[de] || de) + "' para '" + (LABEL_COLUNA_KANBAN[para] || para) + "'");
      return false;
    }

    if (para === "Cancelada") {
      removerParticipacao(aloc, t);
      return true;
    }
    if (para === "EmCurso" && de === "Pendente") {
      iniciarAlocacao(aloc, t);
      return true;
    }
    if (para === "EmCurso") {
      // Atrasada/Concluida/Validada -> reabrir (abre o modal da nova janela).
      abrirReabrir([aloc], t);
      return true;
    }
    if (para === "Validada") {
      abrirAvaliar([aloc], t);
      return true;
    }
    if (para === "Concluida" && !ehGestor && de === "EmCurso") {
      if (["Em_curso", "Reaberta"].indexOf(aloc.estado) === -1) {
        toast.addToast("error", "Só pode terminar participações em curso");
        return false;
      }
      terminarAlocacao(aloc, t);
      return true;
    }
    toast.addToast("error", "Não é possível mover de '" + (LABEL_COLUNA_KANBAN[de] || de) + "' para '" + (LABEL_COLUNA_KANBAN[para] || para) + "'");
    return false;
  };

  var cancelarTarefa = function () {
    setConfirmar({
      titulo: "Cancelar Tarefa",
      mensagem: "Todas as participacoes serao canceladas. Esta accao fica registada no historico.",
      variante: "perigo",
      textoConfirmar: "Cancelar tarefa",
      executar: function () {
        return acao("put", "/api/tarefas/" + detalhe.id + "/cancelar", {});
      },
    });
  };

  var eliminarTarefa = function () {
    var t = detalhe;
    setConfirmar({
      titulo: "Eliminar Tarefa",
      mensagem: "Tem a certeza que deseja eliminar a tarefa '" + t.titulo + "'? O historico tambem sera removido.",
      variante: "perigo",
      textoConfirmar: "Eliminar",
      executar: async function () {
        setSaving(true);
        try {
          var r = await api.delete("/api/tarefas/" + t.id);
          toast.addToast("success", r.mensagem || "Tarefa eliminada");
          fecharDetalhe();
          await carregar(pagina, true);
          await carregarStats();
        } catch (e) {
          toast.addToast("error", e.message);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  var alocacoesVisiveis = [];
  if (detalhe) {
    alocacoesVisiveis = (detalhe.alocacoes || []).slice();
    if (!ehGestor && meuColaboradorId) {
      alocacoesVisiveis = alocacoesVisiveis.filter(function (a) {
        return String(a.colaborador_id) === String(meuColaboradorId);
      });
    }
    alocacoesVisiveis.sort(function (a, b) {
      return new Date(a.janela_fim).getTime() - new Date(b.janela_fim).getTime();
    });
  }
  var minhaNoDetalhe = detalhe && !ehGestor && meuColaboradorId ? minhaAlocacao(detalhe, meuColaboradorId) : null;
  var avaliarPendentes = alocacoesVisiveis.filter(function (a) {
    return a.estado === "Concluida" || a.estado === "Atrasada";
  });

  var statsExibicao = [
    { titulo: "Total", valor: stats ? stats.total : "…", cor: "text-on-surface" },
    { titulo: "Pendentes", valor: stats ? (stats.por_estado.Pendente || 0) : "…", cor: "text-amber-600" },
    { titulo: "Em Curso", valor: stats ? (stats.por_estado.Em_curso || 0) : "…", cor: "text-sky-600" },
    { titulo: "Concluídas", valor: stats ? ((stats.por_estado.Concluida || 0) + (stats.por_estado.Validada || 0)) : "…", cor: "text-emerald-600" },
    { titulo: "Atrasadas", valor: stats ? stats.atrasadas : "…", cor: "text-red-600" },
    { titulo: "Nota Média", valor: stats && stats.nota_media !== null && stats.nota_media !== undefined ? Number(stats.nota_media).toFixed(1) : "—", cor: "text-primary" },
  ];

  var temFiltros = filtros.search || filtros.estado || filtros.prioridade || filtros.colaborador_id || filtros.atrasadas;

  // Cartoes do Kanban: uma alocacao por cartao (tarefa + colaborador).
  // Para o colaborador o backend ja devolve apenas as proprias alocacoes;
  // o filtro extra so se aplica quando o id local e conhecido.
  var cartoesKanban = [];
  if (visualizacao === "kanban") {
    tarefas.forEach(function (t) {
      (t.alocacoes || []).forEach(function (a) {
        if (!ehGestor && meuColaboradorId && String(a.colaborador_id) !== String(meuColaboradorId)) return;
        cartoesKanban.push({ t: t, aloc: a, coluna: colunaDeAlocacao(a) });
      });
    });
    cartoesKanban.sort(function (x, y) {
      var fx = new Date(x.aloc.janela_fim).getTime();
      var fy = new Date(y.aloc.janela_fim).getTime();
      return fx - fy;
    });
  }

  var chaveAgrupamento = function (t) {
    if (ehGestor) return t.prazo ? String(t.prazo).slice(0, 10) : "";
    var minha = minhaAlocacao(t, meuColaboradorId);
    return minha && minha.janela_fim ? String(minha.janela_fim).slice(0, 10) : "";
  };

  var paginacaoBloc = paginacao.total_paginas > 1 ? (
    <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/30">
      <p className="text-[12px] text-outline">Página {pagina} de {paginacao.total_paginas}</p>
      <div className="flex gap-2">
        <button
          onClick={function () { carregar(pagina - 1); }}
          disabled={pagina <= 1}
          className="px-3 py-1.5 text-[12px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-30"
        >
          Anterior
        </button>
        <button
          onClick={function () { carregar(pagina + 1); }}
          disabled={pagina >= paginacao.total_paginas}
          className="px-3 py-1.5 text-[12px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-30"
        >
          Próximo
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Gestão de Tarefas"
        subtitulo={ehGestor
          ? "Atribua tarefas a varios colaboradores, cada um com a sua janela, acompanhe o progresso automatico e avalie no fim."
          : "Acompanhe as suas tarefas, inicie quando estiver disponivel e consulte a avaliacao do gestor."}
        breadcrumb={[{ label: "Desenvolvimento" }, { label: "Gestão de Tarefas" }]}
        acoes={
          <>
            <Link
              href="/dashboard/portal"
              className="px-4 py-2.5 text-[13px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container transition-all"
            >
              Portal
            </Link>
            {ehGestor && (
              <Button onClick={abrirNovo}>
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nova Tarefa
              </Button>
            )}
          </>
        }
      />

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsExibicao.map(function (s, i) {
          return (
            <div key={i} className="bg-surface-card border border-outline-variant rounded-xl p-4">
              <p className="text-[11px] font-medium text-outline">{s.titulo}</p>
              <p className={"text-[24px] font-bold mt-1 " + s.cor}>{s.valor}</p>
            </div>
          );
        })}
      </section>

      <Toolbar>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 w-full">
          <div className="lg:col-span-2">
            <label className="text-[11px] font-medium text-on-surface-variant block mb-1">Pesquisar</label>
            <input
              type="text"
              value={filtros.search}
              onChange={function (e) { alterarFiltro("search", e.target.value); }}
              placeholder="Titulo ou descricao..."
              className={CAMPO}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant block mb-1">Estado</label>
            <select
              value={filtros.estado}
              onChange={function (e) { alterarFiltro("estado", e.target.value); }}
              className={CAMPO}
            >
              <option value="">Todos</option>
              {ESTADOS_TAREFA.map(function (e) {
                return <option key={e} value={e}>{LABEL_ESTADO[e]}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant block mb-1">Prioridade</label>
            <select
              value={filtros.prioridade}
              onChange={function (e) { alterarFiltro("prioridade", e.target.value); }}
              className={CAMPO}
            >
              <option value="">Todas</option>
              {PRIORIDADES.map(function (p) { return <option key={p} value={p}>{p}</option>; })}
            </select>
          </div>
          {ehGestor && (
            <div>
              <label className="text-[11px] font-medium text-on-surface-variant block mb-1">Colaborador</label>
              <select
                value={filtros.colaborador_id}
                onChange={function (e) { alterarFiltro("colaborador_id", e.target.value); }}
                className={CAMPO}
              >
                <option value="">Todos</option>
                {colaboradores.map(function (c) {
                  return <option key={c.id} value={c.id}>{c.nome_completo}</option>;
                })}
              </select>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <label className="flex items-center gap-2 text-[13px] text-on-surface-variant cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!filtros.atrasadas}
              onChange={function (e) { alterarFiltro("atrasadas", e.target.checked); }}
              className="rounded border-outline-variant text-primary focus:ring-primary/30"
            />
            Somente atrasadas
          </label>
          {temFiltros && (
            <button
              onClick={function () { setFiltros(FILTROS_VAZIOS); }}
              className="px-4 py-2 text-[13px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container transition-colors"
            >
              Limpar Tudo
            </button>
          )}
        </div>
      </Toolbar>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-5 pb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-on-surface">
            {ehGestor ? "Tarefas" : "As Minhas Tarefas"}
            <span className="ml-2 text-[12px] font-normal text-outline">({paginacao.total} registo(s))</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-outline">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Actualização automática a cada 10s
            </span>
            <div className="flex rounded-lg border border-outline-variant overflow-hidden">
              <button
                onClick={function () { setVisualizacao("tabela"); }}
                className={"px-3 py-1.5 text-[12px] font-medium transition-colors " + (visualizacao === "tabela" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container")}
              >
                Tabela
              </button>
              <button
                onClick={function () { setVisualizacao("dia"); }}
                className={"px-3 py-1.5 text-[12px] font-medium transition-colors " + (visualizacao === "dia" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container")}
              >
                Por dia
              </button>
              <button
                onClick={function () { setVisualizacao("kanban"); }}
                className={"px-3 py-1.5 text-[12px] font-medium transition-colors " + (visualizacao === "kanban" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container")}
              >
                Kanban
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : tarefas.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title="Nenhuma tarefa encontrada"
            description={temFiltros ? "Ajuste ou limpe os filtros para ver mais resultados." : "Crie a primeira tarefa para começar."}
            action={temFiltros ? (
              <button
                onClick={function () { setFiltros(FILTROS_VAZIOS); }}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Limpar filtros
              </button>
            ) : null}
          />
        ) : visualizacao === "kanban" ? (
          <div className="p-4">
            <p className="text-[11px] text-outline mb-3">
              Arraste os cartões entre colunas para mudar o estado. No telemóvel, toque no ícone de arrastar do cartão.
            </p>
            <div className="flex gap-3 overflow-x-auto pb-3 items-stretch">
              {COLUNAS_KANBAN.map(function (col) {
                var itens = cartoesKanban.filter(function (c) { return c.coluna === col.chave; });
                var activa = sobreColuna === col.chave;
                return (
                  <div
                    key={col.chave}
                    onDragOver={function (e) {
                      e.preventDefault();
                      if (sobreColuna !== col.chave) setSobreColuna(col.chave);
                    }}
                    onDragLeave={function (e) {
                      if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
                      if (sobreColuna === col.chave) setSobreColuna(null);
                    }}
                    onDrop={function (e) {
                      e.preventDefault();
                      var alvo = arrastando;
                      setSobreColuna(null);
                      setArrastando(null);
                      if (alvo) executarMovimento(alvo.t, alvo.aloc, alvo.de, col.chave);
                    }}
                    className={
                      "flex-1 min-w-[250px] max-w-[330px] rounded-xl border bg-surface-container/40 transition-colors " +
                      (activa ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-outline-variant/40")
                    }
                  >
                    <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-outline-variant/40">
                      <span className={"w-2 h-2 rounded-full " + col.dot} />
                      <span className="material-symbols-outlined text-[16px] text-outline">{col.icone}</span>
                      <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">{col.rotulo}</h3>
                      <span className="ml-auto text-[11px] font-semibold text-outline">{itens.length}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[70px]">
                      {itens.map(function (c) {
                        var a = c.aloc;
                        var emArrasto = arrastando && String(arrastando.aloc.id) === String(a.id);
                        return (
                          <div
                            key={a.id}
                            draggable={true}
                            onDragStart={function (e) {
                              setArrastando({ t: c.t, aloc: a, de: col.chave });
                              e.dataTransfer.effectAllowed = "move";
                              try { e.dataTransfer.setData("text/plain", String(a.id)); } catch (err) { /* alguns navegadores */ }
                            }}
                            onDragEnd={function () { setArrastando(null); setSobreColuna(null); }}
                            className={
                              "bg-surface-card border rounded-lg p-2.5 shadow-sm transition-all cursor-grab active:cursor-grabbing " +
                              (emArrasto ? "opacity-40 border-dashed border-primary" : "border-outline-variant/60 hover:border-primary/60")
                            }
                          >
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={function () { setMenuMover({ t: c.t, aloc: a, de: col.chave }); }}
                                title="Mover para..."
                                className="mt-0.5 text-outline hover:text-primary shrink-0"
                              >
                                <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-on-surface leading-tight truncate">{c.t.titulo}</p>
                                <p className="text-[11px] text-on-surface-variant truncate">
                                  {a.colaborador ? a.colaborador.nome_completo : "Sem colaborador"}
                                </p>
                                {a.descricao && (
                                  <p className="text-[11px] text-outline truncate italic mt-0.5">{a.descricao}</p>
                                )}
                              </div>
                              <EstadoBadge estado={a.estado} />
                            </div>
                            <div className="mt-2">
                              <BarraProgresso valor={progressoAoVivo(a, agora)} />
                            </div>
                            <div className="mt-1.5">
                              <ContagemRegressiva aloc={a} agora={agora} />
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <button
                                onClick={function () { abrirDetalhe(c.t); }}
                                className="text-[11px] font-medium text-primary hover:underline"
                              >
                                Detalhes
                              </button>
                              {a.nota !== null && a.nota !== undefined && (
                                <span className="text-[11px] font-bold text-on-surface">
                                  {Number(a.nota).toFixed(1)}/20
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {itens.length === 0 && (
                        <p className="text-[11px] text-outline/50 text-center py-3">Sem cartões</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {paginacaoBloc}
          </div>
        ) : visualizacao === "dia" ? (
          <div className="p-5 space-y-5">
            {agruparPorDia(tarefas, chaveAgrupamento).map(function (grupo) {
              return (
                <div key={grupo.chave || "sem-janela"}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={"material-symbols-outlined text-[16px] " + (grupo.chave ? "text-primary" : "text-outline/60")}>calendar_month</span>
                    <h3 className="text-[13px] font-semibold text-on-surface">{rotuloDia(grupo.chave)}</h3>
                    <span className="text-[11px] text-outline">({grupo.itens.length} tarefa(s))</span>
                  </div>
                  <div className="space-y-2">
                    {grupo.itens.map(function (t) {
                      var atrasada = tarefaAtrasada(t, agora);
                      var minha = ehGestor ? null : minhaAlocacao(t, meuColaboradorId);
                      return (
                        <div
                          key={t.id}
                          className={"border rounded-lg p-3 flex flex-wrap items-center gap-3 " + (atrasada ? "border-red-200 bg-red-50/40" : "border-outline-variant/50 bg-surface-card")}
                        >
                          <div className="flex-1 min-w-[180px]">
                            <p className="text-[13px] font-medium text-on-surface leading-tight">{t.titulo}</p>
                            <p className="text-[11px] text-outline">
                              {ehGestor && t.colaborador ? t.colaborador.nome_completo + " · " : ""}
                              {minha ? textoJanela(minha) : (t.prazo ? "até " + formatDate(t.prazo) + (t.prazo_hora ? " às " + String(t.prazo_hora).slice(0, 5) : "") : "sem prazo")}
                            </p>
                          </div>
                          <div className="hidden md:block">
                            <BarraProgresso valor={progressoTarefa(t, agora)} />
                            <div className="mt-1">
                              <ContagemRegressiva aloc={ehGestor ? contagemTarefa(t, agora) : minha} agora={agora} />
                            </div>
                          </div>
                          <EstadoBadge estado={minha ? minha.estado : t.estado} />
                          <button
                            onClick={function () { abrirDetalhe(t); }}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            Detalhes
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {paginacaoBloc}
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Tarefa</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">{ehGestor ? "Colaboradores" : "Janela"}</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Prazo</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Prioridade</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Progresso</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase">Estado</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Nota</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-on-surface-variant uppercase text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {tarefas.map(function (t) {
                  var atrasada = tarefaAtrasada(t, agora);
                  var minha = ehGestor ? null : minhaAlocacao(t, meuColaboradorId);
                  var alocsTarefa = t.alocacoes || [];
                  var nomeColaboradores = alocsTarefa
                    .map(function (a) { return a.colaborador ? a.colaborador.nome_completo : ""; })
                    .filter(Boolean);
                  return (
                    <tr key={t.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="px-4 py-2.5 max-w-[260px]">
                        <p className="text-[13px] font-medium text-on-surface truncate">{t.titulo}</p>
                        {t.descricao && <p className="text-[11px] text-outline truncate">{t.descricao}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-on-surface-variant">
                        {ehGestor ? (
                          <span>
                            {nomeColaboradores[0] || "—"}
                            {nomeColaboradores.length > 1 && (
                              <span className="text-outline"> +{nomeColaboradores.length - 1}</span>
                            )}
                          </span>
                        ) : (
                          <span className={atrasada ? "font-semibold text-red-600" : "text-on-surface-variant"}>
                            {minha ? textoJanela(minha) : "—"}
                          </span>
                        )}
                        {atrasada && <span className="block text-[10px] font-semibold text-red-500">Atrasada</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        <span className="text-on-surface-variant">{t.prazo ? formatDate(t.prazo) : "—"}</span>
                        {t.prazo_hora && <span className="block text-[11px] text-outline">às {String(t.prazo_hora).slice(0, 5)}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <EstadoBadgePrioridade prioridade={t.prioridade} />
                      </td>
                      <td className="px-4 py-2.5">
                        <BarraProgresso valor={progressoTarefa(t, agora)} />
                        <div className="mt-1">
                          <ContagemRegressiva aloc={ehGestor ? contagemTarefa(t, agora) : minha} agora={agora} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <EstadoBadge estado={minha ? minha.estado : t.estado} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {notaExibicao(t, minha) !== null ? (
                          <span className="text-[13px] font-bold text-on-surface">{notaExibicao(t, minha).toFixed(1)}</span>
                        ) : (
                          <span className="text-[12px] text-outline/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={function () { abrirDetalhe(t); }}
                            className="text-[11px] font-medium text-primary hover:underline px-1.5 py-0.5 rounded hover:bg-primary/5"
                          >
                            Detalhes
                          </button>
                          {ehGestor && (
                            <button
                              onClick={function () { editarTarefa(t); }}
                              className="text-[11px] font-medium text-on-surface-variant hover:underline px-1.5 py-0.5 rounded hover:bg-surface-container"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {paginacaoBloc}
          </div>
        )}

        {(!loading && tarefas.length > 0 && visualizacao === "tabela") && (
          <div className="md:hidden divide-y divide-outline-variant/30">
            {tarefas.map(function (t) {
              var atrasada = tarefaAtrasada(t, agora);
              var minha = ehGestor ? null : minhaAlocacao(t, meuColaboradorId);
              var nomes = (t.alocacoes || [])
                .map(function (a) { return a.colaborador ? a.colaborador.nome_completo : ""; })
                .filter(Boolean);
              return (
                <div key={t.id} className={"p-4 space-y-2.5 " + (atrasada ? "bg-red-50/40" : "")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-on-surface leading-tight">{t.titulo}</p>
                      <p className="text-[11px] text-outline mt-0.5 truncate">
                        {ehGestor
                          ? (nomes.join(", ") || "Sem colaborador")
                          : (minha ? textoJanela(minha) : "—")}
                      </p>
                    </div>
                    <EstadoBadge estado={minha ? minha.estado : t.estado} />
                  </div>
                  <BarraProgresso valor={progressoTarefa(t, agora)} />
                  <div className="flex items-center justify-between gap-2">
                    <ContagemRegressiva aloc={ehGestor ? contagemTarefa(t, agora) : minha} agora={agora} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <EstadoBadgePrioridade prioridade={t.prioridade} />
                    <span className="text-[11px] text-outline">
                      {t.prazo
                        ? "até " + formatDate(t.prazo) + (t.prazo_hora ? " às " + String(t.prazo_hora).slice(0, 5) : "")
                        : "sem prazo"}
                    </span>
                    {atrasada && <span className="text-[11px] font-semibold text-red-500">Atrasada</span>}
                    {notaExibicao(t, minha) !== null && (
                      <span className="text-[12px] font-bold text-on-surface ml-auto">
                        {notaExibicao(t, minha).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={function () { abrirDetalhe(t); }}
                      className="flex-1 py-2 text-[12px] font-medium text-primary border border-primary/40 rounded-lg hover:bg-primary/5"
                    >
                      Detalhes
                    </button>
                    {ehGestor && (
                      <button
                        onClick={function () { editarTarefa(t); }}
                        className="flex-1 py-2 text-[12px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {paginacaoBloc}
          </div>
        )}
      </section>

      {formTarefa && (
        <Modal
          isOpen={true}
          onClose={function () { setFormTarefa(null); }}
          title={formTarefa.id ? "Editar Tarefa" : "Nova Tarefa"}
          size={formTarefa.id ? "md" : "lg"}
          footer={
            <>
              <Button variant="outline" onClick={function () { setFormTarefa(null); }}>Cancelar</Button>
              <Button onClick={guardarForm} disabled={saving}>
                {saving ? "A guardar..." : (formTarefa.id ? "Guardar" : "Atribuir")}
              </Button>
            </>
          }
        >
          <form onSubmit={guardarForm} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Titulo *</label>
              <input
                type="text"
                value={formTarefa.titulo}
                onChange={function (e) { setFormTarefa(Object.assign({}, formTarefa, { titulo: e.target.value })); }}
                required
                maxLength={200}
                placeholder="Ex.: Preparar relatorio mensal"
                className={CAMPO}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Descricao</label>
              <textarea
                value={formTarefa.descricao}
                onChange={function (e) { setFormTarefa(Object.assign({}, formTarefa, { descricao: e.target.value })); }}
                rows={3}
                placeholder="Detalhe o que precisa de ser feito"
                className={CAMPO + " resize-none"}
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Prioridade</label>
              <select
                value={formTarefa.prioridade}
                onChange={function (e) { setFormTarefa(Object.assign({}, formTarefa, { prioridade: e.target.value })); }}
                className={CAMPO}
              >
                {PRIORIDADES.map(function (p) { return <option key={p} value={p}>{p}</option>; })}
              </select>
            </div>

            {!formTarefa.id && (
              <div className="border-t border-outline-variant/50 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase">
                    Colaboradores e janelas *
                  </label>
                  <button
                    type="button"
                    onClick={function () { setFormLinhas(formLinhas.concat([linhaJanelaVazia()])); }}
                    className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">person_add</span>
                    Adicionar colaborador
                  </button>
                </div>
                {formLinhas.map(function (linha, i) {
                  return (
                    <div key={i} className="border border-outline-variant/60 rounded-lg p-3 space-y-2 bg-surface-container/40">
                      <div className="flex items-start gap-2">
                        <select
                          value={linha.colaborador_id}
                          onChange={function (e) { mudarLinha(i, "colaborador_id", e.target.value); }}
                          className={CAMPO + " flex-1"}
                        >
                          <option value="">Seleccionar colaborador...</option>
                          {colaboradores.map(function (c) {
                            return <option key={c.id} value={c.id}>{c.nome_completo}</option>;
                          })}
                        </select>
                        {formLinhas.length > 1 && (
                          <button
                            type="button"
                            onClick={function () { setFormLinhas(formLinhas.filter(function (_, j) { return j !== i; })); }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Remover linha"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-outline uppercase block mb-1">O que vai fazer (opcional)</label>
                        <input
                          type="text"
                          value={linha.descricao || ""}
                          onChange={function (e) { mudarLinha(i, "descricao", e.target.value); }}
                          placeholder="Ex.: montar a estrutura de madeira"
                          maxLength={500}
                          className={CAMPO}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-outline uppercase block mb-1">Início da janela *</label>
                          <input
                            type="datetime-local"
                            value={linha.janela_inicio}
                            onChange={function (e) { mudarLinha(i, "janela_inicio", e.target.value); }}
                            className={CAMPO}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-outline uppercase block mb-1">Fim da janela *</label>
                          <input
                            type="datetime-local"
                            value={linha.janela_fim}
                            onChange={function (e) { mudarLinha(i, "janela_fim", e.target.value); }}
                            className={CAMPO}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11px] text-outline">
                  Cada colaborador tem a sua propria janela de data/hora. O progresso de cada um e calculado
                  automaticamente pelo tempo decorrido dentro da sua janela.
                </p>
              </div>
            )}
          </form>
        </Modal>
      )}

      {detalhe && (
        <Modal
          isOpen={true}
          onClose={fecharDetalhe}
          title={detalhe.titulo}
          size="xl"
          footer={<Button variant="outline" onClick={fecharDetalhe}>Fechar</Button>}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <EstadoBadge estado={detalhe.estado} />
              <span
                className={
                  "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded " +
                  (COR_PRIORIDADE[detalhe.prioridade] || "bg-slate-100 text-slate-600")
                }
              >
                {detalhe.prioridade}
              </span>
              {detalhe.prazo && (
                <span className="text-[12px] text-on-surface-variant">
                  Prazo: <strong>{formatDate(detalhe.prazo)}{detalhe.prazo_hora ? " às " + String(detalhe.prazo_hora).slice(0, 5) : ""}</strong>
                </span>
              )}
              {detalhe.atribuidor && (
                <span className="text-[12px] text-outline">· Atribuída por {detalhe.atribuidor.nome_completo}</span>
              )}
            </div>

            {detalheLoading && <p className="text-[12px] text-outline">A actualizar...</p>}

            {detalhe.descricao && (
              <p className="text-[13px] text-on-surface-variant whitespace-pre-line bg-surface-container rounded-lg p-3">
                {detalhe.descricao}
              </p>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-on-surface-variant uppercase">Progresso</span>
                <span className="text-[13px] font-bold text-on-surface">{progressoTarefa(detalhe, agora)}%</span>
              </div>
              <BarraProgresso valor={progressoTarefa(detalhe, agora)} />
              <p className="text-[11px] text-outline mt-1">
                Progresso automatico: tempo decorrido dentro da janela de cada colaborador.
              </p>
            </div>

            {detalhe.nota !== null && detalhe.nota !== undefined && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase">Avaliação do Gestor</p>
                    <p className="text-[11px] text-outline mt-0.5">
                      {detalhe.avaliacao_detalhes || "Media das notas atribuidas por colaborador"}
                    </p>
                    {detalhe.validacao_observacoes && (
                      <p className="text-[12px] text-on-surface-variant mt-1">{detalhe.validacao_observacoes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[24px] font-bold text-primary leading-none">{Number(detalhe.nota).toFixed(1)}</p>
                    <p className="text-[11px] text-outline">/ 20 · {detalhe.classificacao}</p>
                  </div>
                </div>
                {detalhe.data_conclusao && (
                  <p className="text-[11px] text-outline mt-2">Concluída em {formatDateTime(detalhe.data_conclusao)}</p>
                )}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase">
                  Colaboradores ({alocacoesVisiveis.length})
                </h4>
                {ehGestor && (
                  <button
                    onClick={function () {
                      setAdicionar({ linhas: [linhaJanelaVazia()] });
                    }}
                    className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">person_add</span>
                    Adicionar colaboradores
                  </button>
                )}
              </div>

              <div className="border border-outline-variant/60 rounded-lg overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-semibold text-on-surface-variant uppercase">Colaborador</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-on-surface-variant uppercase">Janela</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-on-surface-variant uppercase">Estado</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-on-surface-variant uppercase">Progresso</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-on-surface-variant uppercase text-center">Nota</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-on-surface-variant uppercase text-center">Acções</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {alocacoesVisiveis.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-[12px] text-outline">
                          Nenhuma atribuicao visivel
                        </td>
                      </tr>
                    )}
                    {alocacoesVisiveis.map(function (a) {
                      var atrasada = alocAtrasada(a, agora);
                      var editavel = ["Concluida", "Validada", "Cancelada", "Atrasada"].indexOf(a.estado) === -1;
                      var emEdicaoJanela = janelaEdicao && janelaEdicao.alocacao_id === a.id;
                      var emReatribuicao = reatribuir && reatribuir.alocacao_id === a.id;
                      return (
                        <AlocacaoLinha
                          key={a.id}
                          aloc={a}
                          agora={agora}
                          atrasada={atrasada}
                          ehGestor={ehGestor}
                          editavel={editavel}
                          emEdicaoJanela={emEdicaoJanela}
                          emReatribuicao={emReatribuicao}
                          colaboradores={colaboradores}
                          janelaEdicao={janelaEdicao}
                          reatribuir={reatribuir}
                          saving={saving}
                          onMudarJanela={function (campo, valor) {
                            setJanelaEdicao(function (actual) { return Object.assign({}, actual, { [campo]: valor }); });
                          }}
                          onGuardarJanela={guardarJanela}
                          onCancelarJanela={function () { setJanelaEdicao(null); }}
                          onAbrirJanela={function () {
                            setJanelaEdicao({
                              alocacao_id: a.id,
                              janela_inicio: janelaInput(a.janela_inicio),
                              janela_fim: janelaInput(a.janela_fim),
                              descricao: a.descricao || "",
                            });
                            setReatribuir(null);
                          }}
                          onMudarReatribuicao={function (valor) {
                            setReatribuir({ alocacao_id: a.id, colaborador_id: valor });
                          }}
                          onGuardarReatribuicao={guardarReatribuicao}
                          onCancelarReatribuicao={function () { setReatribuir(null); }}
                          onAbrirReatribuicao={function () {
                            setReatribuir({ alocacao_id: a.id, colaborador_id: "" });
                            setJanelaEdicao(null);
                          }}
                          onRemover={function () { removerParticipacao(a); }}
                          onAvaliar={function () { abrirAvaliar([a]); }}
                          onReabrir={function () { abrirReabrir([a]); }}
                          onDecidir={function (tipo) { setDecidir({ alocacao_id: a.id, nome: a.colaborador ? a.colaborador.nome_completo : "", motivo: a.justificativa, tipo: tipo, observacoes: "" }); }}
                          onIniciar={function () { iniciarAlocacao(a); }}
                          onTerminar={function () { terminarAlocacao(a); }}
                          onJustificar={function () { abrirJustificar(a); }}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {ehGestor && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={function () { editarTarefa(detalhe); }}>
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Editar dados
                </Button>
                {avaliarPendentes.length > 0 && (
                  <Button size="sm" onClick={function () { abrirAvaliar(avaliarPendentes); }}>
                    <span className="material-symbols-outlined text-[16px]">grade</span>
                    Avaliar ({avaliarPendentes.length})
                  </Button>
                )}
                {detalhe.estado !== "Cancelada" && (
                  <Button variant="outline" size="sm" onClick={cancelarTarefa} disabled={saving}>
                    <span className="material-symbols-outlined text-[16px]">block</span>
                    Cancelar tarefa
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={eliminarTarefa} disabled={saving}>
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Eliminar
                </Button>
              </div>
            )}

            {!ehGestor && minhaNoDetalhe && (
              <div className="bg-surface-container rounded-lg p-4 space-y-3">
                <p className="text-[12px] font-semibold text-on-surface-variant uppercase">
                  A minha participação
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] text-on-surface-variant">{textoJanela(minhaNoDetalhe)}</p>
                  <ContagemRegressiva aloc={minhaNoDetalhe} agora={agora} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {minhaNoDetalhe.estado === "Pendente" && (
                    <Button size="sm" onClick={function () { iniciarAlocacao(minhaNoDetalhe); }} disabled={saving}>
                      <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      Iniciar
                    </Button>
                  )}
                  {(minhaNoDetalhe.estado === "Em_curso" || minhaNoDetalhe.estado === "Reaberta") && (
                    <Button size="sm" onClick={function () { terminarAlocacao(minhaNoDetalhe); }} disabled={saving}>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Terminar
                    </Button>
                  )}
                  {(EM_JANELA.indexOf(minhaNoDetalhe.estado) !== -1 || minhaNoDetalhe.estado === "Atrasada") && (
                    <Button variant="outline" size="sm" onClick={function () { abrirJustificar(minhaNoDetalhe); }} disabled={saving}>
                      <span className="material-symbols-outlined text-[16px]">assignment</span>
                      Justificar
                    </Button>
                  )}
                </div>
                {minhaNoDetalhe.nota !== null && minhaNoDetalhe.nota !== undefined && (
                  <p className="text-[12px] text-on-surface-variant">
                    <span className="font-semibold">Avaliação:</span> {parseFloat(minhaNoDetalhe.nota).toFixed(1)}/20
                    {minhaNoDetalhe.classificacao ? " · " + minhaNoDetalhe.classificacao : ""}
                    {minhaNoDetalhe.avaliado_por === null && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-primary border border-primary/30 rounded px-1.5 py-0.5">
                        Automática
                      </span>
                    )}
                  </p>
                )}
                <p className="text-[11px] text-outline">
                  {minhaNoDetalhe.estado === "Pendente" && "Por iniciar. Inicie dentro da janela para o progresso ser contado."}
                  {minhaNoDetalhe.estado === "Em_curso" && "Em curso - o progresso cresce automaticamente e o tempo restante diminui em tempo real."}
                  {minhaNoDetalhe.estado === "Reaberta" && "Reaberta pelo gestor - nova janela em curso."}
                  {minhaNoDetalhe.estado === "Justificativa" && "Justificativa apresentada - aguarda a decisao do gestor."}
                  {minhaNoDetalhe.estado === "Atrasada" && "A janela terminou sem concluir. Pode justificar ou aguardar a decisao do gestor (reabrir, eliminar ou avaliar)."}
                  {minhaNoDetalhe.estado === "Concluida" && "Concluida - avaliacao automatica registada pela rapidez. O gestor pode reavaliar."}
                  {minhaNoDetalhe.estado === "Validada" && "Avaliada pelo gestor."}
                  {minhaNoDetalhe.estado === "Cancelada" && "Participacao cancelada."}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase mb-2">Histórico</h4>
              {!detalhe.eventos || detalhe.eventos.length === 0 ? (
                <p className="text-[12px] text-outline">Sem movimentos registados</p>
              ) : (
                <div className="space-y-2">
                  {detalhe.eventos.map(function (ev) {
                    return (
                      <div key={ev.id} className="flex items-start gap-3 text-[12px] border-b border-outline-variant/30 last:border-0 pb-2 last:pb-0">
                        <span className="text-[11px] text-outline whitespace-nowrap">{formatDateTime(ev.createdAt)}</span>
                        <div className="flex-1">
                          <p className="text-on-surface-variant">{ev.descricao}</p>
                          {ev.utilizador && <p className="text-[11px] text-outline">{ev.utilizador.nome_completo}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {avaliar && (
        <Modal
          isOpen={true}
          onClose={function () { setAvaliar(null); }}
          title="Avaliar colaboradores"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={function () { setAvaliar(null); }}>Cancelar</Button>
              <Button onClick={enviarAvaliacao} disabled={saving}>
                {saving ? "A guardar..." : "Registar avaliação"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {avaliar.titulo && (
              <p className="text-[12px] font-semibold text-primary truncate">Tarefa: {avaliar.titulo}</p>
            )}
            <p className="text-[12px] text-on-surface-variant">
              O gestor avalia cada colaborador com tres indicadores (0 a 20). A <strong>nota final e a media</strong>{" "}
              dos tres, calculada automaticamente. As observacoes sao opcionais.
            </p>
            {avaliar.linhas.map(function (l, i) {
              var notaCalculada = notaDaLinha(l);
              return (
                <div key={l.alocacao_id} className="border border-outline-variant/60 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-on-surface">{l.nome}</p>
                    {notaCalculada !== null && (
                      <p className="text-[12px] font-bold text-primary whitespace-nowrap">
                        Nota final: {String(notaCalculada).replace(".", ",")} / 20 ({classificarNotaLocal(notaCalculada)})
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-outline uppercase block mb-1">Desempenho (0-20) *</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={l.desempenho}
                        onChange={function (e) { mudarAvaliacao(i, "desempenho", e.target.value); }}
                        className={CAMPO}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-outline uppercase block mb-1">Produtividade (0-20) *</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={l.produtividade}
                        onChange={function (e) { mudarAvaliacao(i, "produtividade", e.target.value); }}
                        className={CAMPO}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-outline uppercase block mb-1">Cumprimento do prazo (0-20) *</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={l.cumprimento_prazo}
                        onChange={function (e) { mudarAvaliacao(i, "cumprimento_prazo", e.target.value); }}
                        className={CAMPO}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-outline uppercase block mb-1">Observações</label>
                    <input
                      type="text"
                      value={l.observacoes}
                      onChange={function (e) { mudarAvaliacao(i, "observacoes", e.target.value); }}
                      placeholder="Comentarios sobre o trabalho"
                      maxLength={4000}
                      className={CAMPO}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {reabrir && (
        <Modal
          isOpen={true}
          onClose={function () { setReabrir(null); }}
          title="Reabrir tarefa"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={function () { setReabrir(null); }}>Cancelar</Button>
              <Button onClick={enviarReabertura} disabled={saving}>
                {saving ? "A guardar..." : "Reabrir"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {reabrir.titulo && (
              <p className="text-[12px] font-semibold text-primary truncate">Tarefa: {reabrir.titulo}</p>
            )}
            <p className="text-[12px] text-on-surface-variant">
              A reabrir, {reabrir.nomes.join(", ")} volta a <strong>Em Curso</strong> com uma nova janela e a nota
              anterior e removida.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Nova janela - início *</label>
                <input
                  type="datetime-local"
                  value={reabrir.janela_inicio}
                  onChange={function (e) { setReabrir(Object.assign({}, reabrir, { janela_inicio: e.target.value })); }}
                  className={CAMPO}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Nova janela - fim *</label>
                <input
                  type="datetime-local"
                  value={reabrir.janela_fim}
                  onChange={function (e) { setReabrir(Object.assign({}, reabrir, { janela_fim: e.target.value })); }}
                  className={CAMPO}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {decidir && detalhe && (
        <Modal
          isOpen={true}
          onClose={function () { setDecidir(null); }}
          title={decidir.tipo === "aceitar" ? "Aceitar justificativa" : "Rejeitar justificativa"}
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={function () { setDecidir(null); }}>Voltar</Button>
              <Button
                variant={decidir.tipo === "aceitar" ? "destructive" : "default"}
                onClick={decidirJustificativa}
                disabled={saving}
              >
                {saving ? "A guardar..." : (decidir.tipo === "aceitar" ? "Aceitar (cancelar participação)" : "Rejeitar (continuar tarefa)")}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase mb-1">
                Justificativa de {decidir.nome}
              </p>
              <p className="text-[13px] text-on-surface-variant bg-surface-container rounded-lg p-3 whitespace-pre-line">
                {decidir.motivo}
              </p>
            </div>
            <p className="text-[12px] text-on-surface-variant">
              {decidir.tipo === "aceitar"
                ? "A participacao sera cancelada sem penalizacao. Pode depois atribuir a tarefa a outro colaborador."
                : "A tarefa volta ao estado anterior e o prazo continua a contar."}
            </p>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={decidir.observacoes}
                onChange={function (e) { setDecidir(Object.assign({}, decidir, { observacoes: e.target.value })); }}
                rows={2}
                maxLength={2000}
                className={CAMPO + " resize-none"}
              />
            </div>
            {decidir.tipo === "aceitar" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={function () { setDecidir(null); }}
                  className="flex-1 py-2 text-[13px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setDecidir(null);
                    setAdicionar({ linhas: [linhaJanelaVazia()] });
                  }}
                  className="flex-1 py-2 text-[13px] font-medium text-primary border border-primary/40 rounded-lg hover:bg-primary/5"
                >
                  Reatribuir a outro
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {justificar && (
        <Modal
          isOpen={true}
          onClose={function () { setJustificar(null); }}
          title="Justificar pendência"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={function () { setJustificar(null); }}>Cancelar</Button>
              <Button onClick={enviarJustificativa} disabled={saving}>
                {saving ? "A enviar..." : "Enviar justificativa"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-[12px] text-on-surface-variant">
              Descreva o motivo de nao poder concluir a tarefa dentro da janela. O gestor aceita (cancela ou
              reatribui sem penalizacao) ou rejeita (a tarefa continua e o prazo continua a contar).
            </p>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase block mb-1">Motivo *</label>
              <textarea
                value={justificar.motivo}
                onChange={function (e) { setJustificar(Object.assign({}, justificar, { motivo: e.target.value })); }}
                rows={4}
                maxLength={2000}
                placeholder="Detalhe o motivo (minimo 10 caracteres)"
                className={CAMPO + " resize-none"}
              />
              <p className="text-[11px] text-outline mt-1">{(justificar.motivo || "").trim().length} caracteres</p>
            </div>
          </div>
        </Modal>
      )}

      {menuMover && (
        <Modal
          isOpen={true}
          onClose={function () { setMenuMover(null); }}
          title="Mover cartão"
          size="sm"
          footer={
            <Button variant="outline" onClick={function () { setMenuMover(null); }}>Cancelar</Button>
          }
        >
          <div className="space-y-3">
            <div>
              <p className="text-[13px] font-semibold text-on-surface truncate">{menuMover.t.titulo}</p>
              <p className="text-[11px] text-on-surface-variant">
                {menuMover.aloc.colaborador ? menuMover.aloc.colaborador.nome_completo : "Sem colaborador"}
                {" · " + (LABEL_COLUNA_KANBAN[menuMover.de] || menuMover.de)}
              </p>
            </div>
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase">Mover para</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {COLUNAS_KANBAN.filter(function (col) {
                return transicoesPermitidas(menuMover.de, ehGestor).indexOf(col.chave) !== -1;
              }).map(function (col) {
                return (
                  <button
                    key={col.chave}
                    type="button"
                    onClick={function () {
                      var m = menuMover;
                      setMenuMover(null);
                      executarMovimento(m.t, m.aloc, m.de, col.chave);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-outline-variant/60 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <span className={"w-2 h-2 rounded-full " + col.dot} />
                    <span className="text-[13px] font-medium text-on-surface">
                      {col.rotulo}
                    </span>
                    <span className="ml-auto text-[11px] text-outline">
                      {rotuloTransicao(menuMover.de, col.chave, ehGestor)}
                    </span>
                  </button>
                );
              })}
              {transicoesPermitidas(menuMover.de, ehGestor).length === 0 && (
                <p className="text-[12px] text-outline">Este cartão não pode ser movido.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {adicionar && detalhe && (
        <Modal
          isOpen={true}
          onClose={function () { setAdicionar(null); }}
          title="Adicionar colaboradores"
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={function () { setAdicionar(null); }}>Cancelar</Button>
              <Button
                onClick={async function () {
                  var erro = validarLinhas(adicionar.linhas);
                  if (erro) {
                    toast.addToast("error", erro);
                    return;
                  }
                  await acao("post", "/api/tarefas/" + detalhe.id + "/alocacoes", {
                    alocacoes: adicionar.linhas.map(function (l) {
                      return {
                        colaborador_id: l.colaborador_id,
                        janela_inicio: l.janela_inicio,
                        janela_fim: l.janela_fim,
                        descricao: (l.descricao || "").trim() || null,
                      };
                    }),
                  }, function () { setAdicionar(null); });
                }}
                disabled={saving}
              >
                {saving ? "A guardar..." : "Atribuir"}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {adicionar.linhas.map(function (linha, i) {
              return (
                <div key={i} className="border border-outline-variant/60 rounded-lg p-3 space-y-2 bg-surface-container/40">
                  <div className="flex items-start gap-2">
                    <select
                      value={linha.colaborador_id}
                      onChange={function (e) {
                        setAdicionar(function (actual) {
                          var novo = actual.linhas.slice();
                          novo[i] = Object.assign({}, novo[i], { colaborador_id: e.target.value });
                          return { linhas: novo };
                        });
                      }}
                      className={CAMPO + " flex-1"}
                    >
                      <option value="">Seleccionar colaborador...</option>
                      {colaboradores.map(function (c) {
                        return <option key={c.id} value={c.id}>{c.nome_completo}</option>;
                      })}
                    </select>
                    {adicionar.linhas.length > 1 && (
                      <button
                        type="button"
                        onClick={function () {
                          setAdicionar(function (actual) {
                            return { linhas: actual.linhas.filter(function (_, j) { return j !== i; }) };
                          });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      value={linha.janela_inicio}
                      onChange={function (e) {
                        setAdicionar(function (actual) {
                          var novo = actual.linhas.slice();
                          novo[i] = Object.assign({}, novo[i], { janela_inicio: e.target.value });
                          return { linhas: novo };
                        });
                      }}
                      className={CAMPO}
                    />
                    <input
                      type="datetime-local"
                      value={linha.janela_fim}
                      onChange={function (e) {
                        setAdicionar(function (actual) {
                          var novo = actual.linhas.slice();
                          novo[i] = Object.assign({}, novo[i], { janela_fim: e.target.value });
                          return { linhas: novo };
                        });
                      }}
                      className={CAMPO}
                    />
                  </div>
                  <input
                    type="text"
                    value={linha.descricao || ""}
                    onChange={function (e) {
                      setAdicionar(function (actual) {
                        var novo = actual.linhas.slice();
                        novo[i] = Object.assign({}, novo[i], { descricao: e.target.value });
                        return { linhas: novo };
                      });
                    }}
                    placeholder="O que vai fazer (opcional)"
                    maxLength={500}
                    className={CAMPO}
                  />
                </div>
              );
            })}
            <button
              type="button"
              onClick={function () {
                setAdicionar(function (actual) { return { linhas: actual.linhas.concat([linhaJanelaVazia()]) }; });
              }}
              className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              Adicionar linha
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmar}
        titulo={confirmar ? confirmar.titulo : ""}
        mensagem={confirmar ? confirmar.mensagem : ""}
        textoConfirmar={confirmar ? confirmar.textoConfirmar : undefined}
        variante={confirmar ? confirmar.variante : undefined}
        onCancel={function () { setConfirmar(null); }}
        onConfirm={async function () {
          var fn = confirmar ? confirmar.executar : null;
          setConfirmar(null);
          if (fn) await fn();
        }}
      />
    </div>
  );
}

function EstadoBadgePrioridade({ prioridade }) {
  return (
    <span
      className={
        "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded " +
        (COR_PRIORIDADE[prioridade] || "bg-slate-100 text-slate-600")
      }
    >
      {prioridade}
    </span>
  );
}

function notaExibicao(t, minha) {
  var valor = minha && minha.nota !== null && minha.nota !== undefined ? minha.nota : t.nota;
  if (valor === null || valor === undefined || valor === "") return null;
  return parseFloat(valor);
}

function AlocacaoLinha(props) {
  var a = props.aloc;
  var progresso = progressoAoVivo(a, props.agora);
  var nome = a.colaborador ? a.colaborador.nome_completo : "Colaborador";

  return (
    <>
      <tr className="hover:bg-surface-container/40 transition-colors">
        <td className="px-3 py-2 text-[12px] text-on-surface font-medium align-top">
          {nome}
          {a.descricao && <span className="block text-[10px] font-normal text-outline mt-0.5">{a.descricao}</span>}
        </td>
        <td className="px-3 py-2 text-[11px] text-on-surface-variant align-top">
          {props.emEdicaoJanela ? (
            <div className="space-y-1 min-w-[210px]">
              <input
                type="datetime-local"
                value={props.janelaEdicao.janela_inicio}
                onChange={function (e) { props.onMudarJanela("janela_inicio", e.target.value); }}
                className="w-full px-2 py-1 rounded border border-outline-variant text-[12px] text-on-surface bg-surface-card"
              />
              <input
                type="datetime-local"
                value={props.janelaEdicao.janela_fim}
                onChange={function (e) { props.onMudarJanela("janela_fim", e.target.value); }}
                className="w-full px-2 py-1 rounded border border-outline-variant text-[12px] text-on-surface bg-surface-card"
              />
              <input
                type="text"
                value={props.janelaEdicao.descricao || ""}
                onChange={function (e) { props.onMudarJanela("descricao", e.target.value); }}
                placeholder="O que vai fazer (opcional)"
                maxLength={500}
                className="w-full px-2 py-1 rounded border border-outline-variant text-[12px] text-on-surface bg-surface-card"
              />
            </div>
          ) : (
            <span className="whitespace-nowrap">{textoJanela(a)}</span>
          )}
          {props.atrasada && <span className="block text-[10px] font-semibold text-red-500">Janela terminada</span>}
        </td>
        <td className="px-3 py-2 align-top"><EstadoBadge estado={a.estado} /></td>
        <td className="px-3 py-2 align-top">
          <BarraProgresso valor={progresso} />
          <div className="mt-1"><ContagemRegressiva aloc={a} agora={props.agora} /></div>
        </td>
        <td className="px-3 py-2 text-center align-top">
          {a.nota !== null && a.nota !== undefined ? (
            <span className="text-[13px] font-bold text-on-surface">{parseFloat(a.nota).toFixed(1)}</span>
          ) : (
            <span className="text-[12px] text-outline/60">—</span>
          )}
          {a.classificacao && <span className="block text-[10px] text-outline">{a.classificacao}</span>}
          {a.avaliado_por === null && a.nota !== null && a.nota !== undefined && (
            <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wide text-primary border border-primary/30 rounded px-1 py-0.5">
              Automática
            </span>
          )}
          {a.desempenho !== null && a.desempenho !== undefined && (
            <span className="block text-[9px] text-outline/80 mt-0.5" title="Indicadores: desempenho, produtividade, cumprimento do prazo">
              D {parseFloat(a.desempenho).toFixed(1)} · P {parseFloat(a.produtividade).toFixed(1)} · Prazo {parseFloat(a.cumprimento_prazo).toFixed(1)}
            </span>
          )}
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex flex-wrap items-center justify-center gap-1">
            {props.ehGestor && a.estado === "Justificativa" && (
              <>
                <BotaoAcao onClick={function () { props.onDecidir("aceitar"); }} disabled={props.saving}>Aceitar</BotaoAcao>
                <BotaoAcao onClick={function () { props.onDecidir("rejeitar"); }} disabled={props.saving}>Rejeitar</BotaoAcao>
              </>
            )}
            {props.ehGestor && a.estado === "Concluida" && (
              <>
                <BotaoAcao onClick={props.onAvaliar} disabled={props.saving}>Avaliar</BotaoAcao>
                <BotaoAcao onClick={props.onReabrir} disabled={props.saving}>Reabrir</BotaoAcao>
              </>
            )}
            {props.ehGestor && a.estado === "Atrasada" && (
              <>
                <BotaoAcao onClick={props.onAvaliar} disabled={props.saving}>Avaliar</BotaoAcao>
                <BotaoAcao onClick={props.onReabrir} disabled={props.saving}>Reabrir</BotaoAcao>
                <BotaoAcao onClick={props.onRemover} disabled={props.saving} perigo>Eliminar</BotaoAcao>
              </>
            )}
            {props.ehGestor && a.estado === "Validada" && (
              <BotaoAcao onClick={props.onReabrir} disabled={props.saving}>Reabrir</BotaoAcao>
            )}
            {props.ehGestor && props.editavel && !props.emEdicaoJanela && !props.emReatribuicao && a.estado !== "Justificativa" && (
              <>
                <BotaoAcao onClick={props.onAbrirJanela} disabled={props.saving}>Janela</BotaoAcao>
                <BotaoAcao onClick={props.onAbrirReatribuicao} disabled={props.saving}>Reatribuir</BotaoAcao>
                <BotaoAcao onClick={props.onRemover} disabled={props.saving} perigo>Remover</BotaoAcao>
              </>
            )}
            {!props.ehGestor && a.estado === "Pendente" && (
              <BotaoAcao onClick={props.onIniciar} disabled={props.saving}>Iniciar</BotaoAcao>
            )}
            {!props.ehGestor && (a.estado === "Em_curso" || a.estado === "Reaberta") && (
              <BotaoAcao onClick={props.onTerminar} disabled={props.saving}>Terminar</BotaoAcao>
            )}
            {!props.ehGestor && (EM_JANELA.indexOf(a.estado) !== -1 || a.estado === "Atrasada") && (
              <BotaoAcao onClick={props.onJustificar} disabled={props.saving}>Justificar</BotaoAcao>
            )}
          </div>
        </td>
      </tr>

      {props.emEdicaoJanela && (
        <tr className="bg-surface-container/40">
          <td colSpan={6} className="px-3 py-2">
            <div className="flex items-center justify-end gap-2">
              <BotaoAcao onClick={props.onCancelarJanela}>Cancelar</BotaoAcao>
              <button
                type="button"
                onClick={props.onGuardarJanela}
                disabled={props.saving}
                className="text-[11px] font-semibold px-3 py-1 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
              >
                {props.saving ? "..." : "Guardar janela"}
              </button>
            </div>
          </td>
        </tr>
      )}

      {props.emReatribuicao && (
        <tr className="bg-surface-container/40">
          <td colSpan={6} className="px-3 py-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                value={props.reatribuir.colaborador_id}
                onChange={function (e) { props.onMudarReatribuicao(e.target.value); }}
                className="px-2 py-1.5 rounded border border-outline-variant text-[12px] text-on-surface bg-surface-card min-w-[200px]"
              >
                <option value="">Novo colaborador...</option>
                {props.colaboradores.map(function (c) {
                  return <option key={c.id} value={c.id}>{c.nome_completo}</option>;
                })}
              </select>
              <BotaoAcao onClick={props.onCancelarReatribuicao}>Cancelar</BotaoAcao>
              <button
                type="button"
                onClick={props.onGuardarReatribuicao}
                disabled={props.saving || !props.reatribuir.colaborador_id}
                className="text-[11px] font-semibold px-3 py-1 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
              >
                {props.saving ? "..." : "Reatribuir"}
              </button>
            </div>
          </td>
        </tr>
      )}

      {a.justificativa && (
        <tr className="bg-orange-50/40">
          <td colSpan={6} className="px-3 py-2">
            <p className="text-[11px] text-on-surface-variant">
              <span className="font-semibold">Justificativa{a.justificativa_data ? " (" + formatDateTime(a.justificativa_data) + ")" : ""}:</span>{" "}
              {a.justificativa}
              {a.justificativa_decisao && (
                <span className="text-outline"> — Decisão do gestor: {a.justificativa_decisao}</span>
              )}
            </p>
          </td>
        </tr>
      )}

      {!props.ehGestor && a.observacoes && a.estado === "Validada" && (
        <tr className="bg-primary/5">
          <td colSpan={6} className="px-3 py-2">
            <p className="text-[11px] text-on-surface-variant">
              <span className="font-semibold">Observações do gestor:</span> {a.observacoes}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
