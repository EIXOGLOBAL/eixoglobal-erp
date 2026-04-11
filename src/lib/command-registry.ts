import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Users,
  Truck,
  FolderKanban,
  FileText,
  ClipboardList,
  Calculator,
  Wrench,
  CalendarClock,
  FolderOpen,
  DollarSign,
  Receipt,
  ShoppingCart,
  Package,
  FileSpreadsheet,
  PieChart,
  UserCheck,
  Clock,
  GraduationCap,
  CheckCircle,
  Shield,
  UserCog,
  Settings,
  Brain,
  Activity,
  UserPlus,
  FilePlus,
  Plus,
  LogOut,
  User,
  BarChart3,
  CheckSquare,
  Bell,
  Megaphone,
  MapPin,
  CalendarDays,
  Ruler,
  BookOpen,
  HardHat,
  KeyRound,
  Handshake,
  Building2,
  Banknote,
  TrendingUp,
  Layers,
  ArrowLeftRight,
  AlertCircle,
  ClipboardCheck,
  GitBranch,
  LayoutList,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandCategory = "navegacao" | "acoes_rapidas" | "admin" | "sistema"

export interface CommandItem {
  id: string
  title: string
  description: string
  icon: LucideIcon
  category: CommandCategory
  action: string // "navigate:/path" or "action:name"
  keywords: string[]
  adminOnly?: boolean
}

// ---------------------------------------------------------------------------
// Category labels (PT-BR)
// ---------------------------------------------------------------------------

export const COMMAND_CATEGORY_LABELS: Record<CommandCategory, string> = {
  navegacao: "Navegação",
  acoes_rapidas: "Ações Rápidas",
  admin: "Admin",
  sistema: "Sistema",
}

// ---------------------------------------------------------------------------
// Navigation commands — all sidebar pages
// ---------------------------------------------------------------------------

const navigationCommands: CommandItem[] = [
  // Top-level
  { id: "nav-dashboard", title: "Dashboard", description: "Painel principal", icon: LayoutDashboard, category: "navegacao", action: "navigate:/dashboard", keywords: ["inicio", "home", "painel"] },
  { id: "nav-relatorios", title: "Relatórios", description: "Relatórios e análises", icon: BarChart3, category: "navegacao", action: "navigate:/relatorios", keywords: ["relatorio", "analise", "grafico"] },
  { id: "nav-tarefas", title: "Tarefas", description: "Gestão de tarefas", icon: CheckSquare, category: "navegacao", action: "navigate:/tarefas", keywords: ["tarefa", "todo", "atividade"] },
  { id: "nav-notificacoes", title: "Notificações", description: "Central de notificações", icon: Bell, category: "navegacao", action: "navigate:/notificacoes", keywords: ["notificacao", "alerta", "aviso"] },
  { id: "nav-comunicados", title: "Comunicados", description: "Comunicados gerais", icon: Megaphone, category: "navegacao", action: "navigate:/comunicados", keywords: ["comunicado", "anuncio", "mural"] },

  // Administração
  { id: "nav-financeiro", title: "Financeiro", description: "Gestão financeira", icon: DollarSign, category: "navegacao", action: "navigate:/financeiro", keywords: ["financeiro", "dinheiro", "caixa", "receita", "despesa"] },
  { id: "nav-fluxo-caixa", title: "Fluxo de Caixa", description: "Controle de fluxo de caixa", icon: TrendingUp, category: "navegacao", action: "navigate:/financeiro/fluxo-de-caixa", keywords: ["fluxo", "caixa", "entrada", "saida"] },
  { id: "nav-dre", title: "DRE", description: "Demonstrativo de resultados", icon: BarChart3, category: "navegacao", action: "navigate:/financeiro/dre", keywords: ["dre", "demonstrativo", "resultado"] },
  { id: "nav-faturamento", title: "Faturamento", description: "Controle de faturamento", icon: FileText, category: "navegacao", action: "navigate:/financeiro/faturamento", keywords: ["faturamento", "fatura", "nota"] },
  { id: "nav-recebiveis", title: "Recebíveis", description: "Contas a receber", icon: DollarSign, category: "navegacao", action: "navigate:/financeiro/recebiveis", keywords: ["recebivel", "receber", "cobranca"] },
  { id: "nav-despesas", title: "Despesas", description: "Controle de despesas", icon: Banknote, category: "navegacao", action: "navigate:/financeiro/despesas", keywords: ["despesa", "gasto", "custo"] },
  { id: "nav-notas-fiscais", title: "Documentos Fiscais", description: "Notas fiscais", icon: Receipt, category: "navegacao", action: "navigate:/financeiro/notas", keywords: ["nota", "fiscal", "nf", "nfe"] },
  { id: "nav-centros-custo", title: "Centros de Custo", description: "Gestão de centros de custo", icon: Layers, category: "navegacao", action: "navigate:/financeiro/centros-de-custo", keywords: ["centro", "custo", "departamento"] },
  { id: "nav-conciliacao", title: "Conciliação", description: "Conciliação bancária", icon: ArrowLeftRight, category: "navegacao", action: "navigate:/financeiro/conciliacao", keywords: ["conciliacao", "banco", "extrato"] },
  { id: "nav-inadimplencia", title: "Inadimplência", description: "Controle de inadimplência", icon: AlertCircle, category: "navegacao", action: "navigate:/financeiro/inadimplencia", keywords: ["inadimplencia", "atraso", "devedor"] },

  { id: "nav-dep-pessoal", title: "Dep. Pessoal", description: "Departamento pessoal", icon: ClipboardCheck, category: "navegacao", action: "navigate:/dep-pessoal", keywords: ["departamento", "pessoal", "dp"] },
  { id: "nav-funcionarios", title: "Funcionários", description: "Cadastro de funcionários", icon: Users, category: "navegacao", action: "navigate:/rh/funcionarios", keywords: ["funcionario", "colaborador", "empregado"] },
  { id: "nav-folha", title: "Folha de Pagamento", description: "Folha de pagamento", icon: Banknote, category: "navegacao", action: "navigate:/rh/folha", keywords: ["folha", "pagamento", "salario"] },
  { id: "nav-ferias", title: "Férias & Afastamentos", description: "Controle de férias", icon: ClipboardCheck, category: "navegacao", action: "navigate:/dep-pessoal/ferias", keywords: ["ferias", "afastamento", "licenca"] },

  { id: "nav-rh", title: "RH", description: "Recursos humanos", icon: GraduationCap, category: "navegacao", action: "navigate:/rh", keywords: ["rh", "recursos", "humanos"] },
  { id: "nav-treinamentos", title: "Treinamentos", description: "Gestão de treinamentos", icon: GraduationCap, category: "navegacao", action: "navigate:/rh/treinamentos", keywords: ["treinamento", "capacitacao", "curso"] },
  { id: "nav-alocacoes", title: "Alocações", description: "Alocação de pessoal", icon: UserCog, category: "navegacao", action: "navigate:/rh/alocacoes", keywords: ["alocacao", "distribuicao", "equipe"] },
  { id: "nav-organograma", title: "Organograma", description: "Organograma da empresa", icon: GitBranch, category: "navegacao", action: "navigate:/rh/organograma", keywords: ["organograma", "hierarquia", "estrutura"] },
  { id: "nav-tabela-salarial", title: "Tabela Salarial", description: "Tabela de salários", icon: LayoutList, category: "navegacao", action: "navigate:/rh/tabela-salarial", keywords: ["salario", "tabela", "remuneracao"] },

  { id: "nav-ponto", title: "Controle de Ponto", description: "Registro de ponto", icon: Clock, category: "navegacao", action: "navigate:/ponto", keywords: ["ponto", "horario", "frequencia", "jornada"] },
  { id: "nav-fornecedores", title: "Fornecedores", description: "Cadastro de fornecedores", icon: Truck, category: "navegacao", action: "navigate:/fornecedores", keywords: ["fornecedor", "parceiro", "prestador"] },
  { id: "nav-estoque", title: "Estoque", description: "Controle de estoque", icon: Package, category: "navegacao", action: "navigate:/estoque", keywords: ["estoque", "material", "insumo", "almoxarifado"] },
  { id: "nav-compras", title: "Compras", description: "Gestão de compras", icon: ShoppingCart, category: "navegacao", action: "navigate:/compras", keywords: ["compra", "pedido", "aquisicao"] },

  // Engenharia
  { id: "nav-clientes", title: "Clientes", description: "Cadastro de clientes", icon: Handshake, category: "navegacao", action: "navigate:/clientes", keywords: ["cliente", "contratante", "empresa"] },
  { id: "nav-projetos", title: "Projetos", description: "Gestão de projetos", icon: FolderKanban, category: "navegacao", action: "navigate:/projects", keywords: ["projeto", "obra", "empreendimento"] },
  { id: "nav-mapa", title: "Mapa de Obras", description: "Mapa de obras e projetos", icon: MapPin, category: "navegacao", action: "navigate:/mapa", keywords: ["mapa", "localizacao", "obra", "geolocalizacao"] },
  { id: "nav-contratos", title: "Contratos", description: "Gestão de contratos", icon: FileText, category: "navegacao", action: "navigate:/contratos", keywords: ["contrato", "acordo", "termo"] },
  { id: "nav-composicoes", title: "Composições", description: "Composições de custo", icon: Calculator, category: "navegacao", action: "navigate:/composicoes", keywords: ["composicao", "custo", "unitario", "sinapi"] },
  { id: "nav-orcamentos", title: "Orçamentos", description: "Orçamentos de projetos", icon: FileSpreadsheet, category: "navegacao", action: "navigate:/orcamentos", keywords: ["orcamento", "proposta", "estimativa"] },
  { id: "nav-cronograma", title: "Cronograma", description: "Cronograma de obras", icon: CalendarDays, category: "navegacao", action: "navigate:/cronograma", keywords: ["cronograma", "prazo", "gantt", "planejamento"] },
  { id: "nav-medicoes", title: "Medições", description: "Medições de obra", icon: Ruler, category: "navegacao", action: "navigate:/measurements", keywords: ["medicao", "boletim", "levantamento"] },
  { id: "nav-rdo", title: "RDO", description: "Relatório diário de obra", icon: BookOpen, category: "navegacao", action: "navigate:/rdo", keywords: ["rdo", "diario", "obra", "relatorio"] },
  { id: "nav-empreiteiras", title: "Empreiteiras", description: "Gestão de empreiteiras", icon: HardHat, category: "navegacao", action: "navigate:/empreiteiras", keywords: ["empreiteira", "subcontratada", "terceirizada"] },
  { id: "nav-equipamentos", title: "Equipamentos", description: "Gestão de equipamentos", icon: Wrench, category: "navegacao", action: "navigate:/equipamentos", keywords: ["equipamento", "maquina", "ferramenta"] },
  { id: "nav-locacoes", title: "Locações", description: "Controle de locações", icon: KeyRound, category: "navegacao", action: "navigate:/locacoes", keywords: ["locacao", "aluguel", "locado"] },
  { id: "nav-qualidade", title: "Gestão de Qualidade", description: "Controle de qualidade", icon: CheckCircle, category: "navegacao", action: "navigate:/qualidade", keywords: ["qualidade", "iso", "norma", "auditoria"] },

  // Segurança
  { id: "nav-seguranca", title: "Segurança do Trabalho", description: "Segurança e saúde ocupacional", icon: Shield, category: "navegacao", action: "navigate:/seguranca-trabalho", keywords: ["seguranca", "trabalho", "epi", "sst", "cipa"] },
  { id: "nav-documentos", title: "Gestão de Documentos", description: "Documentos e arquivos", icon: FolderOpen, category: "navegacao", action: "navigate:/documentos", keywords: ["documento", "arquivo", "pasta"] },
]

// ---------------------------------------------------------------------------
// Quick action commands
// ---------------------------------------------------------------------------

const quickActionCommands: CommandItem[] = [
  { id: "action-novo-cliente", title: "Novo Cliente", description: "Cadastrar novo cliente", icon: UserPlus, category: "acoes_rapidas", action: "navigate:/clientes?novo=1", keywords: ["novo", "cliente", "cadastrar", "adicionar"] },
  { id: "action-novo-projeto", title: "Novo Projeto", description: "Criar novo projeto", icon: FilePlus, category: "acoes_rapidas", action: "navigate:/projects?novo=1", keywords: ["novo", "projeto", "criar", "obra"] },
  { id: "action-novo-contrato", title: "Novo Contrato", description: "Criar novo contrato", icon: FilePlus, category: "acoes_rapidas", action: "navigate:/contratos?novo=1", keywords: ["novo", "contrato", "criar"] },
  { id: "action-novo-orcamento", title: "Novo Orçamento", description: "Criar novo orçamento", icon: Plus, category: "acoes_rapidas", action: "navigate:/orcamentos?novo=1", keywords: ["novo", "orcamento", "criar", "proposta"] },
  { id: "action-nova-medicao", title: "Nova Medição", description: "Registrar nova medição", icon: Plus, category: "acoes_rapidas", action: "navigate:/measurements?novo=1", keywords: ["nova", "medicao", "registrar"] },
  { id: "action-novo-rdo", title: "Novo RDO", description: "Criar relatório diário de obra", icon: Plus, category: "acoes_rapidas", action: "navigate:/rdo?novo=1", keywords: ["novo", "rdo", "diario", "relatorio"] },
  { id: "action-nova-tarefa", title: "Nova Tarefa", description: "Criar nova tarefa", icon: Plus, category: "acoes_rapidas", action: "navigate:/tarefas?novo=1", keywords: ["nova", "tarefa", "criar", "atividade"] },
  { id: "action-nova-compra", title: "Nova Compra", description: "Registrar nova compra", icon: Plus, category: "acoes_rapidas", action: "navigate:/compras?novo=1", keywords: ["nova", "compra", "pedido"] },
  { id: "action-novo-fornecedor", title: "Novo Fornecedor", description: "Cadastrar novo fornecedor", icon: UserPlus, category: "acoes_rapidas", action: "navigate:/fornecedores?novo=1", keywords: ["novo", "fornecedor", "cadastrar"] },
]

// ---------------------------------------------------------------------------
// Admin-only commands
// ---------------------------------------------------------------------------

const adminCommands: CommandItem[] = [
  { id: "admin-usuarios", title: "Gerenciar Usuários", description: "Administrar usuários do sistema", icon: UserCog, category: "admin", action: "navigate:/users", keywords: ["usuario", "permissao", "acesso", "gerenciar"], adminOnly: true },
  { id: "admin-empresas", title: "Gerenciar Empresas", description: "Administrar empresas", icon: Building2, category: "admin", action: "navigate:/companies", keywords: ["empresa", "companhia", "organizacao"], adminOnly: true },
  { id: "admin-configuracoes", title: "Configurações do Sistema", description: "Configurações gerais", icon: Settings, category: "admin", action: "navigate:/configuracoes", keywords: ["configuracao", "sistema", "config"], adminOnly: true },
  { id: "admin-ia", title: "Inteligência Artificial", description: "Configurações de IA", icon: Brain, category: "admin", action: "navigate:/ia", keywords: ["ia", "inteligencia", "artificial", "ai", "assistente"], adminOnly: true },
  { id: "admin-monitoramento", title: "Monitoramento", description: "Monitoramento do sistema", icon: Activity, category: "admin", action: "navigate:/configuracoes/monitoramento", keywords: ["monitoramento", "status", "saude", "log"], adminOnly: true },
  { id: "admin-auditoria", title: "Auditoria", description: "Logs de auditoria", icon: ClipboardList, category: "admin", action: "navigate:/configuracoes/auditoria", keywords: ["auditoria", "log", "historico", "registro"], adminOnly: true },
]

// ---------------------------------------------------------------------------
// System commands
// ---------------------------------------------------------------------------

const systemCommands: CommandItem[] = [
  { id: "sys-perfil", title: "Meu Perfil", description: "Ver e editar perfil", icon: User, category: "sistema", action: "navigate:/configuracoes/perfil", keywords: ["perfil", "conta", "meus dados", "usuario"] },
  { id: "sys-sair", title: "Sair", description: "Encerrar sessão", icon: LogOut, category: "sistema", action: "action:logout", keywords: ["sair", "logout", "desconectar", "encerrar"] },
]

// ---------------------------------------------------------------------------
// All commands combined
// ---------------------------------------------------------------------------

export const ALL_COMMANDS: CommandItem[] = [
  ...navigationCommands,
  ...quickActionCommands,
  ...adminCommands,
  ...systemCommands,
]

// ---------------------------------------------------------------------------
// Fuzzy search helper
// ---------------------------------------------------------------------------

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics (ç→c, ã→a, etc.)
}

function fuzzyMatch(text: string, query: string): boolean {
  const normalizedText = normalizeText(text)
  const normalizedQuery = normalizeText(query)

  // Check if query words appear in the text (order-independent)
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean)
  return queryWords.every((word) => normalizedText.includes(word))
}

function scoreMatch(command: CommandItem, query: string): number {
  const normalizedQuery = normalizeText(query)
  let score = 0

  // Title exact match — highest priority
  if (normalizeText(command.title) === normalizedQuery) return 100

  // Title starts with query
  if (normalizeText(command.title).startsWith(normalizedQuery)) score += 50

  // Title contains query
  if (normalizeText(command.title).includes(normalizedQuery)) score += 30

  // Description contains query
  if (normalizeText(command.description).includes(normalizedQuery)) score += 10

  // Keywords match
  for (const keyword of command.keywords) {
    if (normalizeText(keyword).includes(normalizedQuery)) {
      score += 20
      break
    }
  }

  return score
}

// ---------------------------------------------------------------------------
// Search function
// ---------------------------------------------------------------------------

export function searchCommands(
  query: string,
  userRole: string = "USER"
): CommandItem[] {
  const isAdmin = userRole === "ADMIN"

  // Filter commands based on role
  const availableCommands = ALL_COMMANDS.filter((cmd) => {
    if (cmd.adminOnly && !isAdmin) return false
    return true
  })

  // If no query, return all available commands
  if (!query.trim()) return availableCommands

  // Score and filter matching commands
  const scored = availableCommands
    .map((cmd) => {
      const titleMatch = fuzzyMatch(cmd.title, query)
      const descMatch = fuzzyMatch(cmd.description, query)
      const keywordMatch = cmd.keywords.some((kw) => fuzzyMatch(kw, query))

      if (!titleMatch && !descMatch && !keywordMatch) return null

      return { command: cmd, score: scoreMatch(cmd, query) }
    })
    .filter((item): item is { command: CommandItem; score: number } => item !== null)

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score)

  return scored.map((item) => item.command)
}

// ---------------------------------------------------------------------------
// Group commands by category
// ---------------------------------------------------------------------------

export function groupCommandsByCategory(
  commands: CommandItem[]
): Record<CommandCategory, CommandItem[]> {
  const groups: Record<CommandCategory, CommandItem[]> = {
    navegacao: [],
    acoes_rapidas: [],
    admin: [],
    sistema: [],
  }

  for (const cmd of commands) {
    groups[cmd.category].push(cmd)
  }

  return groups
}
