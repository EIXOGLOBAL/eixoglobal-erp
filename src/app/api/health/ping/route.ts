import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { timestamp: Date.now(), server: "ok" },
    {
      headers: {
        "Cache-Control": "no-cache, no-store",
      },
    }
  );
}
