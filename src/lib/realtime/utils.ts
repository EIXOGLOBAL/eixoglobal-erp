/**
 * Real-Time Communication Utilities
 * Funções auxiliares para SSE e WebSocket
 */

import { getSSEServer } from "./sse-server";
import { getWSServer } from "./ws-server";
import type {
  SSENotification,
  SSEDashboardUpdate,
  SSEStockAlert,
  SSEProgressUpdate,
  WSChatMessage,
  WSOrderStatus,
} from "./types";

// ============================================================================
// SSE Utilities
// ============================================================================

/**
 * Envia notificação para um usuário via SSE
 */
export function sendNotification(
  userId: string,
  notification: SSENotification,
): void {
  const sseServer = getSSEServer();
  sseServer.sendToUser(userId, {
    type: "notification",
    data: notification,
  });
}

/**
 * Envia notificação para múltiplos usuários
 */
export function sendNotificationToUsers(
  userIds: string[],
  notification: SSENotification,
): void {
  const sseServer = getSSEServer();
  for (const userId of userIds) {
    sseServer.sendToUser(userId, {
      type: "notification",
      data: notification,
    });
  }
}

/**
 * Envia notificação broadcast para todos os usuários
 */
export function broadcastNotification(notification: SSENotification): void {
  const sseServer = getSSEServer();
  sseServer.broadcast({
    type: "notification",
    data: notification,
  });
}

/**
 * Atualiza dashboard de um usuário
 */
export function updateDashboard(
  userId: string,
  dashboardData: SSEDashboardUpdate,
): void {
  const sseServer = getSSEServer();
  sseServer.sendToUser(userId, {
    type: "dashboard",
    data: dashboardData,
  });
}

/**
 * Envia alerta de estoque baixo
 */
export function sendStockAlert(userId: string, alert: SSEStockAlert): void {
  const sseServer = getSSEServer();
  sseServer.sendToUser(userId, {
    type: "alert",
    data: alert,
  });
}

/**
 * Envia alerta de estoque para canal
 */
export function sendStockAlertToChannel(
  channel: string,
  alert: SSEStockAlert,
): void {
  const sseServer = getSSEServer();
  sseServer.sendToChannel(channel, {
    type: "alert",
    data: alert,
  });
}

/**
 * Atualiza progresso de uma tarefa
 */
export function updateProgress(
  userId: string,
  progress: SSEProgressUpdate,
): void {
  const sseServer = getSSEServer();
  sseServer.sendToUser(userId, {
    type: "progress",
    data: progress,
  });
}

/**
 * Atualiza progresso em um canal específico
 */
export function updateProgressInChannel(
  channel: string,
  progress: SSEProgressUpdate,
): void {
  const sseServer = getSSEServer();
  sseServer.sendToChannel(channel, {
    type: "progress",
    data: progress,
  });
}

// ============================================================================
// WebSocket Utilities
// ============================================================================

/**
 * Envia mensagem de chat para uma room
 */
export function sendChatMessage(roomId: string, message: WSChatMessage): void {
  const wsServer = getWSServer();
  wsServer.sendToRoom(roomId, {
    type: "chat",
    room: roomId,
    data: message,
  });
}

/**
 * Envia mensagem privada para um usuário
 */
export function sendPrivateMessage(
  userId: string,
  message: WSChatMessage,
): void {
  const wsServer = getWSServer();
  wsServer.sendToUser(userId, {
    type: "message",
    data: message,
  });
}

/**
 * Atualiza status de pedido
 */
export function updateOrderStatus(
  orderId: string,
  status: WSOrderStatus,
): void {
  const wsServer = getWSServer();
  const roomId = `order-${orderId}`;
  wsServer.sendToRoom(roomId, {
    type: "order-status",
    room: roomId,
    data: status,
  });
}

/**
 * Notifica usuários sobre atualização de documento colaborativo
 */
export function notifyDocumentUpdate(
  documentId: string,
  update: unknown,
): void {
  const wsServer = getWSServer();
  const roomId = `doc-${documentId}`;
  wsServer.sendToRoom(roomId, {
    type: "update",
    room: roomId,
    data: update,
  });
}

/**
 * Notifica sobre evento de calendário
 */
export function notifyCalendarEvent(userId: string, event: unknown): void {
  const wsServer = getWSServer();
  const roomId = `calendar-${userId}`;
  wsServer.sendToRoom(roomId, {
    type: "calendar-event",
    room: roomId,
    data: event,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gera ID único para mensagens
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Formata timestamp para exibição
 */
export function formatTimestamp(
  timestamp: number,
  format: "relative" | "absolute" | "time" = "relative",
): string {
  const now = Date.now();
  const diff = now - timestamp;
  const date = new Date(timestamp);

  switch (format) {
    case "relative":
      if (diff < 1000) return "Agora";
      if (diff < 60000) return `${Math.floor(diff / 1000)}s atrás`;
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
      return `${Math.floor(diff / 86400000)}d atrás`;

    case "time":
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

    case "absolute":
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    default:
      return date.toISOString();
  }
}

/**
 * Valida mensagem SSE
 */
export function validateSSEMessage(message: unknown): boolean {
  if (!message || typeof message !== "object") return false;
  const msg = message as Record<string, unknown>;
  return typeof msg.type === "string" && "data" in msg;
}

/**
 * Valida mensagem WebSocket
 */
export function validateWSMessage(message: unknown): boolean {
  if (!message || typeof message !== "object") return false;
  const msg = message as Record<string, unknown>;
  return typeof msg.type === "string" && "data" in msg;
}

/**
 * Sanitiza mensagem de texto
 */
export function sanitizeMessage(message: string): string {
  return message
    .trim()
    .replace(/[<>]/g, "") // Remove < e >
    .substring(0, 5000); // Limita tamanho
}

/**
 * Verifica se o navegador suporta SSE
 */
export function supportsSSE(): boolean {
  return typeof EventSource !== "undefined";
}

/**
 * Verifica se o navegador suporta WebSocket
 */
export function supportsWebSocket(): boolean {
  return typeof WebSocket !== "undefined";
}

/**
 * Verifica se notificações do navegador estão disponíveis
 */
export function supportsNotifications(): boolean {
  return "Notification" in window;
}

/**
 * Solicita permissão para notificações
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications()) return false;

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Mostra notificação do navegador
 */
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions,
): void {
  if (!supportsNotifications() || Notification.permission !== "granted") {
    return;
  }

  new Notification(title, {
    icon: "/favicon.ico",
    ...options,
  });
}

/**
 * Calcula variação percentual
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Formata número
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formata moeda
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata percentual
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Retry function com exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
