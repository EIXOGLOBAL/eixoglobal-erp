'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { getStorageProvider, validateImageFile, FileValidationError } from '@/lib/storage-provider'

export async function uploadAvatar(userId: string, formData: FormData) {
  try {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }

    const user = session.user as { id: string; role: string; companyId: string }
    if (user.id !== userId && user.role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão' }
    }

    const file = formData.get('file') as File | null
    if (!file) return { success: false, error: 'Nenhum arquivo enviado' }

    validateImageFile(file)

    const storage = getStorageProvider()
    const { url: avatarUrl } = await storage.upload(file, 'avatars')

    await prisma.user.update({ where: { id: userId }, data: { avatarUrl } })

    revalidatePath('/rh/funcionarios')
    revalidatePath(`/rh/funcionarios/${userId}`)
    revalidatePath('/users')

    return { success: true, avatarUrl }
  } catch (error) {
    if (error instanceof FileValidationError) return { success: false, error: error.message }
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao salvar foto' }
  }
}

export async function removeAvatar(userId: string) {
  try {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string }
    if (user.id !== userId && user.role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão' }
    }

    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } })
    revalidatePath('/rh/funcionarios')
    revalidatePath(`/rh/funcionarios/${userId}`)

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro' }
  }
}

export async function uploadEmployeeAvatar(employeeId: string, formData: FormData) {
  try {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string }
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return { success: false, error: 'Sem permissão' }
    }

    const file = formData.get('file') as File | null
    if (!file) return { success: false, error: 'Nenhum arquivo enviado' }

    validateImageFile(file)

    const storage = getStorageProvider()
    const { url: avatarUrl } = await storage.upload(file, 'avatars')

    await prisma.employee.update({ where: { id: employeeId }, data: { avatarUrl } })

    revalidatePath('/rh/funcionarios')
    revalidatePath(`/rh/funcionarios/${employeeId}`)

    return { success: true, avatarUrl }
  } catch (error) {
    if (error instanceof FileValidationError) return { success: false, error: error.message }
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao salvar foto' }
  }
}

export async function removeEmployeeAvatar(employeeId: string) {
  try {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string }
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return { success: false, error: 'Sem permissão' }
    }

    await prisma.employee.update({ where: { id: employeeId }, data: { avatarUrl: null } })
    revalidatePath('/rh/funcionarios')
    revalidatePath(`/rh/funcionarios/${employeeId}`)

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro' }
  }
}
