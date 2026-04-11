'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"
import { logCreate, logUpdate, logDelete } from "@/lib/audit-logger"
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'bdi-config' })

const bdiConfigSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    companyId: z.string().uuid("ID da empresa inválido"),
    administracaoCentral: z.number().min(0).max(99.99),
    seguroGarantia: z.number().min(0).max(99.99),
    risco: z.number().min(0).max(99.99),
    despesasFinanceiras: z.number().min(0).max(99.99),
    lucro: z.number().min(0).max(99.99),
    iss: z.number().min(0).max(99.99),
    pis: z.number().min(0).max(99.99),
    cofins: z.number().min(0).max(99.99),
    irpj: z.number().min(0).max(99.99),
    csll: z.number().min(0).max(99.99),
    isDefault: z.boolean().optional(),
})

export type BDIConfigInput = z.infer<typeof bdiConfigSchema>

/**
 * Calcula o BDI total usando a fórmula padrão do TCU (Acórdão 2.622/2013):
 * BDI = ((1 + AC + S + R) * (1 + DF) * (1 + L)) / (1 - I) - 1
 * Onde:
 *   AC = Administração Central
 *   S  = Seguro e Garantia
 *   R  = Risco
 *   DF = Despesas Financeiras
 *   L  = Lucro
 *   I  = Tributos (ISS + PIS + COFINS + IRPJ + CSLL)
 */
export async function calculateBDI(data: {
    administracaoCentral: number
    seguroGarantia: number
    risco: number
    despesasFinanceiras: number
    lucro: number
    iss: number
    pis: number
    cofins: number
    irpj: number
    csll: number
}): Promise<number> {
    const ac = data.administracaoCentral / 100
    const sg = data.seguroGarantia / 100
    const r = data.risco / 100
    const df = data.despesasFinanceiras / 100
    const l = data.lucro / 100
    const tributos = (data.iss + data.pis + data.cofins + data.irpj + data.csll) / 100

    if (tributos >= 1) return 0

    const bdi = ((1 + ac + sg + r) * (1 + df) * (1 + l)) / (1 - tributos) - 1
    return Math.round(bdi * 10000) / 100
}

export async function createBDIConfig(data: BDIConfigInput) {
    try {
        await assertAuthenticated()
        const validated = bdiConfigSchema.parse(data)
        const percentage = await calculateBDI(validated)

        if (validated.isDefault) {
            await prisma.bDIConfig.updateMany({
                where: { companyId: validated.companyId, isDefault: true },
                data: { isDefault: false }
            })
        }

        const bdiConfig = await prisma.bDIConfig.create({
            data: {
                name: validated.name,
                companyId: validated.companyId,
                percentage,
                administracaoCentral: validated.administracaoCentral,
                seguroGarantia: validated.seguroGarantia,
                risco: validated.risco,
                despesasFinanceiras: validated.despesasFinanceiras,
                lucro: validated.lucro,
                iss: validated.iss,
                pis: validated.pis,
                cofins: validated.cofins,
                irpj: validated.irpj,
                csll: validated.csll,
                isDefault: validated.isDefault ?? false,
            },
            include: { company: true }
        })

        await logCreate('BDIConfig', bdiConfig.id, validated.name, {
            percentage,
            ...validated,
        })

        revalidatePath('/configuracoes/bdi')
        revalidatePath('/orcamentos')
        return { success: true, data: bdiConfig }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar configuração BDI")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar configuração BDI",
        }
    }
}

export async function updateBDIConfig(id: string, data: BDIConfigInput) {
    try {
        await assertAuthenticated()
        const validated = bdiConfigSchema.parse(data)
        const percentage = await calculateBDI(validated)

        const oldConfig = await prisma.bDIConfig.findUnique({ where: { id } })

        if (validated.isDefault) {
            await prisma.bDIConfig.updateMany({
                where: { companyId: validated.companyId, isDefault: true, id: { not: id } },
                data: { isDefault: false }
            })
        }

        const bdiConfig = await prisma.bDIConfig.update({
            where: { id },
            data: {
                name: validated.name,
                companyId: validated.companyId,
                percentage,
                administracaoCentral: validated.administracaoCentral,
                seguroGarantia: validated.seguroGarantia,
                risco: validated.risco,
                despesasFinanceiras: validated.despesasFinanceiras,
                lucro: validated.lucro,
                iss: validated.iss,
                pis: validated.pis,
                cofins: validated.cofins,
                irpj: validated.irpj,
                csll: validated.csll,
                isDefault: validated.isDefault ?? false,
            },
            include: { company: true }
        })

        await logUpdate('BDIConfig', id, validated.name, oldConfig, {
            percentage,
            ...validated,
        })

        revalidatePath('/configuracoes/bdi')
        revalidatePath('/orcamentos')
        return { success: true, data: bdiConfig }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar configuração BDI")
        return { success: false, error: "Erro ao atualizar configuração BDI" }
    }
}

export async function deleteBDIConfig(id: string) {
    try {
        await assertAuthenticated()
        const config = await prisma.bDIConfig.findUnique({ where: { id } })
        await prisma.bDIConfig.delete({ where: { id } })

        if (config) {
            await logDelete('BDIConfig', id, config.name, config)
        }

        revalidatePath('/configuracoes/bdi')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar configuração BDI")
        return { success: false, error: "Erro ao deletar configuração BDI" }
    }
}

export async function getBDIConfigs(companyId: string) {
    try {
        await assertAuthenticated()
        const bdiConfigs = await prisma.bDIConfig.findMany({
            where: { companyId },
            include: { company: { select: { id: true, name: true } } },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
        })
        return { success: true, data: bdiConfigs }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar configurações BDI")
        return { success: false, error: "Erro ao buscar configurações BDI" }
    }
}

export async function getBDIConfigById(id: string) {
    try {
        await assertAuthenticated()
        const bdiConfig = await prisma.bDIConfig.findUnique({
            where: { id },
            include: { company: true }
        })

        if (!bdiConfig) {
            return { success: false, error: "Configuração BDI não encontrada" }
        }

        return { success: true, data: bdiConfig }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar configuração BDI")
        return { success: false, error: "Erro ao buscar configuração BDI" }
    }
}

export async function getDefaultBDIConfig(companyId: string) {
    try {
        await assertAuthenticated()
        const bdiConfig = await prisma.bDIConfig.findFirst({
            where: { companyId, isDefault: true },
            include: { company: { select: { id: true, name: true } } }
        })

        if (!bdiConfig) {
            return { success: false, error: "Nenhuma configuração BDI padrão encontrada" }
        }

        return { success: true, data: bdiConfig }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar configuração BDI padrão")
        return { success: false, error: "Erro ao buscar configuração BDI padrão" }
    }
}

export async function getBDIAuditHistory(companyId: string) {
    try {
        await assertAuthenticated()
        const logs = await prisma.auditLog.findMany({
            where: {
                entity: 'BDIConfig',
                companyId,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })
        return { success: true, data: logs }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar histórico de auditoria BDI")
        return { success: false, error: "Erro ao buscar histórico" }
    }
}
