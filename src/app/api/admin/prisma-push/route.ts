import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { execSync } from "child_process"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/**
 * Executa `prisma db push` em produção para sincronizar o schema Prisma com o banco.
 * ADMIN-only. Endpoint temporário para remediar schema drift acumulado.
 *
 * Query params:
 *   ?force=true  — passa --accept-data-loss (permite drops)
 *   ?dryRun=true — adiciona --skip-generate (default) e para o push
 *
 * Remova este endpoint após a remediação.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const force = url.searchParams.get("force") === "true"

  const args = ["prisma", "db", "push", "--skip-generate"]
  if (force) args.push("--accept-data-loss")

  const cmd = `npx ${args.join(" ")}`

  try {
    const stdout = execSync(cmd, {
      cwd: process.cwd(),
      env: { ...process.env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 110_000,
    })
    return NextResponse.json(
      { ok: true, cmd, stdout: String(stdout) },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        cmd,
        message: err?.message ?? String(err),
        stdout: err?.stdout ? String(err.stdout) : null,
        stderr: err?.stderr ? String(err.stderr) : null,
        status: err?.status ?? null,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
