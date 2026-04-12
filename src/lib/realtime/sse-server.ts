/**
 * Server-Sent Events (SSE) Server Manager
 * Gerencia conexões SSE para comunicação unidirecional servidor -> cliente
 * 
 * Casos de uso:
 * - Notificações em tempo real
 * - Atualizações de dashboard (KPIs)
 * - Alertas de estoque baixo
 * - Progresso de importações
 */

export interface SSEClient {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  channels: Set<string>;
  lastPing: number;
}

export interface SSEMessage {
  type: string;
  data: unknown;
  channel?: string;
  timestamp?: number;
}

export interface SSEServerConfig {
  heartbeatInterval?: number; // ms
  clientTimeout?: number; // ms
  maxClientsPerUser?: number;
}

class SSEServerManager {
  private clients: Map<string, SSEClient> = new Map();
  private channels: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<SSEServerConfig>;

  constructor(config: SSEServerConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30s
      clientTimeout: config.clientTimeout ?? 60000, // 60s
      maxClientsPerUser: config.maxClientsPerUser ?? 5,
    };

    this.startHeartbeat();
  }

  /**
   * Adiciona um novo cliente SSE
   */
  addClient(
    clientId: string,
    userId: string,
    controller: ReadableStreamDefaultController,
  ): void {
    // Verifica limite de clientes por usuário
    const userClients = Array.from(this.clients.values()).filter(
      (c) => c.userId === userId,
    );

    if (userClients.length >= this.config.maxClientsPerUser) {
      // Remove o cliente mais antigo
      const oldestClient = userClients.sort((a, b) => a.lastPing - b.lastPing)[0];
      this.removeClient(oldestClient.id);
    }

    const client: SSEClient = {
      id: clientId,
      userId,
      controller,
      channels: new Set(),
      lastPing: Date.now(),
    };

    this.clients.set(clientId, client);
    console.log(`[SSE] Cliente conectado: ${clientId} (usuário: ${userId})`);
  }

  /**
   * Remove um cliente SSE
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove das channels
    Array.from(client.channels).forEach((channel) => {
      const channelClients = this.channels.get(channel);
      if (channelClients) {
        channelClients.delete(clientId);
        if (channelClients.size === 0) {
          this.channels.delete(channel);
        }
      }
    });

    try {
      client.controller.close();
    } catch (error) {
      console.error(`[SSE] Erro ao fechar controller: ${error}`);
    }

    this.clients.delete(clientId);
    console.log(`[SSE] Cliente desconectado: ${clientId}`);
  }

  /**
   * Inscreve um cliente em um canal
   */
  subscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.channels.add(channel);

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)?.add(clientId);

    console.log(`[SSE] Cliente ${clientId} inscrito no canal: ${channel}`);
  }

  /**
   * Desinscreve um cliente de um canal
   */
  unsubscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.channels.delete(channel);

    const channelClients = this.channels.get(channel);
    if (channelClients) {
      channelClients.delete(clientId);
      if (channelClients.size === 0) {
        this.channels.delete(channel);
      }
    }

    console.log(`[SSE] Cliente ${clientId} desinscrito do canal: ${channel}`);
  }

  /**
   * Envia mensagem para um cliente específico
   */
  sendToClient(clientId: string, message: SSEMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.sendMessage(client, message);
  }

  /**
   * Envia mensagem para todos os clientes de um usuário
   */
  sendToUser(userId: string, message: SSEMessage): void {
    const userClients = Array.from(this.clients.values()).filter(
      (c) => c.userId === userId,
    );

    for (const client of userClients) {
      this.sendMessage(client, message);
    }
  }

  /**
   * Envia mensagem para todos os clientes de um canal
   */
  sendToChannel(channel: string, message: SSEMessage): void {
    const channelClients = this.channels.get(channel);
    if (!channelClients) return;

    Array.from(channelClients).forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendMessage(client, message);
      }
    });
  }

  /**
   * Envia mensagem para todos os clientes conectados
   */
  broadcast(message: SSEMessage): void {
    Array.from(this.clients.values()).forEach((client) => {
      this.sendMessage(client, message);
    });
  }

  /**
   * Envia mensagem SSE formatada
   */
  private sendMessage(client: SSEClient, message: SSEMessage): void {
    try {
      const data = {
        ...message,
        timestamp: message.timestamp ?? Date.now(),
      };

      const encoder = new TextEncoder();
      const formatted = `event: ${message.type}\ndata: ${JSON.stringify(data)}\n\n`;
      
      client.controller.enqueue(encoder.encode(formatted));
      client.lastPing = Date.now();
    } catch (error) {
      console.error(`[SSE] Erro ao enviar mensagem para ${client.id}:`, error);
      this.removeClient(client.id);
    }
  }

  /**
   * Envia ping (heartbeat) para todos os clientes
   */
  private sendHeartbeat(): void {
    const now = Date.now();
    const encoder = new TextEncoder();
    const pingMessage = ": ping\n\n";

    Array.from(this.clients.entries()).forEach(([clientId, client]) => {
      try {
        // Verifica timeout
        if (now - client.lastPing > this.config.clientTimeout) {
          console.log(`[SSE] Cliente ${clientId} timeout`);
          this.removeClient(clientId);
          return;
        }

        // Envia ping
        client.controller.enqueue(encoder.encode(pingMessage));
        client.lastPing = now;
      } catch (error) {
        console.error(`[SSE] Erro ao enviar heartbeat para ${clientId}:`, error);
        this.removeClient(clientId);
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
      totalChannels: this.channels.size,
      clientsByUser: Array.from(this.clients.values()).reduce(
        (acc, client) => {
          acc[client.userId] = (acc[client.userId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      channelSubscriptions: Array.from(this.channels.entries()).map(
        ([channel, clients]) => ({
          channel,
          subscribers: clients.size,
        }),
      ),
    };
  }

  /**
   * Limpa todos os clientes
   */
  cleanup(): void {
    this.stopHeartbeat();
    for (const clientId of Array.from(this.clients.keys())) {
      this.removeClient(clientId);
    }
  }
}

// Singleton instance
let sseServerInstance: SSEServerManager | null = null;

export function getSSEServer(config?: SSEServerConfig): SSEServerManager {
  if (!sseServerInstance) {
    sseServerInstance = new SSEServerManager(config);
  }
  return sseServerInstance;
}

export { SSEServerManager };
