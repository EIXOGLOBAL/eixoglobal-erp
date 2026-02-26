import { getMaterials, getInventoryValue, getLowStockMaterials, getMovements } from "@/app/actions/inventory-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle, DollarSign, TrendingDown, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react"
import { MaterialDialog } from "@/components/inventory/material-dialog"
import { MaterialsTable } from "@/components/inventory/materials-table"
import { Badge } from "@/components/ui/badge"

export default async function EstoquePage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const [materials, inventoryValueResult, lowStockMaterials, recentMovements] = await Promise.all([
        getMaterials(companyId),
        getInventoryValue(companyId),
        getLowStockMaterials(companyId),
        getMovements(companyId),
    ])

    const totalValue = inventoryValueResult.success ? inventoryValueResult.data?.totalValue || 0 : 0
    const totalItems = materials.length
    const lowStockCount = lowStockMaterials.length
    const zeroStockCount = materials.filter(m => m.currentStock === 0).length

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Estoque</h2>
                    <p className="text-muted-foreground">
                        Controle de materiais e movimentações de estoque
                    </p>
                </div>
                <MaterialDialog companyId={companyId} />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Materiais</CardTitle>
                        <Package className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalItems}</div>
                        <p className="text-xs text-muted-foreground">Itens cadastrados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor do Estoque</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">Valor total em estoque</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">Abaixo do mínimo</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{zeroStockCount}</div>
                        <p className="text-xs text-muted-foreground">Estoque zerado</p>
                    </CardContent>
                </Card>
            </div>

            {/* Alertas de Estoque Baixo */}
            {lowStockCount > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Materiais com Estoque Crítico
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {lowStockMaterials.slice(0, 5).map(m => (
                                <span key={m.id} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                    {m.name}: {m.currentStock} {m.unit} (mín: {m.minStock})
                                </span>
                            ))}
                            {lowStockCount > 5 && (
                                <span className="text-xs text-orange-600">+{lowStockCount - 5} outros</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabela de Materiais */}
            <Card>
                <CardHeader>
                    <CardTitle>Materiais em Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                    <MaterialsTable materials={materials} companyId={companyId} />
                </CardContent>
            </Card>

            {/* Histórico de Movimentações */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Últimas Movimentações
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentMovements.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            Nenhuma movimentação registrada. Use "Movimentar Estoque" na tabela acima.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="text-left py-2 pr-4">Tipo</th>
                                        <th className="text-left py-2 pr-4">Material</th>
                                        <th className="text-right py-2 pr-4">Quantidade</th>
                                        <th className="text-left py-2 pr-4">Projeto</th>
                                        <th className="text-left py-2 pr-4">Obs.</th>
                                        <th className="text-right py-2">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentMovements.slice(0, 20).map(m => (
                                        <tr key={m.id} className="border-b last:border-0">
                                            <td className="py-2 pr-4">
                                                {m.type === 'IN' ? (
                                                    <div className="flex items-center gap-1 text-green-700">
                                                        <ArrowDownCircle className="h-4 w-4" />
                                                        <Badge className="bg-green-100 text-green-800 text-xs">Entrada</Badge>
                                                    </div>
                                                ) : m.type === 'OUT' ? (
                                                    <div className="flex items-center gap-1 text-red-700">
                                                        <ArrowUpCircle className="h-4 w-4" />
                                                        <Badge className="bg-red-100 text-red-800 text-xs">Saída</Badge>
                                                    </div>
                                                ) : m.type === 'ADJUSTMENT' ? (
                                                    <Badge className="bg-purple-100 text-purple-800 text-xs">Ajuste</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs">Transferência</Badge>
                                                )}
                                            </td>
                                            <td className="py-2 pr-4">
                                                <span className="font-medium">{m.material.name}</span>
                                                <span className="text-muted-foreground ml-1 font-mono text-xs">({m.material.code})</span>
                                            </td>
                                            <td className="py-2 pr-4 text-right font-medium">
                                                <span className={m.type === 'IN' ? 'text-green-700' : m.type === 'OUT' ? 'text-red-700' : ''}>
                                                    {m.type === 'OUT' ? '-' : '+'}{m.quantity} {m.material.unit}
                                                </span>
                                            </td>
                                            <td className="py-2 pr-4 text-muted-foreground text-xs">
                                                {m.project?.name || '—'}
                                            </td>
                                            <td className="py-2 pr-4 text-muted-foreground text-xs max-w-[200px] truncate">
                                                {m.notes || '—'}
                                            </td>
                                            <td className="py-2 text-right text-muted-foreground text-xs">
                                                {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {recentMovements.length > 20 && (
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Exibindo 20 de {recentMovements.length} movimentações
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
