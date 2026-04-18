'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, ShieldCheck, UserX, Ban } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { changeClientStatus } from '@/app/actions/client-actions'
import { ClientDialog } from './client-dialog'
import { ClientQuickView } from './client-quick-view'
import { ExportButton } from '@/components/ui/export-button'
import type { ExportColumn } from '@/lib/export-utils'

const clientExportColumns: ExportColumn[] = [
  { key: 'code', label: 'Codigo' },
  { key: 'displayName', label: 'Nome / Razao Social' },
  { key: 'typePtBr', label: 'Tipo' },
  { key: 'document', label: 'CNPJ / CPF' },
  { key: 'cityState', label: 'Cidade / UF' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'statusPtBr', label: 'Status' },
  { key: 'createdAt', label: 'Cadastro' },
]

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  BLOCKED: 'destructive',
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  BLOCKED: 'Bloqueado',
}

interface Client {
  id: string
  code: string | null
  displayName: string
  type: string
  companyName: string | null
  tradeName: string | null
  personName: string | null
  cnpj: string | null
  cpf: string | null
  city: string | null
  state: string | null
  status: string
  email: string | null
  phone: string | null
  mobile: string | null
  address: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  zipCode: string | null
  contactPerson: string | null
  contactRole: string | null
  notes: string | null
  companyId: string
  createdAt: Date
  updatedAt: Date
  _count: { projects: number }
}

interface ClientsTableProps {
  clients: Client[]
  companyId: string
}

export function ClientsTable({ clients, companyId }: ClientsTableProps) {
  const { toast } = useToast()
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [quickViewClient, setQuickViewClient] = useState<Client | null>(null)
  const [quickViewOpen, setQuickViewOpen] = useState(false)

  function handleQuickView(client: Client) {
    setQuickViewClient(client)
    setQuickViewOpen(true)
  }

  async function handleStatusChange(
    id: string,
    status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  ) {
    const result = await changeClientStatus(id, status)
    if (result.success) {
      toast({
        title: 'Status alterado',
        description: `Status do cliente alterado para ${statusLabels[status]}.`,
      })
      window.location.reload()
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: result.error,
      })
    }
  }

  function handleEdit(client: Client) {
    setEditClient(client)
    setEditDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lista de Clientes</CardTitle>
        <ExportButton
          data={clients.map(c => ({
            ...c,
            code: c.code ? `#${c.code}` : '',
            typePtBr: c.type === 'COMPANY' ? 'PJ' : 'PF',
            document: c.type === 'COMPANY' ? (c.cnpj || '') : (c.cpf || ''),
            cityState: c.city && c.state ? `${c.city} / ${c.state}` : (c.city || ''),
            statusPtBr: statusLabels[c.status] || c.status,
          }))}
          columns={clientExportColumns}
          filename="clientes"
          title="Clientes"
          sheetName="Clientes"
          size="sm"
        />
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>Nenhum cliente cadastrado ainda.</p>
            <p className="text-sm mt-1">Use o botão &quot;Novo Cliente&quot; para começar.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CNPJ / CPF</TableHead>
                <TableHead>Cidade / UF</TableHead>
                <TableHead className="text-center">Obras</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleQuickView(client)}
                >
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {client.code ? `#${client.code}` : '—'}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <div>
                      <span
                        className="font-medium text-blue-600 hover:underline block truncate"
                      >
                        {client.displayName}
                      </span>
                      {client.type === 'COMPANY' && client.tradeName && (
                        <p className="text-xs text-muted-foreground">
                          {client.tradeName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {client.type === 'COMPANY' ? 'PJ' : 'PF'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.type === 'COMPANY'
                      ? client.cnpj || '—'
                      : client.cpf || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {client.city && client.state
                      ? `${client.city} / ${client.state}`
                      : client.city || '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{client._count.projects}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[client.status]}>
                      {statusLabels[client.status]}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Abrir menu de ações">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/clientes/${client.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhe
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(client)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Alterar Status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(client.id, 'ACTIVE')}
                              disabled={client.status === 'ACTIVE'}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                              Ativo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(client.id, 'INACTIVE')}
                              disabled={client.status === 'INACTIVE'}
                            >
                              <UserX className="mr-2 h-4 w-4 text-orange-600" />
                              Inativo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(client.id, 'BLOCKED')}
                              disabled={client.status === 'BLOCKED'}
                            >
                              <Ban className="mr-2 h-4 w-4 text-red-600" />
                              Bloqueado
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit dialog outside dropdown */}
      {editClient && (
        <ClientDialog
          companyId={companyId}
          client={editClient}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) setEditClient(null)
          }}
        />
      )}

      {/* Quick View Sheet */}
      <ClientQuickView
        client={quickViewClient}
        open={quickViewOpen}
        onOpenChange={(open) => {
          setQuickViewOpen(open)
          if (!open) setQuickViewClient(null)
        }}
        companyId={companyId}
      />
    </Card>
  )
}
