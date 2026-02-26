"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    LayoutDashboard,
    FolderKanban,
    FileText,
    Users,
    Calculator,
    ClipboardCheck,
    DollarSign,
    Package,
    ShoppingCart,
    BarChart3,
    Building2,
    UserCog,
    GraduationCap,
    CalendarDays,
    Layers,
    TrendingUp,
    Plus,
    ExternalLink,
    Settings,
    Banknote,
    Receipt,
    FileSpreadsheet,
    HardHat,
    Ruler,
} from "lucide-react"

type NavItem = {
    label: string
    href: string
    icon: React.ElementType
    group: string
}

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Páginas" },
    { label: "Relatórios", href: "/relatorios", icon: BarChart3, group: "Páginas" },
    { label: "Projetos", href: "/projects", icon: FolderKanban, group: "Engenharia" },
    { label: "Contratos", href: "/contratos", icon: FileText, group: "Engenharia" },
    { label: "Composições", href: "/composicoes", icon: Calculator, group: "Engenharia" },
    { label: "Orçamentos", href: "/orcamentos", icon: FileSpreadsheet, group: "Engenharia" },
    { label: "Cronograma", href: "/cronograma", icon: CalendarDays, group: "Engenharia" },
    { label: "Medições", href: "/measurements", icon: Ruler, group: "Engenharia" },
    { label: "Empreiteiras", href: "/empreiteiras", icon: HardHat, group: "Engenharia" },
    { label: "Fluxo de Caixa", href: "/financeiro/fluxo-de-caixa", icon: TrendingUp, group: "Financeiro" },
    { label: "DRE", href: "/financeiro/dre", icon: BarChart3, group: "Financeiro" },
    { label: "Faturamento", href: "/financeiro/faturamento", icon: FileText, group: "Financeiro" },
    { label: "Recebíveis", href: "/financeiro/recebiveis", icon: DollarSign, group: "Financeiro" },
    { label: "Despesas", href: "/financeiro/despesas", icon: Banknote, group: "Financeiro" },
    { label: "Documentos Fiscais", href: "/financeiro/notas", icon: Receipt, group: "Financeiro" },
    { label: "Fornecedores", href: "/financeiro/fornecedores", icon: Building2, group: "Financeiro" },
    { label: "Centros de Custo", href: "/financeiro/centros-de-custo", icon: Layers, group: "Financeiro" },
    { label: "Funcionários", href: "/rh/funcionarios", icon: Users, group: "RH / Dep. Pessoal" },
    { label: "Folha de Pagamento", href: "/rh/folha", icon: Banknote, group: "RH / Dep. Pessoal" },
    { label: "Férias & Afastamentos", href: "/dep-pessoal/ferias", icon: ClipboardCheck, group: "RH / Dep. Pessoal" },
    { label: "Treinamentos", href: "/rh/treinamentos", icon: GraduationCap, group: "RH / Dep. Pessoal" },
    { label: "Alocações", href: "/rh/alocacoes", icon: UserCog, group: "RH / Dep. Pessoal" },
    { label: "Estoque", href: "/estoque", icon: Package, group: "Administração" },
    { label: "Compras", href: "/compras", icon: ShoppingCart, group: "Administração" },
    { label: "Empresas", href: "/companies", icon: Building2, group: "Sistema" },
    { label: "Usuários", href: "/users", icon: Users, group: "Sistema" },
    { label: "Configurações", href: "/configuracoes", icon: Settings, group: "Sistema" },
]

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const router = useRouter()
    const [query, setQuery] = useState("")

    const navigate = useCallback(
        (href: string, newTab = false) => {
            onOpenChange(false)
            setQuery("")
            if (newTab) {
                window.open(href, "_blank")
            } else {
                router.push(href)
            }
        },
        [router, onOpenChange]
    )

    const filteredItems =
        query.length < 1
            ? NAV_ITEMS
            : NAV_ITEMS.filter(
                  (item) =>
                      item.label.toLowerCase().includes(query.toLowerCase()) ||
                      item.group.toLowerCase().includes(query.toLowerCase())
              )

    const groups = Array.from(new Set(filteredItems.map((i) => i.group)))

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput
                placeholder="Buscar páginas, projetos, funcionários..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

                {/* Ações Rápidas — exibidas somente quando não há query */}
                {!query && (
                    <>
                        <CommandGroup heading="Ações Rápidas">
                            <CommandItem onSelect={() => navigate("/projects")}>
                                <Plus className="mr-2 h-4 w-4" />
                                Novo Projeto
                                <span className="ml-auto text-xs text-muted-foreground">/projects</span>
                            </CommandItem>
                            <CommandItem onSelect={() => navigate("/contratos")}>
                                <Plus className="mr-2 h-4 w-4" />
                                Novo Contrato
                                <span className="ml-auto text-xs text-muted-foreground">/contratos</span>
                            </CommandItem>
                            <CommandItem onSelect={() => navigate("/measurements")}>
                                <Plus className="mr-2 h-4 w-4" />
                                Novo Boletim de Medição
                                <span className="ml-auto text-xs text-muted-foreground">/measurements</span>
                            </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                    </>
                )}

                {/* Navegação agrupada por seção */}
                {groups.map((group) => (
                    <CommandGroup key={group} heading={group}>
                        {filteredItems
                            .filter((i) => i.group === group)
                            .map((item) => {
                                const Icon = item.icon
                                return (
                                    <CommandItem
                                        key={item.href}
                                        value={`${item.label} ${item.group}`}
                                        onSelect={() => navigate(item.href)}
                                    >
                                        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {item.label}
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {item.href}
                                        </span>
                                    </CommandItem>
                                )
                            })}
                    </CommandGroup>
                ))}

                {/* Abrir em nova aba — exibido somente quando há resultados filtrados */}
                {query && filteredItems.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Abrir em nova aba">
                            {filteredItems.slice(0, 3).map((item) => {
                                const Icon = item.icon
                                return (
                                    <CommandItem
                                        key={`new-tab-${item.href}`}
                                        value={`nova aba ${item.label}`}
                                        onSelect={() => navigate(item.href, true)}
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {item.label} — nova aba
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    )
}
