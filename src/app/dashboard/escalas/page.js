"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

var NOME_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Escala vazia (7 dias, tudo descanso)
var diaVazio = function () {
  var d = {};
  for (var i = 0; i < 7; i++) d[i] = { hora_entrada: "", hora_saida: "" };
  return d;
};

// Escala de escritorio: segunda a sexta 08:00-16:00, fim de semana de descanso
var escalaPadraoSemana = function () {
  var d = diaVazio();
  for (var i = 1; i <= 5; i++) d[i] = { hora_entrada: "08:00", hora_saida: "16:00" };
  return d;
};

var temHoras = function (linha) {
  return !!(linha && (linha.hora_entrada || linha.hora_saida));
};

// Turno que passa da meia-noite (ex.: 20:00-04:00 dos segurancas)
var eTurnoNocturno = function (linha) {
  if (!linha || !linha.hora_entrada || !linha.hora_saida) return false;
  return linha.hora_saida <= linha.hora_entrada;
};

export default function EscalasPage() {
  var [aba, setAba] = useState("escalas");

  // ---- Escalas ----
  var [colaboradores, setColaboradores] = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState("");
  var [selecionadoId, setSelecionadoId] = useState(null);
  var [escalaForm, setEscalaForm] = useState(diaVazio());
  var [aGuardar, setAGuardar] = useState(false);

  // ---- Feriados ----
  var [feriados, setFeriados] = useState([]);
  var [loadingFeriados, setLoadingFeriados] = useState(false);
  var [formFeriado, setFormFeriado] = useState({ data: "", data_fim: "", descricao: "" });
  var [aSalvarFeriado, setASalvarFeriado] = useState(false);
  var [confirmDeleteFeriado, setConfirmDeleteFeriado] = useState(null);

  var [msg, setMsg] = useState(null);

  var carregarEscalas = async function () {
    try {
      setLoading(true);
      var resp = await api.get("/api/escalas");
      var dados = resp.dados || [];
      setColaboradores(dados);
      // Mantem a seleccao se o colaborador continuar a existir
      if (selecionadoId) {
        var aindaExiste = dados.some(function (c) { return c.colaborador_id === selecionadoId; });
        if (!aindaExiste) setSelecionadoId(null);
      }
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoading(false);
    }
  };

  var carregarFeriados = async function () {
    try {
      setLoadingFeriados(true);
      var resp = await api.get("/api/feriados");
      setFeriados(resp.dados || []);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoadingFeriados(false);
    }
  };

  useEffect(function () {
    carregarEscalas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(function () {
    if (aba === "feriados") carregarFeriados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  var selecionarColaborador = function (c) {
    setSelecionadoId(c.colaborador_id);
    var form = diaVazio();
    for (var i = 0; i < 7; i++) {
      var dia = (c.dias || []).find(function (d) { return d.dia_semana === i; });
      form[i] = {
        hora_entrada: dia && dia.hora_entrada ? dia.hora_entrada : "",
        hora_saida: dia && dia.hora_saida ? dia.hora_saida : "",
      };
    }
    setEscalaForm(form);
    setMsg(null);
  };

  var selecionado = colaboradores.find(function (c) { return c.colaborador_id === selecionadoId; }) || null;

  var mudarDia = function (diaSemana, campo, valor) {
    var novo = { ...escalaForm };
    novo[diaSemana] = { ...novo[diaSemana], [campo]: valor };
    setEscalaForm(novo);
  };

  var alternarDescanso = function (diaSemana) {
    var novo = { ...escalaForm };
    if (temHoras(novo[diaSemana])) {
      novo[diaSemana] = { hora_entrada: "", hora_saida: "" };
    } else {
      novo[diaSemana] = { hora_entrada: "08:00", hora_saida: "16:00" };
    }
    setEscalaForm(novo);
  };

  var guardarEscala = async function () {
    if (!selecionado) return;
    var dias = [];
    for (var i = 0; i < 7; i++) {
      var e = (escalaForm[i].hora_entrada || "").trim();
      var s = (escalaForm[i].hora_saida || "").trim();
      if ((e === "") !== (s === "")) {
        setMsg({ tipo: "erro", texto: "Preencha as duas horas ou nenhuma em " + NOME_DIA[i] + " (nenhuma = dia de descanso)." });
        return;
      }
      dias.push({ dia_semana: i, hora_entrada: e || null, hora_saida: s || null });
    }

    try {
      setAGuardar(true);
      setMsg(null);
      var resp = await api.put("/api/escalas/" + selecionadoId, { dias: dias });
      var texto = resp.mensagem || "Escala guardada com sucesso";
      if (resp.ausentes_removidos > 0) {
        texto += " — " + resp.ausentes_removidos + " ausente(s) automático(s) removido(s) de dias que passaram a descanso.";
      }
      setMsg({ tipo: "sucesso", texto: texto });
      await carregarEscalas();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setAGuardar(false);
    }
  };

  var adicionarFeriado = async function (e) {
    e.preventDefault();
    if (!formFeriado.data) {
      setMsg({ tipo: "erro", texto: "Escolhe a data do feriado." });
      return;
    }
    try {
      setASalvarFeriado(true);
      setMsg(null);
      var resp = await api.post("/api/feriados", {
        data: formFeriado.data,
        data_fim: formFeriado.data_fim || undefined,
        descricao: formFeriado.descricao || undefined,
      });
      var texto = resp.mensagem || "Feriado criado com sucesso";
      if (resp.ausentes_removidos > 0) {
        texto += " — " + resp.ausentes_removidos + " ausente(s) automático(s) removido(s).";
      }
      setMsg({ tipo: "sucesso", texto: texto });
      setFormFeriado({ data: "", data_fim: "", descricao: "" });
      await carregarFeriados();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setASalvarFeriado(false);
    }
  };

  var eliminarFeriado = async function () {
    if (!confirmDeleteFeriado) return;
    try {
      setMsg(null);
      var resp = await api.delete("/api/feriados/" + confirmDeleteFeriado.id);
      setMsg({ tipo: "sucesso", texto: resp.mensagem || "Feriado eliminado com sucesso" });
      setConfirmDeleteFeriado(null);
      await carregarFeriados();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  var busca = search.trim().toLowerCase();
  var listaFiltrada = colaboradores.filter(function (c) {
    if (!busca) return true;
    return (
      (c.nome_completo || "").toLowerCase().indexOf(busca) !== -1 ||
      (c.numero_colaborador || "").toLowerCase().indexOf(busca) !== -1 ||
      (c.id_biometrico || "").toLowerCase().indexOf(busca) !== -1
    );
  });

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={!!confirmDeleteFeriado}
        titulo="Eliminar Feriado"
        mensagem={"Tem certeza que deseja eliminar o feriado" + (confirmDeleteFeriado ? " de " + helpers.formatDate(confirmDeleteFeriado.data) : "") + "? A partir desse dia o biómetro volta a marcar ausentes normalmente."}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminarFeriado}
        onCancel={function () { setConfirmDeleteFeriado(null); }}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>SGHR</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Tempo e Presença</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Escalas e Turnos</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">Escalas e Turnos</h1>
        </div>
      </section>

      <div className="flex gap-1 border-b border-outline-variant/20 overflow-x-auto">
        <button onClick={function () { setAba("escalas"); }} className={"flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors border-b-2 whitespace-nowrap " + (aba === "escalas" ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface border-transparent")}>
          <span className="material-symbols-outlined text-[18px]">work_history</span>
          Horários / Escalas
        </button>
        <button onClick={function () { setAba("feriados"); }} className={"flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors border-b-2 whitespace-nowrap " + (aba === "feriados" ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface border-transparent")}>
          <span className="material-symbols-outlined text-[18px]">event_busy</span>
          Feriados
        </button>
      </div>

      {msg && (
        <div className={"p-3 rounded-lg text-[13px] font-medium flex items-center gap-2 " + (msg.tipo === "sucesso" ? "badge-success border border-success/10" : "badge-danger border border-error/10")}>
          <span className="material-symbols-outlined text-[18px]">{msg.tipo === "sucesso" ? "check_circle" : "error"}</span>
          {msg.texto}
          <button onClick={function () { setMsg(null); }} className="ml-auto hover:opacity-60">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {aba === "escalas" && (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5 items-start">
          {/* Lista de colaboradores */}
          <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-4">
            <div className="space-y-2 mb-3">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Colaborador</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/50">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={function (e) { setSearch(e.target.value); }}
                  placeholder="Nome, número ou ID biométrico..."
                  className="w-full pl-10 pr-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {loading ? (
              <p className="text-[13px] text-on-surface-variant/70 py-6 text-center">A carregar...</p>
            ) : listaFiltrada.length === 0 ? (
              <p className="text-[13px] text-on-surface-variant/70 py-6 text-center">Nenhum colaborador encontrado.</p>
            ) : (
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {listaFiltrada.map(function (c) {
                  var activo = c.colaborador_id === selecionadoId;
                  return (
                    <button
                      key={c.colaborador_id}
                      onClick={function () { selecionarColaborador(c); }}
                      className={"w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all " + (activo ? "bg-primary/10 border border-primary/30" : "hover:bg-background/60 border border-transparent")}
                    >
                      <div className="w-9 h-9 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[12px] font-bold">
                        {helpers.getInitials(c.nome_completo)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-on-surface truncate">{c.nome_completo}</p>
                        <p className="text-[11px] text-on-surface-variant/70 truncate">
                          {c.numero_colaborador ? "Nº " + c.numero_colaborador : "—"}
                          {c.id_biometrico ? " · Bio " + c.id_biometrico : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full " + helpers.getEstadoBadgeClass(c.estado)}>
                          {c.estado || "—"}
                        </span>
                        {c.tem_escala ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full badge-info">Escala própria</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full badge-secondary">Padrão</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Editor da escala */}
          {selecionado ? (
            <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-5">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[13px] font-bold">
                  {helpers.getInitials(selecionado.nome_completo)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold text-on-surface truncate">{selecionado.nome_completo}</h2>
                  <p className="text-[12px] text-on-surface-variant/70">
                    {selecionado.tem_escala ? "Escala semanal própria" : "Sem escala gravada — a mostrar o horário padrão (08:00-16:00) e os dias de descanso da ficha"}
                  </p>
                </div>
              </div>

              <p className="text-[12px] text-on-surface-variant/60 mb-4">
                Cada dia com as duas horas preenchidas = dia de trabalho. As duas vazias = dia de descanso (o biómetro não marca ausente). Horas que passam da meia-noite (ex.: 20:00 às 04:00) são aceites para turnos nocturnos.
              </p>

              <div className="space-y-2 mb-4">
                {NOME_DIA.map(function (nome, d) {
                  var linha = escalaForm[d] || { hora_entrada: "", hora_saida: "" };
                  var descanso = !temHoras(linha);
                  return (
                    <div key={d} className={"flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 rounded-lg border transition-colors " + (descanso ? "bg-background/40 border-outline-variant/20" : "bg-background/60 border-outline-variant/40")}>
                      <div className="flex items-center justify-between sm:justify-start sm:w-28 shrink-0">
                        <span className={"text-[13px] font-semibold " + (descanso ? "text-on-surface-variant/60" : "text-on-surface")}>{nome}</span>
                        {eTurnoNocturno(linha) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full badge-warning sm:hidden">Noite</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap flex-1">
                        <input
                          type="time"
                          value={linha.hora_entrada}
                          disabled={descanso}
                          onChange={function (e) { mudarDia(d, "hora_entrada", e.target.value); }}
                          title="Hora de entrada"
                          className="px-2.5 py-2 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-40"
                        />
                        <span className="text-[12px] text-on-surface-variant/60">até</span>
                        <input
                          type="time"
                          value={linha.hora_saida}
                          disabled={descanso}
                          onChange={function (e) { mudarDia(d, "hora_saida", e.target.value); }}
                          title="Hora de saída"
                          className="px-2.5 py-2 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-40"
                        />
                        {eTurnoNocturno(linha) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full badge-warning hidden sm:inline">Noite</span>
                        )}
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={descanso}
                          onChange={function () { alternarDescanso(d); }}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className={"text-[12px] font-medium " + (descanso ? "text-on-surface-variant/80" : "text-on-surface-variant/60")}>Descanso</span>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={function () { setEscalaForm(escalaPadraoSemana()); }}
                >
                  <span className="material-symbols-outlined text-[16px]">routine</span>
                  Padrão (Seg-Sex 08:00-16:00)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={function () { setEscalaForm(diaVazio()); }}
                >
                  <span className="material-symbols-outlined text-[16px]">clear_all</span>
                  Limpar tudo
                </Button>
                <div className="flex-1" />
                <Button onClick={guardarEscala} disabled={aGuardar}>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {aGuardar ? "A guardar..." : "Guardar Escala"}
                </Button>
              </div>
            </section>
          ) : (
            <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-10 text-center">
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant/30">work_history</span>
              <p className="text-[14px] text-on-surface-variant/70 mt-3">Selecciona um colaborador à esquerda para ver e editar a escala semanal.</p>
              <p className="text-[12px] text-on-surface-variant/50 mt-1">Quem não tem escala gravada usa o horário padrão e os dias de descanso da ficha.</p>
            </section>
          )}
        </div>
      )}

      {aba === "feriados" && (
        <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px] text-primary">event_busy</span>
            <h2 className="text-[15px] font-bold text-on-surface">Feriados</h2>
            <span className="text-[12px] text-on-surface-variant/70">— nestes dias o biómetro não marca ninguém como ausente (mesmo quem trabalha ao sábado); para pontes/prolongamentos escolhe também a data final</span>
          </div>
          <form onSubmit={adicionarFeriado} className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={formFeriado.data}
                onChange={function (e) { setFormFeriado({ ...formFeriado, data: e.target.value }); }}
                title="Data do feriado"
                className="px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <span className="text-[12px] text-on-surface-variant/70">até</span>
              <input
                type="date"
                value={formFeriado.data_fim}
                min={formFeriado.data || undefined}
                onChange={function (e) { setFormFeriado({ ...formFeriado, data_fim: e.target.value }); }}
                title="Até (opcional) — para feriados prolongados"
                className="px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <input
              type="text"
              value={formFeriado.descricao}
              onChange={function (e) { setFormFeriado({ ...formFeriado, descricao: e.target.value }); }}
              placeholder="Descrição (ex.: Dia da Independência Nacional)"
              className="flex-1 min-w-[200px] px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <Button type="submit" disabled={aSalvarFeriado}>
              <span className="material-symbols-outlined text-[16px]">add</span>
              {aSalvarFeriado ? "A adicionar..." : "Adicionar Feriado"}
            </Button>
          </form>
          {loadingFeriados ? (
            <p className="text-[13px] text-on-surface-variant/70 py-4">A carregar feriados...</p>
          ) : feriados.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant/70">Nenhum feriado registado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {feriados.map(function (f) {
                return (
                  <div key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background/50 border border-outline-variant/20">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-on-surface">{helpers.formatDate(f.data)}</p>
                      <p className="text-[11px] text-on-surface-variant/70 truncate">{f.descricao || "Feriado"}</p>
                    </div>
                    <button onClick={function () { setConfirmDeleteFeriado(f); }} title="Remover feriado" className="p-1.5 shrink-0 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
