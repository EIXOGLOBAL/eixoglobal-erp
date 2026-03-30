'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"

// ============================================================================
// SCHEMAS
// ============================================================================

const progressPhotoSchema = z.object({
  projectId: z.string().uuid(),
  filePath: z.string().min(1, "Caminho do arquivo é obrigatório"),
  caption: z.string().optional(),
  category: z.enum([
    'GENERAL',
    'EXCAVATION',
    'FOUNDATION',
    'STRUCTURE',
    'FINISHING',
    'SAFETY',
    'MILESTONE',
    'ISSUE',
    'OTHER',
  ]).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(20),
})

const photoFilterSchema = z.object({
  projectId: z.string().uuid().optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// ============================================================================
// UPLOAD & CRUD
// ============================================================================

export async function uploadPhoto(
  data: z.infer<typeof progressPhotoSchema>
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = progressPhotoSchema.parse(data)

    // Verify project exists
    const project = await (prisma as any).project.findUnique({
      where: { id: validated.projectId },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!project) {
      return { success: false, error: "Projeto não encontrado" }
    }

    const photo = await (prisma as any).progressPhoto.create({
      data: {
        projectId: validated.projectId,
        filePath: validated.filePath,
        caption: validated.caption || null,
        category: validated.category || 'GENERAL',
        latitude: validated.latitude || null,
        longitude: validated.longitude || null,
        uploadedBy: session.user.id,
        uploadedAt: new Date(),
      },
      include: {
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/progress-photos')
    revalidatePath(`/projects/${validated.projectId}`)
    return { success: true, data: photo }
  } catch (error) {
    console.error("Erro ao fazer upload de foto:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer upload de foto",
    }
  }
}

export async function getPhotos(
  params?: {
    pagination?: z.infer<typeof paginationSchema>
    filters?: z.infer<typeof photoFilterSchema>
  }
) {
  try {
    const pagination = paginationSchema.parse(params?.pagination || {})
    const filters = photoFilterSchema.parse(params?.filters || {})

    const skip = (pagination.page - 1) * pagination.limit

    const where = {
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.category && { category: filters.category }),
      ...(filters.startDate && {
        uploadedAt: { gte: new Date(filters.startDate) },
      }),
      ...(filters.endDate && {
        uploadedAt: { lte: new Date(filters.endDate) },
      }),
    }

    const [data, total] = await Promise.all([
      (prisma as any).progressPhoto.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          uploader: { select: { id: true, name: true } },
        },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).progressPhoto.count({ where }),
    ])

    return {
      success: true,
      data: {
        items: data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      },
    }
  } catch (error) {
    console.error("Erro ao buscar fotos de progresso:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar fotos",
      data: null,
    }
  }
}

export async function getPhotoById(id: string) {
  try {
    const photo = await (prisma as any).progressPhoto.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!photo) {
      return { success: false, error: "Foto não encontrada" }
    }

    return { success: true, data: photo }
  } catch (error) {
    console.error("Erro ao buscar foto:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar foto",
    }
  }
}

export async function deletePhoto(id: string) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const photo = await (prisma as any).progressPhoto.findUnique({
      where: { id },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!photo) {
      return { success: false, error: "Foto não encontrada" }
    }

    await (prisma as any).progressPhoto.delete({
      where: { id },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/progress-photos')
    revalidatePath(`/projects/${photo.projectId}`)
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar foto:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao deletar foto",
    }
  }
}

// ============================================================================
// TIMELINE & ANALYTICS
// ============================================================================

export async function getPhotoTimeline(projectId: string) {
  try {
    const project = await (prisma as any).project.findUnique({
      where: { id: projectId },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!project) {
      return { success: false, error: "Projeto não encontrado" }
    }

    const photos = await (prisma as any).progressPhoto.findMany({
      where: { projectId },
      include: {
        uploader: { select: { id: true, name: true } },
      },
      orderBy: { uploadedAt: 'asc' },
    })
    // TODO: Remove 'as any' after running prisma generate

    // Group photos by date
    const timelineByDate: { [key: string]: any[] } = {}
    photos.forEach((photo: any) => {
      const dateKey = photo.uploadedAt
        .toISOString()
        .split('T')[0]
      if (!timelineByDate[dateKey]) {
        timelineByDate[dateKey] = []
      }
      timelineByDate[dateKey].push(photo)
    })

    // Group photos by category
    const byCategory: { [key: string]: number } = {}
    photos.forEach((photo: any) => {
      byCategory[photo.category] = (byCategory[photo.category] || 0) + 1
    })

    const timeline = Object.entries(timelineByDate).map(([date, items]) => ({
      date,
      count: items.length,
      photos: items,
    }))

    return {
      success: true,
      data: {
        project: { id: projectId, name: project.name },
        totalPhotos: photos.length,
        byCategory,
        timeline,
        firstPhoto: photos.length > 0 ? photos[0].uploadedAt : null,
        lastPhoto: photos.length > 0 ? photos[photos.length - 1].uploadedAt : null,
      },
    }
  } catch (error) {
    console.error("Erro ao buscar timeline de fotos:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar timeline",
      data: null,
    }
  }
}
