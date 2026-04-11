import { execSync } from "child_process"
import { existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from "fs"
import { join, basename, resolve } from "path"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKUPS_DIR = join(process.cwd(), "backups")
const MAX_FILENAME_LENGTH = 255

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackupFile {
  filename: string
  size: number
  sizeFormatted: string
  createdAt: string
  ageInDays: number
}

export interface BackupStats {
  totalBackups: number
  totalSize: number
  totalSizeFormatted: string
  lastBackupDate: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(2)} ${units[i]}`
}

function ensureBackupsDir(): void {
  if (!existsSync(BACKUPS_DIR)) {
    mkdirSync(BACKUPS_DIR, { recursive: true })
  }
}

/**
 * Validates that a filename is safe and resolves within the backups directory.
 * Prevents path traversal attacks.
 */
function sanitizeFilename(filename: string): string {
  // Extract only the basename (no directory components)
  const clean = basename(filename)

  // Reject empty, dot-files, or suspiciously long names
  if (!clean || clean.startsWith(".") || clean.length > MAX_FILENAME_LENGTH) {
    throw new Error("Nome de arquivo invalido")
  }

  // Only allow expected backup file patterns
  if (!/^backup_\d{4}-\d{2}-\d{2}_\d{6}\.sql\.gz$/.test(clean)) {
    throw new Error("Formato de nome de arquivo nao permitido")
  }

  // Resolve and confirm it stays within BACKUPS_DIR
  const resolved = resolve(BACKUPS_DIR, clean)
  if (!resolved.startsWith(resolve(BACKUPS_DIR))) {
    throw new Error("Caminho de arquivo fora do diretorio de backups")
  }

  return resolved
}

/**
 * Parses DATABASE_URL into pg connection parameters for pg_dump.
 * Supports: postgresql://user:pass@host:port/dbname
 */
function parseDatabaseUrl(): {
  host: string
  port: string
  user: string
  password: string
  database: string
} {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL nao configurada")
  }

  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname || "localhost",
      port: parsed.port || "5432",
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
    }
  } catch {
    throw new Error("DATABASE_URL em formato invalido")
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a compressed database backup using pg_dump + gzip.
 * Returns the filename and size of the created backup.
 */
export function createBackup(): { filename: string; size: number; sizeFormatted: string } {
  ensureBackupsDir()

  const conn = parseDatabaseUrl()
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, "_")
    .replace(/[-:]/g, (m) => (m === "-" ? "-" : ""))
    .replace(/\.\d+Z$/, "")
    // Format: backup_YYYY-MM-DD_HHmmss.sql.gz
    .replace(/_(\d{2})(\d{2})(\d{2})$/, "_$1$2$3")

  // Normalize timestamp to expected format
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const fname = `backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.sql.gz`
  const filepath = join(BACKUPS_DIR, fname)

  // Build pg_dump command with env-based password (PGPASSWORD)
  const cmd = [
    `PGPASSWORD=${shellEscape(conn.password)}`,
    "pg_dump",
    `-h ${shellEscape(conn.host)}`,
    `-p ${shellEscape(conn.port)}`,
    `-U ${shellEscape(conn.user)}`,
    `--no-owner`,
    `--no-acl`,
    shellEscape(conn.database),
    `| gzip > ${shellEscape(filepath)}`,
  ].join(" ")

  try {
    execSync(cmd, { shell: "/bin/sh", timeout: 300_000, stdio: "pipe" })
  } catch (err: any) {
    // Clean up partial file on failure
    try {
      if (existsSync(filepath)) unlinkSync(filepath)
    } catch {
      /* ignore cleanup errors */
    }
    throw new Error(`Falha ao criar backup: ${err.message ?? "erro desconhecido"}`)
  }

  const stats = statSync(filepath)
  return {
    filename: fname,
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
  }
}

/**
 * Lists all backup files with metadata, sorted newest first.
 */
export function listBackups(): BackupFile[] {
  ensureBackupsDir()

  const files = readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".sql.gz"))
  const now = Date.now()

  return files
    .map((filename) => {
      const filepath = join(BACKUPS_DIR, filename)
      const stats = statSync(filepath)
      const ageMs = now - stats.mtimeMs
      return {
        filename,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        createdAt: stats.mtime.toISOString(),
        ageInDays: Math.floor(ageMs / (1000 * 60 * 60 * 24)),
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Deletes a backup file. Validates the filename to prevent path traversal.
 */
export function deleteBackup(filename: string): void {
  const filepath = sanitizeFilename(filename)
  if (!existsSync(filepath)) {
    throw new Error("Arquivo de backup nao encontrado")
  }
  unlinkSync(filepath)
}

/**
 * Removes backups older than the specified number of days.
 * Returns the count of deleted files.
 */
export function cleanupOldBackups(keepDays: number = 7): number {
  const backups = listBackups()
  let deleted = 0

  for (const backup of backups) {
    if (backup.ageInDays > keepDays) {
      try {
        const filepath = join(BACKUPS_DIR, basename(backup.filename))
        if (existsSync(filepath)) {
          unlinkSync(filepath)
          deleted++
        }
      } catch {
        /* skip files that fail to delete */
      }
    }
  }

  return deleted
}

/**
 * Returns aggregated stats about all available backups.
 */
export function getBackupStats(): BackupStats {
  const backups = listBackups()
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0)

  return {
    totalBackups: backups.length,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    lastBackupDate: backups.length > 0 ? backups[0].createdAt : null,
  }
}

// ---------------------------------------------------------------------------
// Shell escape helper
// ---------------------------------------------------------------------------

function shellEscape(str: string): string {
  // Wrap in single quotes, escape any embedded single quotes
  return "'" + str.replace(/'/g, "'\\''") + "'"
}
