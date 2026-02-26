import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getRentalById } from '@/app/actions/rental-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Building2, Calendar, DollarSign, FolderKanban, Phone } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PaymentDialog } from '@/components/locacoes/payment-dialog'
import {
  RENTAL_TYPE_LABELS,
  BILLING_CYCLE_LABELS,
  RENTAL_STATUS_LABELS,
} from '@/lib/rental-icons'

function formatCurrency(value: number | { toString(): string } | null | undefined) {
  if (value == null) return 'R$ 0,00'
  const num = typeof value === 'number' ? value : parseFloat(value.toString())
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-800 border border-blue-200',
    RETURNED: 'bg-green-100 text-green-800 border border-green-200',
    OVERDUE: 'bg-red-100 text-red-800 border border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-800 border border-gray-200',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LocacaoDetailPage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const result = await getRentalById(id)
  if (!result.success || !result.data) {
    notFound()
  }

  const rental = result.data
  const item = rental.item

  const totalPaid = Number(rental.totalPaid ?? 0)
  const unitRate = Number(rental.unitRate)

  // Calcular custo acumulado estimado
  const start = new Date(rental.startDate)
  const end = rental.actualEndDate
    ? new Date(rental.actualEndDate)
    : rental.expectedEndDate
      ? new Date(rental.expectedEndDate)
      : new Date()
  const daysDiff = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

  let estimatedTotal = 0
  if (rental.billingCycle === 'DAILY') estimatedTotal = unitRate * daysDiff
  else if (rental.billingCycle === 'WEEKLY') estimatedTotal = unitRate * Math.ceil(daysDiff / 7)
  else estimatedTotal = unitRate * Math.ceil(daysDiff / 30)

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/locacoes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-3xl font-bold tracking-tight">{item.name}</h2>
            <Badge variant="outline">{RENTAL_TYPE_LABELS[item.type] ?? item.type}</Badge>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(rental.status)}`}
            >
              {RENTAL_STATUS_LABELS[rental.status] ?? rental.status}
            </span>
          </div>
          {item.description && (
            <p className="text-muted-foreground mt-1">{item.description}</p>
          )}
        </div>
        {rental.status === 'ACTIVE' && (
          <PaymentDialog rentalId={rental.id} />
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{item.supplier ?? '-'}</p>
            {item.supplierPhone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {item.supplierPhone}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              Projeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{rental.project?.name ?? 'Sem projeto vinculado'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-medium">Início:</span> {formatDate(rental.startDate)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Prev. Devolução:</span>{' '}
              {formatDate(rental.expectedEndDate)}
            </p>
            {rental.actualEndDate && (
              <p className="text-sm">
                <span className="font-medium">Devolvido em:</span>{' '}
                {formatDate(rental.actualEndDate)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {BILLING_CYCLE_LABELS[rental.billingCycle] ?? rental.billingCycle} —{' '}
              {formatCurrency(rental.unitRate)}/período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-medium">Total Pago:</span>{' '}
              <span className="text-green-600 font-mono">{formatCurrency(totalPaid)}</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Estimativa:</span>{' '}
              <span className="font-mono">{formatCurrency(estimatedTotal)}</span>
            </p>
            {estimatedTotal > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((totalPaid / estimatedTotal) * 100)}% pago
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pagamentos">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="historico">Histórico do Item</TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Histórico de Pagamentos</h3>
            {rental.status === 'ACTIVE' && (
              <PaymentDialog rentalId={rental.id} />
            )}
          </div>
          {rental.payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pagamento registrado ainda.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Mês Ref.</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rental.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paidDate)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.referenceMonth ?? '-'}
                      </TableCell>
                      <TableCell className="font-mono text-green-600 font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {payment.notes ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex justify-end mt-3">
            <p className="text-sm text-muted-foreground">
              Total pago:{' '}
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(totalPaid)}
              </span>
            </p>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <h3 className="font-semibold mb-4">Outras Locações deste Item</h3>
          <p className="text-sm text-muted-foreground">
            Item: <span className="font-medium">{item.name}</span>
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Tipo: <span className="font-medium">{RENTAL_TYPE_LABELS[item.type] ?? item.type}</span>
          </p>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{rental.project?.name ?? '-'}</TableCell>
                  <TableCell>{BILLING_CYCLE_LABELS[rental.billingCycle] ?? rental.billingCycle}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(rental.unitRate)}</TableCell>
                  <TableCell>{formatDate(rental.startDate)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(rental.status)}`}
                    >
                      {RENTAL_STATUS_LABELS[rental.status] ?? rental.status}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
