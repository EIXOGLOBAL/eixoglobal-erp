import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  createBackup,
  listBackups,
  deleteBackup,
  getBackupStats,
  cleanupOldBackups,
} from "@/lib/backup-manager"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function assertAdmin() {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

// ---------------------------------------------------------------------------
// GET /api/system/backup — list backups + stats
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await assertAdmin()
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  try {
    const [backups, stats] = [listBackups(), getBackupStats()]
    return NextResponse.json({ success: true, backups, stats })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message ?? "Erro ao listar backups" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/system/backup — create or delete a backup
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await assertAdmin()
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action = (body as any).action ?? "create"

    // --- Delete ---
    if (action === "delete") {
      const filename = (body as any).filename
      if (!filename || typeof filename !== "string") {
        return NextResponse.json(
          { success: false, error: "Filename obrigatorio" },
          { status: 400 }
        )
      }
      deleteBackup(filename)
      return NextResponse.json({ success: true, message: "Backup removido" })
    }

    // --- Cleanup ---
    if (action === "cleanup") {
      const keepDays = Number((body as any).keepDays) || 7
      const deleted = cleanupOldBackups(keepDays)
      return NextResponse.json({ success: true, deleted })
    }

    // --- Create (default) ---
    const result = createBackup()
    return NextResponse.json({
      success: true,
      filename: result.filename,
      size: result.size,
      sizeFormatted: result.sizeFormatted,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message ?? "Erro no backup" },
      { status: 500 }
    )
  }
}
