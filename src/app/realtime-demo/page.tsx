/**
 * Demo Page - Real-Time Features
 * 
 * Página de demonstração das funcionalidades de comunicação em tempo real
 * 
 * Acesse: /realtime-demo
 */

"use client";

import { useState } from "react";
import { NotificationBell } from "@/components/realtime/notification-bell";
import { LiveDashboard } from "@/components/realtime/live-dashboard";
import { ChatWidget } from "@/components/realtime/chat-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  MessageCircle,
  BarChart3,
  Send,
  Zap,
  Activity,
} from "lucide-react";

export default function RealtimeDemoPage() {
  const [userId] = useState("demo-user-123");
  const [userName] = useState("Demo User");
  const [testMessage, setTestMessage] = useState("");

  // Simula envio de notificação de teste
  const sendTestNotification = async () => {
    try {
      const response = await fetch("/api/realtime/test/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          notification: {
            id: `test-${Date.now()}`,
            type: "info",
            title: "Notificação de Teste",
            message: testMessage || "Esta é uma notificação de teste!",
            timestamp: Date.now(),
            read: false,
          },
        }),
      });

      if (response.ok) {
        setTestMessage("");
      }
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
    }
  };

  // Simula atualização de dashboard
  const updateTestDashboard = async () => {
    try {
      await fetch("/api/realtime/test/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          dashboard: {
            metrics: [
              {
                id: "revenue",
                label: "Receita Total",
                value: Math.floor(Math.random() * 200000) + 100000,
                previousValue: 100000,
                format: "currency",
                icon: "dollar",
              },
              {
                id: "orders",
                label: "Pedidos Hoje",
                value: Math.floor(Math.random() * 50) + 20,
                previousValue: 38,
                format: "number",
                icon: "cart",
              },
              {
                id: "customers",
                label: "Novos Clientes",
                value: Math.floor(Math.random() * 20) + 5,
                previousValue: 15,
                format: "number",
                icon: "users",
              },
              {
                id: "conversion",
                label: "Taxa de Conversão",
                value: Math.random() * 10 + 2,
                previousValue: 3.5,
                format: "percentage",
                icon: "trending-up",
              },
            ],
            alerts:
              Math.random() > 0.5
                ? [
                    {
                      id: "alert-1",
                      type: "warning" as const,
                      message: "Estoque baixo em 3 produtos",
                    },
                  ]
                : [],
            lastUpdate: Date.now(),
          },
        }),
      });
    } catch (error) {
      console.error("Erro ao atualizar dashboard:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Real-Time Communication Demo
          </h1>
          <p className="text-muted-foreground mt-2">
            Demonstração das funcionalidades de comunicação em tempo real
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            User ID: {userId}
          </Badge>
          <NotificationBell userId={userId} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações (SSE)
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard (SSE)
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat (WebSocket)
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Server-Sent Events (SSE)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Comunicação unidirecional (servidor → cliente) ideal para:
                </p>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>Notificações em tempo real</li>
                  <li>Atualizações de dashboard</li>
                  <li>Alertas de estoque</li>
                  <li>Progresso de importações</li>
                </ul>
                <div className="pt-4 space-y-2">
                  <Badge variant="secondary">Reconexão automática</Badge>
                  <Badge variant="secondary">Heartbeat/ping</Badge>
                  <Badge variant="secondary">Rate limiting</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  WebSockets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Comunicação bidirecional (cliente ↔ servidor) ideal para:
                </p>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>Chat em tempo real</li>
                  <li>Edição colaborativa</li>
                  <li>Sincronização de calendários</li>
                  <li>Status de pedidos</li>
                </ul>
                <div className="pt-4 space-y-2">
                  <Badge variant="secondary">Baixa latência</Badge>
                  <Badge variant="secondary">Suporte a rooms</Badge>
                  <Badge variant="secondary">Bidirecional</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Arquivos Criados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold mb-2">Server-Side:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>✓ src/lib/realtime/sse-server.ts</li>
                      <li>✓ src/lib/realtime/ws-server.ts</li>
                      <li>✓ src/app/api/sse/route.ts</li>
                      <li>✓ src/lib/realtime/server-init.ts</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Client-Side:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>✓ src/lib/realtime/sse-client.ts</li>
                      <li>✓ src/lib/realtime/ws-client.ts</li>
                      <li>✓ src/components/realtime/notification-bell.tsx</li>
                      <li>✓ src/components/realtime/live-dashboard.tsx</li>
                      <li>✓ src/components/realtime/chat-widget.tsx</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Testar Notificações SSE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem de teste..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendTestNotification();
                    }
                  }}
                />
                <Button onClick={sendTestNotification}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Clique no sino no canto superior direito para ver as
                notificações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como Usar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-semibold">1. Componente:</p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {`import { NotificationBell } from "@/components/realtime/notification-bell";

<NotificationBell userId="user-123" />`}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">2. Enviar do servidor:</p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {`import { sendNotification } from "@/lib/realtime";

sendNotification("user-123", {
  id: "notif-1",
  type: "success",
  title: "Pedido Confirmado",
  message: "Seu pedido foi confirmado!",
  timestamp: Date.now(),
  read: false,
});`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Testar Dashboard ao Vivo</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={updateTestDashboard}>
                <Activity className="h-4 w-4 mr-2" />
                Atualizar Métricas
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Clique para gerar métricas aleatórias e ver a atualização em
                tempo real
              </p>
            </CardContent>
          </Card>

          <LiveDashboard userId={userId} />

          <Card>
            <CardHeader>
              <CardTitle>Como Usar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-semibold">1. Componente:</p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {`import { LiveDashboard } from "@/components/realtime/live-dashboard";

<LiveDashboard userId="user-123" />`}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">2. Atualizar do servidor:</p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {`import { updateDashboard } from "@/lib/realtime";

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
});`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat em Tempo Real (WebSocket)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Clique no ícone de chat no canto inferior direito para abrir o
                widget de chat. Abra esta página em outra aba ou navegador para
                testar a comunicação em tempo real.
              </p>
              <Badge variant="outline">
                Room ID: demo-chat
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como Usar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-semibold">1. Widget Flutuante:</p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {`import { ChatWidget } from "@/components/realtime/chat-widget";

<ChatWidget
  userId="user-123"
  userName="João Silva"
  roomId="support"
  roomName="Suporte"
  position="bottom-right"
/>`}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">2. Chat Inline:</p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {`import { InlineChat } from "@/components/realtime/chat-widget";

<InlineChat
  userId="user-123"
  userName="João Silva"
  roomId="support"
  roomName="Chat de Suporte"
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chat Widget */}
      <ChatWidget
        userId={userId}
        userName={userName}
        roomId="demo-chat"
        roomName="Demo Chat"
        position="bottom-right"
      />
    </div>
  );
}
