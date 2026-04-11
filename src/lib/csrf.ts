import { NextRequest, NextResponse } from 'next/server'

export const CSRF_COOKIE_NAME = 'csrf-token'
export const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a cryptographically random CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID()
}

/**
 * Set the CSRF token cookie on a NextResponse.
 *
 * httpOnly is false so client-side JS can read the cookie value and send it
 * back as a header (double-submit cookie pattern).
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

/**
 * Read the CSRF token from the request cookie.
 */
export function getCsrfFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null
}

/**
 * Read the CSRF token from the request header.
 */
export function getCsrfFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME) ?? null
}

/**
 * Validate CSRF using the double-submit cookie pattern.
 *
 * Compares the token sent in the cookie (automatically by the browser) with
 * the token sent in the header (explicitly by JS). An attacker cannot read
 * our cookies due to SameSite policy, so they cannot forge the header value.
 *
 * Returns true when both tokens are present and match.
 */
export function validateCsrf(request: NextRequest): boolean {
  const cookieToken = getCsrfFromCookie(request)
  const headerToken = getCsrfFromHeader(request)

  if (!cookieToken || !headerToken) {
    return false
  }

  return cookieToken === headerToken
}
