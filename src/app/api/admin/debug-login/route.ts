import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Verificar colunas da tabela users via raw query
    const columns: any[] = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `

    // 2. Contar usuarios via raw SQL
    const countResult: any[] = await prisma.$queryRaw`SELECT COUNT(*) as total FROM users`

    // 3. Buscar admin via raw SQL
    const adminResult: any[] = await prisma.$queryRaw`
      SELECT id, username, role, "companyId", "isActive"
      FROM users
      WHERE username = 'admin'
      LIMIT 1
    `

    // 4. Listar todas as tabelas
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    // 5. Contar empresas
    const companyResult: any[] = await prisma.$queryRaw`SELECT COUNT(*) as total FROM companies`

    return NextResponse.json({
      userCount: countResult[0]?.total,
      admin: adminResult[0] || null,
      columnNames: columns.map((c: any) => c.column_name),
      columnCount: columns.length,
      tableCount: tables.length,
      companyCount: companyResult[0]?.total,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    }, { status: 500 })
  }
}
