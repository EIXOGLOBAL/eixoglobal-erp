import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Buscar admin por username
    const user = await prisma.user.findUnique({
      where: { username: 'admin' },
      select: {
        id: true, username: true, password: true, role: true,
        isActive: true, isBlocked: true, blockedReason: true,
        email: true, name: true, companyId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User admin not found' }, { status: 404 })
    }

    // 2. Testar senha
    const match = await bcrypt.compare('123456', user.password)

    return NextResponse.json({
      found: true,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      passwordMatch: match,
      hasCompany: !!user.companyId,
      loginWouldWork: match && user.isActive && !user.isBlocked,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
