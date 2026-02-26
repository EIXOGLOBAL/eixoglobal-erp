'use client'

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Pencil, Trash2, ShoppingCart } from "lucide-react"
import { deletePurchaseOrder } from "@/app/actions/purchase-actions"
import { useToast } from "@/hooks/use-toast"
import { PurchaseOrderDialog } from "./purchase-order-dialog"

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Aguardando Aprovacao",
    APPROVED: "Aprovado",
    ORDERED: "Pedido Realizado",
    PARTIALLY_RECEIVED: "Recebimento Parcial",
    RECEIVED: "Recebido",
    CANCELLED: "Cancelado",
}

const STATUS_CLASSES: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PENDING_APPROVAL: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    ORDERED: "bg-purple-100 text-purple-800",
    PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
    RECEIVED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
}

interface Order {
    id: string
    number: string
    status: string
    totalValue: number
    expectedAt: Date | null
    createdAt: Date
    supplier: { id: string; name: string } | null
    project: { id: string; name: string } | null
    _count: { items: number }
}

interface Supplier {
    id: string
    name: string
}

interface Project {
    id: string
    name: string
}

interface PurchaseOrdersTableProps {
    orders: Order[]
    companyId: string
    suppliers: Supplier[]
    projects: Project[]
}

export function PurchaseOrdersTable({ orders, companyId, suppliers, projects }: PurchaseOrdersTableProps) {
    const { toast } = useToast()

    const fmt = (n: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

    const fmtDate = (d: Date | null | undefined) => {
        if (!d) return "—"
        return new Date(d).toLocaleDateString('pt-BR')
    }

    async function handleDelete(id: string, number: string) {
        if (!confirm(`Deletar o pedido "${number}"? Esta acao nao pode ser desfeita.`)) return

        const result = await deletePurchaseOrder(id)
        if (result.success) {
            toast({ title: "Pedido Deletado", description: `${number} foi removido.` })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground mb-3 opacity-30" />
                <p className="text-muted-foreground">Nenhum pedido de compra cadastrado.</p>
                <p className="text-sm text-muted-foreground">Clique em &quot;Novo Pedido&quot; para comecar.</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="text-center">Itens</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">
                            {order.number}
                        </TableCell>
                        <TableCell>
                            {order.supplier?.name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                            {order.project?.name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge variant="outline">{order._count.items}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                            {fmt(order.totalValue)}
                        </TableCell>
                        <TableCell>
                            <Badge className={STATUS_CLASSES[order.status]}>
                                {STATUS_LABELS[order.status] || order.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{fmtDate(order.expectedAt)}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Acoes</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={`/compras/${order.id}`}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Ver Detalhes
                                        </Link>
                                    </DropdownMenuItem>
                                    <PurchaseOrderDialog
                                        companyId={companyId}
                                        suppliers={suppliers}
                                        projects={projects}
                                        order={order}
                                        trigger={
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                        }
                                    />
                                    {order.status === 'DRAFT' && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => handleDelete(order.id, order.number)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Deletar
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
