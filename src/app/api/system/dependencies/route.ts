import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UpdateStatus = "UP_TO_DATE" | "PATCH" | "MINOR" | "MAJOR"

interface DependencyInfo {
  name: string
  category: string
  installed: string
  latest: string | null
  status: UpdateStatus | "ERROR"
}

interface NodeInfo {
  installed: string
  latestLts: string | null
  status: UpdateStatus | "ERROR"
}

interface DependencyCheckResult {
  dependencies: DependencyInfo[]
  node: NodeInfo
  summary: {
    total: number
    upToDate: number
    patch: number
    minor: number
    major: number
    error: number
  }
  checkedAt: string
}

// ---------------------------------------------------------------------------
// Cache (1 hour)
// ---------------------------------------------------------------------------

let cachedResult: { data: DependencyCheckResult; timestamp: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Key packages to check with their categories
// ---------------------------------------------------------------------------

const KEY_PACKAGES: Record<string, string> = {
  next: "Framework",
  react: "Framework",
  ai: "AI",
  "@prisma/client": "Banco de Dados",
  tailwindcss: "Estilo",
  "lucide-react": "UI",
  recharts: "Graficos",
  jose: "Seguranca",
  bcryptjs: "Seguranca",
  "date-fns": "Utilitario",
  zod: "Validacao",
}

// ---------------------------------------------------------------------------
// Semver helpers
// ---------------------------------------------------------------------------

function parseSemver(version: string): [number, number, number] | null {
  const clean = version.replace(/^[~^>=<\s]+/, "").replace(/-.*$/, "")
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)]
}

function classifyUpdate(installed: string, latest: string): UpdateStatus {
  const inst = parseSemver(installed)
  const lat = parseSemver(latest)
  if (!inst || !lat) return "UP_TO_DATE"

  if (lat[0] > inst[0]) return "MAJOR"
  if (lat[1] > inst[1]) return "MINOR"
  if (lat[2] > inst[2]) return "PATCH"
  return "UP_TO_DATE"
}

// ---------------------------------------------------------------------------
// Read installed versions from package.json
// ---------------------------------------------------------------------------

function getInstalledVersions(): Record<string, string> {
  const pkgPath = join(process.cwd(), "package.json")
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
  const all: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  }
  const result: Record<string, string> = {}
  for (const name of Object.keys(KEY_PACKAGES)) {
    if (all[name]) {
      result[name] = all[name].replace(/^[~^]/, "")
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Fetch latest version from NPM registry
// ---------------------------------------------------------------------------

async function fetchLatestNpm(pkg: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${pkg}/latest`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.version ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Fetch latest Node.js LTS version
// ---------------------------------------------------------------------------

async function fetchLatestNodeLts(): Promise<string | null> {
  try {
    const res = await fetch("https://nodejs.org/dist/index.json", {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data: Array<{ version: string; lts: string | false }> = await res.json()
    const lts = data.find((entry) => entry.lts !== false)
    return lts ? lts.version.replace(/^v/, "") : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// GET /api/system/dependencies
// Returns installed versions from package.json (no external calls)
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  try {
    const installed = getInstalledVersions()
    const dependencies = Object.entries(KEY_PACKAGES).map(([name, category]) => ({
      name,
      category,
      installed: installed[name] ?? "nao instalado",
    }))

    return NextResponse.json({
      dependencies,
      nodeVersion: process.version.replace(/^v/, ""),
      cachedResult: cachedResult
        ? { checkedAt: cachedResult.data.checkedAt, summary: cachedResult.data.summary }
        : null,
    })
  } catch (error: any) {
    console.error("[system/dependencies] Erro ao ler versoes:", error)
    return NextResponse.json(
      { error: "Erro ao ler versoes instaladas" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/system/dependencies
// Checks NPM registry + Node.js for latest versions (cached 1h)
// ---------------------------------------------------------------------------

export async function POST() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  // Return cached result if still valid
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedResult.data, {
      headers: { "X-Cache": "HIT" },
    })
  }

  try {
    const installed = getInstalledVersions()

    // Fetch all latest versions in parallel
    const packageNames = Object.keys(KEY_PACKAGES)
    const [latestVersions, latestNodeLts] = await Promise.all([
      Promise.all(packageNames.map((name) => fetchLatestNpm(name))),
      fetchLatestNodeLts(),
    ])

    // Build dependency info list
    const dependencies: DependencyInfo[] = packageNames.map((name, i) => {
      const installedVersion = installed[name] ?? "nao instalado"
      const latestVersion = latestVersions[i]

      let status: UpdateStatus | "ERROR" = "ERROR"
      if (latestVersion && installed[name]) {
        status = classifyUpdate(installedVersion, latestVersion)
      } else if (!latestVersion) {
        status = "ERROR"
      }

      return {
        name,
        category: KEY_PACKAGES[name],
        installed: installedVersion,
        latest: latestVersion,
        status,
      }
    })

    // Node.js info
    const nodeInstalled = process.version.replace(/^v/, "")
    const node: NodeInfo = {
      installed: nodeInstalled,
      latestLts: latestNodeLts,
      status: latestNodeLts ? classifyUpdate(nodeInstalled, latestNodeLts) : "ERROR",
    }

    // Summary counts
    const summary = {
      total: dependencies.length,
      upToDate: dependencies.filter((d) => d.status === "UP_TO_DATE").length,
      patch: dependencies.filter((d) => d.status === "PATCH").length,
      minor: dependencies.filter((d) => d.status === "MINOR").length,
      major: dependencies.filter((d) => d.status === "MAJOR").length,
      error: dependencies.filter((d) => d.status === "ERROR").length,
    }

    const result: DependencyCheckResult = {
      dependencies,
      node,
      summary,
      checkedAt: new Date().toISOString(),
    }

    // Cache the result
    cachedResult = { data: result, timestamp: Date.now() }

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS" },
    })
  } catch (error: any) {
    console.error("[system/dependencies] Erro ao verificar atualizacoes:", error)
    return NextResponse.json(
      { error: "Erro ao verificar atualizacoes" },
      { status: 500 }
    )
  }
}
