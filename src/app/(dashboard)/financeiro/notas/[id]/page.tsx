import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, FileText, Printer } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

interface InvoicePageProps {
    params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
    const session = await getSession()
    if (!session) redirect("/login")

    const { id } = await params
    const note = await prisma.fiscalNote.findUnique({
        where: { id },
        include: {
            measurements: {
                include: {
                    contractItem: true,
                    project: true
                }
            }
        }
    })

    if (!note) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <h1 className="text-2xl font-bold">Nota Fiscal não encontrada</h1>
                <Button asChild variant="outline">
                    <Link href="/financeiro/faturamento">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Faturamento
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild aria-label="Voltar">
                            <Link href="/financeiro/faturamento">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">Nota Fiscal: {note.number}</h1>
                    </div>
                    <p className="text-muted-foreground ml-10">
                        Detalhes da pré-nota gerada em {format(note.issuedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                    <Button>
                        <FileText className="mr-2 h-4 w-4" /> Baixar XML
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Resumo Financeiro</CardTitle>
                        <CardDescription>Informações gerais da nota</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-medium">Status</span>
                            <Badge variant={note.status === 'ISSUED' ? 'default' : 'secondary'}>
                                {note.status === 'ISSUED' ? 'Emitida' : note.status}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-medium">Valor Total</span>
                            <span className="text-lg font-bold">
                                {Number(note.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-medium">Tipo</span>
                            <span>{note.type}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Chave de Acesso</span>
                            <span className="font-mono text-sm text-muted-foreground break-all">
                                {note.accessKey || 'Não gerada'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Medições Associadas</CardTitle>
                        <CardDescription>Serviços incluídos neste faturamento ({note.measurements.length})</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Projeto</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Qtd.</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {note.measurements.map((measurement) => {
                                    const totalValue = Number(measurement.quantity) * Number(measurement.contractItem.unitPrice);
                                    return (
                                        <TableRow key={measurement.id}>
                                            <TableCell className="font-medium">
                                                {format(measurement.date, 'dd/MM/yy')}
                                            </TableCell>
                                            <TableCell>{measurement.project.name}</TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={measurement.contractItem.description}>
                                                {measurement.contractItem.description}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {Number(measurement.quantity).toLocaleString('pt-BR')} {measurement.contractItem.unit}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
