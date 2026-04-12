/**
 * Real-Time Communication Module
 * Exporta todas as funcionalidades de comunicação em tempo real
 */

// Server-Sent Events (SSE)
export { getSSEServer, SSEServerManager } from "./sse-server";
export type { SSEClient, SSEMessage, SSEServerConfig } from "./sse-server";

// WebSocket
export { getWSServer, WebSocketServerManager } from "./ws-server";
export type { WSClient, WSMessage, WSServerConfig } from "./ws-server";

// Client Hooks - SSE
export {
  useSSE,
  useSSENotifications,
  useSSEDashboard,
  useSSEAlerts,
  useSSEProgress,
} from "./sse-client";
export type { UseSSEOptions, UseSSEReturn } from "./sse-client";

// Client Hooks - WebSocket
export {
  useWebSocket,
  useWebSocketChat,
  useWebSocketCollaboration,
  useWebSocketCalendar,
  useWebSocketOrderStatus,
} from "./ws-client";
export type { UseWebSocketOptions, UseWebSocketReturn } from "./ws-client";

// Types
export type {
  SSENotification,
  SSEDashboardUpdate,
  SSEStockAlert,
  SSEProgressUpdate,
  WSChatMessage,
  WSCollaborationUpdate,
  WSCalendarEvent,
  WSOrderStatus,
  WSUserPresence,
  ConnectionStatus,
  RealtimeConfig,
  SSEEventType,
  WSEventType,
  ServerStats,
  RateLimitConfig,
  RealtimeError,
  RealtimeErrorCode,
  DashboardMetric,
  DashboardAlert,
} from "./types";

// Utilities
export {
  sendNotification,
  sendNotificationToUsers,
  broadcastNotification,
  updateDashboard,
  sendStockAlert,
  sendStockAlertToChannel,
  updateProgress,
  updateProgressInChannel,
  sendChatMessage,
  sendPrivateMessage,
  updateOrderStatus,
  notifyDocumentUpdate,
  notifyCalendarEvent,
  generateMessageId,
  formatTimestamp,
  validateSSEMessage,
  validateWSMessage,
  sanitizeMessage,
  supportsSSE,
  supportsWebSocket,
  supportsNotifications,
  requestNotificationPermission,
  showBrowserNotification,
  calculatePercentageChange,
  formatNumber,
  formatCurrency,
  formatPercentage,
  debounce,
  throttle,
  retryWithBackoff,
} from "./utils";
