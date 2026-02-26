import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'

export async function proxy(request: NextRequest) {
    const currentUser = request.cookies.get('session')?.value
    const session = currentUser ? await decrypt(currentUser) : null

    // If user is authenticated and tries to access login or register, redirect to dashboard
    if (session && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname === '/')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // If user is NOT authenticated and tries to access protected routes (dashboard, companies, users...)
    if (!session && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/register-setup')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
