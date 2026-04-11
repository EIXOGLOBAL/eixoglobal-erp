'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import { trackError } from '@/lib/error-tracker'

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Projects Error]', error)
    }
    trackError({
      error,
      context: 'projects-error-boundary',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }).catch(() => {})
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Erro ao carregar projetos
          </h2>
          <p className="text-sm text-muted-foreground">
            Ocorreu um erro inesperado ao carregar esta pagina. Nossa equipe foi
            notificada e estamos trabalhando para resolver.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60">
              Ref: {error.digest}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => reset()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
