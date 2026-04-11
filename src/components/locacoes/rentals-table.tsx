'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { MoreHorizontal, Eye, DollarSign, RotateCcw, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { returnRental, cancelRental, addRentalPayment } from '@/app/actions/rental-actions'
import { useToast } from '@/hooks/use-toast'
import {
  RENTAL_TYPE_LABELS,
  BILLING_CYCLE_LABELS,
  RENTAL_STATUS_LABELS,
} from '@/lib/rental-icons'

import { formatDate } from "@/lib/formatters"
interface RentalProject {
  id: string
  name: string
}

interface RentalItemRef {
  id: string
  name: string
  type: string
}

interface Rental {
  id: string
  item: RentalItemRef
  project?: RentalProject | null
  billingCycle: string
  unitRate: number | { toString(): string }
  startDate: Date | string
  expectedEndDate?: Date | string | null
  status: string
}

interface RentalsTableProps {
  rentals: Rental[]
}

function statusBadge(status: string) {
  const colorMap: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-800 border border-blue-200',
    RETURNED: 'bg-green-100 text-green-800 border border-green-200',
    OVERDUE: 'bg-red-100 text-red-800 border border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-800 border border-gray-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorMap[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {RENTAL_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function formatCurrency(value: number | { toString(): string }) {
  const num = typeof value === 'number' ? value : parseFloat(value.toString())
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

export function RentalsTable({ rentals }: RentalsTableProps) {
  const { toast } = useToast()

  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returnRentalId, setReturnRentalId] = useState('')
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]!)

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelRentalId, setCancelRentalId] = useState('')

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentRentalId, setPaymentRentalId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]!)
  const [paymentRefMonth, setPaymentRefMonth] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)

  function openReturn(id: string) {
    setReturnRentalId(id)
    setReturnDialogOpen(true)
  }

  function openCancel(id: string) {
    setCancelRentalId(id)
    setCancelDialogOpen(true)
  }

  function openPayment(id: string) {
    setPaymentRentalId(id)
    setPaymentAmount(0)
    setPaymentDate(new Date().toISOString().split('T')[0]!)
    setPaymentRefMonth('')
    setPaymentNotes('')
    setPaymentDialogOpen(true)
  }

  async function handleReturn() {
    const result = await returnRental(returnRentalId, returnDate)
    if (result.success) {
      toast({ title: 'Locação devolvida', description: 'Item marcado como devolvido.' })
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    }
    setReturnDialogOpen(false)
  }

  async function handleCancel() {
    const result = await cancelRental(cancelRentalId)
    if (result.success) {
      toast({ title: 'Locação cancelada', description: 'A locação foi cancelada.' })
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    }
    setCancelDialogOpen(false)
  }

  async function handlePayment() {
    if (paymentAmount <= 0) {
      toast({ title: 'Erro', description: 'Informe um valor maior que zero.', variant: 'destructive' })
      return
    }
    setPaymentLoading(true)
    const result = await addRentalPayment({
      rentalId: paymentRentalId,
      amount: paymentAmount,
      paidDate: paymentDate,
      referenceMonth: paymentRefMonth || null,
      notes: paymentNotes || null,
    })
    setPaymentLoading(false)
    if (result.success) {
      toast({ title: 'Pagamento registrado', description: 'Pagamento registrado com sucesso.' })
      setPaymentDialogOpen(false)
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    }
  }

  if (rentals.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nenhuma locação encontrada.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Valor/Período</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Prev. Devolução</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rentals.map((rental) => (
              <TableRow key={rental.id}>
                <TableCell className="font-medium">{rental.item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {RENTAL_TYPE_LABELS[rental.item.type] ?? rental.item.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {rental.project?.name ?? '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {BILLING_CYCLE_LABELS[rental.billingCycle] ?? rental.billingCycle}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatCurrency(rental.unitRate)}
                </TableCell>
                <TableCell className="text-sm">{formatDate(rental.startDate)}</TableCell>
                <TableCell className="text-sm">{formatDate(rental.expectedEndDate)}</TableCell>
                <TableCell>{statusBadge(rental.status)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/locacoes/${rental.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhe
                        </Link>
                      </DropdownMenuItem>
                      {rental.status === 'ACTIVE' && (
                        <>
                          <DropdownMenuItem onSelect={() => openPayment(rental.id)}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar Pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openReturn(rental.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Devolver
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => openCancel(rental.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
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
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Registre um pagamento realizado para esta locação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valor Pago (R$) *</label>
              <CurrencyInput
                value={paymentAmount}
                onChange={(v) => setPaymentAmount(v)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data do Pagamento *</label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mês de Referência</label>
              <Input
                type="month"
                value={paymentRefMonth}
                onChange={(e) => setPaymentRefMonth(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Observações..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePayment} disabled={paymentLoading}>
              {paymentLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Devolução</AlertDialogTitle>
            <AlertDialogDescription>
              Informe a data de devolução do item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">Data de Devolução</label>
            <Input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReturn}>
              Confirmar Devolução
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Locação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta locação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Locação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
