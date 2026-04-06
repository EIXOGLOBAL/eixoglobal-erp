import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/auth'
import { securityHeaders } from '@/lib/security-headers'
import { decrypt } from '@/lib/session'

// Routes that don't require authentication
const publicRoutes = ['/login', '/api/webhooks', '/api/version', '/api/admin/reset-password', '/setup', '/register-setup']

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        const response = NextResponse.next()
        // Add security headers to public routes
        Object.entries(securityHeaders).forEach(([key, value]) => {
            response.headers.set(key, value)
        })
        return response
    }

    // Allow static files and Next.js internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    // Check session
    const currentUser = request.cookies.get('session')?.value
    const session = currentUser ? await decrypt(currentUser) : null

    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Refresh session (extend expiry)
    let response = await updateSession(request)
    if (!response) {
        response = NextResponse.next()
    }

    // Add security headers to authenticated routes
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
