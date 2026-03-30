import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, DollarSign, Clock, CalendarDays } from "lucide-react"
import { getPurchaseOrders } from "@/app/actions/purchase-actions"
import { PurchaseOrdersTable } from "@/components/compras/purchase-orders-table"
import { PurchaseOrderDialog } from "@/components/compras/purchase-order-dialog"
import { toNumber, formatCurrency } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

export default async function ComprasPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const [ordersResponse, suppliers, projects] = await Promise.all([
        getPurchaseOrders({ companyId }),
        prisma.supplier.findMany({
            where: { companyId, isActive: true },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.project.findMany({
            where: { companyId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
    ])

    const orders = ordersResponse.data || []
    const activeOrders = orders.filter(o => o.status !== 'DRAFT' && o.status !== 'CANCELLED')
    const totalActiveValue = activeOrders.reduce((sum, o) => sum + toNumber(o.totalValue), 0)
    const awaitingReceival = orders.filter(o => o.status === 'ORDERED' || o.status === 'PARTIALLY_RECEIVED')

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const ordersThisMonth = orders.filter(o => {
        const d = new Date(o.createdAt)
        return d >= startOfMonth && d <= endOfMonth
    })

    // Converter Decimal para number para Client Components
    const serializedOrders = orders.map(order => ({
        ...order,
        totalValue: toNumber(order.totalValue)
    }))

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Pedidos de Compra</h2>
                    <p className="text-muted-foreground">
                        Gestão de pedidos de compra e suprimentos
                    </p>
                </div>
                <PurchaseOrderDialog
                    companyId={companyId}
                    suppliers={suppliers}
                    projects={projects}
                />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos Ativos</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeOrders.length}</div>
                        <p className="text-xs text-muted-foreground">Excluindo rascunhos e cancelados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total em Pedidos</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{formatCurrency(totalActiveValue)}</div>
                        <p className="text-xs text-muted-foreground">Soma dos pedidos ativos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aguardando Recebimento</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">{awaitingReceival.length}</div>
                        <p className="text-xs text-muted-foreground">Pedidos Realizados / Parcial</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos do Mês</CardTitle>
                        <CalendarDays className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ordersThisMonth.length}</div>
                        <p className="text-xs text-muted-foreground">Criados neste mês</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de pedidos */}
            <Card>
                <CardHeader>
                    <CardTitle>Todos os Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                    <PurchaseOrdersTable
                        orders={serializedOrders}
                        companyId={companyId}
                        suppliers={suppliers}
                        projects={projects}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
