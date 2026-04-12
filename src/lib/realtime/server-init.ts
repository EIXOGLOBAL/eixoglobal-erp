/**
 * WebSocket Server Initialization
 * 
 * Este arquivo deve ser importado no instrumentation.ts para inicializar
 * o servidor WebSocket quando a aplicação Next.js iniciar.
 * 
 * Uso:
 * 
 * // instrumentation.ts
 * import { initializeRealtimeServers } from "@/lib/realtime/server-init";
 * 
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === "nodejs") {
 *     await initializeRealtimeServers();
 *   }
 * }
 */

import { getWSServer } from "./ws-server";
import { getSSEServer } from "./sse-server";

/**
 * Inicializa os servidores de comunicação em tempo real
 */
export async function initializeRealtimeServers() {
  try {
    // Inicializa servidor SSE (singleton)
    const sseServer = getSSEServer({
      heartbeatInterval: 30000, // 30s
      clientTimeout: 60000, // 60s
      maxClientsPerUser: 5,
    });

    console.log("[Realtime] SSE Server inicializado");

    // Inicializa servidor WebSocket
    const wsServer = getWSServer({
      port: Number(process.env.WS_PORT) || 3001,
      path: process.env.WS_PATH || "/ws",
      heartbeatInterval: 30000, // 30s
      clientTimeout: 60000, // 60s
      maxClientsPerUser: 5,
      maxMessageSize: 1024 * 1024, // 1MB
    });

    wsServer.initialize();

    console.log("[Realtime] WebSocket Server inicializado");

    // Cleanup ao encerrar
    process.on("SIGTERM", () => {
      console.log("[Realtime] Encerrando servidores...");
      sseServer.cleanup();
      wsServer.cleanup();
    });

    process.on("SIGINT", () => {
      console.log("[Realtime] Encerrando servidores...");
      sseServer.cleanup();
      wsServer.cleanup();
      process.exit(0);
    });

    return { sseServer, wsServer };
  } catch (error) {
    console.error("[Realtime] Erro ao inicializar servidores:", error);
    throw error;
  }
}

/**
 * Inicializa apenas o servidor SSE
 */
export function initializeSSEServer() {
  const sseServer = getSSEServer({
    heartbeatInterval: 30000,
    clientTimeout: 60000,
    maxClientsPerUser: 5,
  });

  console.log("[Realtime] SSE Server inicializado");
  return sseServer;
}

/**
 * Inicializa apenas o servidor WebSocket
 */
export function initializeWSServer() {
  const wsServer = getWSServer({
    port: Number(process.env.WS_PORT) || 3001,
    path: process.env.WS_PATH || "/ws",
    heartbeatInterval: 30000,
    clientTimeout: 60000,
    maxClientsPerUser: 5,
    maxMessageSize: 1024 * 1024,
  });

  wsServer.initialize();

  console.log("[Realtime] WebSocket Server inicializado");
  return wsServer;
}
