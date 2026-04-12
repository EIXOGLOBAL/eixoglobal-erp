/**
 * SSE Client Hook
 * Hook React para consumir Server-Sent Events
 * 
 * Uso:
 * const { isConnected, subscribe, unsubscribe } = useSSE({
 *   userId: '123',
 *   channels: ['notifications', 'dashboard'],
 *   onMessage: (message) => console.log(message),
 * });
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface SSEMessage {
  type: string;
  data: unknown;
  channel?: string;
  timestamp?: number;
}

export interface UseSSEOptions {
  userId: string;
  channels?: string[];
  onMessage?: (message: SSEMessage) => void;
  onError?: (error: Event) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number; // ms
  maxReconnectAttempts?: number;
}

export interface UseSSEReturn {
  isConnected: boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  reconnect: () => void;
  disconnect: () => void;
  lastMessage: SSEMessage | null;
  reconnectAttempts: number;
}

export function useSSE(options: UseSSEOptions): UseSSEReturn {
  const {
    userId,
    channels = [],
    onMessage,
    onError,
    onConnected,
    onDisconnected,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(
    new Set(channels),
  );

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);

  /**
   * Conecta ao servidor SSE
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return; // Já conectado
    }

    try {
      // Monta URL com parâmetros
      const channelsParam = Array.from(subscribedChannels).join(",");
      const url = `/api/sse?userId=${encodeURIComponent(userId)}${
        channelsParam ? `&channels=${encodeURIComponent(channelsParam)}` : ""
      }`;

      // Cria EventSource
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // Handler: conexão aberta
      eventSource.onopen = () => {
        console.log("[SSE] Conectado");
        setIsConnected(true);
        setReconnectAttempts(0);
        onConnected?.();
      };

      // Handler: mensagem genérica
      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error("[SSE] Erro ao parsear mensagem:", error);
        }
      };

      // Handler: erro
      eventSource.onerror = (error) => {
        console.error("[SSE] Erro de conexão:", error);
        setIsConnected(false);
        onError?.(error);

        // Fecha conexão atual
        eventSource.close();
        eventSourceRef.current = null;

        // Tenta reconectar se não foi desconexão manual
        if (!isManualDisconnectRef.current && autoReconnect) {
          if (reconnectAttempts < maxReconnectAttempts) {
            console.log(
              `[SSE] Tentando reconectar em ${reconnectInterval}ms (tentativa ${reconnectAttempts + 1}/${maxReconnectAttempts})`,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts((prev) => prev + 1);
              connect();
            }, reconnectInterval);
          } else {
            console.error("[SSE] Máximo de tentativas de reconexão atingido");
            onDisconnected?.();
          }
        }
      };

      // Handlers para eventos customizados
      eventSource.addEventListener("connected", (event) => {
        console.log("[SSE] Evento connected:", event.data);
      });

      eventSource.addEventListener("notification", (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error("[SSE] Erro ao parsear notificação:", error);
        }
      });

      eventSource.addEventListener("dashboard", (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error("[SSE] Erro ao parsear dashboard:", error);
        }
      });

      eventSource.addEventListener("alert", (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error("[SSE] Erro ao parsear alerta:", error);
        }
      });

      eventSource.addEventListener("progress", (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error("[SSE] Erro ao parsear progresso:", error);
        }
      });
    } catch (error) {
      console.error("[SSE] Erro ao criar EventSource:", error);
      setIsConnected(false);
    }
  }, [
    userId,
    subscribedChannels,
    onMessage,
    onError,
    onConnected,
    onDisconnected,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    reconnectAttempts,
  ]);

  /**
   * Desconecta do servidor SSE
   */
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setReconnectAttempts(0);
    onDisconnected?.();
  }, [onDisconnected]);

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
   * Inscreve em um canal
   */
  const subscribe = useCallback(
    (channel: string) => {
      setSubscribedChannels((prev) => {
        const newSet = new Set(prev);
        newSet.add(channel);
        return newSet;
      });

      // Reconecta para aplicar nova inscrição
      if (isConnected) {
        reconnect();
      }
    },
    [isConnected, reconnect],
  );

  /**
   * Desinscreve de um canal
   */
  const unsubscribe = useCallback(
    (channel: string) => {
      setSubscribedChannels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(channel);
        return newSet;
      });

      // Reconecta para aplicar mudança
      if (isConnected) {
        reconnect();
      }
    },
    [isConnected, reconnect],
  );

  // Conecta ao montar
  useEffect(() => {
    isManualDisconnectRef.current = false;
    connect();

    // Cleanup ao desmontar
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    subscribe,
    unsubscribe,
    reconnect,
    disconnect,
    lastMessage,
    reconnectAttempts,
  };
}

/**
 * Hook simplificado para receber notificações
 */
export function useSSENotifications(
  userId: string,
  onNotification: (notification: unknown) => void,
) {
  return useSSE({
    userId,
    channels: ["notifications"],
    onMessage: (message) => {
      if (message.type === "notification") {
        onNotification(message.data);
      }
    },
  });
}

/**
 * Hook simplificado para receber atualizações de dashboard
 */
export function useSSEDashboard(
  userId: string,
  onUpdate: (data: unknown) => void,
) {
  return useSSE({
    userId,
    channels: ["dashboard"],
    onMessage: (message) => {
      if (message.type === "dashboard") {
        onUpdate(message.data);
      }
    },
  });
}

/**
 * Hook simplificado para receber alertas
 */
export function useSSEAlerts(userId: string, onAlert: (alert: unknown) => void) {
  return useSSE({
    userId,
    channels: ["alerts"],
    onMessage: (message) => {
      if (message.type === "alert") {
        onAlert(message.data);
      }
    },
  });
}

/**
 * Hook simplificado para acompanhar progresso
 */
export function useSSEProgress(
  userId: string,
  taskId: string,
  onProgress: (progress: unknown) => void,
) {
  return useSSE({
    userId,
    channels: [`progress-${taskId}`],
    onMessage: (message) => {
      if (message.type === "progress") {
        onProgress(message.data);
      }
    },
  });
}
