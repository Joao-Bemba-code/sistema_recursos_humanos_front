"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/helpers";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Toolbar from "@/components/ui/Toolbar";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

var FILTROS_VAZIOS = { search: "", modulo: "", accao: "" };

var CAMPO =
  "w-full px-3 py-2 rounded-lg border border-outline-variant text-[13px] text-on-surface bg-surface-card focus:ring-1 focus:ring-primary/30 focus:border-primary/50";

// Rotulos legiveis para os valores que o backend envia. Para qualquer valor
// novo, rotulo() humaniza a string (tambem funciona com snake_case).
var ACAO_LABEL = {
  acesso: "Acesso",
  login: "Início de sessão",
  criar: "Criação",
  criado: "Criado",
  criacao: "Criação",
  registado: "Registado",
  editar: "Edição",
  editado: "Editado",
  actualizar: "Atualização",
  atualizar: "Atualização",
  actualizado: "Atualizado",
  atualizado: "Atualizado",
  alterado: "Alterado",
  validar: "Validação",
  validado: "Validado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  carregar: "Carregado",
  carregado: "Carregado",
  descarregar: "Descarregado",
  descarregado: "Descarregado",
  desconhecido: "Desconhecido",
  eliminar: "Eliminação",
  eliminado: "Eliminado",
  remover: "Remoção",
  removido: "Removido",
  cancelado: "Cancelado",
  concluido: "Concluído",
};

var ACAO_VARIANTE = {
  criar: "success",
  criado: "success",
  criacao: "success",
  registado: "success",
  validar: "success",
  validado: "success",
  aprovado: "success",
  concluido: "success",
  carregar: "info",
  carregado: "info",
  descarregar: "info",
  descarregado: "info",
  editar: "warning",
  editado: "warning",
  actualizar: "warning",
  atualizar: "warning",
  actualizado: "warning",
  atualizado: "warning",
  alterado: "warning",
  eliminar: "destructive",
  eliminado: "destructive",
  remover: "destructive",
  removido: "destructive",
  cancelado: "destructive",
  rejeitado: "destructive",
};

var MODULO_LABEL = {
  sistema: "Sistema",
  colaboradores: "Colaboradores",
  contratos: "Contratos",
  departamentos: "Departamentos",
  unidades: "Unidades",
  utilizadores: "Utilizadores",
  perfis: "Perfis",
  permissoes: "Permissões",
  assiduidade: "Assiduidade",
  banco_horas: "Banco de Horas",
  faltas: "Faltas e Atrasos",
  ferias: "Férias",
  pedidos: "Pedidos",
  escalas: "Escalas e Turnos",
  tarefas: "Tarefas",
  avaliacao: "Avaliação",
  formacao: "Formação",
  minhas_formacoes: "As Minhas Formações",
  mensagens: "Mensagens",
  comunicados: "Comunicados",
  documentos: "Documentos",
  folha_salarial: "Folha Salarial",
  creditos: "Créditos",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
  advertencias: "Advertências",
  processos_disciplinares: "Processos Disciplinares",
  atividades: "Atividades",
};

function rotulo(valor, mapa) {
  if (!valor) return "—";
  var chave = String(valor);
  if (mapa && mapa[chave]) return mapa[chave];
  return chave
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

export default function AtividadesPage() {
  var auth = useAuth();
  var toast = useToast();
  // addToast e estavel (useCallback no provider); depender do objecto toast
  // faria o efeito de carregamento repetir-se sempre que um toast aparece.
  var addToast = toast && toast.addToast ? toast.addToast : null;

  // O backend ja limita os dados: colaborador ve so os seus, RH/admin ve todos.
  // Aqui so adaptamos o texto da pagina ao ambito visivel.
  var podeVerTodos = !!(
    auth &&
    ((typeof auth.isAdmin === "function" && auth.isAdmin()) ||
      (typeof auth.hasPermission === "function" &&
        (auth.hasPermission("atividades", "read") || auth.hasPermission("colaboradores", "read"))))
  );

  var [atividades, setAtividades] = useState([]);
  var [total, setTotal] = useState(null);
  var [loading, setLoading] = useState(true);
  var [erro, setErro] = useState("");
  var [filtros, setFiltros] = useState(FILTROS_VAZIOS);

  var carregar = useCallback(async function () {
    setLoading(true);
    setErro("");
    try {
      var data = await api.get("/api/atividades?limit=50");
      setAtividades((data && Array.isArray(data.dados)) ? data.dados : []);
      setTotal(data && typeof data.total === "number" ? data.total : null);
    } catch (e) {
      var mensagem = e.message || "Não foi possível carregar as atividades";
      setErro(mensagem);
      setAtividades([]);
      setTotal(null);
      if (addToast) addToast("error", mensagem);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(function () {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  // Opcoes dos selects derivadas exclusivamente dos dados carregados.
  var opcoesModulo = useMemo(function () {
    var vistos = {};
    var lista = [];
    atividades.forEach(function (a) {
      var valor = a && a.modulo ? String(a.modulo) : "";
      if (!valor || vistos[valor]) return;
      vistos[valor] = true;
      lista.push({ value: valor, label: rotulo(valor, MODULO_LABEL) });
    });
    lista.sort(function (x, y) { return x.label.localeCompare(y.label, "pt"); });
    return lista;
  }, [atividades]);

  var opcoesAccao = useMemo(function () {
    var vistos = {};
    var lista = [];
    atividades.forEach(function (a) {
      var valor = a && a.accao ? String(a.accao) : "";
      if (!valor || vistos[valor]) return;
      vistos[valor] = true;
      lista.push({ value: valor, label: rotulo(valor, ACAO_LABEL) });
    });
    lista.sort(function (x, y) { return x.label.localeCompare(y.label, "pt"); });
    return lista;
  }, [atividades]);

  var visiveis = useMemo(function () {
    var termo = (filtros.search || "").trim().toLowerCase();
    return atividades.filter(function (a) {
      if (filtros.modulo && String(a.modulo || "") !== filtros.modulo) return false;
      if (filtros.accao && String(a.accao || "") !== filtros.accao) return false;
      if (!termo) return true;
      var texto = ((a.descricao || "") + " " + (a.accao || "")).toLowerCase();
      return texto.indexOf(termo) !== -1;
    });
  }, [atividades, filtros]);

  var alterarFiltro = function (campo, valor) {
    setFiltros(function (actual) { return Object.assign({}, actual, { [campo]: valor }); });
  };

  var temFiltros = !!(filtros.search || filtros.modulo || filtros.accao);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Atividades"
        subtitulo={podeVerTodos
          ? "Acompanhe a atividade recente de toda a organização."
          : "Acompanhe o registo das suas atividades recentes."}
        breadcrumb={[{ label: "Principal" }, { label: "Atividades" }]}
        acoes={
          <Button onClick={carregar} disabled={loading} variant="outline" size="sm">
            <span className="material-symbols-outlined text-[18px]">{loading ? "hourglass_top" : "refresh"}</span>
            {loading ? "A atualizar..." : "Atualizar"}
          </Button>
        }
      />

      <Toolbar resultados={visiveis.length} resultadosLabel="atividades">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] font-medium text-on-surface-variant block mb-1">Pesquisar</label>
          <input
            type="text"
            value={filtros.search}
            onChange={function (e) { alterarFiltro("search", e.target.value); }}
            placeholder="Descrição ou ação..."
            className={CAMPO}
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="text-[11px] font-medium text-on-surface-variant block mb-1">Módulo</label>
          <select
            value={filtros.modulo}
            onChange={function (e) { alterarFiltro("modulo", e.target.value); }}
            className={CAMPO}
          >
            <option value="">Todos os módulos</option>
            {opcoesModulo.map(function (op) {
              return <option key={op.value} value={op.value}>{op.label}</option>;
            })}
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label className="text-[11px] font-medium text-on-surface-variant block mb-1">Ação</label>
          <select
            value={filtros.accao}
            onChange={function (e) { alterarFiltro("accao", e.target.value); }}
            className={CAMPO}
          >
            <option value="">Todas as ações</option>
            {opcoesAccao.map(function (op) {
              return <option key={op.value} value={op.value}>{op.label}</option>;
            })}
          </select>
        </div>
        {temFiltros && (
          <button
            type="button"
            onClick={function () { setFiltros(FILTROS_VAZIOS); }}
            className="px-3 py-2 text-[12px] font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </Toolbar>

      <section className="bg-surface-card border border-outline-variant rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-on-surface">
            Feed de atividades
            <span className="ml-2 text-[12px] font-normal text-outline">
              ({visiveis.length}{total !== null ? " de " + total : ""})
            </span>
          </h2>
          <span className="hidden sm:inline text-[11px] text-outline">Eventos mais recentes</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : erro ? (
          <div className="m-4 p-4 rounded-lg bg-error/10 border border-error/20 text-error flex flex-wrap items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span className="text-[13px] font-medium flex-1">{erro}</span>
            <Button onClick={carregar} variant="outline" size="sm">Tentar novamente</Button>
          </div>
        ) : atividades.length === 0 ? (
          <EmptyState
            icon="history"
            title="Sem atividades"
            description="Ainda não existem eventos registados para mostrar."
          />
        ) : visiveis.length === 0 ? (
          <EmptyState
            icon="search"
            title="Nenhuma atividade encontrada"
            description="Ajuste ou limpe os filtros para ver mais resultados."
            action={
              <button
                type="button"
                onClick={function () { setFiltros(FILTROS_VAZIOS); }}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Limpar filtros
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-outline-variant/30">
            {visiveis.map(function (a, i) {
              return (
                <li key={a.id || "atividade-" + i} className="p-4 hover:bg-surface-container/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">history</span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={ACAO_VARIANTE[a.accao] || "secondary"}>
                          {rotulo(a.accao, ACAO_LABEL)}
                        </Badge>
                        <span className="text-[11px] font-semibold text-on-surface-variant">
                          {rotulo(a.modulo, MODULO_LABEL)}
                        </span>
                        {a.entidade && (
                          <span className="text-[11px] text-outline">· {a.entidade}</span>
                        )}
                        <span className="text-[11px] text-outline sm:ml-auto">
                          {formatDateTime(a.createdAt)}
                        </span>
                      </div>
                      {a.descricao && (
                        <p className="text-[13px] text-on-surface leading-snug">{a.descricao}</p>
                      )}
                      <p className="text-[11px] text-on-surface-variant/70 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        {a.utilizador_nome || "Utilizador do sistema"}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
