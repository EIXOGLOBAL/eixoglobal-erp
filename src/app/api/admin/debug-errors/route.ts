import { NextRequest, NextResponse } from "next/server"
import { getDebugErrors } from "@/lib/debug-errors"

export const dynamic = "force-dynamic"

// Endpoint de diagnóstico — usado para inspecionar erros capturados em memória.
// Protegido por DEBUG_TOKEN dedicado (não compartilhar com outros tokens).
function authorized(req: NextRequest) {
  const token = req.headers.get("x-debug-token")
  const expected = process.env.DEBUG_TOKEN
  if (!expected) return false
  return token === expected
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  return NextResponse.json({ errors: getDebugErrors() })
}
