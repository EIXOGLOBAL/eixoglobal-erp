import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

// Endpoint protegido por token (env ADMIN_RESET_TOKEN).
// POST { email?: string, password: string }
// - sem email: reseta todos os ADMIN
// - com email: reseta apenas o usuario indicado
// GET: lista emails de admins (sem senha)
function authorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token")
  const expected = process.env.ADMIN_RESET_TOKEN
  return !!expected && token === expected
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({ count: users.length, users })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const password: string | undefined = body?.password
    const email: string | undefined = body?.email
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "password missing or too short" }, { status: 400 })
    }
    const hashed = await bcrypt.hash(password, 10)
    const where = email ? { email } : { role: "ADMIN" as const }
    const result = await prisma.user.updateMany({ where, data: { password: hashed } })
    return NextResponse.json({ ok: true, updated: result.count, where })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 })
  }
}
