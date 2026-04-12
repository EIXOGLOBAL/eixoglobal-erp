/**
 * Live Dashboard Component
 * Dashboard com atualizações em tempo real via SSE
 * 
 * Uso:
 * <LiveDashboard userId="123" />
 */

"use client";

import { useState, useEffect } from "react";
import { useSSEDashboard } from "@/lib/realtime/sse-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  format?: "number" | "currency" | "percentage";
  trend?: "up" | "down" | "neutral";
  icon?: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  alerts?: Array<{
    id: string;
    type: "warning" | "error" | "info";
    message: string;
  }>;
  lastUpdate: number;
}

interface LiveDashboardProps {
  userId: string;
  initialData?: DashboardData;
  className?: string;
}

export function LiveDashboard({
  userId,
  initialData,
  className,
}: LiveDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(
    initialData || {
      metrics: [],
      alerts: [],
      lastUpdate: Date.now(),
    },
  );

  // Conecta ao SSE para receber atualizações
  const { isConnected } = useSSEDashboard(userId, (data) => {
    setDashboardData(data as DashboardData);
  });

  // Formata valor baseado no tipo
  const formatValue = (
    value: number,
    format: DashboardMetric["format"] = "number",
  ) => {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      case "percentage":
        return `${value.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat("pt-BR").format(value);
    }
  };

  // Calcula variação percentual
  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Ícone baseado no nome
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case "dollar":
        return DollarSign;
      case "cart":
        return ShoppingCart;
      case "users":
        return Users;
      case "package":
        return Package;
      default:
        return TrendingUp;
    }
  };

  // Formata timestamp da última atualização
  const formatLastUpdate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 1000) return "Agora";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s atrás`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
    return new Date(timestamp).toLocaleTimeString("pt-BR");
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard em Tempo Real</h2>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Conectado" : "Desconectado"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Atualizado {formatLastUpdate(dashboardData.lastUpdate)}
          </span>
        </div>
      </div>

      {/* Alertas */}
      {dashboardData.alerts && dashboardData.alerts.length > 0 && (
        <div className="space-y-2">
          {dashboardData.alerts.map((alert) => (
            <Card
              key={alert.id}
              className={cn(
                "border-l-4",
                alert.type === "error" && "border-l-red-500",
                alert.type === "warning" && "border-l-yellow-500",
                alert.type === "info" && "border-l-blue-500",
              )}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle
                  className={cn(
                    "h-5 w-5",
                    alert.type === "error" && "text-red-500",
                    alert.type === "warning" && "text-yellow-500",
                    alert.type === "info" && "text-blue-500",
                  )}
                />
                <p className="text-sm">{alert.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardData.metrics.map((metric) => {
          const Icon = getIcon(metric.icon);
          const change = calculateChange(metric.value, metric.previousValue);
          const trend = metric.trend || (change && change > 0 ? "up" : "down");

          return (
            <Card key={metric.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatValue(metric.value, metric.format)}
                </div>
                {change !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    {trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        trend === "up" ? "text-green-500" : "text-red-500",
                      )}
                    >
                      {Math.abs(change).toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      vs anterior
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Placeholder se não houver dados */}
      {dashboardData.metrics.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aguardando dados do dashboard...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Componente de métrica individual para uso customizado
 */
export function DashboardMetricCard({
  metric,
  className,
}: {
  metric: DashboardMetric;
  className?: string;
}) {
  const formatValue = (
    value: number,
    format: DashboardMetric["format"] = "number",
  ) => {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      case "percentage":
        return `${value.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat("pt-BR").format(value);
    }
  };

  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const change = calculateChange(metric.value, metric.previousValue);
  const trend = metric.trend || (change && change > 0 ? "up" : "down");

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(metric.value, metric.format)}
        </div>
        {change !== null && (
          <div className="flex items-center gap-1 mt-1">
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend === "up" ? "text-green-500" : "text-red-500",
              )}
            >
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
