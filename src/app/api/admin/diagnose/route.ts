import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Endpoint de diagnostico temporario — roda exatamente as mesmas queries
// que as paginas /contratos, /orcamentos, /comunicados, /seguranca-trabalho
// e /qualidade fazem, e retorna qual falha e com qual mensagem.
export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const companyId = (session.user as any).companyId as string
  const results: Record<string, any> = {}

  const run = async (name: string, fn: () => Promise<any>) => {
    try {
      const data = await fn()
      results[name] = {
        ok: true,
        sample: Array.isArray(data) ? { count: data.length, first: data[0] } : data,
      }
    } catch (err: any) {
      results[name] = {
        ok: false,
        message: err?.message ?? String(err),
        code: err?.code,
        name: err?.name,
        stack: (err?.stack ?? "").split("\n").slice(0, 8).join("\n"),
      }
    }
  }

  await run("project.findMany", () =>
    prisma.project.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 5 })
  )
  await run("contractor.findMany", () =>
    prisma.contractor.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 5 })
  )
  await run("contract.findMany+bulletins", () =>
    prisma.contract.findMany({
      where: { companyId },
      include: {
        project: { select: { id: true, name: true } },
        contractor: { select: { id: true, name: true } },
        _count: { select: { items: true, amendments: true, adjustments: true, bulletins: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
  )
  await run("contract.count", () => prisma.contract.count({ where: { companyId } }))
  await run("budget.findMany", () =>
    (prisma as any).budget?.findMany?.({ where: { companyId }, take: 5 }) ?? Promise.reject(new Error("prisma.budget not found"))
  )
  await run("communication.findMany", () =>
    (prisma as any).communication?.findMany?.({ where: { companyId }, take: 5 }) ?? Promise.reject(new Error("prisma.communication not found"))
  )
  await run("qualityInspection.findMany", () =>
    (prisma as any).qualityInspection?.findMany?.({ where: { companyId }, take: 5 }) ?? Promise.reject(new Error("prisma.qualityInspection not found"))
  )
  await run("safetyIncident.findMany", () =>
    (prisma as any).safetyIncident?.findMany?.({ where: { companyId }, take: 5 }) ?? Promise.reject(new Error("prisma.safetyIncident not found"))
  )

  // Prisma client version
  const meta: Record<string, any> = {
    prismaModels: Object.keys(prisma).filter(
      (k) => typeof (prisma as any)[k]?.findMany === "function"
    ),
    companyId,
    nodeVersion: process.version,
  }

  return NextResponse.json({ meta, results }, { headers: { "Cache-Control": "no-store" } })
}
