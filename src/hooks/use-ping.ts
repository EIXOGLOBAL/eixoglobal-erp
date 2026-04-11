"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type PingStatus = "good" | "fair" | "poor" | "offline";

interface PingResult {
  latency: number;
  timestamp: number;
}

interface UsePingReturn {
  latency: number;
  status: PingStatus;
  history: PingResult[];
}

const PING_INTERVAL = 30_000;
const HISTORY_SIZE = 10;
const AVERAGE_WINDOW = 3;

function getStatus(ms: number): PingStatus {
  if (ms < 100) return "good";
  if (ms < 300) return "fair";
  if (ms < 1000) return "poor";
  return "offline";
}

function averageLatency(history: PingResult[], window: number): number {
  if (history.length === 0) return 0;
  const slice = history.slice(-window);
  const sum = slice.reduce((acc, r) => acc + r.latency, 0);
  return Math.round(sum / slice.length);
}

export function usePing(): UsePingReturn {
  const [history, setHistory] = useState<PingResult[]>([]);
  const [status, setStatus] = useState<PingStatus>("offline");
  const [latency, setLatency] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ping = useCallback(async () => {
    try {
      const start = performance.now();
      const res = await fetch("/api/health/ping", { cache: "no-store" });
      const end = performance.now();

      if (!res.ok) throw new Error("ping failed");

      const ms = Math.round(end - start);
      const result: PingResult = { latency: ms, timestamp: Date.now() };

      setHistory((prev) => {
        const next = [...prev, result].slice(-HISTORY_SIZE);
        const avg = averageLatency(next, AVERAGE_WINDOW);
        setLatency(avg);
        setStatus(getStatus(avg));
        return next;
      });
    } catch {
      setStatus("offline");
      setLatency(0);
      setHistory((prev) => [
        ...prev,
        { latency: -1, timestamp: Date.now() },
      ].slice(-HISTORY_SIZE));
    }
  }, []);

  useEffect(() => {
    // Initial ping
    ping();

    function startInterval() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(ping, PING_INTERVAL);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        ping();
        startInterval();
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }

    startInterval();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [ping]);

  return { latency, status, history };
}
