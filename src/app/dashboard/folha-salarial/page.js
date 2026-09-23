"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import helpers from "@/lib/helpers";
import { getT } from "@/lib/translations";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const TAXA_SEGURANCA_SOCIAL = 0.03;
const ISENCAO_SUBSIDIO_ALIMENTACAO = 30000;
const TABELA_IRT = [
  { ate: 150000, parcela: 0, taxa: 0 },
  { ate: 200000, parcela: 12500, taxa: 0.16 },
  { ate: 300000, parcela: 31250, taxa: 0.18 },
  { ate: 500000, parcela: 49250, taxa: 0.19 },
  { ate: 1000000, parcela: 87250, taxa: 0.20 },
  { ate: 1500000, parcela: 187250, taxa: 0.21 },
  { ate: 2000000, parcela: 292250, taxa: 0.22 },
  { ate: 2500000, parcela: 402250, taxa: 0.23 },
  { ate: 5000000, parcela: 517250, taxa: 0.24 },
  { ate: 10000000, parcela: 1117250, taxa: 0.245 },
  { ate: Infinity, parcela: 2342250, taxa: 0.25 },
];

const arredondar = (v) => Math.round(v * 100) / 100;

const calcularSegurancaSocial = (bruto) => arredondar(bruto * TAXA_SEGURANCA_SOCIAL);

const calcularIRT = (base) => {
  if (!base || base <= 0) return 0;
  for (let i = 0; i < TABELA_IRT.length; i++) {
    if (base <= TABELA_IRT[i].ate) {
      const limiteInferior = i === 0 ? 0 : TABELA_IRT[i - 1].ate;
      return arredondar(TABELA_IRT[i].parcela + (base - limiteInferior) * TABELA_IRT[i].taxa);
    }
  }
  return 0;
};

const calcularDescontosObrigatorios = (salarioBase, subsidios, horasExtras) => {
  const sb = parseFloat(salarioBase) || 0;
  const sub = parseFloat(subsidios) || 0;
  const he = parseFloat(horasExtras) || 0;
  const bruto = sb + sub + he;
  const ss = calcularSegurancaSocial(bruto);
  const subsidiosTributaveis = Math.max(0, sub - ISENCAO_SUBSIDIO_ALIMENTACAO);
  const baseIRT = Math.max(0, sb + he + subsidiosTributaveis - ss);
  return { seguranca_social: ss, irt: calcularIRT(baseIRT) };
};

export default function FolhaSalarialPage() {
  var t = getT();

  const [tab, setTab] = useState("vencimentos");

  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroColaborador, setFiltroColaborador] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  const [dados, setDados] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: "" });
  const [recalculando, setRecalculando] = useState(false);
  const [gerarAuto, setGerarAuto] = useState(false);
  const [autogForm, setAutogForm] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
  const [gerando, setGerando] = useState(false);
  const [resultadoGerar, setResultadoGerar] = useState(null);
  const [baixandoResumo, setBaixandoResumo] = useState(false);
  const [resumoMes, setResumoMes] = useState(String(new Date().getMonth() + 1));
  const [resumoAno, setResumoAno] = useState(String(new Date().getFullYear()));
  const [resumoOpen, setResumoOpen] = useState(false);

  const [form, setForm] = useState({});

  const defaultFormVenc = {
    colaborador_id: "", salario_base: "", subsidio_alimentacao: "",
    subsidio_transporte: "", subsidio_educacao: "", outros_subsidios: "",
    desconto_irt: "", desconto_seguranca_social: "", outros_descontos: "",
    data_inicio: "", data_fim: "", estado: "Activo"
  };

  const defaultFormPag = {
    colaborador_id: "", mes: "", ano: "", salario_base: "",
    subsidios: "", horas_extras: "", descontos: "", irt: "",
    seguranca_social: "", desconto_faltas: "", data_pagamento: "", estado: "Pendente"
  };

  const loadColaboradores = async () => {
    try {
      const data = await api.get("/api/colaboradores?limit=200");
      setColaboradores(data.dados || []);
    } catch (e) {
      // silêncio
    }
  };

  const carregar = async (page = 1) => {
    setLoading(true);
    setMsg(null);
    try {
      let url;
      if (tab === "vencimentos") {
        url = `/api/folha-salarial/vencimentos?page=${page}&limit=15`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (filtroEstado) url += `&estado=${filtroEstado}`;
        if (filtroColaborador) url += `&colaborador_id=${filtroColaborador}`;
      } else {
        url = `/api/folha-salarial/pagamentos?page=${page}&limit=15`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (filtroEstado) url += `&estado=${filtroEstado}`;
        if (filtroColaborador) url += `&colaborador_id=${filtroColaborador}`;
        if (filtroMes) url += `&mes=${filtroMes}`;
        if (filtroAno) url += `&ano=${filtroAno}`;
      }
      const data = await api.get(url);
      setDados(data.dados || []);
      setPaginacao(data.paginacao || { total: 0, pagina: 1, total_paginas: 1 });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadColaboradores(); }, []);
  useEffect(() => { carregar(1); }, [tab]);

  const handleInput = (e) => {
    const nome = e.target.name;
    const valor = e.target.value;
    setForm(prev => {
      const novo = { ...prev, [nome]: valor };
      if (tab === "pagamentos" && (nome === "salario_base" || nome === "subsidios" || nome === "horas_extras")) {
        const obrigatorios = calcularDescontosObrigatorios(novo.salario_base, novo.subsidios, novo.horas_extras);
        novo.seguranca_social = obrigatorios.seguranca_social;
        novo.irt = obrigatorios.irt;
      }
      return novo;
    });
  };

  const handleColaboradorChange = async (e) => {
    const colabId = e.target.value;
    setForm(prev => ({ ...prev, colaborador_id: colabId, salario_base: "", subsidios: "", desconto_faltas: "", seguranca_social: "", irt: "" }));
    if (!colabId) return;
    try {
      const data = await api.get(`/api/folha-salarial/contrato-actual/${colabId}`);
      if (data && data.dados) {
        const sb = data.dados.salario_base || 0;
        const sub = data.dados.subsidio_alimentacao || 0;
        const obrigatorios = calcularDescontosObrigatorios(sb, sub, 0);
        setForm(prev => ({
          ...prev,
          colaborador_id: colabId,
          salario_base: sb,
          subsidios: sub,
          seguranca_social: obrigatorios.seguranca_social,
          irt: obrigatorios.irt,
        }));
      }
      buscarDescontoFaltas(colabId, form.mes, form.ano);
      buscarHorasExtras(colabId, form.mes, form.ano);
    } catch (e) {
      console.error("Erro ao buscar contrato:", e);
    }
  };

  const buscarHorasExtras = async (colabId, mes, ano) => {
    if (!colabId || !mes || !ano) return;
    try {
      const data = await api.get(`/api/folha-salarial/preview-horas-extras?colaborador_id=${colabId}&mes=${mes}&ano=${ano}`);
      if (data && data.dados && data.dados.horas_extras !== undefined) {
        setForm(prev => ({ ...prev, horas_extras: data.dados.horas_extras }));
      }
    } catch (e) {
      console.error("Erro ao buscar horas extras:", e);
    }
  };

  const buscarDescontoFaltas = async (colabId, mes, ano) => {
    if (!colabId || !mes || !ano) return;
    try {
      const data = await api.get(`/api/folha-salarial/preview-desconto-faltas?colaborador_id=${colabId}&mes=${mes}&ano=${ano}`);
      if (data && data.dados && data.dados.desconto_faltas !== undefined) {
        setForm(prev => ({ ...prev, desconto_faltas: data.dados.desconto_faltas }));
      }
    } catch (e) {
      console.error("Erro ao buscar desconto de faltas:", e);
    }
  };

  const handleMesAnoChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const novo = { ...prev, [name]: value };
      if (novo.colaborador_id && novo.mes && novo.ano) {
        buscarDescontoFaltas(novo.colaborador_id, novo.mes, novo.ano);
        buscarHorasExtras(novo.colaborador_id, novo.mes, novo.ano);
      }
      return novo;
    });
  };

  const calcularTotalBrutoVenc = (f) => {
    var sb = parseFloat(f.salario_base) || 0;
    var sa = parseFloat(f.subsidio_alimentacao) || 0;
    var st = parseFloat(f.subsidio_transporte) || 0;
    var se = parseFloat(f.subsidio_educacao) || 0;
    var os = parseFloat(f.outros_subsidios) || 0;
    return sb + sa + st + se + os;
  };

  const calcularTotalLiquidoVenc = (f) => {
    var bruto = calcularTotalBrutoVenc(f);
    var di = parseFloat(f.desconto_irt) || 0;
    var ds = parseFloat(f.desconto_seguranca_social) || 0;
    var od = parseFloat(f.outros_descontos) || 0;
    return bruto - di - ds - od;
  };

  const calcularTotalLiquidoPag = (f) => {
    var sb = parseFloat(f.salario_base) || 0;
    var sub = parseFloat(f.subsidios) || 0;
    var he = parseFloat(f.horas_extras) || 0;
    var desc = parseFloat(f.descontos) || 0;
    var irt = parseFloat(f.irt) || 0;
    var ss = parseFloat(f.seguranca_social) || 0;
    var df = parseFloat(f.desconto_faltas) || 0;
    return sb + sub + he - desc - irt - ss - df;
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(tab === "vencimentos" ? { ...defaultFormVenc } : { ...defaultFormPag });
    setShowModal(true);
    setMsg(null);
  };

  const abrirEditar = (item) => {
    setEditando(item);
    if (tab === "vencimentos") {
      setForm({
        colaborador_id: item.colaborador_id || item.colaborador?.id || "",
        salario_base: item.salario_base || "",
        subsidio_alimentacao: item.subsidio_alimentacao || "",
        subsidio_transporte: item.subsidio_transporte || "",
        subsidio_educacao: item.subsidio_educacao || "",
        outros_subsidios: item.outros_subsidios || "",
        desconto_irt: item.desconto_irt || "",
        desconto_seguranca_social: item.desconto_seguranca_social || "",
        outros_descontos: item.outros_descontos || "",
        data_inicio: item.data_inicio ? item.data_inicio.substring(0, 10) : "",
        data_fim: item.data_fim ? item.data_fim.substring(0, 10) : "",
        estado: item.estado || "Activo"
      });
    } else {
      setForm({
        colaborador_id: item.colaborador_id || item.colaborador?.id || "",
        mes: item.mes || "",
        ano: item.ano || "",
        salario_base: item.salario_base || "",
        subsidios: item.subsidios || "",
        horas_extras: item.horas_extras || "",
        descontos: item.descontos || "",
        irt: item.irt || "",
        seguranca_social: item.seguranca_social || "",
        desconto_faltas: item.desconto_faltas || "",
        data_pagamento: item.data_pagamento ? item.data_pagamento.substring(0, 10) : "",
        estado: item.estado || "Pendente"
      });
    }
    setShowModal(true);
    setMsg(null);
  };

  const abrirVer = (item) => {
    setViewItem(item);
    setShowViewModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (tab === "vencimentos") {
        if (editando) {
          await api.put(`/api/folha-salarial/vencimentos/${editando.id}`, form);
          setMsg({ tipo: "sucesso", texto: "Vencimento atualizado com sucesso" });
        } else {
          await api.post("/api/folha-salarial/vencimentos", form);
          setMsg({ tipo: "sucesso", texto: "Vencimento criado com sucesso" });
        }
      } else {
        if (editando) {
          await api.put(`/api/folha-salarial/pagamentos/${editando.id}`, form);
          setMsg({ tipo: "sucesso", texto: "Pagamento atualizado com sucesso" });
        } else {
          await api.post("/api/folha-salarial/pagamentos", form);
          setMsg({ tipo: "sucesso", texto: "Pagamento criado com sucesso" });
        }
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
      if (tab === "vencimentos") {
        await api.delete(`/api/folha-salarial/vencimentos/${confirmDelete.id}`);
      } else {
        await api.delete(`/api/folha-salarial/pagamentos/${confirmDelete.id}`);
      }
      setMsg({ tipo: "sucesso", texto: "Registo eliminado com sucesso" });
      setConfirmDelete({ open: false, id: null, nome: "" });
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  const recalcularFaltas = async (id) => {
    setRecalculando(true);
    try {
      var data = await api.post(`/api/folha-salarial/pagamentos/${id}/recalcular-faltas`);
      setMsg({ tipo: "sucesso", texto: "Desconto de faltas recalculado com sucesso" });
      if (viewItem && viewItem.id === id) {
        setViewItem(data.dados);
      }
      carregar(paginacao.pagina);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setRecalculando(false);
    }
  };

  const gerarPagamentosAutomaticos = async (e) => {
    e.preventDefault();
    setGerando(true);
    setMsg(null);
    try {
      const data = await api.post("/api/folha-salarial/pagamentos/gerar-automaticos", autogForm);
      setResultadoGerar(data.dados);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setGerando(false);
    }
  };

  const fecharGerar = () => {
    setGerarAuto(false);
    setResultadoGerar(null);
    setMsg(null);
    carregar(paginacao.pagina);
  };

  const baixarResumo = async (e) => {
    if (e) e.preventDefault();
    if (!resumoMes || !resumoAno) {
      setMsg({ tipo: "erro", texto: "Seleciona o mês e o ano do resumo antes de gerar o PDF." });
      return;
    }
    setBaixandoResumo(true);
    setMsg(null);
    try {
      await api.downloadPdf(`/api/pdf/resumo-pagamentos?mes=${resumoMes}&ano=${resumoAno}`, `resumo_pagamentos_${resumoMes}_${resumoAno}.pdf`);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setBaixandoResumo(false);
    }
  };

  const nomeColab = (item) => {
    if (item.colaborador) return item.colaborador.nome_completo || "";
    var c = colaboradores.find(c => String(c.id) === String(item.colaborador_id));
    return c ? c.nome_completo : "";
  };

  const numColab = (item) => {
    if (item.colaborador) return item.colaborador.numero_colaborador || "";
    var c = colaboradores.find(c => String(c.id) === String(item.colaborador_id));
    return c ? c.numero_colaborador : "";
  };

  const renderColabCell = (item) => (
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant/30 shadow-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[12px] font-bold text-primary">{helpers.getInitials(nomeColab(item))}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-on-surface">{nomeColab(item)}</span>
          <span className="text-[12px] text-on-surface-variant/70">{numColab(item)}</span>
        </div>
      </div>
    </td>
  );

  const renderBadgeEstado = (estado) => {
    var cls = "";
    if (tab === "vencimentos") {
      cls = estado === "Activo" ? "badge-success" : "badge-secondary";
    } else {
      if (estado === "Pago") cls = "badge-success";
      else if (estado === "Pendente") cls = "badge-warning";
      else cls = "badge-danger";
    }
    return (
      <span className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${cls}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
        {estado}
      </span>
    );
  };

  const renderPagination = () => (
    <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-wide">
        Exibindo {dados.length} de {paginacao.total} registos
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
  );

  const activeFilters = [];
  if (filtroEstado) activeFilters.push({ label: `Estado: ${filtroEstado}`, onClear: () => { setFiltroEstado(""); } });
  if (filtroColaborador) {
    var cn = colaboradores.find(c => String(c.id) === String(filtroColaborador));
    activeFilters.push({ label: `Colaborador: ${cn ? cn.nome_completo : filtroColaborador}`, onClear: () => setFiltroColaborador("") });
  }
  if (tab === "pagamentos") {
    if (filtroMes) activeFilters.push({ label: `Mês: ${MESES[parseInt(filtroMes) - 1] || filtroMes}`, onClear: () => setFiltroMes("") });
    if (filtroAno) activeFilters.push({ label: `Ano: ${filtroAno}`, onClear: () => setFiltroAno("") });
  }

  const limparFiltros = () => {
    setSearch("");
    setFiltroEstado("");
    setFiltroColaborador("");
    setFiltroMes("");
    setFiltroAno("");
  };

  const getColaboradorNome = (id) => {
    var c = colaboradores.find(c => String(c.id) === String(id));
    return c ? c.nome_completo : "";
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete.open}
        titulo="Eliminar Registo"
        mensagem={`Tem certeza que deseja eliminar o registo de ${confirmDelete.nome}? Esta ação não pode ser desfeita.`}
        textoConfirmar="Sim, Eliminar"
        textoCancelar="Cancelar"
        variante="perigo"
        onConfirm={eliminar}
        onCancel={() => setConfirmDelete({ open: false, id: null, nome: "" })}
      />

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 font-medium uppercase tracking-wide">
            <span>SGHR</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Financeiro</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary/70">Folha Salarial</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Gestão de Folha Salarial</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {tab === "pagamentos" && (
            <>
              <button onClick={() => { setResumoOpen(!resumoOpen); setResultadoGerar(null); }} className="flex items-center gap-2 px-4 py-2.5 bg-success/10 text-success text-[13px] font-semibold rounded-lg border border-success/20 hover:bg-success/20 transition-all active:scale-95">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                Resumo PDF
              </button>
              <button onClick={() => { setGerarAuto(true); setResultadoGerar(null); }} className="flex items-center gap-2 px-4 py-2.5 bg-secondary/10 text-secondary text-[13px] font-semibold rounded-lg border border-secondary/20 hover:bg-secondary/20 transition-all active:scale-95">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                Gerar Automático
              </button>
            </>
          )}
          <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            {tab === "vencimentos" ? "Novo Vencimento" : "Novo Pagamento"}
          </button>
        </div>
      </section>

      {resumoOpen && (
        <section className="glass-panel rounded-xl border border-outline-variant/30 p-5 flex flex-col md:flex-row md:items-end gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Mês do resumo</label>
            <select value={resumoMes} onChange={(e) => setResumoMes(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
              {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Ano do resumo</label>
            <input type="number" min="2000" value={resumoAno} onChange={(e) => setResumoAno(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="flex items-end pb-0.5">
            <button onClick={baixarResumo} disabled={baixandoResumo} className="flex items-center gap-2 px-4 py-2.5 bg-success/10 text-success text-[13px] font-semibold rounded-lg border border-success/20 hover:bg-success/20 disabled:opacity-50 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[18px]">download</span>
              {baixandoResumo ? "A gerar..." : "Baixar Resumo"}
            </button>
          </div>
          <p className="text-[11px] text-on-surface-variant/60 md:flex-1 md:pb-2">O resumo é gerado para o mês e ano escolhidos. Se ainda não processaste a folha desse período, verás a razão.</p>
        </section>
      )}

      <section className="glass-panel rounded-xl border border-outline-variant/30 overflow-hidden">
        <div className="flex border-b border-outline-variant/20">
          <button onClick={() => { setTab("vencimentos"); setSearch(""); setFiltroEstado(""); setFiltroColaborador(""); setFiltroMes(""); setFiltroAno(""); }} className={`flex items-center gap-2 px-6 py-3.5 text-[13px] font-semibold transition-all ${tab === "vencimentos" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"}`}>
            <span className="material-symbols-outlined text-[18px]">payments</span>
            Vencimentos
          </button>
          <button onClick={() => { setTab("pagamentos"); setSearch(""); setFiltroEstado(""); setFiltroColaborador(""); setFiltroMes(""); setFiltroAno(""); }} className={`flex items-center gap-2 px-6 py-3.5 text-[13px] font-semibold transition-all ${tab === "pagamentos" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"}`}>
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            Pagamentos
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
            <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Buscar</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Nome do colaborador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregar(1)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[14px]"
              />
            </div>
          </div>
          <div className={`grid gap-3 w-full lg:w-auto ${tab === "pagamentos" ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-3"}`}>
            {tab === "pagamentos" && (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Mês</label>
                  <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                    <option value="">Todos</option>
                    {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Ano</label>
                  <input type="number" placeholder="2024" value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Estado</label>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {tab === "vencimentos" ? (
                  <>
                    <option value="Activo">Ativo</option>
                    <option value="Inactivo">Inativo</option>
                  </>
                ) : (
                  <>
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                    <option value="Cancelado">Cancelado</option>
                  </>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1">Colaborador</label>
              <select value={filtroColaborador} onChange={(e) => setFiltroColaborador(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20">
                <option value="">Todos</option>
                {colaboradores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <button onClick={() => carregar(1)} className="w-full px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                Filtrar
              </button>
            </div>
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-on-surface-variant/60 font-medium mr-1">Filtros ativos:</span>
            {activeFilters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-bold uppercase">
                {f.label}
                <button onClick={f.onClear} className="hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
              </span>
            ))}
            <button onClick={limparFiltros} className="text-[11px] font-bold text-primary hover:underline ml-2 uppercase tracking-wide">Limpar Tudo</button>
          </div>
        )}
      </section>

      {tab === "vencimentos" && (
        <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse data-grid-tight">
              <thead>
                <tr className="bg-background/50 border-b border-outline-variant/20">
                  <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider w-[280px]">Colaborador</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Salário Base</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Subsídios</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Total Bruto</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Descontos</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Total Líquido</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}><td colSpan={8} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                  ))
                ) : dados.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">payments</span>
                    <p className="text-on-surface-variant font-medium">Nenhum vencimento encontrado</p>
                    <p className="text-[13px] text-outline mt-1">Clique em "Novo Vencimento" para adicionar</p>
                  </td></tr>
                ) : (
                  dados.map((item) => (
                    <tr key={item.id} className="hover:bg-primary/[0.02] transition-colors group">
                      {renderColabCell(item)}
                      <td className="px-4 py-4">
                        <span className="text-on-surface font-medium">{helpers.formatCurrency(item.salario_base)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col text-[12px] text-on-surface-variant">
                          <span>Alim: {helpers.formatCurrency(item.subsidio_alimentacao)}</span>
                          <span>Trans: {helpers.formatCurrency(item.subsidio_transporte)}</span>
                          <span>Educ: {helpers.formatCurrency(item.subsidio_educacao)}</span>
                          {(parseFloat(item.outros_subsidios) || 0) > 0 && <span>Outros: {helpers.formatCurrency(item.outros_subsidios)}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface font-bold">{helpers.formatCurrency(item.total_bruto)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col text-[12px] text-on-surface-variant">
                          <span>IRT: {helpers.formatCurrency(item.desconto_irt)}</span>
                          <span>SS: {helpers.formatCurrency(item.desconto_seguranca_social)}</span>
                          {(parseFloat(item.outros_descontos) || 0) > 0 && <span>Outros: {helpers.formatCurrency(item.outros_descontos)}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface font-bold text-success">{helpers.formatCurrency(item.total_liquido)}</span>
                      </td>
                      <td className="px-4 py-4">
                        {renderBadgeEstado(item.estado)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button onClick={() => abrirVer(item)} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                          </button>
                          <button onClick={() => abrirEditar(item)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button onClick={() => setConfirmDelete({ open: true, id: item.id, nome: nomeColab(item) })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
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
          {renderPagination()}
        </section>
      )}

      {tab === "pagamentos" && (
        <section className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse data-grid-tight">
              <thead>
                <tr className="bg-background/50 border-b border-outline-variant/20">
                  <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider w-[280px]">Colaborador</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Mês/Ano</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Salário Base</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Subsídios+Extras</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">IRT + SS + Faltas</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Total Líquido</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider">Data Pagamento</th>
                  <th className="px-6 py-4 font-bold text-on-surface-variant/70 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}><td colSpan={9} className="px-6 py-4"><div className="animate-pulse h-10 bg-surface-container rounded-lg" /></td></tr>
                  ))
                ) : dados.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant/40 block mb-3">receipt_long</span>
                    <p className="text-on-surface-variant font-medium">Nenhum pagamento encontrado</p>
                    <p className="text-[13px] text-outline mt-1">Clique em "Novo Pagamento" para adicionar</p>
                  </td></tr>
                ) : (
                  dados.map((item) => (
                    <tr key={item.id} className="hover:bg-primary/[0.02] transition-colors group">
                      {renderColabCell(item)}
                      <td className="px-4 py-4">
                        <span className="text-on-surface font-medium">{MESES[parseInt(item.mes) - 1] || item.mes}/{item.ano}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface">{helpers.formatCurrency(item.salario_base)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col text-[12px] text-on-surface-variant">
                          <span>Subsídios: {helpers.formatCurrency(item.subsidios)}</span>
                          <span>Extras: {helpers.formatCurrency(item.horas_extras)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col text-[12px] text-on-surface-variant">
                          <span>IRT: {helpers.formatCurrency(item.irt)}</span>
                          <span>SS: {helpers.formatCurrency(item.seguranca_social)}</span>
                          {(parseFloat(item.desconto_faltas) || 0) > 0 && <span className="text-red-600 font-semibold">Faltas: -{helpers.formatCurrency(item.desconto_faltas)}</span>}
                          {(parseFloat(item.descontos) || 0) > 0 && <span className="text-red-600 font-semibold">Outros: -{helpers.formatCurrency(item.descontos)}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface font-bold text-success">{helpers.formatCurrency(item.total_liquido)}</span>
                      </td>
                      <td className="px-4 py-4">
                        {renderBadgeEstado(item.estado)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-on-surface-variant">{item.data_pagamento ? helpers.formatDate(item.data_pagamento) : "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button onClick={() => api.downloadPdf("/api/pdf/folha-salarial/" + item.id, "recibo_" + numColab(item) + ".pdf")} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Baixar PDF">
                            <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                          </button>
                          <button onClick={() => abrirVer(item)} className="p-[3px] text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-all" title="Ver">
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                          </button>
                          <button onClick={() => abrirEditar(item)} className="p-[3px] text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button onClick={() => setConfirmDelete({ open: true, id: item.id, nome: nomeColab(item) })} className="p-[3px] text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all" title="Eliminar">
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
          {renderPagination()}
        </section>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">
                {editando ? (tab === "vencimentos" ? "Editar Vencimento" : "Editar Pagamento") : (tab === "vencimentos" ? "Novo Vencimento" : "Novo Pagamento")}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={guardar} className="p-6">
              {tab === "vencimentos" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador *</label>
                    <select name="colaborador_id" value={form.colaborador_id || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                      <option value="">Selecionar colaborador</option>
                      {colaboradores.map(c => (
                        <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Salário Base (AOA) *</label>
                    <input type="number" step="0.01" name="salario_base" value={form.salario_base || ""} onChange={handleInput} required placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 mb-2 mt-1">
                      <span className="material-symbols-outlined text-[16px] text-success">trending_up</span>
                      <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Subsídios</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Subsídio Alimentação</label>
                    <input type="number" step="0.01" name="subsidio_alimentacao" value={form.subsidio_alimentacao || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Subsídio Transporte</label>
                    <input type="number" step="0.01" name="subsidio_transporte" value={form.subsidio_transporte || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Subsídio Educação</label>
                    <input type="number" step="0.01" name="subsidio_educacao" value={form.subsidio_educacao || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Outros Subsídios</label>
                    <input type="number" step="0.01" name="outros_subsidios" value={form.outros_subsidios || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>

                  <div className="sm:col-span-2 bg-success/5 border border-success/10 rounded-lg p-3 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-success uppercase tracking-wider">Total Bruto</span>
                      <span className="text-[16px] font-bold text-success">{helpers.formatCurrency(calcularTotalBrutoVenc(form))}</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 mb-2 mt-1">
                      <span className="material-symbols-outlined text-[16px] text-error">trending_down</span>
                      <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Descontos</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Desconto IRT</label>
                    <input type="number" step="0.01" name="desconto_irt" value={form.desconto_irt || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Desconto Seg. Social</label>
                    <input type="number" step="0.01" name="desconto_seguranca_social" value={form.desconto_seguranca_social || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Outros Descontos</label>
                    <input type="number" step="0.01" name="outros_descontos" value={form.outros_descontos || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>

                  <div className="sm:col-span-2 bg-error/5 border border-error/10 rounded-lg p-3 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-error uppercase tracking-wider">Total Líquido</span>
                      <span className={`text-[16px] font-bold ${calcularTotalLiquidoVenc(form) >= 0 ? "text-success" : "text-error"}`}>{helpers.formatCurrency(calcularTotalLiquidoVenc(form))}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data de Início *</label>
                    <input type="date" name="data_inicio" value={form.data_inicio || ""} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data Fim</label>
                    <input type="date" name="data_fim" value={form.data_fim || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado</label>
                    <select name="estado" value={form.estado || "Activo"} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                      <option value="Activo">Ativo</option>
                      <option value="Inactivo">Inativo</option>
                    </select>
                  </div>
                </div>
              )}

              {tab === "pagamentos" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Colaborador *</label>
                    <select name="colaborador_id" value={form.colaborador_id || ""} onChange={handleColaboradorChange} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                      <option value="">Selecionar colaborador</option>
                      {colaboradores.map(c => (
                        <option key={c.id} value={c.id}>{c.nome_completo} ({c.numero_colaborador})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Mês *</label>
                    <select name="mes" value={form.mes || ""} onChange={handleMesAnoChange} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                      <option value="">Selecionar mês</option>
                      {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Ano *</label>
                    <input type="number" name="ano" value={form.ano || ""} onChange={handleMesAnoChange} required placeholder="2024" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Salário Base (AOA) *</label>
                    <input type="number" step="0.01" name="salario_base" value={form.salario_base || ""} onChange={handleInput} required placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Subsídios</label>
                    <input type="number" step="0.01" name="subsidios" value={form.subsidios || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Horas Extras</label>
                    <input type="number" step="0.01" name="horas_extras" value={form.horas_extras || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Outros Descontos</label>
                    <input type="number" step="0.01" name="descontos" value={form.descontos || ""} onChange={handleInput} placeholder="0.00" className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">IRT (auto)</label>
                    <input type="number" step="0.01" name="irt" value={form.irt || ""} onChange={handleInput} placeholder="0.00" readOnly className="w-full px-3 py-2.5 bg-surface-variant/30 border border-outline-variant/50 rounded-lg text-[14px] text-on-surface-variant/60 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Segurança Social (auto)</label>
                    <input type="number" step="0.01" name="seguranca_social" value={form.seguranca_social || ""} onChange={handleInput} placeholder="0.00" readOnly className="w-full px-3 py-2.5 bg-surface-variant/30 border border-outline-variant/50 rounded-lg text-[14px] text-on-surface-variant/60 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Desconto Faltas</label>
                    <input type="number" step="0.01" name="desconto_faltas" value={form.desconto_faltas || ""} onChange={handleInput} placeholder="Calculado automaticamente" readOnly className="w-full px-3 py-2.5 bg-surface-variant/30 border border-outline-variant/50 rounded-lg text-[14px] text-on-surface-variant/60 cursor-not-allowed" />
                  </div>

                  <div className="sm:col-span-2 bg-success/5 border border-success/10 rounded-lg p-3 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-success uppercase tracking-wider">Total Líquido</span>
                      <span className={`text-[16px] font-bold ${calcularTotalLiquidoPag(form) >= 0 ? "text-success" : "text-error"}`}>{helpers.formatCurrency(calcularTotalLiquidoPag(form))}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Data Pagamento</label>
                    <input type="date" name="data_pagamento" value={form.data_pagamento || ""} onChange={handleInput} className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Estado *</label>
                    <select name="estado" value={form.estado || "Pendente"} onChange={handleInput} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-outline-variant/20">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
                  {saving ? "A guardar..." : editando ? "Atualizar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {gerarAuto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setGerarAuto(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Gerar Pagamentos Automáticos</h3>
              <button onClick={() => setGerarAuto(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={gerarPagamentosAutomaticos} className="p-6 space-y-4">
              {!resultadoGerar ? (
                <>
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px] text-primary mt-0.5">bolt</span>
                    <p className="text-[13px] text-on-surface-variant leading-relaxed">
                      Serão gerados pagamentos <strong>Pendentes</strong> para todos os colaboradores ativos no mês/ano indicado, com salário base, subsídios, IRT e Segurança Social calculados automaticamente a partir do contrato ativo.
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Mês *</label>
                    <select value={autogForm.mes} onChange={(e) => setAutogForm(prev => ({ ...prev, mes: e.target.value }))} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20">
                      {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant/70 uppercase px-1 block mb-1">Ano *</label>
                    <input type="number" min="2000" max="2100" value={autogForm.ano} onChange={(e) => setAutogForm(prev => ({ ...prev, ano: e.target.value }))} required className="w-full px-3 py-2.5 bg-background border border-outline-variant/50 rounded-lg text-[14px] focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-outline-variant/20">
                    <button type="button" onClick={() => setGerarAuto(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-black/5 transition-colors">Cancelar</button>
                    <button type="submit" disabled={gerando} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                      <span className="material-symbols-outlined text-[18px]">{gerando ? "hourglass_empty" : "bolt"}</span>
                      {gerando ? "A gerar..." : "Gerar Pagamentos"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-success/5 border border-success/10 rounded-lg p-4 text-center">
                    <span className="material-symbols-outlined text-[40px] text-success block mb-2">check_circle</span>
                    <h4 className="text-[16px] font-bold text-on-surface">Pagamentos processados</h4>
                    <p className="text-[13px] text-on-surface-variant mt-1">{MESES[parseInt(autogForm.mes) - 1]}/{autogForm.ano}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20 text-center">
                      <p className="text-[20px] font-bold text-success">{resultadoGerar.criados}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mt-1">Criados</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20 text-center">
                      <p className="text-[20px] font-bold text-warning">{resultadoGerar.ignorados}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mt-1">Já existentes</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20 text-center">
                      <p className="text-[20px] font-bold text-error">{resultadoGerar.erros}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mt-1">Erros</p>
                    </div>
                  </div>
                  {resultadoGerar.erros_detalhe && resultadoGerar.erros_detalhe.length > 0 && (
                    <div className="bg-error/5 border border-error/10 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-[11px] font-bold text-error uppercase tracking-wider mb-2">Sem contrato ativo:</p>
                      <ul className="space-y-1">
                        {resultadoGerar.erros_detalhe.map((e, i) => (
                          <li key={i} className="text-[12px] text-on-surface-variant flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-error">info</span>
                            {getColaboradorNome(e.colaborador_id) || "Colaborador"}: {e.motivo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-outline-variant/20">
                    <button onClick={fecharGerar} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                      <span className="material-symbols-outlined text-[18px]">done</span>
                      Concluir
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {showViewModal && viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-scrim/40" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="sticky top-0 bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 rounded-t-xl flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">
                {tab === "vencimentos" ? "Detalhes do Vencimento" : "Detalhes do Pagamento"}
              </h3>
              <div className="flex items-center gap-2">
                {tab === "pagamentos" && (
                  <button onClick={() => api.downloadPdf("/api/pdf/folha-salarial/" + viewItem.id, "recibo_" + numColab(viewItem) + ".pdf")} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-success/10 text-success text-[12px] font-semibold hover:bg-success/20 transition-all border border-success/10">
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    PDF
                  </button>
                )}
                <button onClick={() => { setShowViewModal(false); abrirEditar(viewItem); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-all border border-primary/10">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Editar
                </button>
                <button onClick={() => setShowViewModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-outline-variant/30 shadow-md bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary">{helpers.getInitials(nomeColab(viewItem))}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">{nomeColab(viewItem)}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[13px] text-on-surface-variant/70">{numColab(viewItem)}</span>
                    {renderBadgeEstado(viewItem.estado)}
                  </div>
                </div>
              </div>

              {tab === "vencimentos" && (
                <>
                  <div>
                    <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-success">trending_up</span>
                      Vencimentos
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        ["Salário Base", helpers.formatCurrency(viewItem.salario_base)],
                        ["Sub. Alimentação", helpers.formatCurrency(viewItem.subsidio_alimentacao)],
                        ["Sub. Transporte", helpers.formatCurrency(viewItem.subsidio_transporte)],
                        ["Sub. Educação", helpers.formatCurrency(viewItem.subsidio_educacao)],
                        ["Outros Subsídios", helpers.formatCurrency(viewItem.outros_subsidios)],
                        ["Total Bruto", helpers.formatCurrency(viewItem.total_bruto)],
                      ].map(function(pair) {
                        return (
                          <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                            <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                            <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-error">trending_down</span>
                      Descontos
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        ["Desconto IRT", helpers.formatCurrency(viewItem.desconto_irt)],
                        ["Desconto Seg. Social", helpers.formatCurrency(viewItem.desconto_seguranca_social)],
                        ["Outros Descontos", helpers.formatCurrency(viewItem.outros_descontos)],
                      ].map(function(pair) {
                        return (
                          <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                            <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                            <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Total Líquido</span>
                      <span className="text-[20px] font-bold text-primary">{helpers.formatCurrency(viewItem.total_liquido)}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
                      Período
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Data de Início</p>
                        <p className="text-[13px] font-semibold text-on-surface">{viewItem.data_inicio ? helpers.formatDate(viewItem.data_inicio) : "—"}</p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Data Fim</p>
                        <p className="text-[13px] font-semibold text-on-surface">{viewItem.data_fim ? helpers.formatDate(viewItem.data_fim) : "—"}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === "pagamentos" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Período</p>
                      <p className="text-[14px] font-bold text-on-surface">{MESES[parseInt(viewItem.mes) - 1] || viewItem.mes}/{viewItem.ano}</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">Data Pagamento</p>
                      <p className="text-[14px] font-bold text-on-surface">{viewItem.data_pagamento ? helpers.formatDate(viewItem.data_pagamento) : "—"}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-success">trending_up</span>
                      Vencimentos
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        ["Salário Base", helpers.formatCurrency(viewItem.salario_base)],
                        ["Subsídios", helpers.formatCurrency(viewItem.subsidios)],
                        ["Horas Extras", helpers.formatCurrency(viewItem.horas_extras)],
                      ].map(function(pair) {
                        return (
                          <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                            <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                            <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-error">trending_down</span>
                      Descontos
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        ["IRT", helpers.formatCurrency(viewItem.irt)],
                        ["Segurança Social", helpers.formatCurrency(viewItem.seguranca_social)],
                        ["Desconto Faltas", helpers.formatCurrency(viewItem.desconto_faltas)],
                        ["Outros Descontos", helpers.formatCurrency(viewItem.descontos)],
                      ].map(function(pair) {
                        return (
                          <div key={pair[0]} className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                            <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-0.5">{pair[0]}</p>
                            <p className="text-[13px] font-semibold text-on-surface">{pair[1] || "—"}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Total Líquido</span>
                      <span className="text-[20px] font-bold text-primary">{helpers.formatCurrency(viewItem.total_liquido)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => recalcularFaltas(viewItem.id)} disabled={recalculando} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-[12px] font-semibold hover:bg-amber-100 transition-all border border-amber-200 disabled:opacity-50">
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      {recalculando ? "A recalcular..." : "Recalcular Desconto Faltas"}
                    </button>
                  </div>

                  {viewItem.recibo && (
                    <div className="bg-background/50 rounded-lg p-3 border border-outline-variant/20">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1">Recibo</p>
                      <a href={viewItem.recibo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        Ver Recibo
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}