# Real-Time Communication - EixoGlobal ERP

Sistema completo de comunicação em tempo real usando **Server-Sent Events (SSE)** e **WebSockets**.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [SSE - Server-Sent Events](#sse---server-sent-events)
- [WebSockets](#websockets)
- [Componentes](#componentes)
- [Exemplos de Uso](#exemplos-de-uso)
- [API Reference](#api-reference)
- [Quando Usar SSE vs WebSocket](#quando-usar-sse-vs-websocket)

## 🎯 Visão Geral

Este módulo implementa comunicação em tempo real para o EixoGlobal ERP, permitindo:

- **Notificações em tempo real**
- **Atualizações de dashboard ao vivo**
- **Alertas de estoque baixo**
- **Progresso de importações**
- **Chat interno entre usuários**
- **Edição colaborativa de documentos**
- **Sincronização de calendários**
- **Atualizações de status de pedidos**

## 🏗️ Arquitetura

```
src/lib/realtime/
├── sse-server.ts          # Gerenciador SSE (servidor)
├── sse-client.ts          # Hooks SSE (cliente)
├── ws-server.ts           # Gerenciador WebSocket (servidor)
├── ws-client.ts           # Hooks WebSocket (cliente)
├── types.ts               # Tipos TypeScript
├── utils.ts               # Funções utilitárias
├── index.ts               # Exports principais
└── examples.ts            # Exemplos de uso

src/app/api/sse/
└── route.ts               # Endpoint SSE

src/components/realtime/
├── notification-bell.tsx  # Sino de notificações
├── live-dashboard.tsx     # Dashboard ao vivo
└── chat-widget.tsx        # Widget de chat
```

## 📡 SSE - Server-Sent Events

### Características

- ✅ Comunicação **unidirecional** (servidor → cliente)
- ✅ Reconexão automática
- ✅ Heartbeat/ping-pong
- ✅ Rate limiting
- ✅ Suporte a canais (channels)

### Casos de Uso

1. **Notificações em tempo real**
2. **Atualizações de dashboard (KPIs)**
3. **Alertas de estoque baixo**
4. **Progresso de importações**

### Servidor

```typescript
import { getSSEServer } from "@/lib/realtime";

// Obter instância do servidor
const sseServer = getSSEServer();

// Enviar notificação para um usuário
sseServer.sendToUser("user-123", {
  type: "notification",
  data: {
    id: "notif-1",
    type: "success",
    title: "Pedido Confirmado",
    message: "Seu pedido foi confirmado!",
    timestamp: Date.now(),
  },
});

// Enviar para um canal
sseServer.sendToChannel("dashboard", {
  type: "dashboard",
  data: { /* dados do dashboard */ },
});

// Broadcast para todos
sseServer.broadcast({
  type: "alert",
  data: { /* alerta */ },
});
```

### Cliente

```typescript
import { useSSE } from "@/lib/realtime";

function MyComponent() {
  const { isConnected, lastMessage } = useSSE({
    userId: "user-123",
    channels: ["notifications", "dashboard"],
    onMessage: (message) => {
      console.log("Nova mensagem:", message);
    },
    autoReconnect: true,
  });

  return <div>Status: {isConnected ? "Conectado" : "Desconectado"}</div>;
}
```

### Hooks Especializados

```typescript
// Notificações
useSSENotifications(userId, onNotification);

// Dashboard
useSSEDashboard(userId, onUpdate);

// Alertas
useSSEAlerts(userId, onAlert);

// Progresso
useSSEProgress(userId, taskId, onProgress);
```

## 🔌 WebSockets

### Características

- ✅ Comunicação **bidirecional** (cliente ↔ servidor)
- ✅ Suporte a rooms
- ✅ Heartbeat/ping-pong
- ✅ Reconexão automática
- ✅ Rate limiting

### Casos de Uso

1. **Chat interno entre usuários**
2. **Edição colaborativa de documentos**
3. **Sincronização de calendários**
4. **Atualizações de status de pedidos**

### Servidor

```typescript
import { getWSServer } from "@/lib/realtime";

// Inicializar servidor (em server.ts ou instrumentation.ts)
const wsServer = getWSServer();
wsServer.initialize(); // Porta 3001 por padrão

// Enviar mensagem para uma room
wsServer.sendToRoom("chat-support", {
  type: "message",
  data: { /* mensagem */ },
});

// Enviar para um usuário
wsServer.sendToUser("user-123", {
  type: "notification",
  data: { /* dados */ },
});
```

### Cliente

```typescript
import { useWebSocket } from "@/lib/realtime";

function ChatComponent() {
  const { isConnected, send, joinRoom } = useWebSocket({
    userId: "user-123",
    onMessage: (message) => {
      console.log("Mensagem recebida:", message);
    },
  });

  useEffect(() => {
    if (isConnected) {
      joinRoom("chat-support");
    }
  }, [isConnected]);

  const sendMessage = () => {
    send({
      type: "message",
      room: "chat-support",
      data: { text: "Olá!" },
    });
  };

  return <button onClick={sendMessage}>Enviar</button>;
}
```

### Hooks Especializados

```typescript
// Chat
useWebSocketChat(userId, roomId, onMessage);

// Edição colaborativa
useWebSocketCollaboration(userId, documentId, onUpdate);

// Calendário
useWebSocketCalendar(userId, onEventUpdate);

// Status de pedidos
useWebSocketOrderStatus(userId, orderId, onStatusUpdate);
```

## 🎨 Componentes

### NotificationBell

Sino de notificações com contador de não lidas.

```typescript
import { NotificationBell } from "@/components/realtime/notification-bell";

<NotificationBell userId="user-123" />
```

### LiveDashboard

Dashboard com métricas atualizadas em tempo real.

```typescript
import { LiveDashboard } from "@/components/realtime/live-dashboard";

<LiveDashboard userId="user-123" />
```

### ChatWidget

Widget de chat flutuante ou inline.

```typescript
import { ChatWidget, InlineChat } from "@/components/realtime/chat-widget";

// Flutuante
<ChatWidget
  userId="user-123"
  userName="João Silva"
  roomId="support"
  roomName="Suporte"
  position="bottom-right"
/>

// Inline
<InlineChat
  userId="user-123"
  userName="João Silva"
  roomId="support"
  roomName="Chat de Suporte"
/>
```

## 📚 Exemplos de Uso

### Exemplo 1: Notificações

```typescript
// Servidor
import { sendNotification } from "@/lib/realtime";

sendNotification("user-123", {
  id: "notif-1",
  type: "success",
  title: "Pedido Confirmado",
  message: "Seu pedido #12345 foi confirmado!",
  timestamp: Date.now(),
  read: false,
  actionUrl: "/pedidos/12345",
});

// Cliente
import { NotificationBell } from "@/components/realtime/notification-bell";

<NotificationBell userId="user-123" />
```

### Exemplo 2: Dashboard ao Vivo

```typescript
// Servidor
import { updateDashboard } from "@/lib/realtime";

updateDashboard("user-123", {
  metrics: [
    {
      id: "revenue",
      label: "Receita Total",
      value: 125000,
      previousValue: 100000,
      format: "currency",
      icon: "dollar",
    },
  ],
  lastUpdate: Date.now(),
});

// Cliente
import { LiveDashboard } from "@/components/realtime/live-dashboard";

<LiveDashboard userId="user-123" />
```

### Exemplo 3: Chat

```typescript
// Cliente
import { ChatWidget } from "@/components/realtime/chat-widget";

<ChatWidget
  userId="user-123"
  userName="João Silva"
  roomId="support"
  roomName="Suporte"
/>
```

## 📖 API Reference

### SSE Server

```typescript
const sseServer = getSSEServer(config?);

// Métodos
sseServer.addClient(clientId, userId, controller);
sseServer.removeClient(clientId);
sseServer.subscribe(clientId, channel);
sseServer.unsubscribe(clientId, channel);
sseServer.sendToClient(clientId, message);
sseServer.sendToUser(userId, message);
sseServer.sendToChannel(channel, message);
sseServer.broadcast(message);
sseServer.getStats();
sseServer.cleanup();
```

### WebSocket Server

```typescript
const wsServer = getWSServer(config?);

// Métodos
wsServer.initialize(server?);
wsServer.joinRoom(clientId, room);
wsServer.leaveRoom(clientId, room);
wsServer.sendToClient(clientId, message);
wsServer.sendToUser(userId, message);
wsServer.sendToRoom(room, message, excludeClientId?);
wsServer.broadcast(message, excludeClientId?);
wsServer.getStats();
wsServer.cleanup();
```

### Utilities

```typescript
// Notificações
sendNotification(userId, notification);
sendNotificationToUsers(userIds, notification);
broadcastNotification(notification);

// Dashboard
updateDashboard(userId, dashboardData);

// Alertas
sendStockAlert(userId, alert);
sendStockAlertToChannel(channel, alert);

// Progresso
updateProgress(userId, progress);
updateProgressInChannel(channel, progress);

// Chat
sendChatMessage(roomId, message);
sendPrivateMessage(userId, message);

// Pedidos
updateOrderStatus(orderId, status);

// Helpers
generateMessageId();
formatTimestamp(timestamp, format);
sanitizeMessage(message);
supportsSSE();
supportsWebSocket();
supportsNotifications();
requestNotificationPermission();
```

## 🤔 Quando Usar SSE vs WebSocket?

### Use SSE quando:

✅ Comunicação **unidirecional** (servidor → cliente)  
✅ Notificações push  
✅ Atualizações de dashboard  
✅ Alertas e avisos  
✅ Progresso de tarefas longas  
✅ Mais simples de implementar  
✅ Reconexão automática nativa  

**Exemplos:**
- Notificações de sistema
- Atualizações de KPIs
- Alertas de estoque
- Progresso de importações

### Use WebSocket quando:

✅ Comunicação **bidirecional** (cliente ↔ servidor)  
✅ Chat em tempo real  
✅ Edição colaborativa  
✅ Sincronização em tempo real  
✅ Baixa latência crítica  
✅ Alto volume de mensagens  

**Exemplos:**
- Chat interno
- Edição colaborativa de documentos
- Sincronização de calendários
- Jogos multiplayer

## 🔧 Configuração

### SSE

```typescript
const sseServer = getSSEServer({
  heartbeatInterval: 30000,      // 30s
  clientTimeout: 60000,          // 60s
  maxClientsPerUser: 5,
});
```

### WebSocket

```typescript
const wsServer = getWSServer({
  port: 3001,
  path: "/ws",
  heartbeatInterval: 30000,      // 30s
  clientTimeout: 60000,          // 60s
  maxClientsPerUser: 5,
  maxMessageSize: 1024 * 1024,   // 1MB
});
```

## 🚀 Inicialização

### SSE

O servidor SSE é inicializado automaticamente quando o primeiro cliente se conecta ao endpoint `/api/sse`.

### WebSocket

Adicione ao `instrumentation.ts`:

```typescript
import { getWSServer } from "@/lib/realtime";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const wsServer = getWSServer();
    wsServer.initialize();
  }
}
```

## 📝 Notas

- SSE funciona sobre HTTP/HTTPS (sem necessidade de protocolo especial)
- WebSocket requer protocolo ws:// ou wss://
- Ambos implementam reconexão automática
- Rate limiting configurado via Upstash Redis
- Heartbeat/ping-pong para detectar conexões mortas
- Suporte a notificações do navegador

## 🔒 Segurança

- Rate limiting por IP
- Validação de userId obrigatória
- Sanitização de mensagens
- Limite de tamanho de mensagens
- Limite de clientes por usuário

## 📊 Monitoramento

```typescript
// SSE Stats
const sseStats = sseServer.getStats();
console.log(sseStats);
// {
//   totalClients: 10,
//   totalChannels: 3,
//   clientsByUser: { "user-123": 2 },
//   channelSubscriptions: [...]
// }

// WebSocket Stats
const wsStats = wsServer.getStats();
console.log(wsStats);
// {
//   totalClients: 15,
//   totalRooms: 5,
//   totalUsers: 8,
//   clientsByUser: [...],
//   roomMembers: [...]
// }
```

---

**Desenvolvido para EixoGlobal ERP** 🚀
