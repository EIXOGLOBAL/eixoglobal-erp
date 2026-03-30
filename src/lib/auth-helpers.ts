'use server'

import { getSession } from "@/lib/auth"

export async function assertAuthenticated() {
  const session = await getSession()
  if (!session?.user?.id) throw new Error("Não autenticado")
  return session
}

export async function assertCompanyAccess(session: any, resourceCompanyId: string) {
  if (!session?.user?.companyId) throw new Error("Sem empresa vinculada")
  if (session.user.companyId !== resourceCompanyId) throw new Error("Acesso negado: recurso pertence a outra empresa")
}

export async function assertPermission(session: any, permission: string) {
  if (session?.user?.role === "ADMIN") return // ADMIN has all permissions
  if (!session?.user?.[permission]) throw new Error(`Permissão negada: ${permission}`)
}

export async function assertRole(session: any, ...roles: string[]) {
  if (!roles.includes(session?.user?.role)) throw new Error(`Role necessária: ${roles.join(" ou ")}`)
}
