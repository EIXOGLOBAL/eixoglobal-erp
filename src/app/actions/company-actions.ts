'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getNextCode } from "@/lib/sequence"
import { assertAuthenticated, assertRole } from "@/lib/auth-helpers"

const companySchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    tradeName: z.string().optional(),
    cnpj: z.string().min(14, "CNPJ inválido"),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
})

const contactSchema = z.object({
    type: z.enum(['EMAIL', 'PHONE']),
    value: z.string().min(1, "Valor obrigatório"),
    department: z.string().optional(),
    responsible: z.string().optional(),
    isPrimary: z.boolean(),
})

export async function createCompany(data: z.infer<typeof companySchema>) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
        const validated = companySchema.parse(data)
        const code = await getNextCode('company')
        const company = await prisma.company.create({
            data: { ...validated, code }
        })

        revalidatePath('/companies')
        return { success: true, data: company }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao criar empresa' }
    }
}

export async function updateCompany(id: string, data: z.infer<typeof companySchema>) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
        const validated = companySchema.parse(data)

        const company = await prisma.company.update({
            where: { id },
            data: validated
        })

        revalidatePath('/companies')
        revalidatePath(`/companies/${id}`)
        return { success: true, data: company }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao atualizar empresa' }
    }
}

// ─── Company Settings (own company) ──────────────────────────────────────────

export async function getCompanyDetails() {
    try {
        const session = await assertAuthenticated()
        const user = session.user as { companyId?: string }
        if (!user.companyId) {
            return { success: false, error: 'Nenhuma empresa vinculada ao usuário' }
        }
        const company = await prisma.company.findUnique({
            where: { id: user.companyId },
        })
        if (!company) {
            return { success: false, error: 'Empresa não encontrada' }
        }
        return { success: true, data: company }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao buscar dados da empresa' }
    }
}

const companySettingsSchema = z.object({
    name: z.string().min(3, "Razão Social deve ter no mínimo 3 caracteres"),
    tradeName: z.string().optional(),
    cnpj: z.string().min(14, "CNPJ inválido"),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
})

export async function updateCompanySettings(data: z.infer<typeof companySettingsSchema>) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
        const user = session.user as { companyId?: string }
        if (!user.companyId) {
            return { success: false, error: 'Nenhuma empresa vinculada ao usuário' }
        }
        const validated = companySettingsSchema.parse(data)

        const company = await prisma.company.update({
            where: { id: user.companyId },
            data: validated,
        })

        revalidatePath('/configuracoes/empresa')
        revalidatePath('/dashboard')
        return { success: true, data: company }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao atualizar dados da empresa' }
    }
}

export async function uploadCompanyLogo(formData: FormData) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
        const user = session.user as { companyId?: string }
        if (!user.companyId) {
            return { success: false, error: 'Nenhuma empresa vinculada ao usuário' }
        }

        const file = formData.get('file') as File | null
        if (!file) return { success: false, error: 'Nenhum arquivo enviado' }
        if (!file.type.startsWith('image/')) {
            return { success: false, error: 'Apenas imagens são permitidas' }
        }
        if (file.size > 2 * 1024 * 1024) {
            return { success: false, error: 'Imagem muito grande (máximo 2MB)' }
        }

        const { writeFile, mkdir } = await import('fs/promises')
        const { join } = await import('path')

        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
        const filename = `company-${user.companyId}.${ext}`
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'logos')

        await mkdir(uploadDir, { recursive: true })

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(join(uploadDir, filename), buffer)

        const logoUrl = `/uploads/logos/${filename}`

        await prisma.company.update({
            where: { id: user.companyId },
            data: { logoUrl },
        })

        revalidatePath('/configuracoes/empresa')
        return { success: true, logoUrl }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao enviar logo' }
    }
}

export async function removeCompanyLogo() {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
        const user = session.user as { companyId?: string }
        if (!user.companyId) {
            return { success: false, error: 'Nenhuma empresa vinculada ao usuário' }
        }

        await prisma.company.update({
            where: { id: user.companyId },
            data: { logoUrl: null },
        })

        revalidatePath('/configuracoes/empresa')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao remover logo' }
    }
}

export async function deleteCompany(id: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
        const companyWithProjects = await prisma.company.findUnique({
            where: { id },
            include: { projects: true }
        })

        if (!companyWithProjects) {
            return { success: false, error: 'Empresa não encontrada' }
        }

        if (companyWithProjects.projects.length > 0) {
            return { success: false, error: 'Não é possível excluir empresas com projetos cadastrados' }
        }

        await prisma.company.delete({ where: { id } })

        revalidatePath('/companies')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao excluir empresa' }
    }
}

export async function getCompanies() {
    try {
        await assertAuthenticated()
        const companies = await prisma.company.findMany({
            include: {
                _count: { select: { projects: true } }
            },
            orderBy: { name: 'asc' }
        })

        return { success: true, data: companies }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao buscar empresas' }
    }
}

export async function getCompanyById(id: string) {
    try {
        await assertAuthenticated()
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                contacts: {
                    orderBy: [{ isPrimary: 'desc' }, { type: 'asc' }, { createdAt: 'asc' }]
                },
                projects: {
                    include: {
                        _count: {
                            select: { measurements: true, contracts: true }
                        }
                    },
                    orderBy: { startDate: 'desc' }
                },
                _count: { select: { projects: true } }
            }
        })

        if (!company) {
            return { success: false, error: 'Empresa não encontrada' }
        }

        return { success: true, data: company }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao buscar empresa' }
    }
}

// ─── Company Contacts ─────────────────────────────────────────────────────────

export async function addCompanyContact(companyId: string, data: z.infer<typeof contactSchema>) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
        const validated = contactSchema.parse(data)

        // If marking as primary, unset others of same type
        if (validated.isPrimary) {
            await prisma.companyContact.updateMany({
                where: { companyId, type: validated.type, isPrimary: true },
                data: { isPrimary: false }
            })
        }

        const contact = await prisma.companyContact.create({
            data: { ...validated, companyId }
        })

        revalidatePath(`/companies/${companyId}`)
        return { success: true, data: contact }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao adicionar contato' }
    }
}

export async function updateCompanyContact(contactId: string, companyId: string, data: z.infer<typeof contactSchema>) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
        const validated = contactSchema.parse(data)

        if (validated.isPrimary) {
            await prisma.companyContact.updateMany({
                where: { companyId, type: validated.type, isPrimary: true, id: { not: contactId } },
                data: { isPrimary: false }
            })
        }

        const contact = await prisma.companyContact.update({
            where: { id: contactId },
            data: validated
        })

        revalidatePath(`/companies/${companyId}`)
        return { success: true, data: contact }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao atualizar contato' }
    }
}

export async function deleteCompanyContact(contactId: string, companyId: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
        await prisma.companyContact.delete({ where: { id: contactId } })
        revalidatePath(`/companies/${companyId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao excluir contato' }
    }
}
