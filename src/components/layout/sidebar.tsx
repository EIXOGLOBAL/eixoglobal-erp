"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    FolderKanban,
    Ruler,
    DollarSign,
    ChevronDown,
    ChevronRight,
    FileText,
    Receipt,
    Calculator,
    FileSpreadsheet,
    UserCog,
    Package,
    BarChart3,
    Banknote,
    ShoppingCart,
    HardHat,
    ClipboardCheck,
    GraduationCap,
    TrendingUp,
    CalendarDays,
    Layers,
    Search,
    BookOpen,
    Truck,
    MapPin,
    CheckSquare,
    Bell,
    AlertCircle,
    Megaphone,
    GitBranch,
    ClipboardList,
    LayoutList,
    KeyRound,
    Handshake,
    ArrowLeftRight,
    PieChart,
    Clock,
    CheckCircle,
    Shield,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useCommandPalette } from "@/components/layout/command-palette-provider"
import { VersionBadge } from "@/components/version-badge"

// ---------------------------------------------------------------------------
// Module permission field mapping
// Maps sidebar item hrefs to the User.moduleXxx boolean fields.
// Items NOT in this map are always visible (e.g. Dashboard, Tarefas).
// ---------------------------------------------------------------------------
const HREF_TO_PERMISSION: Record<string, string> = {
    // Administração section
    '/financeiro': 'moduleFinancial',
    '/dep-pessoal': 'moduleEmployees',
    '/rh': 'moduleTraining',
    '/ponto': 'moduleTimesheet',
    '/fornecedores': 'moduleSuppliers',
    '/estoque': 'moduleInventory',
    '/compras': 'modulePurchases',
    // Engenharia section
    '/clientes': 'moduleClients',
    '/projects': 'moduleProjects',
    '/mapa': 'moduleProjects',        // Map is part of Projects module
    '/contratos': 'moduleContracts',
    '/composicoes': 'moduleBudgets',   // Compositions are part of Budgets
    '/orcamentos': 'moduleBudgets',
    '/cronograma': 'moduleProjects',   // Schedule is part of Projects module
    '/measurements': 'moduleMeasurements',
    '/rdo': 'moduleDailyReports',
    '/empreiteiras': 'moduleContracts', // Contractors are part of Contracts
    '/equipamentos': 'moduleEquipment',
    '/locacoes': 'moduleRentals',
    '/qualidade': 'moduleQuality',
    // Segurança section
    '/seguranca-trabalho': 'moduleSafety',
    '/documentos': 'moduleDocuments',
}

// Sidebar structure organized by department sections
// Order: top-level → Administração → Engenharia → Sistema (ADMIN only)
const topLevelSection = {
    section: null,
    adminOnly: false,
    items: [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        {
            title: "Relatórios",
            href: "/relatorios",
            icon: BarChart3,
            items: [
                { title: "Visão Geral", href: "/relatorios", icon: BarChart3 },
                { title: "Benchmark", href: "/relatorios/benchmark", icon: TrendingUp },
                { title: "Executivo", href: "/relatorios/executivo", icon: FileText },
                { title: "Comparativo", href: "/relatorios/comparativo", icon: BarChart3 },
                { title: "Capacidade", href: "/relatorios/capacidade", icon: Users },
            ],
        },
        { title: "Tarefas", href: "/tarefas", icon: CheckSquare },
        { title: "Notificações", href: "/notificacoes", icon: Bell },
        { title: "Comunicados", href: "/comunicados", icon: Megaphone },
    ]
}

const administracaoSection = {
    section: "Administração",
    adminOnly: false,
    items: [
        {
            title: "Financeiro",
            icon: DollarSign,
            href: "/financeiro",
            items: [
                { title: "Fluxo de Caixa", href: "/financeiro/fluxo-de-caixa", icon: TrendingUp },
                { title: "DRE", href: "/financeiro/dre", icon: BarChart3 },
                { title: "Faturamento", href: "/financeiro/faturamento", icon: FileText },
                { title: "Recebíveis", href: "/financeiro/recebiveis", icon: DollarSign },
                { title: "Despesas", href: "/financeiro/despesas", icon: Banknote },
                { title: "Documentos Fiscais", href: "/financeiro/notas", icon: Receipt },
                { title: "Fornecedores", href: "/financeiro/fornecedores", icon: Building2 },
                { title: "Centros de Custo", href: "/financeiro/centros-de-custo", icon: Layers },
                { title: "Conciliação", href: "/financeiro/conciliacao", icon: ArrowLeftRight },
                { title: "Projeção Caixa", href: "/financeiro/fluxo-de-caixa", icon: PieChart },
                { title: "Inadimplência", href: "/financeiro/inadimplencia", icon: AlertCircle },
            ]
        },
        {
            title: "Dep. Pessoal",
            icon: ClipboardCheck,
            href: "/dep-pessoal",
            items: [
                { title: "Funcionários", href: "/rh/funcionarios", icon: Users },
                { title: "Folha de Pagamento", href: "/rh/folha", icon: Banknote },
                { title: "Férias & Afastamentos", href: "/dep-pessoal/ferias", icon: ClipboardCheck },
            ]
        },
        {
            title: "RH",
            icon: GraduationCap,
            href: "/rh",
            items: [
                { title: "Treinamentos", href: "/rh/treinamentos", icon: GraduationCap },
                { title: "Alocações", href: "/rh/alocacoes", icon: UserCog },
                { title: "Organograma", href: "/rh/organograma", icon: GitBranch },
                { title: "Tabela Salarial", href: "/rh/tabela-salarial", icon: LayoutList },
            ]
        },
        { title: "Controle de Ponto", href: "/ponto", icon: Clock },
        { title: "Fornecedores", href: "/fornecedores", icon: Truck },
        { title: "Estoque", href: "/estoque", icon: Package },
        { title: "Compras", href: "/compras", icon: ShoppingCart },
    ]
}

const engenhariaSection = {
    section: "Engenharia",
    adminOnly: false,
    items: [
        { title: "Clientes", href: "/clientes", icon: Handshake },
        { title: "Projetos", href: "/projects", icon: FolderKanban },
        { title: "Mapa de Obras", href: "/mapa", icon: MapPin },
        { title: "Contratos", href: "/contratos", icon: FileText },
        { title: "Composições", href: "/composicoes", icon: Calculator },
        { title: "Orçamentos", href: "/orcamentos", icon: FileSpreadsheet },
        { title: "Cronograma", href: "/cronograma", icon: CalendarDays },
        { title: "Medições", href: "/measurements", icon: Ruler },
        { title: "RDO", href: "/rdo", icon: BookOpen },
        { title: "Empreiteiras", href: "/empreiteiras", icon: HardHat },
        { title: "Equipamentos", href: "/equipamentos", icon: Truck },
        { title: "Locações", href: "/locacoes", icon: KeyRound },
        { title: "Gestão de Qualidade", href: "/qualidade", icon: CheckCircle },
    ]
}

const segurancaSection = {
    section: "Segurança",
    adminOnly: false,
    items: [
        { title: "Segurança do Trabalho", href: "/seguranca-trabalho", icon: Shield },
        { title: "Gestão de Documentos", href: "/documentos", icon: FileText },
    ]
}

const sistemaSection = {
    section: "Sistema",
    adminOnly: true, // SOMENTE ADMIN
    items: [
        { title: "Empresas", href: "/companies", icon: Building2 },
        { title: "Usuários", href: "/users", icon: Users },
        { title: "Auditoria", href: "/configuracoes/auditoria", icon: ClipboardList },
        {
            title: "Configurações",
            href: "/configuracoes",
            icon: Settings,
            items: [
                { title: "Geral", href: "/configuracoes", icon: Settings },
                { title: "BDI", href: "/configuracoes/bdi", icon: Calculator },
                { title: "Calendario", href: "/configuracoes/calendario", icon: CalendarDays },
                { title: "Sistema", href: "/configuracoes/sistema", icon: Shield },
                { title: "Fluxos de Aprovacao", href: "/configuracoes/fluxos-aprovacao", icon: GitBranch },
            ],
        },
    ]
}

const allSidebarSections = [topLevelSection, administracaoSection, engenhariaSection, segurancaSection, sistemaSection]

type NavItem = {
    title: string
    href: string
    icon: React.ElementType
    items?: { title: string; href: string; icon: React.ElementType }[]
}

// Module permissions passed from the server layout (User.moduleXxx fields)
export type ModulePermissions = Record<string, boolean>

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    userRole?: string
    modulePermissions?: ModulePermissions
}

// Returns true if item or any of its sub-items match the current path
function itemIsActive(item: NavItem, pathname: string): boolean {
    if (item.items) {
        return item.items.some(sub => pathname === sub.href || pathname.startsWith(sub.href + '/'))
    }
    return pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
}

export function Sidebar({ className, userRole = 'USER', modulePermissions = {} }: SidebarProps) {
    const pathname = usePathname()
    const { setOpen: openCommandPalette } = useCommandPalette()

    const isAdmin = userRole === 'ADMIN'

    // Check if a nav item is accessible based on module permissions.
    // ADMIN always sees everything. Items without a permission mapping are always visible.
    const isItemAccessible = (item: NavItem): boolean => {
        if (isAdmin) return true
        const permField = HREF_TO_PERMISSION[item.href]
        if (!permField) return true // no restriction
        return !!modulePermissions[permField]
    }

    // Filter sections: remove admin-only sections, then remove inaccessible items.
    // For collapsible groups, remove the whole group if none of its children are accessible.
    const sidebarSections = useMemo(() => {
        return allSidebarSections
            .filter(s => !s.adminOnly || isAdmin)
            .map(section => {
                if (isAdmin) return section

                const filteredItems = (section.items as NavItem[]).filter(item => {
                    if (item.items) {
                        // Group item: visible if the group itself is accessible
                        return isItemAccessible(item)
                    }
                    return isItemAccessible(item)
                })

                return { ...section, items: filteredItems }
            })
            .filter(section => section.items.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, modulePermissions])

    // Only auto-open the submenu that contains the active route; all others start closed
    const allNavItems = sidebarSections.flatMap(s => s.items as NavItem[])
    const initialOpenMenus = Object.fromEntries(
        allNavItems
            .filter(i => Boolean(i.items))
            .map(i => [i.title, itemIsActive(i, pathname)])
    )

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(initialOpenMenus)

    const toggleMenu = (title: string) =>
        setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }))

    const renderItem = (item: NavItem) => {
        if (item.items) {
            const isOpen = openMenus[item.title] ?? false
            const hasActiveChild = item.items.some(
                sub => pathname === sub.href || pathname.startsWith(sub.href + '/')
            )

            return (
                <Collapsible
                    key={item.title}
                    open={isOpen}
                    onOpenChange={() => toggleMenu(item.title)}
                    className="space-y-0.5"
                >
                    <CollapsibleTrigger asChild>
                        <button className={cn(
                            "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            hasActiveChild
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground"
                        )}>
                            <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4 shrink-0" />
                                <span>{item.title}</span>
                            </div>
                            <ChevronRight className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-muted-foreground",
                                isOpen && "rotate-90"
                            )} />
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="ml-3 border-l border-border pl-3 space-y-0.5 py-1">
                            {item.items.map((subItem) => {
                                const subActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                                return (
                                    <Link
                                        key={subItem.href}
                                        href={subItem.href}
                                        className={cn(
                                            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                                            subActive
                                                ? "bg-accent text-accent-foreground font-medium"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        <subItem.icon className="h-3.5 w-3.5 shrink-0" />
                                        {subItem.title}
                                    </Link>
                                )
                            })}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )
        }

        const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
        return (
            <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
            >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.title}
            </Link>
        )
    }

    return (
        <div className={cn("flex flex-col w-full border-r min-h-screen bg-background", className)}>
            {/* Brand */}
            <div className="flex h-14 items-center border-b px-4 shrink-0">
                <span className="font-bold text-base tracking-tight">Eixo Global</span>
                <span className="ml-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted rounded px-1.5 py-0.5">ERP</span>
            </div>

            {/* Ctrl+K search hint */}
            <div className="shrink-0 px-3 py-2 border-b">
                <button
                    onClick={() => openCommandPalette(true)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
                >
                    <Search className="h-3 w-3" />
                    <span>Busca rápida</span>
                    <kbd className="ml-auto pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                        <span>⌘</span>K
                    </kbd>
                </button>
            </div>

            {/* Scrollable nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {sidebarSections.map((section, idx) => (
                    <div key={idx}>
                        {section.section && (
                            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                {section.section}
                            </p>
                        )}
                        <div className="space-y-0.5">
                            {section.items.map(item => renderItem(item as NavItem))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Theme toggle */}
            <div className="shrink-0 border-t px-3 py-3">
                <ThemeToggle />
            </div>

            {/* Version badge */}
            <div className="shrink-0 border-t px-3 py-2 flex justify-center">
                <VersionBadge variant="compact" />
            </div>
        </div>
    )
}
