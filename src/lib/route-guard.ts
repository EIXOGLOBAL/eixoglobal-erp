import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { resolvePermissions, UserPermissions } from '@/lib/permissions'

export async function requireAdmin() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')
  return session
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function requirePermission(permission: keyof UserPermissions) {
  const session = await getSession()
  if (!session) redirect('/login')
  const perms = resolvePermissions(session.user)
  if (!perms[permission]) redirect('/dashboard')
  return session
}
