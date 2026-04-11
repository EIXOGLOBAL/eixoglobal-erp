import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaintenanceState {
  active: boolean
  reason: string
  enabledAt: string
  enabledBy: string
  estimatedEnd: string | null
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STATE_FILE = join(process.cwd(), "data", "maintenance-state.json")

function ensureDir(): void {
  const dir = dirname(STATE_FILE)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function readState(): MaintenanceState | null {
  try {
    if (!existsSync(STATE_FILE)) return null
    const raw = readFileSync(STATE_FILE, "utf-8")
    return JSON.parse(raw) as MaintenanceState
  } catch {
    return null
  }
}

function writeState(state: MaintenanceState | null): void {
  ensureDir()
  if (state === null) {
    writeFileSync(STATE_FILE, JSON.stringify({ active: false }, null, 2), "utf-8")
  } else {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8")
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enables maintenance mode.
 * @param adminId - ID of the admin user enabling maintenance
 * @param reason  - Human-readable reason displayed to users
 * @param durationMinutes - Optional estimated duration in minutes
 */
export function enableMaintenance(
  adminId: string,
  reason: string,
  durationMinutes?: number
): MaintenanceState {
  const now = new Date()
  const estimatedEnd = durationMinutes
    ? new Date(now.getTime() + durationMinutes * 60_000).toISOString()
    : null

  const state: MaintenanceState = {
    active: true,
    reason: reason || "Manutenção programada do sistema",
    enabledAt: now.toISOString(),
    enabledBy: adminId,
    estimatedEnd,
  }

  writeState(state)
  return state
}

/**
 * Disables maintenance mode.
 * @param adminId - ID of the admin user disabling maintenance (for audit)
 */
export function disableMaintenance(adminId: string): void {
  writeState(null)
}

/**
 * Returns the current maintenance state or null if not in maintenance.
 */
export function getMaintenanceStatus(): MaintenanceState | null {
  const state = readState()
  if (!state || !state.active) return null

  // Auto-disable if estimated end has passed
  if (state.estimatedEnd) {
    const end = new Date(state.estimatedEnd)
    if (end.getTime() < Date.now()) {
      writeState(null)
      return null
    }
  }

  return state
}

/**
 * Quick boolean check: is maintenance mode currently active?
 */
export function isMaintenanceActive(): boolean {
  return getMaintenanceStatus() !== null
}
