'use server'
import { prisma } from '@/lib/prisma'

export async function getProjectsForMap() {
  const projects = await prisma.project.findMany({
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

  // Serialize Decimal to number for client components
  return projects.map(p => ({
    ...p,
    budget: p.budget ? Number(p.budget) : null,
  }))
}
