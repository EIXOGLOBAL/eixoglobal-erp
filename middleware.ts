import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSessionToken, validateSession } from '@/lib/single-session'

/**
 * Middleware Global de Autenticação
 * 
 * Protege todas as rotas exceto as públicas
 * Valida sessão única (single-session)
 * Redireciona para login se não autenticado
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas (não requerem autenticação)
  const publicPaths = [
    '/login',
    '/register-setup',
    '/api/health',
    '/api/version',
    '/manutencao',
  ]

  // Permitir acesso a assets estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Permitir rotas públicas
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Verificar autenticação
  const session = await getSession()
  if (!session?.user) {
    // Redirecionar para login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verificar sessão única (single-session)
  const sessionToken = await getSessionToken()
  if (sessionToken) {
    try {
      const isValid = await validateSession(session.user.id, sessionToken)
      if (!isValid) {
        // Sessão foi substituída por outro login
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('session')
        response.cookies.delete('session-token')
        return response
      }
    } catch (error) {
      // Em caso de erro na validação, permitir acesso
      // (melhor do que bloquear usuário legítimo)
      console.error('[middleware] Error validating session:', error)
    }
  }

  // Verificar se usuário tem companyId (exceto para rotas de admin)
  if (!pathname.startsWith('/admin') && !session.user.companyId) {
    // Usuário sem empresa - redirecionar para setup
    if (pathname !== '/register-setup') {
      return NextResponse.redirect(new URL('/register-setup', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
