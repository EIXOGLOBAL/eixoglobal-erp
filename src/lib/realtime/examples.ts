/**
 * Exemplos de Uso - Real-Time Communication
 * 
 * Este arquivo contém exemplos práticos de como usar SSE e WebSockets
 * no EixoGlobal ERP.
 */

// ============================================================================
// EXEMPLO 1: Notificações em Tempo Real (SSE)
// ============================================================================

/**
 * Componente que exibe notificações em tempo real
 */
/*
import { NotificationBell } from "@/components/realtime/notification-bell";

export function Header() {
  return (
    <header>
      <NotificationBell userId="user-123" />
    </header>
  );
}
*/

/**
 * Enviando notificação do servidor
 */
/*
import { sendNotification } from "@/lib/realtime";

// Em uma API route ou server action
export async function notifyUser(userId: string) {
  sendNotification(userId, {
    id: "notif-1",
    type: "success",
    title: "Pedido Confirmado",
    message: "Seu pedido #12345 foi confirmado com sucesso!",
    timestamp: Date.now(),
    read: false,
    actionUrl: "/pedidos/12345",
  });
}
*/

// ============================================================================
// EXEMPLO 2: Dashboard ao Vivo (SSE)
// ============================================================================

/**
 * Dashboard com métricas atualizadas em tempo real
 */
/*
import { LiveDashboard } from "@/components/realtime/live-dashboard";

export function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <LiveDashboard userId="user-123" />
    </div>
  );
}
*/

/**
 * Atualizando dashboard do servidor
 */
/*
import { updateDashboard } from "@/lib/realtime";

export async function updateDashboardMetrics(userId: string) {
  updateDashboard(userId, {
    metrics: [
      {
        id: "revenue",
        label: "Receita Total",
        value: 125000,
        previousValue: 100000,
        format: "currency",
        icon: "dollar",
      },
      {
        id: "orders",
        label: "Pedidos Hoje",
        value: 45,
        previousValue: 38,
        format: "number",
        icon: "cart",
      },
      {
        id: "customers",
        label: "Novos Clientes",
        value: 12,
        previousValue: 15,
        format: "number",
        icon: "users",
      },
    ],
    alerts: [
      {
        id: "alert-1",
        type: "warning",
        message: "Estoque baixo em 3 produtos",
      },
    ],
    lastUpdate: Date.now(),
  });
}
*/

// ============================================================================
// EXEMPLO 3: Alertas de Estoque Baixo (SSE)
// ============================================================================

/**
 * Hook customizado para alertas de estoque
 */
/*
import { useSSEAlerts } from "@/lib/realtime";
import { toast } from "@/components/ui/use-toast";

export function useStockAlerts(userId: string) {
  useSSEAlerts(userId, (alert) => {
    const stockAlert = alert as SSEStockAlert;
    
    toast({
      title: "Alerta de Estoque",
      description: `${stockAlert.productName} está com estoque baixo (${stockAlert.currentStock} unidades)`,
      variant: stockAlert.severity === "critical" ? "destructive" : "default",
    });
  });
}
*/

/**
 * Enviando alerta de estoque do servidor
 */
/*
import { sendStockAlert } from "@/lib/realtime";

export async function checkStockLevels() {
  const lowStockProducts = await db.products.findMany({
    where: { stock: { lte: db.raw("minimum_stock") } },
  });

  for (const product of lowStockProducts) {
    // Envia para gerentes de estoque
    sendStockAlertToChannel("stock-managers", {
      id: `stock-${product.id}`,
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      minimumStock: product.minimumStock,
      severity: product.stock === 0 ? "critical" : "low",
      timestamp: Date.now(),
    });
  }
}
*/

// ============================================================================
// EXEMPLO 4: Progresso de Importação (SSE)
// ============================================================================

/**
 * Componente que mostra progresso de importação
 */
/*
import { useSSEProgress } from "@/lib/realtime";
import { Progress } from "@/components/ui/progress";

export function ImportProgress({ userId, taskId }: { userId: string; taskId: string }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("pending");

  useSSEProgress(userId, taskId, (data) => {
    const update = data as SSEProgressUpdate;
    setProgress(update.progress);
    setStatus(update.status);
  });

  return (
    <div>
      <Progress value={progress} />
      <p>{status === "running" ? `Importando... ${progress}%` : status}</p>
    </div>
  );
}
*/

/**
 * Atualizando progresso do servidor
 */
/*
import { updateProgress } from "@/lib/realtime";

export async function importProducts(userId: string, file: File) {
  const taskId = generateMessageId();
  const rows = await parseCSV(file);
  
  for (let i = 0; i < rows.length; i++) {
    await db.products.create({ data: rows[i] });
    
    // Atualiza progresso a cada 10 linhas
    if (i % 10 === 0) {
      updateProgress(userId, {
        taskId,
        taskName: "Importação de Produtos",
        progress: Math.round((i / rows.length) * 100),
        status: "running",
        message: `${i} de ${rows.length} produtos importados`,
        timestamp: Date.now(),
      });
    }
  }

  // Finaliza
  updateProgress(userId, {
    taskId,
    taskName: "Importação de Produtos",
    progress: 100,
    status: "completed",
    message: `${rows.length} produtos importados com sucesso`,
    timestamp: Date.now(),
  });
}
*/

// ============================================================================
// EXEMPLO 5: Chat Interno (WebSocket)
// ============================================================================

/**
 * Widget de chat flutuante
 */
/*
import { ChatWidget } from "@/components/realtime/chat-widget";

export function Layout({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();

  return (
    <div>
      {children}
      <ChatWidget
        userId={user.id}
        userName={user.name}
        userAvatar={user.avatar}
        roomId="support"
        roomName="Suporte"
        position="bottom-right"
      />
    </div>
  );
}
*/

/**
 * Chat inline em uma página
 */
/*
import { InlineChat } from "@/components/realtime/chat-widget";

export function SupportPage() {
  const user = useCurrentUser();

  return (
    <div className="h-screen">
      <InlineChat
        userId={user.id}
        userName={user.name}
        userAvatar={user.avatar}
        roomId="support"
        roomName="Chat de Suporte"
      />
    </div>
  );
}
*/

// ============================================================================
// EXEMPLO 6: Edição Colaborativa (WebSocket)
// ============================================================================

/**
 * Editor colaborativo de documentos
 */
/*
import { useWebSocketCollaboration } from "@/lib/realtime";
import { useState } from "react";

export function CollaborativeEditor({ userId, documentId }: { userId: string; documentId: string }) {
  const [content, setContent] = useState("");

  const { isConnected, sendUpdate } = useWebSocketCollaboration(
    userId,
    documentId,
    (update) => {
      const collab = update as WSCollaborationUpdate;
      
      // Aplica atualização de outro usuário
      if (collab.operation === "insert" && collab.position !== undefined) {
        setContent((prev) =>
          prev.slice(0, collab.position) +
          collab.content +
          prev.slice(collab.position)
        );
      }
    }
  );

  const handleChange = (newContent: string) => {
    setContent(newContent);
    
    // Envia atualização para outros usuários
    sendUpdate({
      documentId,
      userId,
      userName: "Current User",
      operation: "update",
      content: newContent,
      timestamp: Date.now(),
    });
  };

  return (
    <div>
      <Badge variant={isConnected ? "default" : "secondary"}>
        {isConnected ? "Conectado" : "Desconectado"}
      </Badge>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-96"
      />
    </div>
  );
}
*/

// ============================================================================
// EXEMPLO 7: Status de Pedidos (WebSocket)
// ============================================================================

/**
 * Acompanhamento de pedido em tempo real
 */
/*
import { useWebSocketOrderStatus } from "@/lib/realtime";

export function OrderTracking({ userId, orderId }: { userId: string; orderId: string }) {
  const [status, setStatus] = useState("pending");

  useWebSocketOrderStatus(userId, orderId, (data) => {
    const update = data as WSOrderStatus;
    setStatus(update.status);
    
    toast({
      title: "Status do Pedido Atualizado",
      description: update.message || `Status: ${update.status}`,
    });
  });

  return (
    <div>
      <h2>Pedido #{orderId}</h2>
      <Badge>{status}</Badge>
    </div>
  );
}
*/

/**
 * Atualizando status do pedido do servidor
 */
/*
import { updateOrderStatus } from "@/lib/realtime";

export async function updateOrder(orderId: string, newStatus: string) {
  await db.orders.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  updateOrderStatus(orderId, {
    orderId,
    status: newStatus,
    message: `Pedido ${newStatus}`,
    updatedBy: "system",
    timestamp: Date.now(),
  });
}
*/

// ============================================================================
// EXEMPLO 8: Hook Customizado SSE
// ============================================================================

/**
 * Hook customizado para eventos específicos
 */
/*
import { useSSE } from "@/lib/realtime";

export function useCustomEvents(userId: string) {
  const [events, setEvents] = useState([]);

  const { isConnected } = useSSE({
    userId,
    channels: ["custom-events"],
    onMessage: (message) => {
      if (message.type === "custom") {
        setEvents((prev) => [...prev, message.data]);
      }
    },
    onError: (error) => {
      console.error("SSE Error:", error);
    },
    autoReconnect: true,
    maxReconnectAttempts: 5,
  });

  return { events, isConnected };
}
*/

// ============================================================================
// EXEMPLO 9: Hook Customizado WebSocket
// ============================================================================

/**
 * Hook customizado para presença de usuários
 */
/*
import { useWebSocket } from "@/lib/realtime";

export function useUserPresence(userId: string) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const ws = useWebSocket({
    userId,
    onMessage: (message) => {
      if (message.type === "presence") {
        const presence = message.data as WSUserPresence;
        
        setOnlineUsers((prev) => {
          if (presence.status === "online") {
            return [...prev, presence.userId];
          } else {
            return prev.filter((id) => id !== presence.userId);
          }
        });
      }
    },
  });

  useEffect(() => {
    if (ws.isConnected) {
      ws.joinRoom("presence");
    }
  }, [ws.isConnected]);

  return { onlineUsers, ...ws };
}
*/

// ============================================================================
// QUANDO USAR SSE vs WebSocket?
// ============================================================================

/**
 * Use SSE (Server-Sent Events) quando:
 * 
 * ✅ Comunicação UNIDIRECIONAL (servidor → cliente)
 * ✅ Notificações push
 * ✅ Atualizações de dashboard
 * ✅ Alertas e avisos
 * ✅ Progresso de tarefas longas
 * ✅ Feeds de eventos
 * ✅ Mais simples de implementar
 * ✅ Reconexão automática nativa
 * ✅ Funciona sobre HTTP/HTTPS
 * 
 * Exemplos:
 * - Notificações de sistema
 * - Atualizações de KPIs
 * - Alertas de estoque
 * - Progresso de importações
 * - Feed de atividades
 */

/**
 * Use WebSocket quando:
 * 
 * ✅ Comunicação BIDIRECIONAL (cliente ↔ servidor)
 * ✅ Chat em tempo real
 * ✅ Edição colaborativa
 * ✅ Jogos multiplayer
 * ✅ Sincronização em tempo real
 * ✅ Baixa latência crítica
 * ✅ Alto volume de mensagens
 * 
 * Exemplos:
 * - Chat interno
 * - Edição colaborativa de documentos
 * - Sincronização de calendários
 * - Atualizações de status de pedidos (com interação)
 * - Whiteboard colaborativo
 */

export {};
