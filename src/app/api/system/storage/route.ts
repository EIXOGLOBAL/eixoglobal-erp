import { NextResponse } from "next/server"
import { execSync } from "child_process"
import { join } from "path"
import { readdir, stat } from "fs/promises"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

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

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"])
const PDF_EXTS = new Set([".pdf"])
const DOC_EXTS = new Set([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".csv", ".txt"])

function classifyFile(name: string): "images" | "pdfs" | "documents" | "other" {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase()
  if (IMAGE_EXTS.has(ext)) return "images"
  if (PDF_EXTS.has(ext)) return "pdfs"
  if (DOC_EXTS.has(ext)) return "documents"
  return "other"
}

/** Recursively walk a directory and collect total size + per-type file counts. */
async function scanDir(dirPath: string) {
  let totalSize = 0
  let fileCount = 0
  const byType: Record<string, number> = { images: 0, pdfs: 0, documents: 0, other: 0 }

  async function walk(dir: string) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      // Directory may not exist or be unreadable
      return
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile()) {
        try {
          const info = await stat(fullPath)
          totalSize += info.size
          fileCount++
          byType[classifyFile(entry.name)]++
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  await walk(dirPath)
  return { totalSize, fileCount, byType }
}

// ---------------------------------------------------------------------------
// GET /api/system/storage
// ---------------------------------------------------------------------------

export async function GET() {
  // ---- Auth: ADMIN only ----
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  try {
    // ---- Disk usage via df ----
    let disk = { total: 0, used: 0, available: 0, percentUsed: 0, totalFormatted: "", usedFormatted: "", availableFormatted: "" }
    try {
      const output = execSync("df -B1 /", { encoding: "utf-8", timeout: 5000 })
      const lines = output.trim().split("\n")
      // The second line contains the data — columns may vary but the relevant
      // fields are: Filesystem 1B-blocks Used Available Use% Mounted
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/)
        // Some systems (macOS) output extra columns; find large numeric values
        const nums = parts.map(Number).filter((n) => !isNaN(n) && n > 0)
        if (nums.length >= 3) {
          disk.total = nums[0]
          disk.used = nums[1]
          disk.available = nums[2]
        }
        // Percent – try the column that ends with '%'
        const pctCol = parts.find((p) => p.endsWith("%"))
        disk.percentUsed = pctCol ? parseInt(pctCol, 10) : disk.total > 0 ? Math.round((disk.used / disk.total) * 100) : 0
        disk.totalFormatted = formatBytes(disk.total)
        disk.usedFormatted = formatBytes(disk.used)
        disk.availableFormatted = formatBytes(disk.available)
      }
    } catch {
      // df may not work in certain container configurations; fall back gracefully
    }

    // ---- Database size ----
    let database = { size: 0, sizeFormatted: "" }
    try {
      const result: any[] = await (prisma as any).$queryRawUnsafe(
        "SELECT pg_database_size(current_database()) as size"
      )
      const dbSize = Number(result[0]?.size ?? 0)
      database = { size: dbSize, sizeFormatted: formatBytes(dbSize) }
    } catch {
      // Query may fail if the DB user lacks pg_database_size permission
    }

    // ---- Uploads folder ----
    const uploadsPath = join(process.cwd(), "public", "uploads")
    const uploadsScan = await scanDir(uploadsPath)

    const uploads = {
      size: uploadsScan.totalSize,
      sizeFormatted: formatBytes(uploadsScan.totalSize),
      fileCount: uploadsScan.fileCount,
      byType: {
        images: uploadsScan.byType.images,
        pdfs: uploadsScan.byType.pdfs,
        documents: uploadsScan.byType.documents,
        other: uploadsScan.byType.other,
      },
    }

    return NextResponse.json({
      disk,
      database,
      uploads,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[storage] Erro ao obter dados de armazenamento:", error)
    return NextResponse.json(
      { error: "Erro ao obter dados de armazenamento" },
      { status: 500 }
    )
  }
}
