/**
 * Test API - Update Dashboard
 * Endpoint de teste para atualizar dashboard via SSE
 */

import { NextRequest, NextResponse } from "next/server";
import { getSSEServer } from "@/lib/realtime/sse-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, dashboard } = body;

    if (!userId || !dashboard) {
      return NextResponse.json(
        { error: "Missing userId or dashboard" },
        { status: 400 },
      );
    }

    // Envia atualização de dashboard via SSE
    const sseServer = getSSEServer();
    sseServer.sendToUser(userId, {
      type: "dashboard",
      data: dashboard,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Test API] Erro ao atualizar dashboard:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
