import { getClientById } from '@/app/actions/client-actions'
import { getSession } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  FileText,
} from 'lucide-react'
import { ClientDialog } from '@/components/clients/client-dialog'

export const dynamic = 'force-dynamic'

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

const projectStatusLabels: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  ON_HOLD: 'Em Espera',
  CANCELLED: 'Cancelado',
}

const projectStatusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PLANNING: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  ON_HOLD: 'outline',
  CANCELLED: 'destructive',
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const result = await getClientById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const client = result.data

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {client.code && (
              <span className="text-sm font-mono text-muted-foreground">
                #{client.code}
              </span>
            )}
            <h1 className="text-3xl font-bold tracking-tight">
              {client.displayName}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {client.type === 'COMPANY' ? client.companyName : client.personName}
          </p>
        </div>
        <Badge variant={statusVariants[client.status]}>
          {statusLabels[client.status]}
        </Badge>
        <Badge variant="outline">
          {client.type === 'COMPANY' ? 'Pessoa Jurídica' : 'Pessoa Física'}
        </Badge>
        <ClientDialog companyId={client.companyId} client={client} />
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {client.type === 'COMPANY' ? 'CNPJ' : 'CPF'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {client.type === 'COMPANY'
                ? client.cnpj || '—'
                : client.cpf || '—'}
            </div>
            {client.type === 'COMPANY' && client.tradeName && (
              <p className="text-xs text-muted-foreground mt-1">
                Nome Fantasia: {client.tradeName}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contato</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{client.email || '—'}</div>
            {(client.phone || client.mobile) && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {client.phone || client.mobile}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Endereço</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {fullAddress || '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responsável</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {client.contactPerson || '—'}
            </div>
            {client.contactRole && (
              <p className="text-xs text-muted-foreground mt-1">
                {client.contactRole}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="obras">
            Obras ({client.projects.length})
          </TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* Dados Gerais Tab */}
        <TabsContent value="dados" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informações do Cliente</CardTitle>
                <ClientDialog companyId={client.companyId} client={client} trigger={
                  <Button variant="outline" size="sm">Editar</Button>
                } />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {client.type === 'COMPANY' ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Razão Social</p>
                      <p className="text-sm mt-0.5">{client.companyName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nome Fantasia</p>
                      <p className="text-sm mt-0.5">{client.tradeName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CNPJ</p>
                      <p className="text-sm mt-0.5">{client.cnpj || '—'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                      <p className="text-sm mt-0.5">{client.personName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CPF</p>
                      <p className="text-sm mt-0.5">{client.cpf || '—'}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm mt-0.5">{client.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p className="text-sm mt-0.5">{client.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Celular</p>
                  <p className="text-sm mt-0.5">{client.mobile || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Responsável</p>
                  <p className="text-sm mt-0.5">{client.contactPerson || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cargo do Responsável</p>
                  <p className="text-sm mt-0.5">{client.contactRole || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Endereço Completo</p>
                  <p className="text-sm mt-0.5">{fullAddress || '—'}</p>
                </div>
                {client.notes && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Observações</p>
                    <p className="text-sm mt-0.5">{client.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Obras Tab */}
        <TabsContent value="obras" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projetos Vinculados</CardTitle>
              <CardDescription>Obras executadas para este cliente</CardDescription>
            </CardHeader>
            <CardContent>
              {client.projects.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome da Obra</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Orçamento</TableHead>
                      <TableHead className="text-right">Boletins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {project.code || '—'}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={projectStatusVariants[project.status] || 'outline'}
                          >
                            {projectStatusLabels[project.status] || project.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {project.budget
                            ? new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(Number(project.budget))
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {project._count.bulletins}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum projeto vinculado a este cliente.</p>
                  <p className="text-sm mt-1">
                    <Link href="/projects" className="text-blue-600 hover:underline">
                      Acesse Projetos
                    </Link>{' '}
                    para vincular uma obra.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico Tab */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>Registro de alterações do cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Cliente cadastrado</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(client.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                {client.updatedAt.toString() !== client.createdAt.toString() && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Última atualização</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(client.updatedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
