/**
 * WebSocket Client Hook
 * Hook React para comunicação WebSocket bidirecional
 * 
 * Uso:
 * const { isConnected, send, joinRoom, leaveRoom } = useWebSocket({
 *   userId: '123',
 *   onMessage: (message) => console.log(message),
 * });
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface WSMessage {
  type: string;
  data: unknown;
  room?: string;
  from?: string;
  to?: string;
  timestamp?: number;
}

export interface UseWebSocketOptions {
  userId: string;
  url?: string; // URL do servidor WebSocket
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number; // ms
  maxReconnectAttempts?: number;
  heartbeatInterval?: number; // ms
  onMessage?: (message: WSMessage) => void;
  onError?: (error: Event) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  send: (message: WSMessage) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  sendToRoom: (room: string, data: unknown, type?: string) => void;
  sendToUser: (userId: string, data: unknown, type?: string) => void;
  reconnect: () => void;
  disconnect: () => void;
  lastMessage: WSMessage | null;
  reconnectAttempts: number;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    userId,
    url,
    autoConnect = true,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    onMessage,
    onError,
    onConnected,
    onDisconnected,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);

  /**
   * Determina a URL do WebSocket
   */
  const getWebSocketUrl = useCallback(() => {
    if (url) return url;

    // Usa a URL atual do navegador para determinar o protocolo e host
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/ws?userId=${encodeURIComponent(userId)}`;
  }, [url, userId]);

  /**
   * Inicia heartbeat
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "ping",
            timestamp: Date.now(),
          }),
        );
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  /**
   * Para heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Conecta ao servidor WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Já conectado
    }

    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Handler: conexão aberta
      ws.onopen = () => {
        console.log("[WS] Conectado");
        setIsConnected(true);
        setReconnectAttempts(0);
        startHeartbeat();
        onConnected?.();
      };

      // Handler: mensagem recebida
      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Ignora mensagens de pong
          if (message.type !== "pong") {
            onMessage?.(message);
          }
        } catch (error) {
          console.error("[WS] Erro ao parsear mensagem:", error);
        }
      };

      // Handler: erro
      ws.onerror = (error) => {
        console.error("[WS] Erro de conexão:", error);
        onError?.(error);
      };

      // Handler: conexão fechada
      ws.onclose = () => {
        console.log("[WS] Desconectado");
        setIsConnected(false);
        stopHeartbeat();
        wsRef.current = null;

        // Tenta reconectar se não foi desconexão manual
        if (!isManualDisconnectRef.current && autoReconnect) {
          if (reconnectAttempts < maxReconnectAttempts) {
            console.log(
              `[WS] Tentando reconectar em ${reconnectInterval}ms (tentativa ${reconnectAttempts + 1}/${maxReconnectAttempts})`,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts((prev) => prev + 1);
              connect();
            }, reconnectInterval);
          } else {
            console.error("[WS] Máximo de tentativas de reconexão atingido");
            onDisconnected?.();
          }
        } else {
          onDisconnected?.();
        }
      };
    } catch (error) {
      console.error("[WS] Erro ao criar WebSocket:", error);
      setIsConnected(false);
    }
  }, [
    getWebSocketUrl,
    startHeartbeat,
    stopHeartbeat,
    onConnected,
    onMessage,
    onError,
    onDisconnected,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    reconnectAttempts,
  ]);

  /**
   * Desconecta do servidor WebSocket
   */
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setReconnectAttempts(0);
  }, [stopHeartbeat]);

  /**
   * Reconecta manualmente
   */
  const reconnect = useCallback(() => {
    disconnect();
    isManualDisconnectRef.current = false;
    setReconnectAttempts(0);
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  /**
   * Envia mensagem
   */
  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error("[WS] Erro ao enviar mensagem:", error);
      }
    } else {
      console.warn("[WS] WebSocket não está conectado");
    }
  }, []);

  /**
   * Entra em uma room
   */
  const joinRoom = useCallback(
    (room: string) => {
      send({
        type: "join",
        room,
        data: null,
      });
    },
    [send],
  );

  /**
   * Sai de uma room
   */
  const leaveRoom = useCallback(
    (room: string) => {
      send({
        type: "leave",
        room,
        data: null,
      });
    },
    [send],
  );

  /**
   * Envia mensagem para uma room
   */
  const sendToRoom = useCallback(
    (room: string, data: unknown, type = "message") => {
      send({
        type,
        room,
        data,
      });
    },
    [send],
  );

  /**
   * Envia mensagem para um usuário específico
   */
  const sendToUser = useCallback(
    (targetUserId: string, data: unknown, type = "message") => {
      send({
        type,
        to: targetUserId,
        data,
      });
    },
    [send],
  );

  // Conecta ao montar se autoConnect estiver habilitado
  useEffect(() => {
    if (autoConnect) {
      isManualDisconnectRef.current = false;
      connect();
    }

    // Cleanup ao desmontar
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    send,
    joinRoom,
    leaveRoom,
    sendToRoom,
    sendToUser,
    reconnect,
    disconnect,
    lastMessage,
    reconnectAttempts,
  };
}

/**
 * Hook simplificado para chat
 */
export function useWebSocketChat(
  userId: string,
  roomId: string,
  onMessage: (message: unknown) => void,
) {
  const ws = useWebSocket({
    userId,
    onMessage: (message) => {
      if (message.type === "message" && message.room === roomId) {
        onMessage(message.data);
      }
    },
  });

  // Auto-join room quando conectar
  useEffect(() => {
    if (ws.isConnected) {
      ws.joinRoom(roomId);
    }

    return () => {
      if (ws.isConnected) {
        ws.leaveRoom(roomId);
      }
    };
  }, [ws.isConnected, roomId, ws]);

  const sendMessage = useCallback(
    (message: unknown) => {
      ws.sendToRoom(roomId, message);
    },
    [ws, roomId],
  );

  return {
    ...ws,
    sendMessage,
  };
}

/**
 * Hook simplificado para edição colaborativa
 */
export function useWebSocketCollaboration(
  userId: string,
  documentId: string,
  onUpdate: (update: unknown) => void,
) {
  const roomId = `doc-${documentId}`;

  const ws = useWebSocket({
    userId,
    onMessage: (message) => {
      if (message.type === "update" && message.room === roomId) {
        onUpdate(message.data);
      }
    },
  });

  // Auto-join room quando conectar
  useEffect(() => {
    if (ws.isConnected) {
      ws.joinRoom(roomId);
    }

    return () => {
      if (ws.isConnected) {
        ws.leaveRoom(roomId);
      }
    };
  }, [ws.isConnected, roomId, ws]);

  const sendUpdate = useCallback(
    (update: unknown) => {
      ws.sendToRoom(roomId, update, "update");
    },
    [ws, roomId],
  );

  return {
    ...ws,
    sendUpdate,
  };
}

/**
 * Hook simplificado para sincronização de calendário
 */
export function useWebSocketCalendar(
  userId: string,
  onEventUpdate: (event: unknown) => void,
) {
  const roomId = `calendar-${userId}`;

  const ws = useWebSocket({
    userId,
    onMessage: (message) => {
      if (message.type === "calendar-event" && message.room === roomId) {
        onEventUpdate(message.data);
      }
    },
  });

  // Auto-join room quando conectar
  useEffect(() => {
    if (ws.isConnected) {
      ws.joinRoom(roomId);
    }

    return () => {
      if (ws.isConnected) {
        ws.leaveRoom(roomId);
      }
    };
  }, [ws.isConnected, roomId, ws]);

  const updateEvent = useCallback(
    (event: unknown) => {
      ws.sendToRoom(roomId, event, "calendar-event");
    },
    [ws, roomId],
  );

  return {
    ...ws,
    updateEvent,
  };
}

/**
 * Hook simplificado para atualizações de status de pedidos
 */
export function useWebSocketOrderStatus(
  userId: string,
  orderId: string,
  onStatusUpdate: (status: unknown) => void,
) {
  const roomId = `order-${orderId}`;

  const ws = useWebSocket({
    userId,
    onMessage: (message) => {
      if (message.type === "order-status" && message.room === roomId) {
        onStatusUpdate(message.data);
      }
    },
  });

  // Auto-join room quando conectar
  useEffect(() => {
    if (ws.isConnected) {
      ws.joinRoom(roomId);
    }

    return () => {
      if (ws.isConnected) {
        ws.leaveRoom(roomId);
      }
    };
  }, [ws.isConnected, roomId, ws]);

  return ws;
}
