"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { getT } from "@/lib/translations";

var LS_KEY = "cenffor_config";
function loadCfg() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (e) { return {}; } }
function saveCfg(c) { localStorage.setItem(LS_KEY, JSON.stringify(c)); }

var TABS_KEYS = ["organizacao", "sistema", "seguranca"];
var TABS_ICONS = ["business", "settings", "shield"];

export default function ConfiguracoesPage() {
  const auth = useAuth();
  const utilizador = auth ? auth.utilizador : null;
  const [activeTab, setActiveTab] = useState(0);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [organizacoes, setOrganizacoes] = useState([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [, setTick] = useState(0);

  var T = getT();

  // Org state
  const [orgNome, setOrgNome] = useState("");
  const [orgSigla, setOrgSigla] = useState("");
  const [orgEndereco, setOrgEndereco] = useState("");
  const [orgTelefone, setOrgTelefone] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgNif, setOrgNif] = useState("");
  const [orgSite, setOrgSite] = useState("");
  const [orgTemplate, setOrgTemplate] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // System state
  var cfg = loadCfg();
  var sys = cfg.sistema || {};
  const [sistemaIdioma, setSistemaIdioma] = useState("Português");
  const [sistemaData, setSistemaData] = useState("DD/MM/AAAA");
  const [sistemaMoeda, setSistemaMoeda] = useState("Kwanza (AOA)");
  const [sistemaFuso, setSistemaFuso] = useState("Africa/Luanda (GMT+1)");
  const [sistemaDiasFerias, setSistemaDiasFerias] = useState("30");
  const [sistemaLimiteFicheiros, setSistemaLimiteFicheiros] = useState("10");

  // Security state
  var sec = cfg.seguranca || {};
  const [seg2fa, setSeg2fa] = useState(false);
  const [segExpiracao, setSegExpiracao] = useState(true);
  const [segBloqueio, setSegBloqueio] = useState(true);
  const [segSessao, setSegSessao] = useState(true);

  // Email/password change
  const [novoEmail, setNovoEmail] = useState("");
  const [senhaEmail, setSenhaEmail] = useState("");
  const [senhaActual, setSenhaActual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  useEffect(function() {
    var c = loadCfg();
    if (c.sistema) {
      if (c.sistema.idioma) setSistemaIdioma(c.sistema.idioma);
      if (c.sistema.formatoData) setSistemaData(c.sistema.formatoData);
      if (c.sistema.moeda) setSistemaMoeda(c.sistema.moeda);
      if (c.sistema.fuso) setSistemaFuso(c.sistema.fuso);
      if (c.sistema.diasFerias) setSistemaDiasFerias(c.sistema.diasFerias);
      if (c.sistema.limiteFicheiros) setSistemaLimiteFicheiros(c.sistema.limiteFicheiros);
    }
    if (c.seguranca) {
      setSeg2fa(!!c.seguranca.duasFactores);
      setSegExpiracao(c.seguranca.expiracaoSenha !== false);
      setSegBloqueio(c.seguranca.bloqueioTentativas !== false);
      setSegSessao(c.seguranca.sessaoInactiva !== false);
    }
    api.get("/api/organizacoes").then(function(data) {
      var orgs = data.dados || [];
      setOrganizacoes(orgs);
      if (orgs.length > 0) {
        var org = orgs[0];
        setOrgId(org.id);
        setOrgNome(org.nome || "");
        setOrgSigla(org.nome_curto || "");
        setOrgEndereco(org.endereco || "");
        setOrgTelefone(org.telefone || "");
        setOrgEmail(org.email || "");
        setOrgNif(org.nif || "");
        setOrgSite(org.website || "");
        setOrgTemplate(org.template_contrato || "");
        var logoUrl = org.logo_url || "";
        if (logoUrl && logoUrl.indexOf("?v=") === -1) logoUrl += "?v=" + Date.now();
        setOrgLogoUrl(logoUrl);
      }
    }).catch(function() {}).finally(function() { setLoadingOrg(false); });
  }, []);

  var selecionarOrganizacao = useCallback(function(id) {
    var org = organizacoes.find(function(o) { return o.id === id; });
    if (!org) return;
    setOrgId(org.id);
    setOrgNome(org.nome || "");
    setOrgSigla(org.nome_curto || "");
    setOrgEndereco(org.endereco || "");
    setOrgTelefone(org.telefone || "");
    setOrgEmail(org.email || "");
    setOrgNif(org.nif || "");
    setOrgSite(org.website || "");
    setOrgTemplate(org.template_contrato || "");
    var logoUrl = org.logo_url || "";
    if (logoUrl && logoUrl.indexOf("?v=") === -1) logoUrl += "?v=" + Date.now();
    setOrgLogoUrl(logoUrl);
  }, [organizacoes]);

  var nome = "", email = "", perfil = "", userId = "";
  if (utilizador) {
    nome = utilizador.nome_completo || "";
    email = utilizador.email || "";
    perfil = utilizador.perfil ? utilizador.perfil.nome : "";
    userId = utilizador.id || "";
  }

  var guardarOrganizacao = useCallback(async function() {
    setSaving(true); setMsg(null);
    try {
      if (orgId) {
        await api.put("/api/organizacoes/" + orgId, { nome: orgNome, nome_curto: orgSigla, endereco: orgEndereco, telefone: orgTelefone, email: orgEmail, nif: orgNif, website: orgSite, template_contrato: orgTemplate });
      } else {
        var resp = await api.post("/api/organizacoes", { nome: orgNome || "CENFFOR", nif: orgNif, email: orgEmail, telefone: orgTelefone, endereco: orgEndereco, website: orgSite });
        if (resp.dados) setOrgId(resp.dados.id);
      }
      setMsg({ tipo: "sucesso", texto: T.guardar });
    } catch (e) { setMsg({ tipo: "erro", texto: e.message }); }
    finally { setSaving(false); }
  }, [orgId, orgNome, orgSigla, orgEndereco, orgTelefone, orgEmail, orgNif, orgSite, orgTemplate, T]);

  var handleUploadLogo = useCallback(async function(e) {
    var file = e.target.files[0];
    if (!file || !orgId) return;
    setUploadingLogo(true);
    try {
      var formData = new FormData();
      formData.append("logo", file);
      var resp = await api.upload("/api/organizacoes/" + orgId + "/logo", formData);
      if (resp.dados && resp.dados.logo_url) {
        setOrgLogoUrl(resp.dados.logo_url);
        setMsg({ tipo: "sucesso", texto: "Logo atualizado com sucesso" });
      }
    } catch (err) {
      setMsg({ tipo: "erro", texto: err.message });
    } finally {
      setUploadingLogo(false);
    }
  }, [orgId]);

  var guardarSistema = useCallback(function() {
    setMsg(null);
    var c = loadCfg();
    c.sistema = { idioma: sistemaIdioma, formatoData: sistemaData, moeda: sistemaMoeda, fuso: sistemaFuso, diasFerias: sistemaDiasFerias, limiteFicheiros: sistemaLimiteFicheiros };
    saveCfg(c);
    setMsg({ tipo: "sucesso", texto: T.guardar });
    setTick(function(n) { return n + 1; });
  }, [sistemaIdioma, sistemaData, sistemaMoeda, sistemaFuso, sistemaDiasFerias, sistemaLimiteFicheiros, T]);

  var toggleSeguranca = useCallback(function(key, value) {
    var c = loadCfg();
    if (!c.seguranca) c.seguranca = {};
    c.seguranca[key] = value;
    saveCfg(c);
    if (key === "duasFactores") setSeg2fa(value);
    if (key === "expiracaoSenha") setSegExpiracao(value);
    if (key === "bloqueioTentativas") setSegBloqueio(value);
    if (key === "sessaoInactiva") setSegSessao(value);
  }, []);

  var handleAlterarEmail = useCallback(async function() {
    setMsg(null);
    if (!novoEmail || !senhaEmail) { setMsg({ tipo: "erro", texto: "Preencha todos os campos" }); return; }
    try {
      var resp = await api.put("/api/users/" + userId + "/email", { new_email: novoEmail, current_password: senhaEmail });
      if (resp.dados) {
        localStorage.setItem("utilizador", JSON.stringify(resp.dados));
      }
      setMsg({ tipo: "sucesso", texto: "Email atualizado com sucesso" });
      setNovoEmail(""); setSenhaEmail("");
    } catch (e) { setMsg({ tipo: "erro", texto: e.message }); }
  }, [novoEmail, senhaEmail, userId]);

  var handleAlterarSenha = useCallback(async function() {
    setMsg(null);
    if (!senhaActual || !novaSenha || !confirmarSenha) { setMsg({ tipo: "erro", texto: "Preencha todos os campos" }); return; }
    if (novaSenha !== confirmarSenha) { setMsg({ tipo: "erro", texto: "As senhas não coincidem" }); return; }
    if (novaSenha.length < 6) { setMsg({ tipo: "erro", texto: "A senha deve ter pelo menos 6 caracteres" }); return; }
    try {
      await api.put("/api/users/" + userId + "/password", { current_password: senhaActual, new_password: novaSenha });
      setMsg({ tipo: "sucesso", texto: "Senha alterada com sucesso" });
      setSenhaActual(""); setNovaSenha(""); setConfirmarSenha("");
    } catch (e) { setMsg({ tipo: "erro", texto: e.message }); }
  }, [senhaActual, novaSenha, confirmarSenha, userId]);

  var inputCls = "w-full px-4 py-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/40 text-[13px] text-on-surface outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all";
  var inputClsSmall = "flex-1 px-4 py-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/40 text-[13px] text-on-surface outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all";

  var tabLabels = [T.organizacao, T.sistema, T.seguranca];

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>{T.sistema}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">{T.configuracoes}</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">{T.configuracoes}</h1>
        </div>
      </section>

      <div className="glass-panel rounded-xl border border-outline-variant/30 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-outline-variant/30">
          {TABS_KEYS.map(function(key, i) {
            return (
              <button key={key} onClick={function() { setActiveTab(i); setMsg(null); }}
                className={"flex items-center gap-2 px-5 py-3.5 text-[13px] font-semibold whitespace-nowrap transition-all border-b-2 " + (activeTab === i ? "text-primary border-primary bg-primary/5" : "text-on-surface-variant border-transparent hover:bg-surface-container/60 hover:text-on-surface")}>
                <span className="material-symbols-outlined text-[18px]">{TABS_ICONS[i]}</span>
                {tabLabels[i]}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {msg && (
            <div className={"mb-4 px-4 py-3 rounded-lg text-[13px] font-semibold flex items-center gap-2 " + (msg.tipo === "sucesso" ? "bg-success/10 text-success border border-success/10" : "bg-error/10 text-error border border-error/10")}>
              <span className="material-symbols-outlined text-[18px]">{msg.tipo === "sucesso" ? "check_circle" : "error"}</span>
              {msg.texto}
              <button onClick={function() { setMsg(null); }} className="ml-auto hover:opacity-60"><span className="material-symbols-outlined text-[16px]">close</span></button>
            </div>
          )}

          {/* TAB 0: Organizacao */}
          {activeTab === 0 && (
            <div className="space-y-6">
              <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wider mb-4">{T.dadosOrganizacao}</h3>
              {!loadingOrg && organizacoes.length > 1 && (
                <div className="mb-4">
                  <label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">Organização</label>
                  <select value={orgId || ""} onChange={function(e) { selecionarOrganizacao(e.target.value); }} className={inputCls}>
                    {organizacoes.map(function(o) { return <option key={o.id} value={o.id}>{o.nome}</option>; })}
                  </select>
                  <p className="text-[11px] text-on-surface-variant/60 mt-1">O logo definido aqui aplica-se a todos os PDFs dos colaboradores desta organização.</p>
                </div>
              )}
              {loadingOrg ? (
                <div className="space-y-4">{[1,2,3].map(function(i) { return <div key={i} className="h-11 bg-surface-container rounded-lg animate-pulse" />; })}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">{T.nomeOrganizacao} *</label><input type="text" value={orgNome} onChange={function(e) { setOrgNome(e.target.value); }} className={inputCls} /></div>
                  <div><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">{T.sigla}</label><input type="text" value={orgSigla} onChange={function(e) { setOrgSigla(e.target.value); }} className={inputCls} /></div>
                  <div className="md:col-span-2"><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">{T.endereco}</label><input type="text" value={orgEndereco} onChange={function(e) { setOrgEndereco(e.target.value); }} className={inputCls} /></div>
                  <div><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">{T.telefoneOrg}</label><input type="text" value={orgTelefone} onChange={function(e) { setOrgTelefone(e.target.value); }} className={inputCls} /></div>
                  <div><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">{T.emailInstitucionalLabel}</label><input type="email" value={orgEmail} onChange={function(e) { setOrgEmail(e.target.value); }} className={inputCls} /></div>
                  <div><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">NIF</label><input type="text" value={orgNif} onChange={function(e) { setOrgNif(e.target.value); }} className={inputCls} /></div>
                  <div><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">{T.website}</label><input type="url" value={orgSite} onChange={function(e) { setOrgSite(e.target.value); }} placeholder="https://cenffor.co.ao" className={inputCls} /></div>
                </div>
              )}

              <div className="border-t border-outline-variant/20 pt-6 mt-6">
                <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wider mb-4">Modelo de Contrato de Trabalho</h3>
                <p className="text-[12px] text-on-surface-variant/70 mb-4">Defina o template do contrato. Use placeholders como {"{NOME_COLABORADOR}"}, {"{NIF}"}, {"{SALARIO}"}, etc. que serão substituídos automaticamente ao gerar o PDF.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-3">
                    <label className="block text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Template do Contrato</label>
                    <textarea
                      value={orgTemplate}
                      onChange={function(e) { setOrgTemplate(e.target.value); }}
                      placeholder={"Ex:\nENTRE\n{NOME_ORGANIZACAO}, NIF {NIF_ORGANIZACAO}, com sede em {MORADA_ORGANIZACAO}\nE\n{NOME_COLABORADOR}, NIF {NIF_COLABORADOR}, natural de {NATURAL_DE}\n\nCLÁUSULA PRIMEIRA - Categoria Profissional\nO trabalhador será admitido na categoria de {CATEGORIA_PROFISSIONAL}.\n\nCLÁUSULA SEGUNDA - Remuneração\nSalário mensal: {SALARIO_BASE}"}
                      rows={16}
                      className="w-full px-4 py-3 bg-surface-container/60 border border-outline-variant/40 rounded-lg text-[13px] text-on-surface outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all font-mono resize-y"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase">Placeholders:</span>
                      {["NOME_COLABORADOR","NIF_COLABORADOR","BI_COLABORADOR","ESTADO_CIVIL","NATURAL_DE","RESIDENCIA","NUMERO_CONTRATO","DATA_INICIO","DATA_FIM","CATEGORIA_PROFISSIONAL","LOCAL_TRABALHO","HORARIO_TRABALHO","SALARIO_BASE","NOME_ORGANIZACAO","NIF_ORGANIZACAO","MORADA_ORGANIZACAO"].map(function(p) {
                        return <span key={p} className="text-[9px] px-1.5 py-0.5 bg-primary/5 text-primary/70 rounded font-mono">{"{" + p + "}"}</span>;
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 mb-2">Logo da Organização</label>
                      <div className="border-2 border-dashed border-outline-variant/40 rounded-xl p-4 text-center hover:border-primary/30 transition-colors">
                        {orgLogoUrl ? (
                          <div className="space-y-3">
                            <div className="w-full h-24 flex items-center justify-center bg-white rounded-lg border border-outline-variant/20 overflow-hidden">
                              <img src={orgLogoUrl} alt="Logo" className="max-h-20 max-w-full object-contain" />
                            </div>
                            <label className="cursor-pointer text-[11px] font-semibold text-primary hover:underline block">
                              <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                              {uploadingLogo ? "A carregar..." : "Alterar Logo"}
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                            <span className="material-symbols-outlined text-[32px] text-outline-variant/40 block mb-1">cloud_upload</span>
                            <span className="text-[11px] font-semibold text-on-surface-variant/60 block">{uploadingLogo ? "A carregar..." : "Carregar Logo (PNG/JPG)"}</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end"><button onClick={guardarOrganizacao} disabled={saving || loadingOrg} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"><span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>{saving ? T.carregando : T.guardar_3}</button></div>
            </div>
          )}

          {/* TAB 1: Sistema */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wider mb-4">{T.parametrosSistema}</h3>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4"><label className="text-[13px] font-semibold text-on-surface-variant md:w-64 shrink-0">{T.idiomaSistema}</label><select value={sistemaIdioma} onChange={function(e) { setSistemaIdioma(e.target.value); }} className={inputClsSmall}><option>Português</option><option>English</option></select></div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4"><label className="text-[13px] font-semibold text-on-surface-variant md:w-64 shrink-0">{T.formatoData}</label><select value={sistemaData} onChange={function(e) { setSistemaData(e.target.value); }} className={inputClsSmall}><option>DD/MM/AAAA</option><option>MM/DD/AAAA</option><option>AAAA-MM-DD</option></select></div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4"><label className="text-[13px] font-semibold text-on-surface-variant md:w-64 shrink-0">{T.moeda}</label><select value={sistemaMoeda} onChange={function(e) { setSistemaMoeda(e.target.value); }} className={inputClsSmall}><option>Kwanza (AOA)</option><option>Euro (EUR)</option><option>Dólar (USD)</option></select></div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4"><label className="text-[13px] font-semibold text-on-surface-variant md:w-64 shrink-0">{T.fusoHorario}</label><select value={sistemaFuso} onChange={function(e) { setSistemaFuso(e.target.value); }} className={inputClsSmall}><option>Africa/Luanda (GMT+1)</option></select></div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4"><label className="text-[13px] font-semibold text-on-surface-variant md:w-64 shrink-0">{T.diasAvisoFerias}</label><input type="number" value={sistemaDiasFerias} onChange={function(e) { setSistemaDiasFerias(e.target.value); }} className={inputClsSmall} /></div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4"><label className="text-[13px] font-semibold text-on-surface-variant md:w-64 shrink-0">{T.limiteFicheiros}</label><input type="number" value={sistemaLimiteFicheiros} onChange={function(e) { setSistemaLimiteFicheiros(e.target.value); }} className={inputClsSmall} /></div>
              </div>
              <div className="flex justify-end"><button onClick={guardarSistema} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-all shadow-sm"><span className="material-symbols-outlined text-[18px]">save</span>{T.guardar_3}</button></div>
            </div>
          )}

          {/* TAB 2: Seguranca */}
          {activeTab === 2 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wider mb-4">{T.segurancaAcesso}</h3>
                <div className="space-y-4">
                  {[
                    { label: "2FA", desc: "Requerer código adicional durante o login", value: seg2fa, key: "duasFactores" },
                    { label: T.alterarSenha, desc: "Forçar mudança de senha a cada 90 dias", value: segExpiracao, key: "expiracaoSenha" },
                    { label: "Bloqueio de Força Bruta", desc: "Bloquear após 5 tentativas de login falhadas", value: segBloqueio, key: "bloqueioTentativas" },
                    { label: "Sessão Inativa", desc: "Encerrar sessão após 30 minutos de inatividade", value: segSessao, key: "sessaoInactiva" },
                  ].map(function(item) {
                    return (
                      <div key={item.key} className="glass-panel p-4 rounded-xl border border-outline-variant/30 flex items-center justify-between gap-4">
                        <div className="min-w-0"><p className="text-[13px] font-semibold text-on-surface">{item.label}</p><p className="text-[12px] text-on-surface-variant/70">{item.desc}</p></div>
                        <button onClick={function() { toggleSeguranca(item.key, !item.value); }} className={"w-11 h-6 rounded-full relative shrink-0 transition-colors cursor-pointer " + (item.value ? "bg-primary" : "bg-outline-variant/50")}>
                          <div className={"w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all " + (item.value ? "right-0.5" : "left-0.5")} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wider mb-4">{T.utilizadorActual}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">{T.nomeCompleto}</label><input type="text" value={nome} readOnly className="w-full px-4 py-2.5 rounded-lg bg-surface-container/40 border border-outline-variant/30 text-[13px] text-on-surface/70" /></div>
                  <div><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">Email</label><input type="email" value={email} readOnly className="w-full px-4 py-2.5 rounded-lg bg-surface-container/40 border border-outline-variant/30 text-[13px] text-on-surface/70" /></div>
                  <div><label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5">{T.tipo}</label><input type="text" value={perfil} readOnly className="w-full px-4 py-2.5 rounded-lg bg-surface-container/40 border border-outline-variant/30 text-[13px] text-on-surface/70" /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-5 rounded-xl border border-outline-variant/30">
                  <h4 className="text-[13px] font-bold text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-primary">email</span>{T.alterarEmail}</h4>
                  <div className="space-y-3">
                    <div><label className="block text-[11px] font-bold text-on-surface-variant/70 uppercase mb-1">{T.novoEmail}</label><input type="email" value={novoEmail} onChange={function(e) { setNovoEmail(e.target.value); }} className={inputCls} /></div>
                    <div><label className="block text-[11px] font-bold text-on-surface-variant/70 uppercase mb-1">{T.senhaActual}</label><input type="password" value={senhaEmail} onChange={function(e) { setSenhaEmail(e.target.value); }} className={inputCls} /></div>
                    <button onClick={handleAlterarEmail} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-all shadow-sm"><span className="material-symbols-outlined text-[16px]">save</span>{T.guardar_3}</button>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-outline-variant/30">
                  <h4 className="text-[13px] font-bold text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-primary">lock</span>{T.alterarSenha}</h4>
                  <div className="space-y-3">
                    <div><label className="block text-[11px] font-bold text-on-surface-variant/70 uppercase mb-1">{T.senhaActual}</label><input type="password" value={senhaActual} onChange={function(e) { setSenhaActual(e.target.value); }} className={inputCls} /></div>
                    <div><label className="block text-[11px] font-bold text-on-surface-variant/70 uppercase mb-1">{T.novaSenha}</label><input type="password" value={novaSenha} onChange={function(e) { setNovaSenha(e.target.value); }} className={inputCls} /></div>
                    <div><label className="block text-[11px] font-bold text-on-surface-variant/70 uppercase mb-1">{T.confirmarSenha}</label><input type="password" value={confirmarSenha} onChange={function(e) { setConfirmarSenha(e.target.value); }} className={inputCls} /></div>
                    <button onClick={handleAlterarSenha} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-all shadow-sm"><span className="material-symbols-outlined text-[16px]">save</span>{T.guardar_3}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}