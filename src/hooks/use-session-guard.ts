'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

const CHECK_INTERVAL_MS = 30_000 // 30 segundos
const SESSION_CHECK_URL = '/api/auth/session-check'

type SessionCheckResponse = {
  valid: boolean
  reason?: string
  message?: string
}

/**
 * Hook que monitora a validade da sessão do usuário.
 *
 * - Polling a cada 30 segundos via GET /api/auth/session-check
 * - Verifica imediatamente quando a aba volta ao foco (visibilitychange)
 * - Se a sessão foi substituída (login em outro navegador):
 *   - Exibe toast de aviso
 *   - Redireciona para /login
 *
 * Múltiplas abas no mesmo navegador compartilham o cookie session-token,
 * então todas permanecem válidas. Apenas sessões de outros navegadores
 * são invalidadas.
 *
 * @example
 *   // Em um layout ou componente raiz autenticado:
 *   export default function DashboardLayout({ children }) {
 *     useSessionGuard()
 *     return <>{children}</>
 *   }
 */
export function useSessionGuard() {
  const router = useRouter()
  const isRedirectingRef = useRef(false)

  const handleInvalidSession = useCallback(() => {
    // Evita múltiplos redirects (múltiplas abas podem disparar ao mesmo tempo)
    if (isRedirectingRef.current) return
    isRedirectingRef.current = true

    toast({
      title: 'Sessão encerrada',
      description:
        'Login detectado em outro dispositivo. Faça login novamente.',
      variant: 'destructive',
    })

    // Pequeno delay para o toast ser visível antes do redirect
    setTimeout(() => {
      router.push('/login?reason=session_replaced')
    }, 1500)
  }, [router])

  const checkSession = useCallback(async () => {
    // Não checar se já estamos redirecionando
    if (isRedirectingRef.current) return

    try {
      const response = await fetch(SESSION_CHECK_URL, {
        method: 'GET',
        credentials: 'same-origin', // Envia cookies
        cache: 'no-store',
      })

      // Se não autenticado (401), o middleware/auth já cuida do redirect
      if (response.status === 401) return

      const data: SessionCheckResponse = await response.json()

      if (!data.valid && data.reason === 'session_replaced') {
        handleInvalidSession()
      }
    } catch {
      // Erro de rede — não fazer nada. Pode ser que o usuário esteja offline.
      // O próximo polling tentará novamente.
    }
  }, [handleInvalidSession])

  useEffect(() => {
    // Check inicial ao montar o componente
    checkSession()

    // Polling periódico a cada 30 segundos
    const intervalId = setInterval(checkSession, CHECK_INTERVAL_MS)

    // Verifica imediatamente quando a aba volta ao foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkSession])
}
