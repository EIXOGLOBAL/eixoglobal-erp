'use server'

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function uploadAvatar(userId: string, formData: FormData) {
  try {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    
    const user = session.user as { id: string; role: string; companyId: string }
    // Can only upload own avatar unless ADMIN
    if (user.id !== userId && user.role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão' }
    }

    const file = formData.get('file') as File | null
    if (!file) return { success: false, error: 'Nenhum arquivo enviado' }
    
    // Validate type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Apenas imagens são permitidas' }
    }
    
    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'Imagem muito grande (máximo 2MB)' }
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filename = `${userId}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    
    await mkdir(uploadDir, { recursive: true })
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(join(uploadDir, filename), buffer)

    const avatarUrl = `/uploads/avatars/${filename}`

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    })

    revalidatePath('/rh/funcionarios')
    revalidatePath(`/rh/funcionarios/${userId}`)
    revalidatePath('/users')
    
    return { success: true, avatarUrl }
  } catch (error) {
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

// ---------------------------------------------------------------------------
// Employee-specific avatar actions (Employee has its own avatarUrl field)
// ---------------------------------------------------------------------------

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

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Apenas imagens são permitidas' }
    }

    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'Imagem muito grande (máximo 2MB)' }
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filename = `emp_${employeeId}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars')

    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(join(uploadDir, filename), buffer)

    const avatarUrl = `/uploads/avatars/${filename}`

    await prisma.employee.update({
      where: { id: employeeId },
      data: { avatarUrl },
    })

    revalidatePath('/rh/funcionarios')
    revalidatePath(`/rh/funcionarios/${employeeId}`)

    return { success: true, avatarUrl }
  } catch (error) {
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
