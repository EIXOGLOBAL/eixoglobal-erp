'use server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function getProjectsForMap() {
  try {
    const session = await getSession()
    if (!session?.user?.id) return []

    // Filtra por empresa quando disponível (multi-tenant)
    const companyId = session.user.companyId

    const projects = await prisma.project.findMany({
      where: companyId ? { companyId } : undefined,
      select: {
        id: true,
        name: true,
        status: true,
        latitude: true,
        longitude: true,
        startDate: true,
        endDate: true,
        budget: true,
        company: { select: { id: true, name: true } },
        _count: { select: { measurements: true } },
      },
      orderBy: { name: 'asc' },
    })

    // Serialize Decimal -> number e descarta projetos sem coordenadas válidas
    return projects
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => ({
        ...p,
        budget: p.budget ? Number(p.budget) : null,
      }))
  } catch (error) {
    console.error('[getProjectsForMap]', error)
    return []
  }
}
