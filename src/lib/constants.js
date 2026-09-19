export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-nexushr.onrender.com";

export const NAV_ITEMS = [
  {
    titulo: "Principal",
    items: [
      { label: "Painel", href: "/dashboard", icon: "dashboard", modulo: null },
      { label: "Portal", href: "/dashboard/portal", icon: "person", modulo: "portal" },
      { label: "Comunicados", href: "/dashboard/comunicados", icon: "campaign", modulo: null },
    ],
  },
  {
    titulo: "Gestão de Pessoas",
    items: [
      { label: "Colaboradores", href: "/dashboard/colaboradores", icon: "group", modulo: "colaboradores" },
      { label: "Contratos", href: "/dashboard/contratos", icon: "description", modulo: "contratos" },
      { label: "Departamentos", href: "/dashboard/departamentos", icon: "apartment", modulo: "departamentos" },
      { label: "Advertências", href: "/dashboard/advertencias", icon: "warning", modulo: "advertencias" },
    ],
  },
  {
    titulo: "Tempo e Presença",
    items: [
      { label: "Assiduidade", href: "/dashboard/assiduidade", icon: "schedule", modulo: "assiduidade" },
      { label: "Faltas e Atrasos", href: "/dashboard/faltas", icon: "event_busy", modulo: "faltas" },
      { label: "Férias", href: "/dashboard/ferias", icon: "calendar_month", modulo: "ferias" },
      { label: "Pedidos", href: "/dashboard/pedidos", icon: "assignment", modulo: "pedidos" },
    ],
  },
  {
    titulo: "Desenvolvimento",
    items: [
      { label: "Avaliação", href: "/dashboard/avaliacao", icon: "star", modulo: "avaliacao" },
      { label: "Formação", href: "/dashboard/formacao", icon: "school", modulo: "formacao" },
    ],
  },
  {
    titulo: "Financeiro",
    items: [
      { label: "Folha Salarial", href: "/dashboard/folha-salarial", icon: "paid", modulo: "folha_salarial" },
    ],
  },
  {
    titulo: "Sistema",
    items: [
      { label: "Utilizadores", href: "/dashboard/utilizadores", icon: "manage_accounts", modulo: "utilizadores" },
      { label: "Relatórios", href: "/dashboard/relatorios", icon: "bar_chart", modulo: "relatorios" },
      { label: "Configurações", href: "/dashboard/configuracoes", icon: "settings", modulo: "configuracoes" },
    ],
  },
];

export const PERFIS = [
  "Administrador Geral",
  "Director Geral",
  "Director de Recursos Humanos",
  "Técnico de RH",
  "Director Pedagógico",
  "Coordenador de Formação",
  "Coordenador de Curso",
  "Formador",
  "Funcionário Administrativo",
  "Financeiro",
  "Contabilidade",
  "Auditor",
  "Colaborador",
];

export const TIPOS_CONTRATO = [
  { value: "Determinado", label: "Prazo Determinado" },
  { value: "Indeterminado", label: "Prazo Indeterminado" },
  { value: "Prestacao_Servicos", label: "Prestação de Serviços" },
  { value: "Estagio", label: "Estágio" },
  { value: "Temporario", label: "Temporário" },
];

export const ESTADOS_COLABORADOR = [
  { value: "Activo", label: "Activo" },
  { value: "Inactivo", label: "Inactivo" },
  { value: "Suspenso", label: "Suspenso" },
  { value: "Aposentado", label: "Aposentado" },
  { value: "Desligado", label: "Desligado" },
];

export const TIPOS_COLABORADOR = [
  { value: "Interno", label: "Colaborador Interno" },
  { value: "Externo", label: "Colaborador Externo" },
  { value: "Formador_Interno", label: "Formador Interno" },
  { value: "Formador_Externo", label: "Formador Externo" },
  { value: "Estagiario", label: "Estagiário" },
];

export const TIPOS_LICENCA = [
  { value: "Medica", label: "Licença Médica" },
  { value: "Maternidade", label: "Licença de Maternidade" },
  { value: "Paternidade", label: "Licença de Paternidade" },
  { value: "Casamento", label: "Licença de Casamento" },
  { value: "Falecimento", label: "Licença por Falecimento" },
  { value: "Formacao", label: "Licença de Formação" },
  { value: "Sem_Vencimento", label: "Licença sem Vencimento" },
  { value: "Outra", label: "Outra" },
];

export const GENEROS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
];

export const ESTADOS_CIVIS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União de Facto",
];
