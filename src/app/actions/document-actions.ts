'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import type { DocumentFileCategory } from "@/lib/generated/prisma/enums"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

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
    'DRAWING',
    'SPECIFICATION',
    'MEMORIAL',
    'ART_RRT',
    'PERMIT',
    'CONTRACT',
    'REPORT',
    'PHOTO',
    'INVOICE',
    'CERTIFICATE',
    'MANUAL',
    'OTHER',
  ]),
  filePath: z.string().min(1, "Caminho do arquivo é obrigatório"),
  fileSize: z.number().positive("Tamanho do arquivo deve ser positivo"),
  mimeType: z.string().min(1, "Tipo MIME é obrigatório"),
})

const documentVersionSchema = z.object({
  filePath: z.string().min(1, "Caminho do arquivo é obrigatório"),
  fileSize: z.number().positive("Tamanho do arquivo deve ser positivo"),
  changeNotes: z.string().optional(),
})

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
})

const documentFilterSchema = z.object({
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

    const folder = await prisma.documentFolder.create({
      data: {
        name: validated.name,
        companyId: session.user.companyId!,
        projectId: validated.projectId || null,
        parentId: validated.parentId || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
      },
    })

    await logCreate('DocumentFolder', folder.id, folder.name, validated)

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

    const folders = await prisma.documentFolder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        _count: {
          select: { documents: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    })


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

    const document = await prisma.documentFile.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        category: validated.category,
        companyId: session.user.companyId!,
        folderId: validated.folderId || null,
        uploadedById: session.user.id,
        filePath: validated.filePath,
        fileSize: validated.fileSize,
        mimeType: validated.mimeType,
        version: 1,
      },
      include: {
        folder: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    })

    await logCreate('DocumentFile', document.id, document.name, validated)

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
      ...(filters.folderId && { folderId: filters.folderId }),
      ...(filters.category && { category: filters.category as DocumentFileCategory }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      prisma.documentFile.findMany({
        where,
        include: {
          folder: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),

      prisma.documentFile.count({ where }),
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
    const document = await prisma.documentFile.findUnique({
      where: { id },
      include: {
        folder: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
        versions: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
      },
    })


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

    const document = await prisma.documentFile.findUnique({
      where: { id: documentId },
    })


    if (!document) {
      return { success: false, error: "Documento não encontrado" }
    }

    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        version: (document.version || 1) + 1,
        filePath: validated.filePath,
        fileSize: validated.fileSize,
        changeNotes: validated.changeNotes || null,
        uploadedById: session.user.id,
      },
      include: {
        document: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    })

    await logCreate('DocumentVersion', version.id, `${document.name} v${version.version}`, validated)

    // Update document version number
    await prisma.documentFile.update({
      where: { id: documentId },
      data: { version: version.version },
    })


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
    const document = await prisma.documentFile.findUnique({
      where: { id },
    })


    if (!document) {
      return { success: false, error: "Documento não encontrado" }
    }

    // Delete all versions first (also cascades via onDelete, but explicit for clarity)
    await prisma.documentVersion.deleteMany({
      where: { documentId: id },
    })


    await prisma.documentFile.delete({
      where: { id },
    })

    await logDelete('DocumentFile', id, document.name, document)

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

    const documents = await prisma.documentFile.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })


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

export async function getDocumentStats(folderId?: string) {
  try {
    const where = folderId ? { folderId } : {}

    const documents = await prisma.documentFile.findMany({
      where,
    })


    const versions = await prisma.documentVersion.findMany({
      where: folderId ? { document: { folderId } } : undefined,
    })


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
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
