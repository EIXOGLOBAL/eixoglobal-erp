"use client";

import { useEffect, useState } from "react";

interface VersionInfo {
  version: string;
  commit: string;
  buildTime: string;
}

const STATIC_INFO: VersionInfo = {
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
  commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "local",
  buildTime: process.env.NEXT_PUBLIC_BUILD_TIME ?? new Date().toISOString(),
};

function formatBuildDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface VersionBadgeProps {
  variant?: "compact" | "full";
  className?: string;
}

export function VersionBadge({
  variant = "compact",
  className = "",
}: VersionBadgeProps) {
  const [info, setInfo] = useState<VersionInfo>(STATIC_INFO);

  useEffect(() => {
    // Tenta buscar do endpoint pra garantir valores atualizados (útil em hot-reload)
    fetch("/api/version")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.version) {
          setInfo({
            version: data.version,
            commit: data.commit ?? STATIC_INFO.commit,
            buildTime: data.buildTime ?? STATIC_INFO.buildTime,
          });
        }
      })
      .catch(() => {});
  }, []);

  const title = `Atualização ${info.version}\nCommit: ${info.commit}\nBuild: ${formatBuildDate(info.buildTime)}`;

  if (variant === "compact") {
    return (
      <div
        className={`text-xs text-muted-foreground select-none ${className}`}
        title={title}
      >
        {info.version}
        <span className="mx-1 opacity-40">·</span>
        <span className="font-mono opacity-70">{info.commit}</span>
      </div>
    );
  }

  return (
    <div className={`text-xs text-muted-foreground ${className}`} title={title}>
      <div>
        <span className="font-medium">Eixo Global ERP</span>{" "}
        <span>{info.version}</span>
      </div>
      <div className="opacity-70">
        Build <span className="font-mono">{info.commit}</span> ·{" "}
        {formatBuildDate(info.buildTime)}
      </div>
    </div>
  );
}
