import { prisma } from '@/lib/prisma'
import { sendContractExpiryAlert, sendDocumentExpiryAlert } from '@/lib/email'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function checkContractExpiries(daysAhead: number = 30) {
    try {
        const cutoffDate = addDays(new Date(), daysAhead)

        const expiringContracts = await prisma.contract.findMany({
            where: {
                status: 'ACTIVE',
                endDate: { lte: cutoffDate, gte: new Date() },
            },
            include: {
                company: { select: { id: true } },
                project: { select: { name: true } },
            },
        })

        if (expiringContracts.length === 0) return { checked: 0, notified: 0 }

        // Group by company
        const byCompany = new Map<string, typeof expiringContracts>()
        for (const c of expiringContracts) {
            const list = byCompany.get(c.companyId) || []
            list.push(c)
            byCompany.set(c.companyId, list)
        }

        let notified = 0
        for (const [companyId, contracts] of byCompany) {
            // Get admins/managers of the company
            const admins = await prisma.user.findMany({
                where: { companyId, role: { in: ['ADMIN', 'MANAGER'] } },
                select: { email: true, name: true },
            })

            const contractData = contracts.map(c => ({
                identifier: c.identifier,
                description: c.description || '',
                endDate: c.endDate ? format(c.endDate, 'dd/MM/yyyy', { locale: ptBR }) : '-',
                daysRemaining: Math.ceil((c.endDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            }))

            for (const admin of admins) {
                await sendContractExpiryAlert(admin.email, admin.name || 'Gestor', contractData)
                notified++
            }
        }

        return { checked: expiringContracts.length, notified }
    } catch (error) {
        console.error('[EMAIL-SCHEDULER] Erro ao verificar contratos:', error)
        return { checked: 0, notified: 0, error: String(error) }
    }
}

export async function checkDocumentExpiries(daysAhead: number = 30) {
    try {
        const cutoffDate = addDays(new Date(), daysAhead)

        const expiringSupplierDocs = await prisma.supplierDocument.findMany({
            where: {
                expiresAt: { lte: cutoffDate, gte: new Date() },
            },
            include: {
                supplier: { select: { name: true, companyId: true } },
            },
        })

        const expiringEquipmentDocs = await prisma.equipmentDocument.findMany({
            where: {
                expiresAt: { lte: cutoffDate, gte: new Date() },
            },
            include: {
                equipment: { select: { name: true, companyId: true } },
            },
        })

        const allDocs = [
            ...expiringSupplierDocs.map(d => ({
                type: d.type,
                entityName: d.supplier.name,
                filename: d.filename,
                expiresAt: format(d.expiresAt!, 'dd/MM/yyyy', { locale: ptBR }),
                daysRemaining: Math.ceil((d.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                companyId: d.supplier.companyId,
            })),
            ...expiringEquipmentDocs.map(d => ({
                type: d.type,
                entityName: d.equipment.name,
                filename: d.filename,
                expiresAt: format(d.expiresAt!, 'dd/MM/yyyy', { locale: ptBR }),
                daysRemaining: Math.ceil((d.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                companyId: d.equipment.companyId,
            })),
        ]

        if (allDocs.length === 0) return { checked: 0, notified: 0 }

        // Group by company
        const byCompany = new Map<string, typeof allDocs>()
        for (const d of allDocs) {
            const list = byCompany.get(d.companyId) || []
            list.push(d)
            byCompany.set(d.companyId, list)
        }

        let notified = 0
        for (const [companyId, docs] of byCompany) {
            const admins = await prisma.user.findMany({
                where: { companyId, role: { in: ['ADMIN', 'MANAGER'] } },
                select: { email: true, name: true },
            })

            for (const admin of admins) {
                await sendDocumentExpiryAlert(admin.email, admin.name || 'Gestor', docs)
                notified++
            }
        }

        return { checked: allDocs.length, notified }
    } catch (error) {
        console.error('[EMAIL-SCHEDULER] Erro ao verificar documentos:', error)
        return { checked: 0, notified: 0, error: String(error) }
    }
}
