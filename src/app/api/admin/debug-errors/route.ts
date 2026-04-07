import { NextRequest, NextResponse } from "next/server"
import { getDebugErrors } from "@/lib/debug-errors"

export const dynamic = "force-dynamic"

function authorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token")
  const expected = process.env.ADMIN_RESET_TOKEN
  return !!expected && token === expected
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  return NextResponse.json({ errors: getDebugErrors() })
}
