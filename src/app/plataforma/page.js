"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

var FORM_VAZIO = {
  nome: "",
  nome_curto: "",
  nif: "",
  email: "",
  telefone: "",
  endereco: "",
  cidade: "",
  provincia: "",
  pais: "Angola",
  website: "",
  dominio: "",
  admin_nome: "",
  admin_email: "",
  admin_password: "",
};

// O logo pode vir do Cloudinary (URL completa) ou do disco local do backend
// ("/uploads/..."), que precisa do endereco da API a frente.
function srcLogo(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return api.baseURL + url;
}

function iniciais(nome) {
  var partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "OR";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

var inputCls =
  "w-full px-4 py-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/40 text-[13px] text-on-surface outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all";

var labelCls = "block text-[12px] font-semibold text-on-surface-variant mb-1.5";

export default function PlataformaPage() {
  const router = useRouter();
  const auth = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [resumo, setResumo] = useState({ organizacoes: 0, organizacoes_activas: 0, utilizadores: 0, colaboradores: 0 });
  const [organizacoes, setOrganizacoes] = useState([]);
  const [busca, setBusca] = useState("");

  const [modalCriar, setModalCriar] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalLogo, setModalLogo] = useState(null);
  const [modalEstado, setModalEstado] = useState(null);
  const [credenciais, setCredenciais] = useState(null);

  // Repor palavra-passe de uma conta da organizacao (suporte).
  const [modalSenha, setModalSenha] = useState(null);
  const [utilizadoresOrg, setUtilizadoresOrg] = useState([]);
  const [carregandoUtilizadores, setCarregandoUtilizadores] = useState(false);
  const [buscaUtilizador, setBuscaUtilizador] = useState("");
  const [utilizadorSenha, setUtilizadorSenha] = useState(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [repondo, setRepondo] = useState(false);
  const [senhaReposta, setSenhaReposta] = useState(null);

  const [form, setForm] = useState(FORM_VAZIO);
  const [editForm, setEditForm] = useState(FORM_VAZIO);
  const [guardando, setGuardando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const superAdmin = !!(auth && auth.utilizador && auth.utilizador.super_admin);

  useEffect(function () {
    if (auth && !auth.loading && auth.isAuthenticated && !superAdmin) {
      router.replace("/dashboard");
    }
  }, [auth, superAdmin, router]);

  const avisar = useCallback(function (tipo, texto) {
    if (toast && toast.addToast) toast.addToast(tipo, texto);
  }, [toast]);

  const buscarDados = useCallback(function () {
    return Promise.all([
      api.get("/api/plataforma/resumo"),
      api.get("/api/plataforma/organizacoes"),
    ]);
  }, []);

  const carregar = useCallback(async function () {
    try {
      var respostas = await buscarDados();
      setErro("");
      if (respostas[0] && respostas[0].dados) setResumo(respostas[0].dados);
      if (respostas[1] && respostas[1].dados) setOrganizacoes(respostas[1].dados);
    } catch (e) {
      setErro(e.message || "Não foi possível carregar as organizações");
    } finally {
      setLoading(false);
    }
  }, [buscarDados]);

  useEffect(function () {
    if (!superAdmin) return;
    var vivo = true;
    buscarDados().then(function (respostas) {
      if (!vivo) return;
      if (respostas[0] && respostas[0].dados) setResumo(respostas[0].dados);
      if (respostas[1] && respostas[1].dados) setOrganizacoes(respostas[1].dados);
      setErro("");
      setLoading(false);
    }).catch(function (e) {
      if (!vivo) return;
      setErro(e.message || "Não foi possível carregar as organizações");
      setLoading(false);
    });
    return function () { vivo = false; };
  }, [superAdmin, buscarDados]);

  var abrirCriar = function () {
    setForm(FORM_VAZIO);
    setModalCriar(true);
  };

  var abrirEditar = function (org) {
    setEditForm({
      nome: org.nome || "",
      nome_curto: org.nome_curto || "",
      nif: org.nif || "",
      email: org.email || "",
      telefone: org.telefone || "",
      endereco: org.endereco || "",
      cidade: org.cidade || "",
      provincia: org.provincia || "",
      pais: org.pais || "Angola",
      website: org.website || "",
      dominio: org.dominio || "",
    });
    setModalEditar(org);
  };

  var alterarCampo = function (campo, valor) {
    setForm(function (anterior) {
      var novo = Object.assign({}, anterior);
      novo[campo] = valor;
      return novo;
    });
  };

  var alterarCampoEdicao = function (campo, valor) {
    setEditForm(function (anterior) {
      var novo = Object.assign({}, anterior);
      novo[campo] = valor;
      return novo;
    });
  };

  var criarOrganizacao = async function () {
    if (!form.nome.trim()) {
      avisar("error", "Indique o nome da organização");
      return;
    }
    var temAdmin = form.admin_nome || form.admin_email || form.admin_password;
    if (temAdmin && (!form.admin_nome || !form.admin_email || !form.admin_password)) {
      avisar("error", "Para o primeiro administrador indique nome, email e palavra-passe");
      return;
    }
    if (temAdmin && form.admin_password.length < 8) {
      avisar("error", "A palavra-passe do administrador deve ter pelo menos 8 caracteres");
      return;
    }

    setGuardando(true);
    try {
      var resp = await api.post("/api/plataforma/organizacoes", form);
      setModalCriar(false);
      setForm(FORM_VAZIO);
      avisar("success", resp.mensagem || "Organização criada");
      if (resp.dados && resp.dados.admin) setCredenciais(resp.dados.admin);
      await carregar();
    } catch (e) {
      avisar("error", e.message);
    } finally {
      setGuardando(false);
    }
  };

  var guardarEdicao = async function () {
    if (!modalEditar) return;
    if (!editForm.nome.trim()) {
      avisar("error", "O nome da organização não pode ficar vazio");
      return;
    }
    setGuardando(true);
    try {
      await api.put("/api/plataforma/organizacoes/" + modalEditar.id, editForm);
      setModalEditar(null);
      avisar("success", "Organização actualizada");
      await carregar();
    } catch (e) {
      avisar("error", e.message);
    } finally {
      setGuardando(false);
    }
  };

  var confirmarEstado = async function () {
    if (!modalEstado) return;
    setGuardando(true);
    try {
      await api.post("/api/plataforma/organizacoes/" + modalEstado.id + "/estado", { activo: modalEstado.activo === false });
      setModalEstado(null);
      avisar("success", modalEstado.activo === false ? "Organização activada" : "Organização desactivada");
      await carregar();
    } catch (e) {
      avisar("error", e.message);
    } finally {
      setGuardando(false);
    }
  };

  var abrirSenha = function (org) {
    setModalSenha(org);
    setUtilizadoresOrg([]);
    setBuscaUtilizador("");
    setUtilizadorSenha(null);
    setNovaSenha("");
    setSenhaReposta(null);
    setCarregandoUtilizadores(true);
    api.get("/api/plataforma/organizacoes/" + org.id + "/utilizadores")
      .then(function (resp) {
        setUtilizadoresOrg((resp.dados && resp.dados.utilizadores) || []);
      })
      .catch(function (e) {
        avisar("error", e.message);
      })
      .finally(function () {
        setCarregandoUtilizadores(false);
      });
  };

  var gerarSenha = function () {
    var alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    var bytes = new Uint32Array(12);
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 4294967296);
    }
    var senha = "";
    for (var j = 0; j < bytes.length; j++) senha += alfabeto.charAt(bytes[j] % alfabeto.length);
    setNovaSenha(senha);
  };

  var reporSenha = async function () {
    if (!modalSenha || !utilizadorSenha) {
      avisar("error", "Escolha o utilizador a repor");
      return;
    }
    if (novaSenha.length < 8) {
      avisar("error", "A nova palavra-passe deve ter pelo menos 8 caracteres");
      return;
    }
    setRepondo(true);
    try {
      var resp = await api.post(
        "/api/plataforma/organizacoes/" + modalSenha.id + "/utilizadores/" + utilizadorSenha.id + "/senha",
        { password: novaSenha }
      );
      setSenhaReposta({
        organizacao: modalSenha.nome,
        utilizador: (resp && resp.dados) || utilizadorSenha,
        password: novaSenha,
      });
      avisar("success", "Palavra-passe reposta");
    } catch (e) {
      avisar("error", e.message);
    } finally {
      setRepondo(false);
    }
  };

  var carregarLogo = async function (ficheiro) {
    if (!modalLogo || !ficheiro) return;
    setUploadingLogo(true);
    try {
      var dados = new FormData();
      dados.append("logo", ficheiro);
      var resp = await api.upload("/api/plataforma/organizacoes/" + modalLogo.id + "/logo", dados);
      if (resp.dados && resp.dados.logo_url) {
        setModalLogo(function (anterior) {
          return anterior ? Object.assign({}, anterior, { logo_url: resp.dados.logo_url }) : anterior;
        });
      }
      avisar("success", "Logo actualizado");
      await carregar();
    } catch (e) {
      avisar("error", e.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  var termo = busca.trim().toLowerCase();
  var visiveis = termo
    ? organizacoes.filter(function (o) {
        return [o.nome, o.nome_curto, o.nif, o.cidade, o.dominio, o.email].some(function (v) {
          return v && String(v).toLowerCase().indexOf(termo) !== -1;
        });
      })
    : organizacoes;

  var termoUtilizador = buscaUtilizador.trim().toLowerCase();
  var utilizadoresVisiveis = termoUtilizador
    ? utilizadoresOrg.filter(function (u) {
        return [u.nome_completo, u.email, u.username].some(function (v) {
          return v && String(v).toLowerCase().indexOf(termoUtilizador) !== -1;
        });
      })
    : utilizadoresOrg;

  var cartoes = [
    { label: "Organizações", valor: resumo.organizacoes, icone: "corporate_fare" },
    { label: "Activas", valor: resumo.organizacoes_activas, icone: "check_circle" },
    { label: "Utilizadores", valor: resumo.utilizadores, icone: "group" },
    { label: "Colaboradores", valor: resumo.colaboradores, icone: "badge" },
  ];

  return (
    <div className="space-y-5 sm:space-y-7">
      <PageHeader
        titulo="Plataforma"
        subtitulo="Gestão das organizações ligadas ao sistema"
        breadcrumb={[{ label: "Plataforma" }]}
        acoes={
          <Button onClick={abrirCriar}>
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            Nova organização
          </Button>
        }
      />

      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
        <span className="material-symbols-outlined text-[20px] text-primary mt-0.5">shield</span>
        <p className="text-[12px] text-on-surface-variant leading-relaxed">
          Esta conta é da plataforma e não pertence a nenhuma organização. Aqui só são geridas as organizações e as
          contagens de utilizadores e colaboradores. Os dados internos de cada organização nunca são mostrados nem
          partilhados com outra organização.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cartoes.map(function (c) {
          return (
            <div key={c.label} className="bg-surface-card border border-outline-variant/30 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] sm:text-[12px] font-semibold text-on-surface-variant/70">{c.label}</span>
                <span className="material-symbols-outlined text-[18px] text-primary/70">{c.icone}</span>
              </div>
              <p className="text-2xl sm:text-[28px] font-bold text-on-surface mt-1.5 leading-none">{c.valor}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-outline">search</span>
          <input
            type="text"
            value={busca}
            onChange={function (e) { setBusca(e.target.value); }}
            placeholder="Pesquisar organização, NIF, cidade..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container/60 border border-outline-variant/40 text-[13px] text-on-surface outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <span className="text-[12px] text-on-surface-variant/60">{visiveis.length} de {organizacoes.length} organizações</span>
      </div>

      {erro && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-error-container text-error text-[13px] font-semibold">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {erro}
          <button onClick={function () { setLoading(true); carregar(); }} className="ml-auto underline">Tentar de novo</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(function (i) {
            return <div key={i} className="h-16 rounded-xl bg-surface-container animate-pulse" />;
          })}
        </div>
      ) : visiveis.length === 0 ? (
        <div className="bg-surface-card border border-outline-variant/30 rounded-xl py-14 px-6 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/25 block mb-2">corporate_fare</span>
          <p className="text-[14px] font-semibold text-on-surface">
            {organizacoes.length === 0 ? "Ainda não há organizações" : "Nenhuma organização encontrada"}
          </p>
          <p className="text-[12px] text-on-surface-variant/70 mt-1">
            {organizacoes.length === 0 ? "Crie a primeira organização para começar." : "Altere a pesquisa."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-card border border-outline-variant/30 rounded-xl overflow-hidden">
          {/* Cabeçalho da tabela (desktop) */}
          <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_110px_168px] gap-4 px-5 py-3 border-b border-outline-variant/30 bg-surface-container/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">Organização</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">Contacto</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">Equipa</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">Estado</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 text-right">Acções</span>
          </div>

          <div className="divide-y divide-outline-variant/20">
            {visiveis.map(function (org) {
              var logo = srcLogo(org.logo_url);
              return (
                <div
                  key={org.id}
                  className="grid grid-cols-1 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_110px_168px] gap-3 md:gap-4 px-4 sm:px-5 py-4 items-center hover:bg-surface-container/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {logo ? (
                      <div className="w-10 h-10 rounded-lg bg-white border border-outline-variant/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img src={logo} alt={"Logo de " + org.nome} className="max-h-8 max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-[12px] font-bold text-primary">{iniciais(org.nome)}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-on-surface truncate">{org.nome}</p>
                      <p className="text-[11px] text-on-surface-variant/60 truncate">
                        {[org.nome_curto, org.nif ? "NIF " + org.nif : null].filter(Boolean).join(" · ") || "Sem sigla"}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 md:pl-0 pl-[52px]">
                    <p className="text-[12px] text-on-surface-variant truncate">{org.email || "Sem email"}</p>
                    <p className="text-[11px] text-on-surface-variant/60 truncate">
                      {[org.telefone, org.cidade].filter(Boolean).join(" · ") || org.dominio || "—"}
                    </p>
                  </div>

                  <div className="md:pl-0 pl-[52px]">
                    <p className="text-[12px] text-on-surface-variant">
                      <span className="font-semibold text-on-surface">{org.utilizadores}</span> utilizadores
                    </p>
                    <p className="text-[11px] text-on-surface-variant/60">
                      <span className="font-semibold text-on-surface-variant">{org.colaboradores}</span> colaboradores
                    </p>
                  </div>

                  <div className="md:pl-0 pl-[52px]">
                    {org.activo !== false ? (
                      <Badge variant="success">Activa</Badge>
                    ) : (
                      <Badge variant="outline" className="text-outline">Desactivada</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 md:justify-end md:pl-0 pl-[52px]">
                    <button
                      onClick={function () { abrirSenha(org); }}
                      title="Repor palavra-passe"
                      className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[19px]">key</span>
                    </button>
                    <button
                      onClick={function () { abrirEditar(org); }}
                      title="Editar organização"
                      className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[19px]">edit</span>
                    </button>
                    <button
                      onClick={function () { setModalLogo(org); }}
                      title="Alterar logo"
                      className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[19px]">image</span>
                    </button>
                    <button
                      onClick={function () { setModalEstado(org); }}
                      title={org.activo !== false ? "Desactivar organização" : "Activar organização"}
                      className={"p-2 rounded-lg transition-colors hover:bg-surface-container " + (org.activo !== false ? "text-on-surface-variant hover:text-error" : "text-success hover:text-success")}
                    >
                      <span className="material-symbols-outlined text-[19px]">power_settings_new</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== CRIAR ==================== */}
      <Modal
        isOpen={modalCriar}
        onClose={function () { setModalCriar(false); }}
        title="Nova organização"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={function () { setModalCriar(false); }}>Cancelar</Button>
            <Button onClick={criarOrganizacao} disabled={guardando}>
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              {guardando ? "A criar..." : "Criar organização"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-[12px] font-bold text-on-surface uppercase tracking-wider mb-3">Dados da organização</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Nome da organização *</label>
                <input type="text" value={form.nome} onChange={function (e) { alterarCampo("nome", e.target.value); }} className={inputCls} placeholder="Ex: CENFFOR - Centro de Formação" />
              </div>
              <div>
                <label className={labelCls}>Sigla</label>
                <input type="text" value={form.nome_curto} onChange={function (e) { alterarCampo("nome_curto", e.target.value); }} className={inputCls} placeholder="CENFFOR" />
              </div>
              <div>
                <label className={labelCls}>NIF</label>
                <input type="text" value={form.nif} onChange={function (e) { alterarCampo("nif", e.target.value); }} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={function (e) { alterarCampo("email", e.target.value); }} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input type="text" value={form.telefone} onChange={function (e) { alterarCampo("telefone", e.target.value); }} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Endereço</label>
                <input type="text" value={form.endereco} onChange={function (e) { alterarCampo("endereco", e.target.value); }} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Cidade</label>
                <input type="text" value={form.cidade} onChange={function (e) { alterarCampo("cidade", e.target.value); }} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Província</label>
                <input type="text" value={form.provincia} onChange={function (e) { alterarCampo("provincia", e.target.value); }} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Website</label>
                <input type="url" value={form.website} onChange={function (e) { alterarCampo("website", e.target.value); }} className={inputCls} placeholder="https://" />
              </div>
              <div>
                <label className={labelCls}>Domínio de email</label>
                <input type="text" value={form.dominio} onChange={function (e) { alterarCampo("dominio", e.target.value); }} className={inputCls} placeholder="empresa.co.ao" />
              </div>
            </div>
          </div>

          <div className="border-t border-outline-variant/30 pt-5">
            <h4 className="text-[12px] font-bold text-on-surface uppercase tracking-wider mb-1">Primeiro administrador</h4>
            <p className="text-[12px] text-on-surface-variant/70 mb-3">
              Opcional, mas sem esta conta ninguém consegue entrar na organização. O nome de utilizador é gerado
              automaticamente a partir do email.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nome completo</label>
                <input type="text" value={form.admin_nome} onChange={function (e) { alterarCampo("admin_nome", e.target.value); }} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email de acesso</label>
                <input type="email" value={form.admin_email} onChange={function (e) { alterarCampo("admin_email", e.target.value); }} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Palavra-passe (mínimo 8 caracteres)</label>
                <input type="text" value={form.admin_password} onChange={function (e) { alterarCampo("admin_password", e.target.value); }} className={inputCls} autoComplete="new-password" />
                <p className="text-[11px] text-on-surface-variant/60 mt-1">
                  Entregue estes dados ao administrador da organização. Ele poderá alterar a palavra-passe depois de entrar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ==================== EDITAR ==================== */}
      <Modal
        isOpen={!!modalEditar}
        onClose={function () { setModalEditar(null); }}
        title={modalEditar ? "Editar " + modalEditar.nome : "Editar organização"}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={function () { setModalEditar(null); }}>Cancelar</Button>
            <Button onClick={guardarEdicao} disabled={guardando}>
              <span className="material-symbols-outlined text-[18px]">save</span>
              {guardando ? "A guardar..." : "Guardar alterações"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nome da organização *</label>
            <input type="text" value={editForm.nome} onChange={function (e) { alterarCampoEdicao("nome", e.target.value); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Sigla</label>
            <input type="text" value={editForm.nome_curto} onChange={function (e) { alterarCampoEdicao("nome_curto", e.target.value); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>NIF</label>
            <input type="text" value={editForm.nif} onChange={function (e) { alterarCampoEdicao("nif", e.target.value); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={editForm.email} onChange={function (e) { alterarCampoEdicao("email", e.target.value); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input type="text" value={editForm.telefone} onChange={function (e) { alterarCampoEdicao("telefone", e.target.value); }} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Endereço</label>
            <input type="text" value={editForm.endereco} onChange={function (e) { alterarCampoEdicao("endereco", e.target.value); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Cidade</label>
            <input type="text" value={editForm.cidade} onChange={function (e) { alterarCampoEdicao("cidade", e.target.value); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Província</label>
            <input type="text" value={editForm.provincia} onChange={function (e) { alterarCampoEdicao("provincia", e.target.value); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input type="url" value={editForm.website} onChange={function (e) { alterarCampoEdicao("website", e.target.value); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Domínio de email</label>
            <input type="text" value={editForm.dominio} onChange={function (e) { alterarCampoEdicao("dominio", e.target.value); }} className={inputCls} />
          </div>
        </div>
      </Modal>

      {/* ==================== LOGO ==================== */}
      <Modal
        isOpen={!!modalLogo}
        onClose={function () { setModalLogo(null); }}
        title={modalLogo ? "Logo de " + modalLogo.nome : "Logo"}
        size="md"
      >
        {modalLogo && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-outline-variant/40 rounded-xl p-4 text-center">
              {modalLogo.logo_url ? (
                <div className="w-full h-28 flex items-center justify-center bg-white rounded-lg border border-outline-variant/20 overflow-hidden">
                  <img src={srcLogo(modalLogo.logo_url)} alt={"Logo de " + modalLogo.nome} className="max-h-24 max-w-full object-contain" />
                </div>
              ) : (
                <div className="py-6">
                  <span className="material-symbols-outlined text-[36px] text-outline-variant/50 block mb-1">image</span>
                  <p className="text-[12px] text-on-surface-variant/60">Sem logo definido</p>
                </div>
              )}
            </div>
            <p className="text-[12px] text-on-surface-variant/70">
              O logo aparece na barra do sistema e nos PDFs desta organização (folha salarial, contratos e relatórios).
              Use PNG ou JPG até 2 MB.
            </p>
            <label className={"flex items-center justify-center gap-2 w-full h-10 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold cursor-pointer hover:bg-primary/5 transition-colors " + (uploadingLogo ? "opacity-60 pointer-events-none" : "")}>
              <input type="file" accept="image/*" className="hidden" onChange={function (e) { carregarLogo(e.target.files[0]); }} />
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              {uploadingLogo ? "A carregar..." : modalLogo.logo_url ? "Substituir logo" : "Carregar logo"}
            </label>
          </div>
        )}
      </Modal>

      {/* ==================== ACTIVAR / DESACTIVAR ==================== */}
      <Modal
        isOpen={!!modalEstado}
        onClose={function () { setModalEstado(null); }}
        title={modalEstado && modalEstado.activo === false ? "Activar organização" : "Desactivar organização"}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={function () { setModalEstado(null); }}>Cancelar</Button>
            <Button
              variant={modalEstado && modalEstado.activo === false ? "default" : "destructive"}
              onClick={confirmarEstado}
              disabled={guardando}
            >
              {guardando ? "A guardar..." : modalEstado && modalEstado.activo === false ? "Activar" : "Desactivar"}
            </Button>
          </>
        }
      >
        {modalEstado && (
          <p className="text-[13px] text-on-surface-variant leading-relaxed">
            {modalEstado.activo === false ? (
              <>A organização <strong className="text-on-surface">{modalEstado.nome}</strong> volta a poder entrar no sistema.</>
            ) : (
              <>A organização <strong className="text-on-surface">{modalEstado.nome}</strong> deixa de conseguir entrar no sistema. Nenhum dado é apagado: os utilizadores apenas ficam sem acesso até reactivar.</>
            )}
          </p>
        )}
      </Modal>

      {/* ==================== REPOR PALAVRA-PASSE ==================== */}
      <Modal
        isOpen={!!modalSenha}
        onClose={function () { setModalSenha(null); }}
        title={modalSenha ? "Repor palavra-passe · " + modalSenha.nome : "Repor palavra-passe"}
        size="md"
        footer={
          senhaReposta ? (
            <Button onClick={function () { setModalSenha(null); }}>Concluir</Button>
          ) : (
            <>
              <Button variant="outline" onClick={function () { setModalSenha(null); }}>Cancelar</Button>
              <Button onClick={reporSenha} disabled={repondo || !utilizadorSenha}>
                <span className="material-symbols-outlined text-[18px]">key</span>
                {repondo ? "A repor..." : "Repor palavra-passe"}
              </Button>
            </>
          )
        }
      >
        {senhaReposta ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-success/10 border border-success/15">
              <span className="material-symbols-outlined text-[20px] text-success mt-0.5">check_circle</span>
              <p className="text-[12px] text-on-surface leading-relaxed">
                A palavra-passe de <strong>{senhaReposta.utilizador.nome_completo || senhaReposta.utilizador.email}</strong> em{" "}
                <strong>{senhaReposta.organizacao}</strong> foi reposta.
              </p>
            </div>
            <div className="rounded-lg bg-surface-container/60 border border-outline-variant/30 p-4 space-y-2">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Utilizador</p>
                <p className="text-[13px] font-semibold text-on-surface break-all">{senhaReposta.utilizador.email || senhaReposta.utilizador.username}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Nova palavra-passe</p>
                <p className="text-[13px] font-bold text-on-surface break-all font-mono">{senhaReposta.password}</p>
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant/60">
              Entregue estes dados à pessoa e recomende que altere a palavra-passe depois de entrar. Não volta a ser
              mostrada.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              Escolha a conta desta organização e defina uma nova palavra-passe. O utilizador será obrigado a
              alterá-la no próximo acesso e eventuais bloqueios por tentativas ficam limpos.
            </p>

            <div>
              <label className={labelCls}>Procurar utilizador</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-outline">search</span>
                <input
                  type="text"
                  value={buscaUtilizador}
                  onChange={function (e) { setBuscaUtilizador(e.target.value); }}
                  placeholder="Nome, email ou nome de utilizador"
                  className={inputCls + " pl-9"}
                />
              </div>
            </div>

            <div className="rounded-lg border border-outline-variant/30 overflow-hidden">
              {carregandoUtilizadores ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
                </div>
              ) : utilizadoresVisiveis.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <span className="material-symbols-outlined text-[28px] text-on-surface-variant/25 block mb-1">person_off</span>
                  <p className="text-[12px] text-on-surface-variant/60">
                    {utilizadoresOrg.length === 0 ? "Esta organização não tem utilizadores." : "Nenhum resultado para a procura."}
                  </p>
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto divide-y divide-outline-variant/20">
                  {utilizadoresVisiveis.map(function (u) {
                    var escolhido = utilizadorSenha && utilizadorSenha.id === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={function () { setUtilizadorSenha(u); }}
                        className={"w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors " + (escolhido ? "bg-primary/10" : "hover:bg-surface-container/60")}
                      >
                        <span className={"w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 " + (escolhido ? "border-primary" : "border-outline-variant")}>
                          {escolhido && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-on-surface truncate">{u.nome_completo}</span>
                          <span className="block text-[11px] text-on-surface-variant/60 truncate">
                            {[u.email, u.username].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        {u.bloqueado && <Badge variant="outline" className="text-error">Bloqueado</Badge>}
                        {!u.activo && <Badge variant="outline" className="text-outline">Inactivo</Badge>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {utilizadorSenha && (
              <div>
                <label className={labelCls}>Nova palavra-passe (mínimo 8 caracteres)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={novaSenha}
                    onChange={function (e) { setNovaSenha(e.target.value); }}
                    className={inputCls + " font-mono"}
                    autoComplete="new-password"
                    placeholder="Nova palavra-passe"
                  />
                  <button
                    type="button"
                    onClick={gerarSenha}
                    className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-primary/30 text-primary text-[12px] font-semibold whitespace-nowrap hover:bg-primary/5 transition-colors flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-[17px]">casino</span>
                    Gerar
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant/60 mt-1">
                  A palavra-passe só é mostrada uma vez. Recomende ao utilizador que a altere depois de entrar.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ==================== CREDENCIAIS DO ADMINISTRADOR ==================== */}
      <Modal
        isOpen={!!credenciais}
        onClose={function () { setCredenciais(null); }}
        title="Administrador criado"
        size="sm"
        footer={<Button onClick={function () { setCredenciais(null); }}>Entendido</Button>}
      >
        {credenciais && (
          <div className="space-y-3">
            <p className="text-[13px] text-on-surface-variant">
              Entregue estes dados ao administrador da organização. A palavra-passe é a que definiu no formulário.
            </p>
            <div className="rounded-lg bg-surface-container/60 border border-outline-variant/30 p-4 space-y-2">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Nome</p>
                <p className="text-[13px] font-semibold text-on-surface">{credenciais.nome}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Email</p>
                <p className="text-[13px] font-semibold text-on-surface break-all">{credenciais.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Nome de utilizador</p>
                <p className="text-[13px] font-semibold text-on-surface break-all">{credenciais.username}</p>
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant/60">
              No primeiro acesso o sistema pede a alteração da palavra-passe.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
