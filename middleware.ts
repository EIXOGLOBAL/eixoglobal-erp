import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/config';

/**
 * Middleware Global de Autenticação com Better-Auth
 * 
 * Protege todas as rotas exceto as públicas
 * Valida sessão com Better-Auth
 * Suporta RBAC e permissões
 * Redireciona para login se não autenticado
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas (não requerem autenticação)
  const publicPaths = [
    '/login',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/verify-2fa',
    '/register-setup',
    '/api/auth',
    '/api/health',
    '/api/version',
    '/manutencao',
  ];

  // Permitir acesso a assets estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Permitir rotas públicas
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Verificar autenticação com Better-Auth
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      // Redirecionar para login
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar se usuário está ativo
    if ((session.user as any).isActive === false) {
      const response = NextResponse.redirect(new URL('/auth/account-inactive', request.url));
      return response;
    }

    // Verificar se usuário está bloqueado
    if ((session.user as any).isBlocked) {
      const response = NextResponse.redirect(new URL('/auth/account-blocked', request.url));
      return response;
    }

    // Verificar se usuário tem companyId (exceto para rotas de admin)
    if (!pathname.startsWith('/admin') && !(session.user as any).companyId) {
      // Usuário sem empresa - redirecionar para setup
      if (pathname !== '/register-setup') {
        return NextResponse.redirect(new URL('/register-setup', request.url));
      }
    }

    // RBAC - Proteção de rotas por role
    const roleProtectedRoutes: Record<string, string[]> = {
      '/admin': ['ADMIN'],
      '/settings/users': ['ADMIN', 'MANAGER'],
      '/settings/company': ['ADMIN', 'MANAGER'],
      '/financial': ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
      '/reports': ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'ENGINEER'],
      '/projects/create': ['ADMIN', 'MANAGER', 'ENGINEER'],
      '/contracts/create': ['ADMIN', 'MANAGER'],
      '/employees': ['ADMIN', 'MANAGER', 'HR_ANALYST'],
    };

    // Verificar se a rota requer role específica
    for (const [route, allowedRoles] of Object.entries(roleProtectedRoutes)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes((session.user as any).role)) {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }
    }

    // Proteção de rotas por permissão
    const permissionProtectedRoutes: Record<string, string> = {
      '/delete': 'canDelete',
      '/approve': 'canApprove',
      '/financial/manage': 'canManageFinancial',
      '/users/manage': 'canManageUsers',
      '/projects/manage': 'canManageProjects',
      '/contracts/manage': 'canManageContracts',
      '/settings': 'canManageSettings',
    };

    // Verificar se a rota requer permissão específica
    for (const [route, permission] of Object.entries(permissionProtectedRoutes)) {
      if (pathname.startsWith(route)) {
        if (!(session.user as any)[permission]) {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }
    }

    // Adicionar headers de segurança
    const response = NextResponse.next();
    
    // Adicionar informações do usuário aos headers (para uso em Server Components)
    response.headers.set('x-user-id', session.user.id);
    response.headers.set('x-user-role', (session.user as any).role || 'USER');
    response.headers.set('x-user-company-id', (session.user as any).companyId || '');

    return response;
  } catch (error) {
    console.error('[middleware] Error validating session:', error);
    
    // Em caso de erro, redirecionar para login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
