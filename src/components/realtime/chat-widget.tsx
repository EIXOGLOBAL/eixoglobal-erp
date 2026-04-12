/**
 * Chat Widget Component
 * Widget de chat interno em tempo real usando WebSocket
 * 
 * Uso:
 * <ChatWidget userId="123" roomId="support" />
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useWebSocketChat } from "@/lib/realtime/ws-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Maximize2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: number;
  type?: "text" | "system";
}

interface ChatWidgetProps {
  userId: string;
  userName: string;
  userAvatar?: string;
  roomId: string;
  roomName?: string;
  className?: string;
  defaultOpen?: boolean;
  position?: "bottom-right" | "bottom-left";
}

export function ChatWidget({
  userId,
  userName,
  userAvatar,
  roomId,
  roomName = "Chat",
  className,
  defaultOpen = false,
  position = "bottom-right",
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Conecta ao WebSocket
  const { isConnected, sendMessage } = useWebSocketChat(
    userId,
    roomId,
    (data) => {
      const message = data as ChatMessage;
      
      setMessages((prev) => [...prev, message]);

      // Incrementa contador de não lidas se o chat estiver fechado ou minimizado
      if (!isOpen || isMinimized) {
        setUnreadCount((prev) => prev + 1);
      }

      // Mostra notificação se for mensagem de outro usuário
      if (
        message.userId !== userId &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(`${message.userName} no ${roomName}`, {
          body: message.message,
          icon: message.userAvatar || "/favicon.ico",
        });
      }
    },
  );

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reseta contador ao abrir
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  // Envia mensagem
  const handleSendMessage = () => {
    if (!inputValue.trim() || !isConnected) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      userId,
      userName,
      userAvatar,
      message: inputValue.trim(),
      timestamp: Date.now(),
      type: "text",
    };

    sendMessage(message);
    setInputValue("");
  };

  // Formata timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Obtém iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Posicionamento
  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className={cn(
          "fixed h-14 w-14 rounded-full shadow-lg z-50",
          positionClasses[position],
          className,
        )}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-6 min-w-6 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        "fixed z-50 shadow-2xl",
        positionClasses[position],
        isMinimized ? "w-80" : "w-96 h-[600px]",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <CardTitle className="text-base">{roomName}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            {isConnected ? "Online" : "Offline"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="p-0">
            <ScrollArea className="h-[440px] px-4" ref={scrollRef}>
              <div className="space-y-4 py-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma mensagem ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Seja o primeiro a enviar uma mensagem!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.userId === userId;
                    const isSystemMessage = message.type === "system";

                    if (isSystemMessage) {
                      return (
                        <div
                          key={message.id}
                          className="flex justify-center"
                        >
                          <Badge variant="secondary" className="text-xs">
                            {message.message}
                          </Badge>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-2",
                          isOwnMessage && "flex-row-reverse",
                        )}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={message.userAvatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(message.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "flex flex-col gap-1 max-w-[70%]",
                            isOwnMessage && "items-end",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {isOwnMessage ? "Você" : message.userName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "rounded-lg px-3 py-2 text-sm",
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted",
                            )}
                          >
                            {message.message}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="border-t pt-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex w-full gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={!isConnected}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || !isConnected}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

/**
 * Componente de chat inline (não flutuante)
 */
export function InlineChat({
  userId,
  userName,
  userAvatar,
  roomId,
  roomName = "Chat",
  className,
}: Omit<ChatWidgetProps, "defaultOpen" | "position">) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isConnected, sendMessage } = useWebSocketChat(
    userId,
    roomId,
    (data) => {
      const message = data as ChatMessage;
      setMessages((prev) => [...prev, message]);
    },
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !isConnected) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      userId,
      userName,
      userAvatar,
      message: inputValue.trim(),
      timestamp: Date.now(),
      type: "text",
    };

    sendMessage(message);
    setInputValue("");
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{roomName}</CardTitle>
        <Badge variant={isConnected ? "default" : "secondary"}>
          {isConnected ? "Online" : "Offline"}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((message) => {
              const isOwnMessage = message.userId === userId;

              return (
                <div
                  key={message.id}
                  className={cn("flex gap-2", isOwnMessage && "flex-row-reverse")}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.userAvatar} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "flex flex-col gap-1 max-w-[70%]",
                      isOwnMessage && "items-end",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {isOwnMessage ? "Você" : message.userName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      {message.message}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex w-full gap-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={!isConnected}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || !isConnected}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
