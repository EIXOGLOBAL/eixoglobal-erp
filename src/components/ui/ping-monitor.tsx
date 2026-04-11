"use client";

import { usePing, type PingStatus } from "@/hooks/use-ping";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  PingStatus,
  { color: string; pulseColor: string; label: string }
> = {
  good: {
    color: "bg-green-500",
    pulseColor: "bg-green-400",
    label: "Conexão boa",
  },
  fair: {
    color: "bg-yellow-500",
    pulseColor: "bg-yellow-400",
    label: "Conexão moderada",
  },
  poor: {
    color: "bg-red-500",
    pulseColor: "bg-red-400",
    label: "Conexão lenta",
  },
  offline: {
    color: "bg-gray-400",
    pulseColor: "bg-gray-300",
    label: "Sem conexão",
  },
};

export function PingMonitor({ className }: { className?: string }) {
  const { latency, status } = usePing();
  const config = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
              className
            )}
          >
            <span className="relative flex h-2 w-2">
              {status !== "offline" && (
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    config.pulseColor
                  )}
                />
              )}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  config.color
                )}
              />
            </span>
            <span>
              {status === "offline" ? "---" : `${latency}ms`}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">
            <p className="font-medium">{config.label}</p>
            {status !== "offline" && (
              <p className="text-muted">
                Latência: {latency}ms (média)
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
