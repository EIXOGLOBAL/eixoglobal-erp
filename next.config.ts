import type { NextConfig } from "next";
import { execSync } from "child_process";
import pkg from "./package.json" with { type: "json" };

function safeExec(cmd: string, fallback = "unknown"): string {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const BUILD_COMMIT =
  process.env.GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  safeExec("git rev-parse HEAD");
const BUILD_COMMIT_SHORT = BUILD_COMMIT.slice(0, 7);
const BUILD_TIME = new Date().toISOString();

// Versão no formato DDMMYYYY-XX (tag git) ou fallback para package.json
function getAppVersion(): string {
  // 1. Tentar ler da env (passada pelo CI/CD ou Dockerfile)
  if (process.env.APP_VERSION) return process.env.APP_VERSION;

  // 2. Tentar ler a tag git mais recente no formato DDMMYYYY-XX
  const latestTag = safeExec("git describe --tags --abbrev=0", "");
  if (latestTag && /^\d{8}-\d{2}$/.test(latestTag)) return latestTag;

  // 3. Fallback: gerar versão baseada na data atual
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}${mm}${yyyy}-01`;
}

const APP_VERSION = getAppVersion();

const nextConfig: NextConfig = {
  // output: "standalone", // Desabilitado temporariamente devido a bug do Turbopack
  reactCompiler: true,
  serverExternalPackages: ['@prisma/client'],
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_BUILD_COMMIT: BUILD_COMMIT_SHORT,
    NEXT_PUBLIC_BUILD_COMMIT_FULL: BUILD_COMMIT,
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ]
  },
};

export default nextConfig;
