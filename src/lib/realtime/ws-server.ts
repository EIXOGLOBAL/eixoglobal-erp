/**
 * WebSocket Server Manager
 * Gerencia conexões WebSocket para comunicação bidirecional
 * 
 * Casos de uso:
 * - Chat interno entre usuários
 * - Edição colaborativa de documentos
 * - Sincronização de calendários
 * - Atualizações de status de pedidos
 */

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import type { Server as HTTPServer } from "http";

export interface WSClient {
  id: string;
  userId: string;
  ws: WebSocket;
  rooms: Set<string>;
  lastPing: number;
  metadata: Record<string, unknown>;
}

export interface WSMessage {
  type: string;
  data: unknown;
  room?: string;
  from?: string;
  to?: string;
  timestamp?: number;
}

export interface WSServerConfig {
  port?: number;
  path?: string;
  heartbeatInterval?: number; // ms
  clientTimeout?: number; // ms
  maxClientsPerUser?: number;
  maxMessageSize?: number; // bytes
}

class WebSocketServerManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private userClients: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<WSServerConfig>;

  constructor(config: WSServerConfig = {}) {
    this.config = {
      port: config.port ?? 3001,
      path: config.path ?? "/ws",
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30s
      clientTimeout: config.clientTimeout ?? 60000, // 60s
      maxClientsPerUser: config.maxClientsPerUser ?? 5,
      maxMessageSize: config.maxMessageSize ?? 1024 * 1024, // 1MB
    };
  }

  /**
   * Inicializa o servidor WebSocket
   */
  initialize(server?: HTTPServer): void {
    if (this.wss) {
      console.log("[WS] Servidor já inicializado");
      return;
    }

    const options = server
      ? { server, path: this.config.path }
      : { port: this.config.port, path: this.config.path };

    this.wss = new WebSocketServer(options);

    this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    this.wss.on("error", (error) => {
      console.error("[WS] Erro no servidor:", error);
    });

    this.startHeartbeat();

    console.log(
      `[WS] Servidor WebSocket iniciado ${server ? `no path ${this.config.path}` : `na porta ${this.config.port}`}`,
    );
  }

  /**
   * Manipula nova conexão
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    // Extrai userId da query string
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      ws.close(1008, "Missing userId parameter");
      return;
    }

    // Verifica limite de clientes por usuário
    const userClientIds = this.userClients.get(userId) || new Set();
    if (userClientIds.size >= this.config.maxClientsPerUser) {
      // Remove o cliente mais antigo
      const oldestClientId = Array.from(userClientIds)[0];
      this.removeClient(oldestClientId);
    }

    // Gera ID único para o cliente
    const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Cria cliente
    const client: WSClient = {
      id: clientId,
      userId,
      ws,
      rooms: new Set(),
      lastPing: Date.now(),
      metadata: {},
    };

    this.clients.set(clientId, client);

    // Adiciona à lista de clientes do usuário
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    this.userClients.get(userId)?.add(clientId);

    console.log(`[WS] Cliente conectado: ${clientId} (usuário: ${userId})`);

    // Envia mensagem de conexão estabelecida
    this.sendToClient(clientId, {
      type: "connected",
      data: {
        clientId,
        userId,
        timestamp: Date.now(),
      },
    });

    // Handlers
    ws.on("message", (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    ws.on("pong", () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPing = Date.now();
      }
    });

    ws.on("close", () => {
      this.removeClient(clientId);
    });

    ws.on("error", (error) => {
      console.error(`[WS] Erro no cliente ${clientId}:`, error);
      this.removeClient(clientId);
    });
  }

  /**
   * Manipula mensagem recebida
   */
  private handleMessage(clientId: string, data: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Verifica tamanho da mensagem
      if (data.length > this.config.maxMessageSize) {
        this.sendToClient(clientId, {
          type: "error",
          data: { message: "Message too large" },
        });
        return;
      }

      const message: WSMessage = JSON.parse(data.toString());
      client.lastPing = Date.now();

      // Processa mensagem baseado no tipo
      switch (message.type) {
        case "join":
          if (message.room) {
            this.joinRoom(clientId, message.room);
          }
          break;

        case "leave":
          if (message.room) {
            this.leaveRoom(clientId, message.room);
          }
          break;

        case "message":
          if (message.room) {
            this.sendToRoom(message.room, {
              ...message,
              from: clientId,
              timestamp: Date.now(),
            });
          } else if (message.to) {
            this.sendToUser(message.to, {
              ...message,
              from: clientId,
              timestamp: Date.now(),
            });
          }
          break;

        case "ping":
          this.sendToClient(clientId, {
            type: "pong",
            data: { timestamp: Date.now() },
          });
          break;

        default:
          // Mensagem customizada - broadcast para a room se especificada
          if (message.room) {
            this.sendToRoom(message.room, {
              ...message,
              from: clientId,
              timestamp: Date.now(),
            });
          }
      }
    } catch (error) {
      console.error(`[WS] Erro ao processar mensagem de ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: "error",
        data: { message: "Invalid message format" },
      });
    }
  }

  /**
   * Remove um cliente
   */
  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove das rooms
    Array.from(client.rooms).forEach((room) => {
      const roomClients = this.rooms.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
        if (roomClients.size === 0) {
          this.rooms.delete(room);
        }
      }
    });

    // Remove da lista de clientes do usuário
    const userClientIds = this.userClients.get(client.userId);
    if (userClientIds) {
      userClientIds.delete(clientId);
      if (userClientIds.size === 0) {
        this.userClients.delete(client.userId);
      }
    }

    // Fecha conexão
    try {
      client.ws.close();
    } catch (error) {
      console.error(`[WS] Erro ao fechar conexão: ${error}`);
    }

    this.clients.delete(clientId);
    console.log(`[WS] Cliente desconectado: ${clientId}`);
  }

  /**
   * Adiciona cliente a uma room
   */
  joinRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.add(room);

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)?.add(clientId);

    console.log(`[WS] Cliente ${clientId} entrou na room: ${room}`);

    // Notifica cliente
    this.sendToClient(clientId, {
      type: "joined",
      data: { room, timestamp: Date.now() },
    });

    // Notifica outros membros da room
    this.sendToRoom(
      room,
      {
        type: "user-joined",
        data: { userId: client.userId, room, timestamp: Date.now() },
      },
      clientId,
    );
  }

  /**
   * Remove cliente de uma room
   */
  leaveRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.delete(room);

    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }

    console.log(`[WS] Cliente ${clientId} saiu da room: ${room}`);

    // Notifica cliente
    this.sendToClient(clientId, {
      type: "left",
      data: { room, timestamp: Date.now() },
    });

    // Notifica outros membros da room
    this.sendToRoom(room, {
      type: "user-left",
      data: { userId: client.userId, room, timestamp: Date.now() },
    });
  }

  /**
   * Envia mensagem para um cliente específico
   */
  sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      const data = {
        ...message,
        timestamp: message.timestamp ?? Date.now(),
      };
      client.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error(`[WS] Erro ao enviar mensagem para ${clientId}:`, error);
      this.removeClient(clientId);
    }
  }

  /**
   * Envia mensagem para todos os clientes de um usuário
   */
  sendToUser(userId: string, message: WSMessage): void {
    const clientIds = this.userClients.get(userId);
    if (!clientIds) return;

    Array.from(clientIds).forEach((clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  /**
   * Envia mensagem para todos os clientes de uma room
   */
  sendToRoom(room: string, message: WSMessage, excludeClientId?: string): void {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;

    Array.from(roomClients).forEach((clientId) => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  /**
   * Envia mensagem para todos os clientes conectados
   */
  broadcast(message: WSMessage, excludeClientId?: string): void {
    Array.from(this.clients.keys()).forEach((clientId) => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  /**
   * Envia ping (heartbeat) para todos os clientes
   */
  private sendHeartbeat(): void {
    const now = Date.now();

    Array.from(this.clients.entries()).forEach(([clientId, client]) => {
      // Verifica timeout
      if (now - client.lastPing > this.config.clientTimeout) {
        console.log(`[WS] Cliente ${clientId} timeout`);
        this.removeClient(clientId);
        return;
      }

      // Envia ping
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.ping();
        } catch (error) {
          console.error(`[WS] Erro ao enviar ping para ${clientId}:`, error);
          this.removeClient(clientId);
        }
      }
    });
  }

  /**
   * Inicia o heartbeat automático
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Para o heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Retorna estatísticas do servidor
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      totalUsers: this.userClients.size,
      clientsByUser: Array.from(this.userClients.entries()).map(
        ([userId, clientIds]) => ({
          userId,
          clients: clientIds.size,
        }),
      ),
      roomMembers: Array.from(this.rooms.entries()).map(([room, clientIds]) => ({
        room,
        members: clientIds.size,
      })),
    };
  }

  /**
   * Limpa todos os clientes e fecha o servidor
   */
  cleanup(): void {
    this.stopHeartbeat();

    for (const clientId of Array.from(this.clients.keys())) {
      this.removeClient(clientId);
    }

    if (this.wss) {
      this.wss.close(() => {
        console.log("[WS] Servidor WebSocket fechado");
      });
      this.wss = null;
    }
  }
}

// Singleton instance
let wsServerInstance: WebSocketServerManager | null = null;

export function getWSServer(config?: WSServerConfig): WebSocketServerManager {
  if (!wsServerInstance) {
    wsServerInstance = new WebSocketServerManager(config);
  }
  return wsServerInstance;
}

export { WebSocketServerManager };
