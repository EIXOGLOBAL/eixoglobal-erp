import { MODULES, ADMIN_MODULES } from '@/lib/module-permissions'

export interface BreadcrumbItem {
  label: string
  href: string
  isHome?: boolean
  isCurrent?: boolean
}

/**
 * Mapeamento de segmentos de rota para labels em PT-BR.
 * Rotas de módulos são resolvidas automaticamente via MODULES/ADMIN_MODULES.
 * Este mapa cobre sub-rotas e páginas que não são módulos raiz.
 */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Início',
  clientes: 'Clientes',
  projetos: 'Projetos',
  projects: 'Projetos',
  contratos: 'Contratos',
  financeiro: 'Financeiro',
  equipamentos: 'Equipamentos',
  locacoes: 'Locações',
  fornecedores: 'Fornecedores',
  medicoes: 'Medições',
  measurements: 'Medições',
  orcamentos: 'Orçamentos',
  compras: 'Compras',
  estoque: 'Estoque',
  faturamento: 'Faturamento',
  'centros-custo': 'Centros de Custo',
  'centros-de-custo': 'Centros de Custo',
  funcionarios: 'Funcionários',
  ponto: 'Ponto',
  treinamentos: 'Treinamentos',
  qualidade: 'Qualidade',
  'seguranca-trabalho': 'Segurança do Trabalho',
  documentos: 'Documentos',
  'diario-obra': 'Diário de Obra',
  rdo: 'Diário de Obra',
  users: 'Usuários',
  configuracoes: 'Configurações',
  ia: 'Inteligência Artificial',
  rh: 'Recursos Humanos',
  relatorios: 'Relatórios',
  tarefas: 'Tarefas',
  comunicados: 'Comunicados',
  notificacoes: 'Notificações',
  composicoes: 'Composições',
  cronograma: 'Cronograma',
  mapa: 'Mapa',
  'curva-s': 'Curva S',
  evm: 'Valor Agregado',
  'business-dashboard': 'Painel Executivo',
  empreiteiras: 'Empreiteiras',
  companies: 'Empresas',
  // Sub-rotas
  perfil: 'Meu Perfil',
  seguranca: 'Segurança',
  auditoria: 'Auditoria',
  monitoramento: 'Monitoramento',
  novo: 'Novo',
  editar: 'Editar',
  print: 'Imprimir',
  dre: 'DRE',
  conciliacao: 'Conciliação',
  'fluxo-de-caixa': 'Fluxo de Caixa',
  inadimplencia: 'Inadimplência',
  notas: 'Notas Fiscais',
  despesas: 'Despesas',
  recebiveis: 'Recebíveis',
  folha: 'Folha de Pagamento',
  alocacoes: 'Alocações',
  organograma: 'Organograma',
  'tabela-salarial': 'Tabela Salarial',
  ferias: 'Férias',
  'dep-pessoal': 'Departamento Pessoal',
  benchmark: 'Benchmark',
  comparativo: 'Comparativo',
  capacidade: 'Capacidade',
  executivo: 'Executivo',
  materiais: 'Materiais',
  qrcode: 'QR Code',
  privacidade: 'Privacidade',
  termos: 'Termos',
}

/**
 * Cria mapa de href -> label a partir das definições de módulos.
 */
function buildModuleMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const mod of [...MODULES, ...ADMIN_MODULES]) {
    map[mod.href] = mod.name
  }
  return map
}

const MODULE_MAP = buildModuleMap()

/**
 * Verifica se um segmento é um ID dinâmico (UUID ou similar).
 */
function isDynamicSegment(segment: string): boolean {
  // UUID v4
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true
  }
  // CUID ou outros IDs alfanuméricos longos
  if (/^[a-z0-9]{20,}$/i.test(segment)) {
    return true
  }
  return false
}

/**
 * Resolve o label de um segmento de rota.
 */
function resolveSegmentLabel(segment: string, fullPath: string): string {
  // Se for segmento dinâmico, usar "Detalhes"
  if (isDynamicSegment(segment)) {
    return 'Detalhes'
  }

  // Verificar no mapa de módulos pelo href completo
  if (MODULE_MAP[fullPath]) {
    return MODULE_MAP[fullPath]
  }

  // Verificar no mapa de labels
  if (ROUTE_LABELS[segment]) {
    return ROUTE_LABELS[segment]
  }

  // Fallback: capitalizar e substituir hífens
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Gera os itens de breadcrumb a partir de um pathname.
 *
 * Exemplo:
 *   /clientes/abc-123/editar
 *   -> [Home, Clientes, Detalhes, Editar]
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'Início', href: '/dashboard', isHome: true },
  ]

  // Remover grupo de rotas como (dashboard) do path
  const cleanPath = pathname.replace(/\/\([^)]+\)/g, '')

  const segments = cleanPath.split('/').filter(Boolean)

  // Se estiver na raiz ou dashboard, retorna só o home
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    items[0].isCurrent = true
    return items
  }

  let currentPath = ''

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]

    // Pular "dashboard" como segmento pois já é o home
    if (segment === 'dashboard' && i === 0) continue

    currentPath += `/${segment}`
    const isLast = i === segments.length - 1

    items.push({
      label: resolveSegmentLabel(segment, currentPath),
      href: currentPath,
      isCurrent: isLast,
    })
  }

  return items
}
