'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, Lock, User, Palette, Bell } from 'lucide-react'
import { updateProfile, changePassword } from '@/app/actions/profile-actions'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação obrigatória'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ProfileFormProps {
  currentName: string
  currentEmail: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProfileForm({ currentName, currentEmail }: ProfileFormProps) {
  return (
    <div className="space-y-6">
      <PersonalInfoSection
        currentName={currentName}
        currentEmail={currentEmail}
      />
      <SecuritySection />
      <PreferencesSection />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Secao: Informacoes Pessoais
// ---------------------------------------------------------------------------
function PersonalInfoSection({
  currentName,
  currentEmail,
}: {
  currentName: string
  currentEmail: string
}) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: currentName, email: currentEmail },
  })

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    setLoading(true)
    try {
      const result = await updateProfile(values)
      if (result.success) {
        toast({ title: 'Perfil atualizado com sucesso!' })
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Informações Pessoais
        </CardTitle>
        <CardDescription>Atualize seu nome e dados de contato</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      readOnly
                      className="bg-muted cursor-not-allowed"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado por aqui. Contate o administrador.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Informações
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Secao: Seguranca
// ---------------------------------------------------------------------------
function SecuritySection() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: z.infer<typeof passwordSchema>) {
    setLoading(true)
    try {
      const result = await changePassword(values)
      if (result.success) {
        toast({ title: 'Senha alterada com sucesso!' })
        form.reset()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Segurança
        </CardTitle>
        <CardDescription>Altere sua senha de acesso ao sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha Atual</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Digite sua senha atual"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Minimo 8 caracteres"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Nova Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Repita a nova senha"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Alterar Senha
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Secao: Preferencias
// ---------------------------------------------------------------------------
function PreferencesSection() {
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const { toast } = useToast()

  function handleThemeChange(value: string) {
    setTheme(value)
    toast({ title: 'Tema alterado com sucesso!' })
  }

  function handleNotificationToggle(checked: boolean) {
    setNotifications(checked)
    toast({
      title: checked
        ? 'Notificacoes ativadas'
        : 'Notificacoes desativadas',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Preferencias
        </CardTitle>
        <CardDescription>
          Configure a aparencia e notificacoes do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tema */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Tema</Label>
            <p className="text-xs text-muted-foreground">
              Escolha a aparencia do sistema
            </p>
          </div>
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione o tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark-dim">Noturno Medio</SelectItem>
              <SelectItem value="dark">Noturno Tradicional</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notificacoes */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications" className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificacoes
            </Label>
            <p className="text-xs text-muted-foreground">
              Receber notificacoes do sistema
            </p>
          </div>
          <Switch
            id="notifications"
            checked={notifications}
            onCheckedChange={handleNotificationToggle}
          />
        </div>
      </CardContent>
    </Card>
  )
}
