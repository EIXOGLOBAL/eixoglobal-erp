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
const APP_VERSION = pkg.version;

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ['@prisma/client'],
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
