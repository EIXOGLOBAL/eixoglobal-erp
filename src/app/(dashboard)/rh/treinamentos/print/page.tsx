import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { PrintTrainingsClient } from "@/components/rh/print-trainings-client"

export const dynamic = 'force-dynamic'

export default async function PrintTrainingsPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) notFound()

    // Buscar empresa
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
            id: true,
            name: true,
            cnpj: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
        },
    })

    // Buscar todos os treinamentos com participantes
    const trainings = await prisma.training.findMany({
        where: { companyId },
        include: {
            participants: {
                include: {
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            jobTitle: true,
                        },
                    },
                },
                orderBy: { createdAt: 'asc' },
            },
            _count: {
                select: { participants: true },
            },
        },
        orderBy: { startDate: 'desc' },
    })

    return (
        <PrintTrainingsClient
            trainings={trainings.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description ?? null,
                instructor: t.instructor ?? null,
                location: t.location ?? null,
                startDate: t.startDate,
                endDate: t.endDate ?? null,
                hours: Number(t.hours),
                maxParticipants: t.maxParticipants ?? null,
                status: t.status,
                type: t.type,
                cost: t.cost ? Number(t.cost) : null,
                participants: t.participants.map(p => ({
                    id: p.id,
                    attended: p.attended,
                    certified: p.certified,
                    notes: p.notes ?? null,
                    employee: {
                        id: p.employee.id,
                        name: p.employee.name,
                        jobTitle: p.employee.jobTitle,
                    },
                })),
                participantCount: t._count.participants,
            }))}
            company={company}
        />
    )
}
