import { auth } from "./config";
import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

// Cache the session for the duration of the request
export const getSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  return session;
});

// Get current user with full details
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  
  if (!session?.user) {
    return null;
  }
  
  return session.user;
});

// Require authentication - throws if not authenticated
export async function requireAuth() {
  const session = await getSession();
  
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  return session;
}

// Require specific role
export async function requireRole(role: string | string[]) {
  const session = await requireAuth();
  
  const roles = Array.isArray(role) ? role : [role];
  
  if (!roles.includes(session.user.role)) {
    throw new Error(`Forbidden: Required role ${roles.join(" or ")}`);
  }
  
  return session;
}

// Require specific permission
export async function requirePermission(permission: string) {
  const session = await requireAuth();
  
  const user = session.user as any;
  
  if (!user[permission]) {
    throw new Error(`Forbidden: Missing permission ${permission}`);
  }
  
  return session;
}

// Role hierarchy for permission checking
const roleHierarchy: Record<string, number> = {
  ADMIN: 100,
  MANAGER: 80,
  SUPERVISOR: 60,
  ENGINEER: 50,
  ACCOUNTANT: 40,
  HR_ANALYST: 40,
  SAFETY_OFFICER: 30,
  USER: 10,
};

// Require minimum role level
export async function requireMinimumRole(minimumRole: string) {
  const session = await requireAuth();
  
  const userLevel = roleHierarchy[session.user.role] || 0;
  const requiredLevel = roleHierarchy[minimumRole] || 0;
  
  if (userLevel < requiredLevel) {
    throw new Error(`Forbidden: Required minimum role ${minimumRole}`);
  }
  
  return session;
}

// Check if user has role (returns boolean)
export async function hasRole(role: string | string[]): Promise<boolean> {
  try {
    await requireRole(role);
    return true;
  } catch {
    return false;
  }
}

// Check if user has permission (returns boolean)
export async function hasPermission(permission: string): Promise<boolean> {
  try {
    await requirePermission(permission);
    return true;
  } catch {
    return false;
  }
}

// Check if user has minimum role (returns boolean)
export async function hasMinimumRole(minimumRole: string): Promise<boolean> {
  try {
    await requireMinimumRole(minimumRole);
    return true;
  } catch {
    return false;
  }
}

// Audit log helper
export async function createAuditLog(data: {
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: any;
}) {
  const session = await getSession();
  const headersList = await headers();
  
  const ipAddress = headersList.get("x-forwarded-for") || 
                    headersList.get("x-real-ip") || 
                    "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";
  
  await db.insert(auditLogs).values({
    userId: session?.user?.id,
    action: data.action,
    resource: data.resource,
    resourceId: data.resourceId,
    ipAddress,
    userAgent,
    metadata: data.metadata,
  });
}

// Organization helpers
export async function requireOrganization() {
  const session = await requireAuth();
  
  if (!session.user.activeOrganization) {
    throw new Error("No active organization");
  }
  
  return session.user.activeOrganization;
}

export async function requireOrganizationRole(role: string | string[]) {
  const organization = await requireOrganization();
  const session = await getSession();
  
  const roles = Array.isArray(role) ? role : [role];
  
  if (!roles.includes(organization.role)) {
    throw new Error(`Forbidden: Required organization role ${roles.join(" or ")}`);
  }
  
  return { session, organization };
}

// Two-factor authentication helpers
export async function requireTwoFactor() {
  const session = await requireAuth();
  
  if (!session.user.twoFactorEnabled) {
    throw new Error("Two-factor authentication required");
  }
  
  return session;
}

// Admin impersonation helpers
export async function isImpersonating() {
  const session = await getSession();
  return session?.impersonatedBy !== undefined;
}

export async function getImpersonator() {
  const session = await getSession();
  return session?.impersonatedBy;
}

// Session management
export async function invalidateAllSessions(userId: string) {
  await auth.api.invalidateAllSessions({
    body: { userId },
    headers: await headers(),
  });
}

export async function invalidateSession(sessionId: string) {
  await auth.api.invalidateSession({
    body: { sessionId },
    headers: await headers(),
  });
}

// Rate limiting helper
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 60
): Promise<{ success: boolean; remaining: number }> {
  // This is a simple in-memory rate limiter
  // For production, use Redis or similar
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  
  // TODO: Implement proper rate limiting with Redis
  // For now, return success
  return { success: true, remaining: limit };
}

// Export auth instance for direct API access
export { auth };
