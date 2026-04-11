import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, FolderOpen, DollarSign, Calendar } from "lucide-react"
import { getPurchaseOrderById } from "@/app/actions/purchase-actions"
import { OrderItemsClient } from "@/components/compras/order-items-client"
import { OrderStatusDialog } from "@/components/compras/order-status-dialog"
import { PurchaseOrderDialog } from "@/components/compras/purchase-order-dialog"
import { formatCurrency, toNumber, formatDate} from "@/lib/formatters"

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Aguardando Aprovação",
    APPROVED: "Aprovado",
    ORDERED: "Pedido Realizado",
    PARTIALLY_RECEIVED: "Recebimento Parcial",
    RECEIVED: "Recebido",
    CANCELLED: "Cancelado",
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PENDING_APPROVAL: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    ORDERED: "bg-purple-100 text-purple-800",
    PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
    RECEIVED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const { id } = await params

    const [order, suppliers, projects, materials] = await Promise.all([
        getPurchaseOrderById(id),
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
        prisma.material.findMany({
            where: { companyId },
            select: { id: true, name: true, unit: true, code: true },
            orderBy: { name: 'asc' }
        }),
    ])

    if (!order) notFound()

    // Converter Decimal para number para Client Components
    const serializedItems = order.items.map(item => ({
        ...item,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        totalPrice: toNumber(item.totalPrice),
    }))

    const fmtDate = (d: Date | null | undefined) => {
        if (!d) return "—"
        return formatDate(d)
    }

    const STATUS_WORKFLOW: Record<string, string[]> = {
        DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
        PENDING_APPROVAL: ['APPROVED', 'CANCELLED', 'DRAFT'],
        APPROVED: ['ORDERED', 'CANCELLED'],
        ORDERED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
        PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
        RECEIVED: [],
        CANCELLED: ['DRAFT'],
    }

    const nextStatuses = STATUS_WORKFLOW[order.status] || []

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/compras">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold">{order.number}</h2>
                            <Badge className={STATUS_COLORS[order.status]}>
                                {STATUS_LABELS[order.status]}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">
                            Criado em {fmtDate(order.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <PurchaseOrderDialog
                        companyId={companyId}
                        suppliers={suppliers}
                        projects={projects}
                        order={order}
                        trigger={
                            <Button variant="outline" size="sm">
                                Editar Pedido
                            </Button>
                        }
                    />
                    {nextStatuses.length > 0 && (
                        <OrderStatusDialog
                            orderId={order.id}
                            currentStatus={order.status}
                            nextStatuses={nextStatuses}
                        />
                    )}
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fornecedor</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-medium">{order.supplier?.name || "—"}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Projeto</CardTitle>
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-medium">{order.project?.name || "—"}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-green-700">{formatCurrency(order.totalValue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Data Prevista</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-medium">{fmtDate(order.expectedAt)}</div>
                        {order.receivedAt && (
                            <p className="text-xs text-muted-foreground">
                                Recebido: {fmtDate(order.receivedAt)}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="items">
                <TabsList>
                    <TabsTrigger value="items">Itens ({order.items.length})</TabsTrigger>
                    <TabsTrigger value="info">Informações</TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="mt-4">
                    <OrderItemsClient
                        orderId={order.id}
                        items={serializedItems}
                        materials={materials}
                        totalValue={toNumber(order.totalValue)}
                    />
                </TabsContent>

                <TabsContent value="info" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Observacoes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {order.notes ? (
                                    <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Nenhuma observacao registrada.</p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Historico de Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'] as const).map((s) => {
                                        const workflow = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED']
                                        const currentIdx = workflow.indexOf(order.status)
                                        const stepIdx = workflow.indexOf(s)
                                        const isPast = stepIdx < currentIdx
                                        const isCurrent = s === order.status
                                        const isFuture = stepIdx > currentIdx

                                        return (
                                            <div key={s} className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full shrink-0 ${
                                                    isCurrent ? 'bg-blue-500 ring-2 ring-blue-200' :
                                                    isPast ? 'bg-green-500' :
                                                    'bg-gray-200'
                                                }`} />
                                                <span className={`text-sm ${
                                                    isCurrent ? 'font-semibold text-blue-700' :
                                                    isPast ? 'text-green-700' :
                                                    isFuture ? 'text-muted-foreground' : ''
                                                }`}>
                                                    {STATUS_LABELS[s]}
                                                </span>
                                                {isCurrent && (
                                                    <Badge variant="outline" className="text-xs ml-auto">Atual</Badge>
                                                )}
                                            </div>
                                        )
                                    })}
                                    {order.status === 'CANCELLED' && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                                            <span className="text-sm font-semibold text-red-700">Cancelado</span>
                                            <Badge variant="outline" className="text-xs ml-auto">Atual</Badge>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Datas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Criado em:</span>
                                    <span>{fmtDate(order.createdAt)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ultima atualizacao:</span>
                                    <span>{fmtDate(order.updatedAt)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Data prevista:</span>
                                    <span>{fmtDate(order.expectedAt)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Data recebimento:</span>
                                    <span>{fmtDate(order.receivedAt)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
