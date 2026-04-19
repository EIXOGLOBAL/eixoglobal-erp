import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const companyId = (session.user as any).companyId as string
  const results: Record<string, any> = {}

  const run = async (name: string, fn: () => Promise<any>) => {
    try {
      const data = await fn()
      results[name] = { ok: true, count: Array.isArray(data) ? data.length : typeof data === "number" ? data : 1 }
    } catch (err: any) {
      results[name] = {
        ok: false,
        message: err?.message ?? String(err),
        code: err?.code,
        meta: err?.meta,
      }
    }
  }

  // /comunicados
  await run("announcement.findMany", () =>
    prisma.announcement.findMany({ where: { companyId }, take: 3 })
  )
  await run("announcement.count", () => prisma.announcement.count({ where: { companyId } }))
  await run("announcementRead.findMany", () =>
    (prisma as any).announcementRead.findMany({ take: 3 })
  )

  // /qualidade
  await run("qualityCheckpoint.findMany", () =>
    prisma.qualityCheckpoint.findMany({ where: { companyId }, take: 3 })
  )
  await run("qualityNonConformity.findMany", () =>
    prisma.qualityNonConformity.findMany({ where: { companyId }, take: 3 })
  )

  // /seguranca-trabalho
  await run("safetyIncident.findMany", () =>
    prisma.safetyIncident.findMany({ where: { companyId }, take: 3 })
  )
  await run("safetyInspection.findMany", () =>
    prisma.safetyInspection.findMany({ where: { companyId }, take: 3 })
  )

  // /contratos  (exata)
  await run("contract.findMany+include", () =>
    prisma.contract.findMany({
      where: { companyId },
      include: {
        project: { select: { id: true, name: true } },
        contractor: { select: { id: true, name: true } },
        _count: { select: { items: true, amendments: true, adjustments: true, bulletins: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    })
  )

  // /orcamentos  (exata)
  await run("budget.findMany", () => prisma.budget.findMany({ where: { companyId }, take: 3 }))
  await run("bDIConfig.findFirst", () =>
    (prisma as any).bDIConfig.findFirst({ where: { companyId, isDefault: true } })
  )

  // Schema drift probe — quais tabelas tem colunas faltando
  await run("schema.drift.safety_incidents", async () => {
    const rows: any[] = await prisma.$queryRawUnsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'safety_incidents' ORDER BY column_name"
    )
    return rows.map((r) => r.column_name)
  })

  return NextResponse.json({ companyId, results }, { headers: { "Cache-Control": "no-store" } })
}
