// Module-based access control system
// ADMIN always has full access. Other users see only modules where their
// corresponding boolean field (User.moduleXxx) is true.

export interface ModuleDefinition {
  id: string
  name: string
  icon: string  // Lucide icon name
  href: string
  permissionField: string  // maps to User.moduleXxx field
  category: 'cadastros' | 'operacional' | 'financeiro' | 'rh' | 'qualidade_seguranca' | 'admin'
}

export const MODULES: ModuleDefinition[] = [
  // Cadastros
  { id: 'clients', name: 'Clientes', icon: 'Users', href: '/clientes', permissionField: 'moduleClients', category: 'cadastros' },
  { id: 'suppliers', name: 'Fornecedores', icon: 'Truck', href: '/fornecedores', permissionField: 'moduleSuppliers', category: 'cadastros' },

  // Operacional
  { id: 'projects', name: 'Projetos', icon: 'FolderKanban', href: '/projetos', permissionField: 'moduleProjects', category: 'operacional' },
  { id: 'contracts', name: 'Contratos', icon: 'FileText', href: '/contratos', permissionField: 'moduleContracts', category: 'operacional' },
  { id: 'dailyReports', name: 'Diário de Obra', icon: 'ClipboardList', href: '/diario-obra', permissionField: 'moduleDailyReports', category: 'operacional' },
  { id: 'measurements', name: 'Medições', icon: 'Calculator', href: '/medicoes', permissionField: 'moduleMeasurements', category: 'operacional' },
  { id: 'equipment', name: 'Equipamentos', icon: 'Wrench', href: '/equipamentos', permissionField: 'moduleEquipment', category: 'operacional' },
  { id: 'rentals', name: 'Locações', icon: 'CalendarClock', href: '/locacoes', permissionField: 'moduleRentals', category: 'operacional' },
  { id: 'documents', name: 'Documentos', icon: 'FolderOpen', href: '/documentos', permissionField: 'moduleDocuments', category: 'operacional' },

  // Financeiro
  { id: 'financial', name: 'Financeiro', icon: 'DollarSign', href: '/financeiro', permissionField: 'moduleFinancial', category: 'financeiro' },
  { id: 'budgets', name: 'Orçamentos', icon: 'Receipt', href: '/orcamentos', permissionField: 'moduleBudgets', category: 'financeiro' },
  { id: 'purchases', name: 'Compras', icon: 'ShoppingCart', href: '/compras', permissionField: 'modulePurchases', category: 'financeiro' },
  { id: 'inventory', name: 'Estoque', icon: 'Package', href: '/estoque', permissionField: 'moduleInventory', category: 'financeiro' },
  { id: 'billing', name: 'Faturamento', icon: 'FileSpreadsheet', href: '/faturamento', permissionField: 'moduleBilling', category: 'financeiro' },
  { id: 'costCenters', name: 'Centros de Custo', icon: 'PieChart', href: '/centros-custo', permissionField: 'moduleCostCenters', category: 'financeiro' },

  // RH
  { id: 'employees', name: 'Funcionários', icon: 'UserCheck', href: '/funcionarios', permissionField: 'moduleEmployees', category: 'rh' },
  { id: 'timesheet', name: 'Ponto', icon: 'Clock', href: '/ponto', permissionField: 'moduleTimesheet', category: 'rh' },
  { id: 'training', name: 'Treinamentos', icon: 'GraduationCap', href: '/treinamentos', permissionField: 'moduleTraining', category: 'rh' },

  // Qualidade & Seguranca
  { id: 'quality', name: 'Qualidade', icon: 'CheckCircle', href: '/qualidade', permissionField: 'moduleQuality', category: 'qualidade_seguranca' },
  { id: 'safety', name: 'Segurança', icon: 'Shield', href: '/seguranca-trabalho', permissionField: 'moduleSafety', category: 'qualidade_seguranca' },
]

// Admin modules (always visible to ADMIN only)
export const ADMIN_MODULES: ModuleDefinition[] = [
  { id: 'users', name: 'Usuários', icon: 'UserCog', href: '/users', permissionField: '', category: 'admin' },
  { id: 'settings', name: 'Configurações', icon: 'Settings', href: '/configuracoes', permissionField: '', category: 'admin' },
  { id: 'ai', name: 'Inteligência Artificial', icon: 'Brain', href: '/ia', permissionField: '', category: 'admin' },
  { id: 'monitoring', name: 'Monitoramento', icon: 'Activity', href: '/configuracoes/monitoramento', permissionField: '', category: 'admin' },
]

// Check if a user has access to a specific module
export function hasModuleAccess(
  user: { role: string; [key: string]: any },
  moduleId: string
): boolean {
  // ADMIN always has full access
  if (user.role === 'ADMIN') return true

  // Find the module definition
  const moduleDef = MODULES.find(m => m.id === moduleId)
  if (!moduleDef) return false

  // Check the user's permission field
  return !!user[moduleDef.permissionField]
}

// Get all accessible modules for a user
export function getAccessibleModules(
  user: { role: string; [key: string]: any }
): ModuleDefinition[] {
  if (user.role === 'ADMIN') {
    return [...MODULES, ...ADMIN_MODULES]
  }

  return MODULES.filter(m => !!user[m.permissionField])
}

// Get accessible modules grouped by category
export function getAccessibleModulesByCategory(
  user: { role: string; [key: string]: any }
): Record<string, ModuleDefinition[]> {
  const accessible = getAccessibleModules(user)
  return accessible.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = []
    acc[mod.category].push(mod)
    return acc
  }, {} as Record<string, ModuleDefinition[]>)
}

// Category labels in PT-BR
export const CATEGORY_LABELS: Record<string, string> = {
  cadastros: 'Cadastros',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
  rh: 'Recursos Humanos',
  qualidade_seguranca: 'Qualidade e Segurança',
  admin: 'Administração',
}

// Get all module IDs (for admin management screen)
export function getAllModuleIds(): string[] {
  return MODULES.map(m => m.id)
}

// Get all permission field names (for building Prisma select/update queries)
export function getAllPermissionFields(): string[] {
  return MODULES.map(m => m.permissionField)
}

// Get module by href path
export function getModuleByPath(path: string): ModuleDefinition | undefined {
  return [...MODULES, ...ADMIN_MODULES].find(m => path.startsWith(m.href))
}

// Check if a given href is accessible for a user (for route protection)
export function isPathAccessible(
  user: { role: string; [key: string]: any },
  path: string
): boolean {
  if (user.role === 'ADMIN') return true

  const mod = getModuleByPath(path)
  if (!mod) return true // paths not tied to any module are open

  if (mod.category === 'admin') return false // admin-only modules
  return !!user[mod.permissionField]
}
