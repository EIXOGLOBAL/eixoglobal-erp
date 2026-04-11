import { requireAdmin } from "@/lib/route-guard"
import { prisma } from "@/lib/prisma"
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
import { RoleBadge } from "@/components/ui/role-badge"
import { AIAccessSelect } from "@/components/ai/ai-access-select"
import { Brain, Zap, Shield, MessageSquare, Ban, Key, Globe, Cpu } from "lucide-react"
import { ApiKeyManager } from "@/components/ai/api-key-manager"
import { getAnthropicApiKey, getSetting, getOpenRouterApiKey, getAIProvider } from "@/lib/system-settings"

export const dynamic = 'force-dynamic'

// Mapeamento de nivel padrao por role
const DEFAULT_LEVEL_BY_ROLE: Record<string, string> = {
  ADMIN: 'FULL',
  MANAGER: 'STANDARD',
  ENGINEER: 'BASIC',
  SUPERVISOR: 'BASIC',
  SAFETY_OFFICER: 'BASIC',
  ACCOUNTANT: 'BASIC',
  HR_ANALYST: 'BASIC',
  USER: 'BASIC',
}

function getEffectiveLevel(role: string, aiAccessLevel: string | null): string {
  if (aiAccessLevel) return aiAccessLevel
  return DEFAULT_LEVEL_BY_ROLE[role] ?? 'BASIC'
}

function AILevelBadge({ level }: { level: string }) {
  switch (level) {
    case 'FULL':
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Completo</Badge>
    case 'STANDARD':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Padr\u00e3o</Badge>
    case 'BASIC':
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200">B\u00e1sico</Badge>
    case 'NONE':
      return <Badge variant="destructive">Desativado</Badge>
    default:
      return <Badge variant="secondary">{level}</Badge>
  }
}

export default async function ConfiguracoesIAPage() {
  await requireAdmin()

  // Anthropic
  const anthropicKey = await getAnthropicApiKey()
  const anthropicConfigured = !!anthropicKey
  const dbAnthropicKey = await getSetting('ANTHROPIC_API_KEY')
  const anthropicMaskedKey = dbAnthropicKey
    ? dbAnthropicKey.slice(0, 8) + '...' + dbAnthropicKey.slice(-4)
    : process.env.ANTHROPIC_API_KEY
      ? process.env.ANTHROPIC_API_KEY.slice(0, 8) + '...' + process.env.ANTHROPIC_API_KEY.slice(-4)
      : null

  // OpenRouter
  const openrouterKey = await getOpenRouterApiKey()
  const openrouterConfigured = !!openrouterKey
  const dbOpenrouterKey = await getSetting('OPENROUTER_API_KEY')
  const openrouterMaskedKey = dbOpenrouterKey
    ? dbOpenrouterKey.slice(0, 8) + '...' + dbOpenrouterKey.slice(-4)
    : null
  const openrouterModel = await getSetting('OPENROUTER_MODEL')

  // Provider ativo
  const activeProvider = await getAIProvider()
  const apiKeyConfigured = anthropicConfigured || openrouterConfigured

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      aiAccessLevel: true,
      isActive: true,
    },
  })

  const totalUsers = users.length
  const usersWithAI = users.filter(
    (u) => u.isActive && getEffectiveLevel(u.role, u.aiAccessLevel) !== 'NONE'
  ).length
  const usersWithoutAI = users.filter(
    (u) => u.isActive && getEffectiveLevel(u.role, u.aiAccessLevel) === 'NONE'
  ).length

  const rateLimits = [
    {
      level: 'Completo (FULL)',
      icon: Zap,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      features: [
        'Chat com IA sem restri\u00e7\u00f5es',
        'An\u00e1lises de todas as empresas',
        'Gera\u00e7\u00e3o de relat\u00f3rios avan\u00e7ados',
        'Predi\u00e7\u00f5es e recomenda\u00e7\u00f5es',
      ],
      rateLimit: '50 requisi\u00e7\u00f5es/hora',
    },
    {
      level: 'Padr\u00e3o (STANDARD)',
      icon: Shield,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      features: [
        'Chat com IA',
        'An\u00e1lises da pr\u00f3pria empresa',
        'Relat\u00f3rios b\u00e1sicos',
        'Sugest\u00f5es operacionais',
      ],
      rateLimit: '30 requisi\u00e7\u00f5es/hora',
    },
    {
      level: 'B\u00e1sico (BASIC)',
      icon: MessageSquare,
      color: 'text-gray-600',
      bg: 'bg-gray-50 dark:bg-gray-950/20',
      features: [
        'Chat com IA (contexto pr\u00f3prio)',
        'Consultas simples',
        'Sem an\u00e1lises de empresa',
        'Sem gera\u00e7\u00e3o de relat\u00f3rios',
      ],
      rateLimit: '20 requisi\u00e7\u00f5es/hora',
    },
    {
      level: 'Desativado (NONE)',
      icon: Ban,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/20',
      features: [
        'Sem acesso \u00e0 IA',
        'Funcionalidades de IA ocultas',
        'Apenas funcionalidades manuais',
      ],
      rateLimit: 'N/A',
    },
  ]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-8 w-8" />
          Configura\u00e7\u00f5es de IA
        </h2>
        <p className="text-muted-foreground">
          Gerencie as permiss\u00f5es e n\u00edveis de acesso \u00e0 Intelig\u00eancia Artificial do sistema
        </p>
      </div>

      {/* Secao 1: Provedores de IA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle className="text-lg">Provedores de IA</CardTitle>
          </div>
          <CardDescription>
            Configure Anthropic Claude e/ou OpenRouter. OpenRouter oferece modelos gratuitos.
          </CardDescription>
          {activeProvider && (
            <div className="flex items-center gap-2 pt-2">
              {activeProvider === 'anthropic' ? (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1">
                  <Cpu className="h-3 w-3" /> Anthropic Claude (ativo)
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
                  <Globe className="h-3 w-3" /> OpenRouter (ativo){openrouterModel ? ` - ${openrouterModel.split('/').pop()}` : ''}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <ApiKeyManager
            anthropicMaskedKey={anthropicMaskedKey}
            anthropicConfigured={anthropicConfigured}
            openrouterMaskedKey={openrouterMaskedKey}
            openrouterConfigured={openrouterConfigured}
            activeProvider={activeProvider}
            openrouterModel={openrouterModel}
          />
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total de usu\u00e1rios</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <p className="text-2xl font-bold text-green-600">{usersWithAI}</p>
              <p className="text-xs text-muted-foreground">Com acesso \u00e0 IA</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <p className="text-2xl font-bold text-red-600">{usersWithoutAI}</p>
              <p className="text-xs text-muted-foreground">Sem acesso \u00e0 IA</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Se\u00e7\u00e3o 2: Tabela de usu\u00e1rios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Permiss\u00f5es de IA por Usu\u00e1rio</CardTitle>
          <CardDescription>
            Configure o n\u00edvel de acesso \u00e0 IA de cada usu\u00e1rio. &quot;Auto&quot; utiliza o n\u00edvel padr\u00e3o baseado no role.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>N\u00edvel Efetivo</TableHead>
                <TableHead>N\u00edvel de IA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const effectiveLevel = getEffectiveLevel(user.role, user.aiAccessLevel)
                return (
                  <TableRow key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{user.name || '-'}</p>
                        {!user.isActive && (
                          <Badge variant="secondary" className="text-xs mt-1">Inativo</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">@{user.username}</span>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <AILevelBadge level={effectiveLevel} />
                    </TableCell>
                    <TableCell>
                      <AIAccessSelect
                        userId={user.id}
                        currentLevel={user.aiAccessLevel}
                        userName={user.name || user.username}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Se\u00e7\u00e3o 3: Limites de uso */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Limites de Uso por N\u00edvel</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {rateLimits.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.level}>
                <CardHeader className="pb-3">
                  <div className={`inline-flex p-2 rounded-lg ${item.bg} w-fit mb-2`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <CardTitle className="text-sm">{item.level}</CardTitle>
                  <CardDescription className="text-xs">
                    Limite: {item.rateLimit}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1">
                    {item.features.map((feature) => (
                      <li key={feature} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">&#8226;</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
