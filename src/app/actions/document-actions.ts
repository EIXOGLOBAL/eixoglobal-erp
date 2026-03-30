'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"

// ============================================================================
// SCHEMAS
// ============================================================================

const folderSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
})

const documentSchema = z.object({
  folderId: z.string().uuid().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  category: z.enum([
    'CONTRACT',
    'SPECIFICATION',
    'DRAWING',
    'REPORT',
    'MEETING_NOTES',
    'INVOICE',
    'CERTIFICATE',
    'OTHER',
  ]),
  filePath: z.string().min(1, "Caminho do arquivo é obrigatório"),
  fileSize: z.number().positive("Tamanho do arquivo deve ser positivo"),
  mimeType: z.string().min(1, "Tipo MIME é obrigatório"),
  projectId: z.string().uuid().optional(),
})

const documentVersionSchema = z.object({
  filePath: z.string().min(1, "Caminho do arquivo é obrigatório"),
  fileSize: z.number().positive("Tamanho do arquivo deve ser positivo"),
  mimeType: z.string().min(1, "Tipo MIME é obrigatório"),
  notes: z.string().optional(),
})

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
})

const documentFilterSchema = z.object({
  projectId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
})

// ============================================================================
// FOLDER OPERATIONS
// ============================================================================

export async function createFolder(data: z.infer<typeof folderSchema>) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = folderSchema.parse(data)

    const folder = await (prisma as any).documentFolder.create({
      data: {
        name: validated.name,
        projectId: validated.projectId || null,
        parentId: validated.parentId || null,
        createdBy: session.user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/documents')
    return { success: true, data: folder }
  } catch (error) {
    console.error("Erro ao criar pasta:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar pasta",
    }
  }
}

export async function getFolders(projectId?: string) {
  try {
    const where = projectId ? { projectId } : {}

    const folders = await (prisma as any).documentFolder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        _count: {
          select: { documents: true, subFolders: true },
        },
      },
      orderBy: { name: 'asc' },
    })
    // TODO: Remove 'as any' after running prisma generate

    return { success: true, data: folders }
  } catch (error) {
    console.error("Erro ao buscar pastas:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar pastas",
      data: [],
    }
  }
}

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

export async function uploadDocument(
  data: z.infer<typeof documentSchema>
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = documentSchema.parse(data)

    const document = await (prisma as any).document.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        category: validated.category,
        folderId: validated.folderId || null,
        projectId: validated.projectId || null,
        uploadedBy: session.user.id,
        uploadedAt: new Date(),
        filePath: validated.filePath,
        fileSize: validated.fileSize,
        mimeType: validated.mimeType,
        version: 1,
      },
      include: {
        folder: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/documents')
    return { success: true, data: document }
  } catch (error) {
    console.error("Erro ao fazer upload do documento:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer upload do documento",
    }
  }
}

export async function getDocuments(
  params?: {
    pagination?: z.infer<typeof paginationSchema>
    filters?: z.infer<typeof documentFilterSchema>
  }
) {
  try {
    const pagination = paginationSchema.parse(params?.pagination || {})
    const filters = documentFilterSchema.parse(params?.filters || {})

    const skip = (pagination.page - 1) * pagination.limit

    const where = {
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.folderId && { folderId: filters.folderId }),
      ...(filters.category && { category: filters.category }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      (prisma as any).document.findMany({
        where,
        include: {
          folder: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          uploader: { select: { id: true, name: true } },
        },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).document.count({ where }),
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
    console.error("Erro ao buscar documentos:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar documentos",
      data: null,
    }
  }
}

export async function getDocumentById(id: string) {
  try {
    const document = await (prisma as any).document.findUnique({
      where: { id },
      include: {
        folder: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } },
        versions: {
          orderBy: { createdAt: 'desc' },
          include: {
            creator: { select: { id: true, name: true } },
          },
        },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!document) {
      return { success: false, error: "Documento não encontrado" }
    }

    return { success: true, data: document }
  } catch (error) {
    console.error("Erro ao buscar documento:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar documento",
    }
  }
}

export async function createVersion(
  documentId: string,
  data: z.infer<typeof documentVersionSchema>
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = documentVersionSchema.parse(data)

    const document = await (prisma as any).document.findUnique({
      where: { id: documentId },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!document) {
      return { success: false, error: "Documento não encontrado" }
    }

    const version = await (prisma as any).documentVersion.create({
      data: {
        documentId,
        version: (document.version || 1) + 1,
        filePath: validated.filePath,
        fileSize: validated.fileSize,
        mimeType: validated.mimeType,
        notes: validated.notes || null,
        createdBy: session.user.id,
        createdAt: new Date(),
      },
      include: {
        document: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    // Update document version number
    await (prisma as any).document.update({
      where: { id: documentId },
      data: { version: version.version },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/documents')
    return { success: true, data: version }
  } catch (error) {
    console.error("Erro ao criar versão do documento:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar versão",
    }
  }
}

export async function deleteDocument(id: string) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const document = await (prisma as any).document.findUnique({
      where: { id },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!document) {
      return { success: false, error: "Documento não encontrado" }
    }

    // Delete all versions first
    await (prisma as any).documentVersion.deleteMany({
      where: { documentId: id },
    })
    // TODO: Remove 'as any' after running prisma generate

    await (prisma as any).document.delete({
      where: { id },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/documents')
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar documento:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao deletar documento",
    }
  }
}

// ============================================================================
// SEARCH & ANALYTICS
// ============================================================================

export async function searchDocuments(query: string) {
  try {
    if (!query || query.trim().length === 0) {
      return { success: false, error: "Termo de busca é obrigatório" }
    }

    const documents = await (prisma as any).document.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        folder: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { uploadedAt: 'desc' },
      take: 50,
    })
    // TODO: Remove 'as any' after running prisma generate

    return {
      success: true,
      data: {
        query,
        results: documents,
        count: documents.length,
      },
    }
  } catch (error) {
    console.error("Erro ao buscar documentos:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar documentos",
      data: null,
    }
  }
}

export async function getDocumentStats(projectId?: string) {
  try {
    const where = projectId ? { projectId } : {}

    const documents = await (prisma as any).document.findMany({
      where,
    })
    // TODO: Remove 'as any' after running prisma generate

    const versions = await (prisma as any).documentVersion.findMany({
      where: projectId ? { document: { projectId } } : undefined,
    })
    // TODO: Remove 'as any' after running prisma generate

    const byCategory = documents.reduce((acc: any, doc: any) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1
      return acc
    }, {})

    const totalSize = documents.reduce(
      (sum: number, doc: any) => sum + (doc.fileSize || 0),
      0
    )

    const recentDocuments = documents.sort(
      (a: any, b: any) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    ).slice(0, 10)

    return {
      success: true,
      data: {
        totalDocuments: documents.length,
        totalVersions: versions.length,
        totalSize,
        byCategory,
        averageVersionsPerDocument:
          documents.length > 0
            ? Math.round(versions.length / documents.length * 100) / 100
            : 0,
        recentDocuments,
      },
    }
  } catch (error) {
    console.error("Erro ao buscar estatísticas de documentos:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar estatísticas",
      data: null,
    }
  }
}
