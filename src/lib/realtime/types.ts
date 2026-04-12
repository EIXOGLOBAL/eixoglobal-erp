/**
 * Real-Time Communication Types
 * Tipos compartilhados para SSE e WebSocket
 */

// ============================================================================
// SSE Types
// ============================================================================

export interface SSEMessage {
  type: string;
  data: unknown;
  channel?: string;
  timestamp?: number;
}

export interface SSENotification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export interface SSEDashboardUpdate {
  metrics: DashboardMetric[];
  alerts?: DashboardAlert[];
  lastUpdate: number;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  format?: "number" | "currency" | "percentage";
  trend?: "up" | "down" | "neutral";
  icon?: string;
}

export interface DashboardAlert {
  id: string;
  type: "warning" | "error" | "info";
  message: string;
}

export interface SSEStockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  severity: "low" | "critical";
  timestamp: number;
}

export interface SSEProgressUpdate {
  taskId: string;
  taskName: string;
  progress: number; // 0-100
  status: "pending" | "running" | "completed" | "failed";
  message?: string;
  timestamp: number;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WSMessage {
  type: string;
  data: unknown;
  room?: string;
  from?: string;
  to?: string;
  timestamp?: number;
}

export interface WSChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: number;
  type?: "text" | "system" | "file";
  fileUrl?: string;
  fileName?: string;
}

export interface WSCollaborationUpdate {
  documentId: string;
  userId: string;
  userName: string;
  operation: "insert" | "delete" | "update";
  position?: number;
  content?: string;
  timestamp: number;
}

export interface WSCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  userId: string;
  userName: string;
  action: "created" | "updated" | "deleted";
  timestamp: number;
}

export interface WSOrderStatus {
  orderId: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  message?: string;
  updatedBy: string;
  timestamp: number;
}

export interface WSUserPresence {
  userId: string;
  userName: string;
  status: "online" | "offline" | "away" | "busy";
  lastSeen?: number;
}

// ============================================================================
// Connection Types
// ============================================================================

export interface ConnectionStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnected?: number;
  lastDisconnected?: number;
}

export interface RealtimeConfig {
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type SSEEventType =
  | "connected"
  | "notification"
  | "dashboard"
  | "alert"
  | "progress"
  | "stock-alert"
  | "custom";

export type WSEventType =
  | "connected"
  | "disconnected"
  | "join"
  | "leave"
  | "message"
  | "chat"
  | "update"
  | "calendar-event"
  | "order-status"
  | "presence"
  | "ping"
  | "pong"
  | "error"
  | "custom";

// ============================================================================
// Server Types
// ============================================================================

export interface ServerStats {
  totalClients: number;
  totalChannels?: number;
  totalRooms?: number;
  totalUsers?: number;
  uptime: number;
}

export interface RateLimitConfig {
  maxConnections: number;
  windowMs: number;
  maxMessagesPerMinute?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface RealtimeError {
  code: string;
  message: string;
  timestamp: number;
  details?: unknown;
}

export type RealtimeErrorCode =
  | "CONNECTION_FAILED"
  | "AUTHENTICATION_FAILED"
  | "RATE_LIMIT_EXCEEDED"
  | "MESSAGE_TOO_LARGE"
  | "INVALID_MESSAGE"
  | "CHANNEL_NOT_FOUND"
  | "ROOM_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "SERVER_ERROR";
