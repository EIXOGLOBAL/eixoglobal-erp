'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { QuickViewSheet } from '@/components/ui/quick-view-sheet'
import { ClientDialog } from './client-dialog'
import {
  Building2,
  User,
  Mail,
  Phone,
  Smartphone,
  MapPin,
  FileText,
  ExternalLink,
  Pencil,
  Calendar,
  Briefcase,
} from 'lucide-react'
import { useState } from 'react'

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

interface ClientQuickViewProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value}</p>
      </div>
    </div>
  )
}

export function ClientQuickView({
  client,
  open,
  onOpenChange,
  companyId,
}: ClientQuickViewProps) {
  const router = useRouter()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  if (!client) return null

  const fullAddress = [
    client.address,
    client.number,
    client.complement,
    client.neighborhood,
    client.city,
    client.state,
    client.zipCode,
  ]
    .filter(Boolean)
    .join(', ')

  const document =
    client.type === 'COMPANY'
      ? client.cnpj
      : client.cpf

  const documentLabel =
    client.type === 'COMPANY' ? 'CNPJ' : 'CPF'

  const createdAt = new Date(client.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const updatedAt = new Date(client.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <>
      <QuickViewSheet
        title={client.displayName}
        description={
          client.type === 'COMPANY'
            ? client.companyName || undefined
            : client.personName || undefined
        }
        open={open}
        onOpenChange={onOpenChange}
        footer={
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setEditDialogOpen(true)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                onOpenChange(false)
                router.push(`/clientes/${client.id}`)
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver Completo
            </Button>
          </>
        }
      >
        {/* Status e Tipo */}
        <div className="flex items-center gap-2 mb-4">
          {client.code && (
            <span className="text-xs font-mono text-muted-foreground">
              #{client.code}
            </span>
          )}
          <Badge variant={statusVariants[client.status]}>
            {statusLabels[client.status]}
          </Badge>
          <Badge variant="outline">
            {client.type === 'COMPANY' ? 'Pessoa Jur\u00eddica' : 'Pessoa F\u00edsica'}
          </Badge>
        </div>

        {/* Documento */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Identifica\u00e7\u00e3o
          </h3>
          <InfoRow icon={FileText} label={documentLabel} value={document} />
          {client.type === 'COMPANY' && client.tradeName && (
            <InfoRow
              icon={Building2}
              label="Nome Fantasia"
              value={client.tradeName}
            />
          )}
        </div>

        <Separator className="my-4" />

        {/* Contato */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Contato</h3>
          <InfoRow icon={Mail} label="Email" value={client.email} />
          <InfoRow icon={Phone} label="Telefone" value={client.phone} />
          <InfoRow icon={Smartphone} label="Celular" value={client.mobile} />
          {!client.email && !client.phone && !client.mobile && (
            <p className="text-xs text-muted-foreground py-1">
              Nenhum contato cadastrado.
            </p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Endereco */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Endere\u00e7o</h3>
          {fullAddress ? (
            <InfoRow icon={MapPin} label="Endere\u00e7o Completo" value={fullAddress} />
          ) : (
            <p className="text-xs text-muted-foreground py-1">
              Nenhum endere\u00e7o cadastrado.
            </p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Responsavel */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Respons\u00e1vel
          </h3>
          {client.contactPerson ? (
            <>
              <InfoRow icon={User} label="Nome" value={client.contactPerson} />
              <InfoRow
                icon={Briefcase}
                label="Cargo"
                value={client.contactRole}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-1">
              Nenhum respons\u00e1vel cadastrado.
            </p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Obras */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Obras</h3>
          <div className="flex items-center gap-3 py-1.5">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">
                Projetos Vinculados
              </p>
              <p className="text-sm font-medium">
                {client._count.projects}{' '}
                {client._count.projects === 1 ? 'projeto' : 'projetos'}
              </p>
            </div>
          </div>
        </div>

        {/* Observacoes */}
        {client.notes && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Observa\u00e7\u00f5es
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {client.notes}
              </p>
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Historico */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Hist\u00f3rico</h3>
          <InfoRow
            icon={Calendar}
            label="Cadastrado em"
            value={createdAt}
          />
          {client.updatedAt.toString() !== client.createdAt.toString() && (
            <InfoRow
              icon={Calendar}
              label="\u00daltima atualiza\u00e7\u00e3o"
              value={updatedAt}
            />
          )}
        </div>
      </QuickViewSheet>

      {/* Dialog de edi\u00e7\u00e3o (fora do Sheet para evitar conflito de portals) */}
      {editDialogOpen && (
        <ClientDialog
          companyId={companyId}
          client={client}
          open={editDialogOpen}
          onOpenChange={(o) => {
            setEditDialogOpen(o)
            if (!o) {
              // Fecha o quick view tambem apos edicao
            }
          }}
        />
      )}
    </>
  )
}
