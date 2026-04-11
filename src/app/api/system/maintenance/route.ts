import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  enableMaintenance,
  disableMaintenance,
  getMaintenanceStatus,
} from "@/lib/maintenance-mode"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// GET /api/system/maintenance — public status check
// ---------------------------------------------------------------------------

export async function GET() {
  const status = getMaintenanceStatus()

  if (!status) {
    return NextResponse.json({ active: false })
  }

  return NextResponse.json({
    active: true,
    reason: status.reason,
    enabledAt: status.enabledAt,
    estimatedEnd: status.estimatedEnd,
  })
}

// ---------------------------------------------------------------------------
// POST /api/system/maintenance — enable/disable (ADMIN only)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action = (body as any).action

    if (action === "enable") {
      const reason = (body as any).reason ?? "Manutencao programada"
      const durationMinutes = (body as any).durationMinutes
        ? Number((body as any).durationMinutes)
        : undefined

      const state = enableMaintenance(session.user.id, reason, durationMinutes)
      return NextResponse.json({ success: true, maintenance: state })
    }

    if (action === "disable") {
      disableMaintenance(session.user.id)
      return NextResponse.json({ success: true, active: false })
    }

    return NextResponse.json(
      { success: false, error: "Acao invalida. Use 'enable' ou 'disable'." },
      { status: 400 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message ?? "Erro interno" },
      { status: 500 }
    )
  }
}
