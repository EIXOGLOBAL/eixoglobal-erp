import { requireAdmin } from "@/lib/route-guard"
import { getBDIConfigs, getBDIAuditHistory } from "@/app/actions/bdi-config-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Calculator,
    Info,
    History,
    Settings,
    Star,
    Pencil,
    Plus,
    Clock,
    User,
} from "lucide-react"
import { toNumber, formatPercent } from "@/lib/formatters"
import { BDIForm } from "@/components/configuracoes/bdi-form"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function BDIConfigPage() {
    const session = await requireAdmin()

    const companyId = session.user?.companyId
    if (!companyId) {
        return (
            <div className="flex-1 p-8">
                <p className="text-muted-foreground">Empresa não vinculada.</p>
            </div>
        )
    }

    const [configsResult, auditResult] = await Promise.all([
        getBDIConfigs(companyId),
        getBDIAuditHistory(companyId),
    ])

    const configs = configsResult.success ? (configsResult.data ?? []) : []
    const auditLogs = auditResult.success ? (auditResult.data ?? []) : []

    const defaultConfig = configs.find(c => c.isDefault)
    const serializedDefault = defaultConfig ? {
        id: defaultConfig.id,
        name: defaultConfig.name,
        percentage: toNumber(defaultConfig.percentage),
        administracaoCentral: toNumber(defaultConfig.administracaoCentral),
        seguroGarantia: toNumber(defaultConfig.seguroGarantia),
        risco: toNumber(defaultConfig.risco),
        despesasFinanceiras: toNumber(defaultConfig.despesasFinanceiras),
        lucro: toNumber(defaultConfig.lucro),
        iss: toNumber(defaultConfig.iss),
        pis: toNumber(defaultConfig.pis),
        cofins: toNumber(defaultConfig.cofins),
        irpj: toNumber(defaultConfig.irpj),
        csll: toNumber(defaultConfig.csll),
        isDefault: defaultConfig.isDefault,
    } : null

    const otherConfigs = configs.filter(c => !c.isDefault)

    const formatDate = (date: Date) =>
        new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date(date))

    const ACTION_LABELS: Record<string, string> = {
        CREATE: 'Criação',
        UPDATE: 'Alteração',
        DELETE: 'Exclusão',
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Calculator className="h-8 w-8" />
                        BDI - Bonificações e Despesas Indiretas
                    </h2>
                    <p className="text-muted-foreground">
                        Configure as taxas componentes do BDI aplicado aos orçamentos de engenharia
                    </p>
                </div>
                <Link href="/configuracoes">
                    <Badge variant="outline" className="gap-1">
                        <Settings className="h-3 w-3" />
                        Configurações
                    </Badge>
                </Link>
            </div>

            {/* Explicação do BDI */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
                        <Info className="h-4 w-4" />
                        O que é BDI?
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-800/80 dark:text-blue-300/80 space-y-2">
                    <p>
                        O <strong>BDI (Bonificações e Despesas Indiretas)</strong> é um percentual aplicado sobre o
                        custo direto de obras e serviços de engenharia para cobrir custos indiretos, despesas
                        financeiras, lucro e tributos. É essencial na formação do preço de venda em orçamentos
                        de construção civil.
                    </p>
                    <p>
                        A fórmula utilizada segue o <strong>Acórdão 2.622/2013 do TCU</strong>, que é a
                        referência para obras públicas no Brasil. O BDI típico para construção de edifícios
                        varia entre <strong>20,34% e 25,00%</strong> segundo o TCU.
                    </p>
                    <p>
                        Ao configurar o BDI, todos os orçamentos da empresa que utilizarem esta configuração
                        terão o preço de venda calculado como: <strong>Preço de Venda = Custo Direto x (1 + BDI)</strong>.
                    </p>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue={defaultConfig ? "edit" : "new"}>
                <TabsList>
                    {defaultConfig && (
                        <TabsTrigger value="edit" className="gap-1.5">
                            <Pencil className="h-3.5 w-3.5" />
                            Editar BDI Padrão
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="new" className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        {defaultConfig ? "Nova Configuração" : "Criar BDI"}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        Histórico ({auditLogs.length})
                    </TabsTrigger>
                </TabsList>

                {/* Edit Default Config */}
                {defaultConfig && (
                    <TabsContent value="edit" className="mt-6">
                        <BDIForm companyId={companyId} config={serializedDefault} />
                    </TabsContent>
                )}

                {/* New Config */}
                <TabsContent value="new" className="mt-6">
                    <BDIForm companyId={companyId} />
                </TabsContent>

                {/* Audit History */}
                <TabsContent value="history" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Histórico de Alterações
                            </CardTitle>
                            <CardDescription>
                                Todas as alterações realizadas nas configurações de BDI
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {auditLogs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Nenhuma alteração registrada.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {auditLogs.map((logEntry) => (
                                        <div key={logEntry.id} className="flex items-start gap-3 rounded-md border p-3">
                                            <div className="shrink-0 mt-0.5">
                                                <div className={`rounded-full p-1.5 ${
                                                    logEntry.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                                    logEntry.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {logEntry.action === 'CREATE' ? <Plus className="h-3 w-3" /> :
                                                     logEntry.action === 'DELETE' ? <History className="h-3 w-3" /> :
                                                     <Pencil className="h-3 w-3" />}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant="outline" className="text-xs">
                                                        {ACTION_LABELS[logEntry.action] ?? logEntry.action}
                                                    </Badge>
                                                    {logEntry.entityName && (
                                                        <span className="text-sm font-medium truncate">
                                                            {logEntry.entityName}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {logEntry.user?.name ?? 'Sistema'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(logEntry.createdAt)}
                                                    </span>
                                                </div>
                                                {logEntry.oldData && logEntry.newData && (
                                                    <details className="mt-2">
                                                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                                            Ver detalhes da alteração
                                                        </summary>
                                                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                            <div className="rounded border p-2 bg-red-50/50 dark:bg-red-950/20">
                                                                <p className="font-medium text-red-700 dark:text-red-400 mb-1">Antes</p>
                                                                <pre className="whitespace-pre-wrap text-muted-foreground overflow-hidden">
                                                                    {formatAuditData(logEntry.oldData)}
                                                                </pre>
                                                            </div>
                                                            <div className="rounded border p-2 bg-green-50/50 dark:bg-green-950/20">
                                                                <p className="font-medium text-green-700 dark:text-green-400 mb-1">Depois</p>
                                                                <pre className="whitespace-pre-wrap text-muted-foreground overflow-hidden">
                                                                    {formatAuditData(logEntry.newData)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Other Configs List */}
            {otherConfigs.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Outras Configurações de BDI</h3>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {otherConfigs.map(cfg => (
                                <Card key={cfg.id} className="hover:shadow-sm transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm">{cfg.name}</CardTitle>
                                            <Badge variant="secondary" className="text-xs">
                                                {formatPercent(toNumber(cfg.percentage))}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="text-xs text-muted-foreground space-y-1">
                                        <div className="flex justify-between">
                                            <span>Adm. Central</span>
                                            <span>{formatPercent(toNumber(cfg.administracaoCentral))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Lucro</span>
                                            <span>{formatPercent(toNumber(cfg.lucro))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tributos</span>
                                            <span>
                                                {formatPercent(
                                                    toNumber(cfg.iss) + toNumber(cfg.pis) + toNumber(cfg.cofins) +
                                                    toNumber(cfg.irpj) + toNumber(cfg.csll)
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-[10px] pt-1 text-muted-foreground/70">
                                            Atualizado em {formatDate(cfg.updatedAt)}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function formatAuditData(jsonString: string): string {
    try {
        const data = JSON.parse(jsonString)
        const relevantKeys = [
            'name', 'percentage', 'administracaoCentral', 'seguroGarantia',
            'risco', 'despesasFinanceiras', 'lucro', 'iss', 'pis', 'cofins', 'irpj', 'csll'
        ]
        const filtered = Object.fromEntries(
            Object.entries(data).filter(([key]) => relevantKeys.includes(key))
        )
        return Object.entries(filtered)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')
    } catch {
        return jsonString
    }
}
