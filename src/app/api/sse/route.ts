/**
 * SSE API Endpoint
 * Endpoint para estabelecer conexões Server-Sent Events
 * 
 * Uso:
 * GET /api/sse?userId=123&channels=notifications,dashboard
 */

import { NextRequest } from "next/server";
import { getSSEServer } from "@/lib/realtime/sse-server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting: 10 conexões por minuto por IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit/sse",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip ?? "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }

    // Extrai parâmetros
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const channelsParam = searchParams.get("channels");

    if (!userId) {
      return new Response("Missing userId parameter", { status: 400 });
    }

    // Gera ID único para o cliente
    const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Cria stream
    const stream = new ReadableStream({
      start(controller) {
        // Adiciona cliente ao servidor SSE
        const sseServer = getSSEServer();
        sseServer.addClient(clientId, userId, controller);

        // Inscreve em canais se especificados
        if (channelsParam) {
          const channels = channelsParam.split(",").map((c) => c.trim());
          for (const channel of channels) {
            sseServer.subscribe(clientId, channel);
          }
        }

        // Envia mensagem de conexão estabelecida
        const encoder = new TextEncoder();
        const connectMessage = `event: connected\ndata: ${JSON.stringify({
          type: "connected",
          clientId,
          userId,
          timestamp: Date.now(),
        })}\n\n`;
        
        controller.enqueue(encoder.encode(connectMessage));

        // Cleanup quando a conexão for fechada
        request.signal.addEventListener("abort", () => {
          sseServer.removeClient(clientId);
        });
      },
      cancel() {
        // Remove cliente quando o stream for cancelado
        const sseServer = getSSEServer();
        sseServer.removeClient(clientId);
      },
    });

    // Retorna response com headers SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Desabilita buffering no nginx
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("[SSE API] Erro:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Suporte a CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
