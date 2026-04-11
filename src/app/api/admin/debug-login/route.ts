import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Contar usuarios
    const userCount = await prisma.user.count()

    // 2. Buscar admin com select minimo
    const admin = await prisma.user.findFirst({
      where: { username: 'admin' },
      select: { id: true, username: true, role: true, companyId: true, isActive: true },
    })

    // 3. Listar todos users (select minimo)
    const allUsers = await prisma.user.findMany({
      select: { id: true, username: true, role: true, companyId: true },
      take: 10,
    })

    // 4. Verificar colunas da tabela users via raw query
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `

    // 5. Contar empresas
    const companyCount = await prisma.company.count()
    const firstCompany = await prisma.company.findFirst({
      select: { id: true, name: true },
    })

    return NextResponse.json({
      userCount,
      admin,
      allUsers,
      columns,
      companyCount,
      firstCompany,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    }, { status: 500 })
  }
}
