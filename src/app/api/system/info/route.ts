import { NextResponse } from "next/server"
import { execSync } from "child_process"
import { readFileSync } from "fs"
import { join } from "path"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Cache layer (60 seconds)
// ---------------------------------------------------------------------------

let cachedResponse: { data: any; timestamp: number } | null = null
const CACHE_TTL_MS = 60_000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(2)} ${units[i]}`
}

function formatUptime(seconds: number): string {
  const dias = Math.floor(seconds / 86400)
  const horas = Math.floor((seconds % 86400) / 3600)
  const minutos = Math.floor((seconds % 3600) / 60)
  const segs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (dias > 0) parts.push(`${dias} ${dias === 1 ? "dia" : "dias"}`)
  if (horas > 0) parts.push(`${horas} ${horas === 1 ? "hora" : "horas"}`)
  if (minutos > 0) parts.push(`${minutos} ${minutos === 1 ? "minuto" : "minutos"}`)
  if (parts.length === 0) parts.push(`${segs} ${segs === 1 ? "segundo" : "segundos"}`)

  return parts.join(", ")
}

function getPackageVersions(): {
  appVersion: string
  nextVersion: string
  prismaVersion: string
  reactVersion: string
} {
  try {
    const pkgPath = join(process.cwd(), "package.json")
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
    return {
      appVersion: pkg.version ?? "desconhecido",
      nextVersion: (pkg.dependencies?.next ?? "desconhecido").replace("^", ""),
      prismaVersion: (pkg.devDependencies?.prisma ?? pkg.dependencies?.["@prisma/client"] ?? "desconhecido").replace("^", ""),
      reactVersion: (pkg.dependencies?.react ?? "desconhecido").replace("^", ""),
    }
  } catch {
    return {
      appVersion: "desconhecido",
      nextVersion: "desconhecido",
      prismaVersion: "desconhecido",
      reactVersion: "desconhecido",
    }
  }
}

function getDiskUsage(): {
  total: string
  used: string
  available: string
  percentUsed: number
  raw: string
} | null {
  try {
    const output = execSync("df -h /", { encoding: "utf-8", timeout: 5000 })
    const lines = output.trim().split("\n")
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/)
      // Format: Filesystem Size Used Avail Use% Mounted
      const pctCol = parts.find((p) => p.endsWith("%"))
      return {
        total: parts[1] ?? "N/A",
        used: parts[2] ?? "N/A",
        available: parts[3] ?? "N/A",
        percentUsed: pctCol ? parseInt(pctCol, 10) : 0,
        raw: lines[1],
      }
    }
  } catch {
    // df may not work in certain environments
  }
  return null
}

function getDockerInfo(): {
  isDocker: boolean
  containerId: string | null
  hostname: string | null
} {
  let isDocker = false
  let containerId: string | null = null

  try {
    // Check for .dockerenv file (most common indicator)
    execSync("test -f /.dockerenv", { timeout: 2000 })
    isDocker = true
  } catch {
    // Not in Docker or command failed
  }

  if (!isDocker) {
    try {
      const cgroup = execSync("cat /proc/1/cgroup 2>/dev/null || true", {
        encoding: "utf-8",
        timeout: 2000,
      })
      if (cgroup.includes("docker") || cgroup.includes("containerd")) {
        isDocker = true
      }
    } catch {
      // Not available
    }
  }

  if (isDocker) {
    try {
      containerId = execSync("hostname", { encoding: "utf-8", timeout: 2000 }).trim().slice(0, 12)
    } catch {
      // hostname may not be available
    }
  }

  return {
    isDocker,
    containerId,
    hostname: process.env.HOSTNAME ?? null,
  }
}

// ---------------------------------------------------------------------------
// GET /api/system/info
// ---------------------------------------------------------------------------

export async function GET() {
  // ---- Auth: ADMIN only ----
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  // ---- Return cached response if still valid ----
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedResponse.data, {
      headers: {
        "X-Cache": "HIT",
        "Cache-Control": "private, max-age=60",
      },
    })
  }

  try {
    // ---- Application info ----
    const versions = getPackageVersions()

    // ---- Server info ----
    const uptimeSeconds = process.uptime()
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    // ---- Database checks (parallel) ----
    const dbStart = Date.now()
    const [dbPing, dbSize, totalUsers, totalCompanies] = await Promise.all([
      (prisma as any)
        .$queryRawUnsafe("SELECT 1 as ok")
        .then(() => ({ ok: true, latencyMs: Date.now() - dbStart }))
        .catch((err: any) => ({ ok: false, latencyMs: Date.now() - dbStart, error: err.message })),
      (prisma as any)
        .$queryRawUnsafe("SELECT pg_database_size(current_database()) as size")
        .then((r: any[]) => {
          const bytes = Number(r[0]?.size ?? 0)
          return { bytes, formatted: formatBytes(bytes) }
        })
        .catch(() => ({ bytes: 0, formatted: "N/A" })),
      (prisma as any).user.count().catch(() => 0),
      (prisma as any).company.count().catch(() => 0),
    ])

    // ---- Disk usage ----
    const disk = getDiskUsage()

    // ---- Docker info ----
    const docker = getDockerInfo()

    // ---- Active sessions estimate (users updated in last 24h) ----
    let activeSessions = 0
    try {
      activeSessions = await (prisma as any).user.count({
        where: {
          lastAccessAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      })
    } catch {
      // lastAccessAt field may not exist
    }

    // ---- Build response ----
    const data = {
      aplicacao: {
        nome: "ERP Eixo Global",
        versao: versions.appVersion,
        ambiente: process.env.NODE_ENV ?? "desconhecido",
        nodeVersion: process.version,
        nextVersion: versions.nextVersion,
        prismaVersion: versions.prismaVersion,
        reactVersion: versions.reactVersion,
      },
      servidor: {
        uptime: {
          seconds: Math.floor(uptimeSeconds),
          formatted: formatUptime(uptimeSeconds),
        },
        memoria: {
          rss: { bytes: memUsage.rss, formatted: formatBytes(memUsage.rss) },
          heapUsed: { bytes: memUsage.heapUsed, formatted: formatBytes(memUsage.heapUsed) },
          heapTotal: { bytes: memUsage.heapTotal, formatted: formatBytes(memUsage.heapTotal) },
          percentUsed: memUsage.heapTotal > 0
            ? Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
            : 0,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          userFormatted: `${(cpuUsage.user / 1_000_000).toFixed(2)}s`,
          systemFormatted: `${(cpuUsage.system / 1_000_000).toFixed(2)}s`,
        },
        disco: disk,
        docker,
      },
      bancoDeDados: {
        conectividade: dbPing,
        tamanho: dbSize,
        totalUsuarios: totalUsers,
        totalEmpresas: totalCompanies,
        sessoesAtivas: activeSessions,
      },
      timestamp: new Date().toISOString(),
    }

    // ---- Cache the response ----
    cachedResponse = { data, timestamp: Date.now() }

    return NextResponse.json(data, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error: any) {
    console.error("[system/info] Erro ao coletar informacoes do sistema:", error)
    return NextResponse.json(
      { error: "Erro ao coletar informacoes do sistema" },
      { status: 500 }
    )
  }
}
