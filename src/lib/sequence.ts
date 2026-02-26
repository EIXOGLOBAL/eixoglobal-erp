import { prisma } from '@/lib/prisma'

/**
 * Gera o próximo código sequencial para um modelo.
 * Ex: getNextCode('employee', companyId) → '0042'
 */
export async function getNextCode(
  model: 'employee' | 'project' | 'equipment' | 'material' | 'company' | 'contractor' | 'client',
  companyId?: string
): Promise<string> {
  let count = 0

  if (model === 'employee') {
    count = await prisma.employee.count({ where: companyId ? { companyId } : {} })
  } else if (model === 'project') {
    count = await prisma.project.count({ where: companyId ? { companyId } : {} })
  } else if (model === 'equipment') {
    count = await prisma.equipment.count({ where: companyId ? { companyId } : {} })
  } else if (model === 'material') {
    count = await prisma.material.count({ where: companyId ? { companyId } : {} })
  } else if (model === 'company') {
    count = await prisma.company.count()
  } else if (model === 'contractor') {
    count = await prisma.contractor.count({ where: companyId ? { companyId } : {} })
  } else if (model === 'client') {
    count = await prisma.client.count({ where: companyId ? { companyId } : {} })
  }

  return String(count + 1).padStart(4, '0')
}
