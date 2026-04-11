import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Listar TODAS as tabelas
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `

    // 2. Colunas da tabela users (se existir)
    const userCols: any[] = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' ORDER BY ordinal_position
    `

    // 3. Dados dos users via SELECT *
    let users: any[] = []
    try {
      users = await prisma.$queryRaw`SELECT * FROM users LIMIT 5`
    } catch (e: any) {
      users = [{ error: e.message }]
    }

    return NextResponse.json({
      tables: tables.map((t: any) => t.table_name),
      userColumns: userCols.map((c: any) => c.column_name),
      users,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
