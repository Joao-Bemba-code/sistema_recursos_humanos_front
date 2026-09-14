"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

var OPERACOES = [
  { chave: "create", label: "Criar", icon: "add_circle" },
  { chave: "read", label: "Ver", icon: "visibility" },
  { chave: "update", label: "Editar", icon: "edit" },
  { chave: "delete", label: "Eliminar", icon: "delete" },
];

var NIVEL_LABELS = {
  0: "Colaborador",
  1: "Técnico",
  2: "Coordenador",
  3: "Director",
  4: "Administrador",
};

var formatData = function (d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch (e) {
    return "—";
  }
};

var normalizarPermissoes = function (perm) {
  if (!perm) return {};
  if (typeof perm === "string") {
    try {
      return JSON.parse(perm);
    } catch (e) {
      return {};
    }
  }
  return perm;
};

export default function UtilizadoresPage() {
  var toast = useToast();

  var [utilizadores, setUtilizadores] = useState([]);
  var [perfis, setPerfis] = useState([]);
  var [modulos, setModulos] = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState("");
  var [filtroPerfil, setFiltroPerfil] = useState("");
  var [filtroEstado, setFiltroEstado] = useState("");
  var [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });
  var [showModal, setShowModal] = useState(false);
  var [editando, setEditando] = useState(null);
  var [form, setForm] = useState({});
  var [saving, setSaving] = useState(false);
  var [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "" });
  var [showPerfilModal, setShowPerfilModal] = useState(false);
  var [perfilEditando, setPerfilEditando] = useState(null);
  var [perfilPermissoes, setPerfilPermissoes] = useState({});
  var [savingPerfil, setSavingPerfil] = useState(false);

  var carregarUtilizadores = useCallback(async function (page) {
    setLoading(true);
    try {
      var url = "/api/users?page=" + (page || 1) + "&limit=15";
      if (search) url += "&search=" + encodeURIComponent(search);
      if (filtroPerfil) url += "&perfil_id=" + filtroPerfil;
      if (filtroEstado) url += "&estado=" + (filtroEstado === "Activo");
      var data = await api.get(url);
      setUtilizadores(data.dados);
      setPaginacao(data.paginacao);
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filtroPerfil, filtroEstado, toast]);

  var carregarPerfis = useCallback(async function () {
    try {
      var data = await api.get("/api/perfis");
      if (data && data.dados) {
        setPerfis(data.dados);
        if (data.modulos) setModulos(data.modulos);
      }
    } catch (e) {
      console.log("Erro ao carregar perfis:", e.message);
    }
  }, []);

  useEffect(function () {
    carregarPerfis();
  }, [carregarPerfis]);

  useEffect(function () {
    carregarUtilizadores(1);
  }, [carregarUtilizadores]);

  var defaultForm = {
    nome_completo: "", email: "", username: "", password: "",
    telefone: "", perfis_selecionados: [], activo: true, colaborador_id: null,
  };

  var perfilPadrao = function () {
    var colab = perfis.filter(function (p) { return p.nome === "Colaborador"; })[0];
    return colab ? [String(colab.id)] : [];
  };

  var abrirNovo = function (previa) {
    setEditando(null);
    setForm({
      ...defaultForm,
      nome_completo: previa ? previa.nome_completo || "" : "",
      email: previa ? previa.email || "" : "",
      telefone: previa ? previa.telefone || "" : "",
      colaborador_id: previa ? previa.colaborador_id || null : null,
      perfis_selecionados: perfilPadrao(),
    });
    setShowModal(true);
  };

  var abrirEditar = function (u) {
    var perfisIds = [];
    if (Array.isArray(u.perfis) && u.perfis.length > 0) {
      perfisIds = u.perfis.map(function (p) { return String(p.id); });
    } else if (u.perfil) {
      perfisIds = [String(u.perfil.id)];
    } else if (u.perfil_id) {
      perfisIds = [String(u.perfil_id)];
    }
    setEditando(u);
    setForm({
      nome_completo: u.nome_completo || "",
      email: u.email || "",
      username: u.username || "",
      password: "",
      telefone: u.telefone || "",
      perfis_selecionados: perfisIds,
      activo: u.activo !== false,
      colaborador_id: u.colaborador_id || null,
    });
    setShowModal(true);
  };

  var togglePerfil = function (id) {
    var sid = String(id);
    setForm(function (prev) {
      var lista = prev.perfis_selecionados || [];
      var idx = lista.indexOf(sid);
      var novo;
      if (idx !== -1) {
        novo = lista.filter(function (x) { return x !== sid; });
      } else {
        novo = lista.concat([sid]);
      }
      return { ...prev, perfis_selecionados: novo };
    });
  };

  var guardar = async function (e) {
    e.preventDefault();
    if (!form.nome_completo || !form.email || !form.username) {
      toast.addToast("error", "Preencha os campos obrigatórios");
      return;
    }
    if (!editando && !form.password) {
      toast.addToast("error", "Defina uma password inicial");
      return;
    }
    if (!form.perfis_selecionados || form.perfis_selecionados.length === 0) {
      toast.addToast("error", "Selecione pelo menos um perfil");
      return;
    }
    setSaving(true);
    try {
      var perfil_ids = form.perfis_selecionados;
      var payload = {
        nome_completo: form.nome_completo,
        email: form.email,
        username: form.username,
        telefone: form.telefone,
        perfil_id: perfil_ids[0],
        perfil_ids: perfil_ids,
        activo: form.activo,
        colaborador_id: form.colaborador_id || null,
      };
      if (editando) {
        if (form.password) payload.password = form.password;
        await api.put("/api/users/" + editando.id, payload);
        toast.addToast("success", "Utilizador atualizado com sucesso");
      } else {
        payload.password = form.password;
        await api.post("/api/users", payload);
        toast.addToast("success", "Utilizador criado com sucesso");
      }
      setShowModal(false);
      carregarUtilizadores(paginacao.pagina);
      carregarPerfis();
    } catch (err) {
      toast.addToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  var eliminar = async function () {
    try {
      await api.delete("/api/users/" + confirmDelete.id);
      toast.addToast("success", "Utilizador eliminado com sucesso");
      setConfirmDelete({ open: false, id: null, nome: "" });
      carregarUtilizadores(1);
    } catch (e) {
      toast.addToast("error", e.message);
    }
  };

  var abrirPerfil = function (perfil) {
    setPerfilEditando(perfil);
    setPerfilPermissoes(normalizarPermissoes(perfil.permissoes));
    setShowPerfilModal(true);
  };

  var togglePermissao = function (modulo, operacao) {
    setPerfilPermissoes(function (prev) {
      var novo = JSON.parse(JSON.stringify(prev));
      if (!novo[modulo]) novo[modulo] = [];
      var idx = novo[modulo].indexOf(operacao);
      if (idx !== -1) {
        novo[modulo].splice(idx, 1);
      } else {
        novo[modulo].push(operacao);
      }
      return novo;
    });
  };

  var guardarPermissoes = async function () {
    if (!perfilEditando) return;
    setSavingPerfil(true);
    try {
      await api.put("/api/perfis/" + perfilEditando.id, {
        permissoes: perfilPermissoes,
      });
      toast.addToast("success", "Permissões atualizadas com sucesso");
      setShowPerfilModal(false);
      carregarPerfis();
    } catch (e) {
      toast.addToast("error", e.message);
    } finally {
      setSavingPerfil(false);
    }
  };

  var activeFilters = [];
  if (filtroPerfil) activeFilters.push({ label: perfilNome(filtroPerfil), onClear: function () { setFiltroPerfil(""); } });
  if (filtroEstado) activeFilters.push({ label: "Estado: " + filtroEstado, onClear: function () { setFiltroEstado(""); } });

  function perfilNome(id) {
    var p = perfis.filter(function (x) { return String(x.id) === String(id); })[0];
    return p ? p.nome : id;
  }

  var inputCls = "w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Utilizador"
        mensagem={"Tem certeza que deseja eliminar " + confirmDelete.nome + "? Esta acção não pode ser desfeita."}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={function () { setConfirmDelete({ open: false, id: null, nome: "" }); }}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>SGHR</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Utilizadores</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Gestão de Utilizadores</h1>
          <p className="text-[13px] text-on-surface-variant/70">Administre as contas de acesso e as permissões de cada perfil.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={abrirNovo}>
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo Utilizador
          </Button>
        </div>
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-grow">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar Utilizador</label>
              <div className="relative mt-1.5">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Nome, email, username..."
                  value={search}
                  onChange={function (e) { setSearch(e.target.value); }}
                  onKeyDown={function (e) { if (e.key === "Enter") carregarUtilizadores(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:w-auto">
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Perfil</label>
                <select value={filtroPerfil} onChange={function (e) { setFiltroPerfil(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos</option>
                  {perfis.map(function (p) { return <option key={p.id} value={p.id}>{p.nome}</option>; })}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
                <select value={filtroEstado} onChange={function (e) { setFiltroEstado(e.target.value); }} className="mt-1.5 w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                  <option value="">Todos</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className="flex items-end pb-0.5">
                <Button onClick={function () { carregarUtilizadores(1); }} variant="outline" className="w-full">
                  <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                  Filtrar
                </Button>
              </div>
            </div>
          </div>
          {activeFilters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros ativos:</span>
              {activeFilters.map(function (f, i) {
                return (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                    {f.label}
                    <button onClick={f.onClear} className="hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
                  </span>
                );
              })}
              <button onClick={function () { setFiltroPerfil(""); setFiltroEstado(""); setSearch(""); }} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse data-grid-tight">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider w-[260px]">Utilizador</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Perfil</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Contacto</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Último Login</th>
                <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                [1,2,3,4,5].map(function (i) {
                  return (
                    <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                  );
                })
              ) : utilizadores.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">manage_accounts</span>
                  <p className="text-on-surface-variant font-medium">Nenhum utilizador encontrado</p>
                  <p className="text-[13px] text-outline mt-1">Clique em &quot;Novo Utilizador&quot; para adicionar</p>
                </td></tr>
              ) : (
                utilizadores.map(function (u) {
                  var perfilLista = Array.isArray(u.perfis) && u.perfis.length > 0 ? u.perfis : (u.perfil ? [u.perfil] : []);
                  return (
                    <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full border border-outline-variant/30 shadow-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[12px] font-bold text-primary">
                              {u.nome_completo ? u.nome_completo.split(" ").slice(0, 2).map(function (n) { return n[0]; }).join("").toUpperCase() : "U"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{u.nome_completo}</span>
                            <span className="text-[12px] text-on-surface-variant/70">{u.sem_conta ? (u.numero_colaborador ? "Nº " + u.numero_colaborador : "Colaborador") : "@" + u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {u.sem_conta ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
                            Sem conta
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                            {perfilLista.map(function (p) {
                              return (
                                <span key={p.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/10">
                                  {p.nome}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-on-surface">{u.email || "—"}</span>
                          <span className="text-[12px] text-on-surface-variant/70">{u.telefone || ""}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface-variant">{u.sem_conta ? "—" : formatData(u.ultimo_login)}</span>
                      </td>
                      <td className="px-4 py-4">
                        {u.sem_conta ? (
                          <Badge variant="secondary" className="uppercase">Sem acesso</Badge>
                        ) : (
                          <Badge variant={u.activo ? "success" : "secondary"} className="uppercase">
                            {u.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          {u.sem_conta ? (
                            <Button onClick={function () { abrirNovo(u); }} variant="default" size="sm">
                              <span className="material-symbols-outlined text-[15px]">person_add</span>
                              Criar conta
                            </Button>
                          ) : (
                            <>
                              <Button onClick={function () { abrirEditar(u); }} variant="ghost" size="icon-sm" title="Editar">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </Button>
                              <Button onClick={function () { setConfirmDelete({ open: true, id: u.id, nome: u.nome_completo }); }} variant="ghost" size="icon-sm" title="Eliminar">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </Button>
                            </>
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
            Exibindo {utilizadores.length} de {paginacao.total} utilizadores
          </div>
          {paginacao.total_paginas > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(paginacao.total_paginas, 5) }, function (_, i) { return i + 1; }).map(function (p) {
                return (
                  <Button key={p} onClick={function () { carregarUtilizadores(p); }} variant={p === paginacao.pagina ? "default" : "outline"} size="sm" className="min-w-[32px]">
                    {p}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div>
            <h2 className="text-[15px] font-bold text-on-surface">Perfis de Acesso</h2>
            <p className="text-[12px] text-on-surface-variant/70">Gestão de perfis e permissões (criar, ver, editar, eliminar) por módulo.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant/20">
                <th className="px-6 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Perfil</th>
                <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Nível</th>
                <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Utilizadores</th>
                <th className="px-4 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider">Módulos</th>
                <th className="px-6 py-3 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {perfis.map(function (p) {
                var perm = normalizarPermissoes(p.permissoes);
                var permKeys = Object.keys(perm);
                var permitidos = permKeys.filter(function (k) { return (perm[k] || []).length > 0; });
                var label = p.nivel >= 4 ? "Todos os módulos" : permitidos.length + " módulo(s)";
                return (
                  <tr key={p.id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{p.nome}</span>
                        {p.descricao && <span className="text-[12px] text-on-surface-variant/70">{p.descricao}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
                        {NIVEL_LABELS[p.nivel] || p.nivel}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[14px] font-semibold text-on-surface">{p.total_utilizadores}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[12px] text-on-surface-variant">{label}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button onClick={function () { abrirPerfil(p); }} variant="ghost" size="sm">
                        <span className="material-symbols-outlined text-[16px]">security</span>
                        Gerir Permissões
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={showModal}
        onClose={function () { setShowModal(false); }}
        title={editando ? "Editar Utilizador" : "Novo Utilizador"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={function () { setShowModal(false); }}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving}>
              <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
              {saving ? "A guardar..." : editando ? "Atualizar" : "Criar Utilizador"}
            </Button>
          </>
        }
      >
        <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Nome Completo *</label>
            <input type="text" value={form.nome_completo || ""} onChange={function (e) { setForm({ ...form, nome_completo: e.target.value }); }} className={inputCls} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Email *</label>
            <input type="email" value={form.email || ""} onChange={function (e) { setForm({ ...form, email: e.target.value }); }} placeholder="exemplo@cenffor.co.ao" className={inputCls} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Username *</label>
            <input type="text" value={form.username || ""} onChange={function (e) { setForm({ ...form, username: e.target.value }); }} placeholder="nome.utilizador" className={inputCls} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">{editando ? "Nova Password (opcional)" : "Password Inicial *"}</label>
            <input type="password" value={form.password || ""} onChange={function (e) { setForm({ ...form, password: e.target.value }); }} placeholder={editando ? "Deixe vazio para manter" : "••••••••"} className={inputCls} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Telefone</label>
            <input type="text" value={form.telefone || ""} onChange={function (e) { setForm({ ...form, telefone: e.target.value }); }} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Perfis *</label>
            <p className="text-[11px] text-on-surface-variant/60 px-1 mb-2">O primeiro perfil selecionado é o principal. Pode marcar vários (ex: Colaborador + Financeiro) — as permissões são somadas.</p>
            <div className="flex flex-wrap gap-2">
              {perfis.map(function (p) {
                var sids = form.perfis_selecionados || [];
                var ativo = sids.indexOf(String(p.id)) !== -1;
                var principal = ativo && String(p.id) === String(sids[0]);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={function () { togglePerfil(p.id); }}
                    className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all " + (ativo
                      ? (principal ? "bg-primary text-white border-primary shadow-sm" : "bg-primary/10 text-primary border-primary/30")
                      : "bg-surface hover:bg-surface-container border-outline-variant/50 text-on-surface-variant")}
                  >
                    {principal && <span className="material-symbols-outlined text-[13px]">star</span>}
                    {p.nome}
                  </button>
                );
              })}
            </div>
            {form.colaborador_id && (
              <p className="text-[11px] text-primary/70 px-1 mt-2">Conta ligada ao colaborador. A criação liga automaticamente este utilizador ao colaborador.</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 px-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.activo !== false}
                onChange={function (e) { setForm({ ...form, activo: e.target.checked }); }}
                className="w-4 h-4 accent-[var(--color-primary)]"
              />
              <span className="text-[13px] font-semibold text-on-surface">Conta ativa (pode iniciar sessão)</span>
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showPerfilModal}
        onClose={function () { setShowPerfilModal(false); }}
        title={"Permissões: " + (perfilEditando ? perfilEditando.nome : "")}
        size="xl"
        footer={
          <>
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-[11px] text-on-surface-variant/60 font-medium">Nível do perfil:</span>
              <Badge variant="info">{perfilEditando ? (NIVEL_LABELS[perfilEditando.nivel] || perfilEditando.nivel) : ""}</Badge>
            </div>
            <Button variant="ghost" onClick={function () { setShowPerfilModal(false); }}>Cancelar</Button>
            <Button onClick={guardarPermissoes} disabled={savingPerfil}>
              <span className="material-symbols-outlined text-[18px]">{savingPerfil ? "hourglass_empty" : "save"}</span>
              {savingPerfil ? "A guardar..." : "Guardar Permissões"}
            </Button>
          </>
        }
      >
        {perfilEditando && perfilEditando.nivel >= 4 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <span className="material-symbols-outlined text-[24px] text-primary">verified_user</span>
            <div>
              <p className="text-[14px] font-bold text-primary">{perfilEditando.nome}</p>
              <p className="text-[12px] text-on-surface-variant/70">Perfil de Administrador — acesso total a todos os módulos e operações (criar, ver, editar, eliminar).</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[12px] text-on-surface-variant/70 mb-3">Marque apenas os módulos e operações que este perfil pode aceder. O que não estiver marcado fica bloqueado.</p>
            {modulos.length === 0 ? (
              <p className="text-[13px] text-on-surface-variant/60 py-4 text-center">Nenhum módulo disponível</p>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                <div className="grid grid-cols-[minmax(160px,1fr)_repeat(4,64px)_28px] gap-1 px-1 pb-1 border-b border-outline-variant/20 sticky top-0 bg-surface">
                  <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase py-1.5">Módulo</span>
                  {OPERACOES.map(function (op) {
                    return (
                      <span key={op.chave} className="text-[10px] font-bold text-on-surface-variant/70 uppercase text-center py-1.5 flex flex-col items-center gap-0.5">
                        <span className="material-symbols-outlined text-[14px]">{op.icon}</span>
                        {op.label}
                      </span>
                    );
                  })}
                  <span />
                </div>

                {modulos.map(function (mod) {
                  var ativos = perfilPermissoes[mod.chave] || [];

                  return (
                    <div key={mod.chave} className="grid grid-cols-[minmax(160px,1fr)_repeat(4,64px)_28px] gap-1 items-center px-1 py-1.5 rounded-lg hover:bg-surface-container/50 transition-colors">
                      <span className="text-[13px] font-semibold text-on-surface">{mod.nome}</span>
                      {OPERACOES.map(function (op) {
                        var aceite = ativos.indexOf(op.chave) !== -1;
                        return (
                          <div key={op.chave} className="flex justify-center">
                            <button
                              type="button"
                              onClick={function () { togglePermissao(mod.chave, op.chave); }}
                              title={op.label}
                              className={"w-6 h-6 rounded-md border flex items-center justify-center transition-all " + (aceite ? "bg-primary border-primary text-white" : "border-outline-variant/50 text-transparent hover:border-primary/40")}
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            </button>
                          </div>
                        );
                      })}
                      <span />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}