/**
 * Test API - Send Notification
 * Endpoint de teste para enviar notificações via SSE
 */

import { NextRequest, NextResponse } from "next/server";
import { getSSEServer } from "@/lib/realtime/sse-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notification } = body;

    if (!userId || !notification) {
      return NextResponse.json(
        { error: "Missing userId or notification" },
        { status: 400 },
      );
    }

    // Envia notificação via SSE
    const sseServer = getSSEServer();
    sseServer.sendToUser(userId, {
      type: "notification",
      data: notification,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Test API] Erro ao enviar notificação:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
