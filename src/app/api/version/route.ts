import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  return NextResponse.json({
    name: "erp-eixo-global",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown",
    commitFull: process.env.NEXT_PUBLIC_BUILD_COMMIT_FULL ?? "unknown",
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown",
    environment: process.env.NODE_ENV ?? "unknown",
  });
}
