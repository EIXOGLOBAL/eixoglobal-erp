import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SESSION_COOKIES = [
  'session',
  'eixo-erp.session_token',
  'eixo-erp.session',
  '__Secure-eixo-erp.session_token',
]

export async function GET() {
  const cookieStore = await cookies()
  SESSION_COOKIES.forEach((name) => {
    try { cookieStore.delete(name) } catch {}
  })
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'https://erp.eixoglobal.com.br'))
}

export async function POST() {
  return GET()
}
