import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  href: string
  category: string
}

interface SearchResponse {
  results: Record<string, SearchResult[]>
  total: number
}

const CATEGORY_LIMIT = 5

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()
    const type = searchParams.get("type") || "all"

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Termo de busca deve ter pelo menos 2 caracteres" },
        { status: 400 }
      )
    }

    const companyId = session.user.companyId
    const role = session.user.role
    const results: Record<string, SearchResult[]> = {}

    // Montar as queries em paralelo conforme o tipo solicitado
    const queries: Promise<void>[] = []

    // --- Clientes ---
    if (type === "all" || type === "clientes") {
      queries.push(
        prisma.client
          .findMany({
            where: {
              companyId,
              isDeleted: false,
              OR: [
                { displayName: { contains: query, mode: "insensitive" } },
                { companyName: { contains: query, mode: "insensitive" } },
                { tradeName: { contains: query, mode: "insensitive" } },
                { personName: { contains: query, mode: "insensitive" } },
                { cnpj: { contains: query, mode: "insensitive" } },
                { cpf: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { code: { contains: query, mode: "insensitive" } },
              ],
            },
            select: { id: true, displayName: true, email: true, code: true },
            take: CATEGORY_LIMIT,
            orderBy: { updatedAt: "desc" },
          })
          .then((clients) => {
            if (clients.length > 0) {
              results["Clientes"] = clients.map((c) => ({
                id: c.id,
                title: c.displayName,
                subtitle: c.code || c.email || undefined,
                href: `/clientes/${c.id}`,
                category: "Clientes",
              }))
            }
          })
      )
    }

    // --- Projetos ---
    if (type === "all" || type === "projetos") {
      queries.push(
        prisma.project
          .findMany({
            where: {
              companyId,
              isDeleted: false,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { location: { contains: query, mode: "insensitive" } },
                { code: { contains: query, mode: "insensitive" } },
              ],
            },
            select: { id: true, name: true, code: true, location: true },
            take: CATEGORY_LIMIT,
            orderBy: { updatedAt: "desc" },
          })
          .then((projects) => {
            if (projects.length > 0) {
              results["Projetos"] = projects.map((p) => ({
                id: p.id,
                title: p.name,
                subtitle: p.code || p.location || undefined,
                href: `/projects/${p.id}`,
                category: "Projetos",
              }))
            }
          })
      )
    }

    // --- Contratos ---
    if (type === "all" || type === "contratos") {
      queries.push(
        prisma.contract
          .findMany({
            where: {
              companyId,
              isDeleted: false,
              OR: [
                { identifier: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { contractNumber: { contains: query, mode: "insensitive" } },
                { object: { contains: query, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              identifier: true,
              description: true,
              contractNumber: true,
            },
            take: CATEGORY_LIMIT,
            orderBy: { updatedAt: "desc" },
          })
          .then((contracts) => {
            if (contracts.length > 0) {
              results["Contratos"] = contracts.map((c) => ({
                id: c.id,
                title: c.identifier,
                subtitle: c.contractNumber || c.description?.slice(0, 60) || undefined,
                href: `/contratos/${c.id}`,
                category: "Contratos",
              }))
            }
          })
      )
    }

    // --- Financeiro ---
    if (type === "all" || type === "financeiro") {
      queries.push(
        prisma.financialRecord
          .findMany({
            where: {
              companyId,
              isDeleted: false,
              OR: [
                { description: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              description: true,
              type: true,
              amount: true,
              status: true,
            },
            take: CATEGORY_LIMIT,
            orderBy: { updatedAt: "desc" },
          })
          .then((records) => {
            if (records.length > 0) {
              results["Financeiro"] = records.map((r) => ({
                id: r.id,
                title: r.description.slice(0, 80),
                subtitle: `${r.type === "INCOME" ? "Receita" : "Despesa"} - ${r.status}`,
                href: `/financeiro`,
                category: "Financeiro",
              }))
            }
          })
      )
    }

    // --- Equipamentos ---
    if (type === "all" || type === "equipamentos") {
      queries.push(
        prisma.equipment
          .findMany({
            where: {
              companyId,
              isDeleted: false,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { code: { contains: query, mode: "insensitive" } },
                { brand: { contains: query, mode: "insensitive" } },
                { model: { contains: query, mode: "insensitive" } },
                { serialNumber: { contains: query, mode: "insensitive" } },
              ],
            },
            select: { id: true, name: true, code: true, brand: true },
            take: CATEGORY_LIMIT,
            orderBy: { updatedAt: "desc" },
          })
          .then((equipment) => {
            if (equipment.length > 0) {
              results["Equipamentos"] = equipment.map((e) => ({
                id: e.id,
                title: e.name,
                subtitle: [e.code, e.brand].filter(Boolean).join(" - ") || undefined,
                href: `/equipamentos/${e.id}`,
                category: "Equipamentos",
              }))
            }
          })
      )
    }

    // --- Usuários (apenas ADMIN) ---
    if ((type === "all" || type === "usuarios") && role === "ADMIN") {
      queries.push(
        prisma.user
          .findMany({
            where: {
              companyId,
              isActive: true,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { username: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            },
            select: { id: true, name: true, username: true, email: true, role: true },
            take: CATEGORY_LIMIT,
            orderBy: { updatedAt: "desc" },
          })
          .then((users) => {
            if (users.length > 0) {
              results["Usuários"] = users.map((u) => ({
                id: u.id,
                title: u.name || u.username,
                subtitle: u.email || u.role || undefined,
                href: `/users`,
                category: "Usuários",
              }))
            }
          })
      )
    }

    // Executar todas as queries em paralelo
    await Promise.all(queries)

    const total = Object.values(results).reduce(
      (sum, arr) => sum + arr.length,
      0
    )

    const response: SearchResponse = { results, total }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[Global Search] Erro:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
