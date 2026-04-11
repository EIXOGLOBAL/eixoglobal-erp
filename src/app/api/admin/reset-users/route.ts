import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // Auth: requer RESET_USERS=true no env
  if (process.env.RESET_USERS !== 'true') {
    return NextResponse.json({ error: 'RESET_USERS not enabled' }, { status: 403 })
  }

  try {
    // 1. Deletar todos os usuarios via raw SQL
    await prisma.$executeRaw`DELETE FROM "users"`

    // 2. Garantir empresa existe
    const companies = await prisma.$queryRaw<{id: string}[]>`SELECT id FROM companies LIMIT 1`
    let companyId: string

    if (companies.length > 0) {
      companyId = companies[0].id
    } else {
      const result = await prisma.$queryRaw<{id: string}[]>`
        INSERT INTO companies (id, name, cnpj, email, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'Eixo Global Engenharia', '00000000000000', 'contato@eixoglobal.com.br', NOW(), NOW())
        RETURNING id
      `
      companyId = result[0].id
    }

    // 3. Criar admin
    const hashed = await bcrypt.hash('123456', 10)
    await prisma.$executeRaw`
      INSERT INTO "users" (id, username, name, email, password, role, "companyId", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'admin', 'Administrador', 'danilo@eixoglobal.com.br', ${hashed}, 'ADMIN', ${companyId}::uuid, true, NOW(), NOW())
    `

    return NextResponse.json({
      success: true,
      message: 'Users reset. Admin: admin / 123456',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
