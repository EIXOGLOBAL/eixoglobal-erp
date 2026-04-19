import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de Autenticação (Edge runtime)
 *
 * NÃO importa o SDK do Better-Auth nem o driver do Postgres: esses módulos
 * usam APIs do Node.js (drizzle-orm/postgres-js) e quebram no runtime Edge,
 * derrubando todas as rotas com HTTP 500.
 *
 * Aqui fazemos apenas uma checagem leve pela presença do cookie de sessão.
 * A validação real da sessão (assinatura, expiração, RBAC) é feita nos
 * layouts e server components, onde o runtime é Node.js.
 */

const PUBLIC_PATHS = [
  '/login',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/verify-2fa',
  '/auth/account-inactive',
  '/auth/account-blocked',
  '/register-setup',
  '/unauthorized',
  '/manutencao',
  '/terms',
  '/privacy',
];

// Cookies emitidos pelo Better-Auth com cookiePrefix "eixo-erp"
const SESSION_COOKIE_NAMES = [
  'eixo-erp.session_token',
  'eixo-erp.session',
  '__Secure-eixo-erp.session_token',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Assets estáticos e rotas com extensão
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Rotas públicas passam sem checagem
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // Checagem barata: existe cookie de sessão?
  const hasSession = SESSION_COOKIE_NAMES.some(
    (name) => !!request.cookies.get(name)?.value,
  );

  if (!hasSession) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (static/image optimization)
     * - favicon.ico
     * - public folder
     * - api routes (têm sua própria validação em cada handler)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
