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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { deleteRentalItem } from '@/app/actions/rental-actions'
import { useToast } from '@/hooks/use-toast'
import { RENTAL_TYPE_LABELS } from '@/lib/rental-icons'
import { RentalItemDialog, type RentalItemData } from './rental-item-dialog'

interface RentalItemRow {
  id: string
  name: string
  type: string
  supplier?: string | null
  supplierPhone?: string | null
  dailyRate?: number | { toString(): string } | null
  weeklyRate?: number | { toString(): string } | null
  monthlyRate?: number | { toString(): string } | null
  description?: string | null
  _count?: { rentals: number }
}

interface RentalItemsTableProps {
  items: RentalItemRow[]
  companyId: string
}

function formatCurrency(value: number | { toString(): string } | null | undefined) {
  if (value == null) return '-'
  const num = typeof value === 'number' ? value : parseFloat(value.toString())
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

function toNumber(value: number | { toString(): string } | null | undefined): number | null {
  if (value == null) return null
  return typeof value === 'number' ? value : parseFloat(value.toString())
}

export function RentalItemsTable({ items, companyId }: RentalItemsTableProps) {
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState('')
  const [editItem, setEditItem] = useState<RentalItemData | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  function openDelete(id: string) {
    setDeleteItemId(id)
    setDeleteDialogOpen(true)
  }

  function openEdit(row: RentalItemRow) {
    setEditItem({
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description ?? null,
      supplier: row.supplier ?? null,
      supplierPhone: row.supplierPhone ?? null,
      dailyRate: toNumber(row.dailyRate),
      weeklyRate: toNumber(row.weeklyRate),
      monthlyRate: toNumber(row.monthlyRate),
    })
    setEditDialogOpen(true)
  }

  async function handleDelete() {
    const result = await deleteRentalItem(deleteItemId)
    if (result.success) {
      toast({ title: 'Item excluído', description: 'Item removido com sucesso.' })
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    }
    setDeleteDialogOpen(false)
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nenhum item cadastrado ainda. Clique em Cadastrar Item para adicionar.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Diária</TableHead>
              <TableHead>Semanal</TableHead>
              <TableHead>Mensal</TableHead>
              <TableHead>Locações</TableHead>
              <TableHead className="w-[60px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {RENTAL_TYPE_LABELS[item.type] ?? item.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.supplier ?? '-'}
                </TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(item.dailyRate)}</TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(item.weeklyRate)}</TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(item.monthlyRate)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{item._count?.rentals ?? 0}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Abrir menu de ações">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => openEdit(item)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => openDelete(item.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog — rendered outside dropdown */}
      {editItem && (
        <RentalItemDialog
          key={editItem.id}
          companyId={companyId}
          item={editItem}
          open={editDialogOpen}
          onOpenChange={(v) => {
            setEditDialogOpen(v)
            if (!v) setEditItem(null)
          }}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Somente itens sem locações ativas podem ser excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
