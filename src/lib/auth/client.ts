"use client";

import { createAuthClient } from "better-auth/react";
import { 
  twoFactorClient, 
  organizationClient,
  adminClient,
  multiSessionClient,
  oneTapClient,
  usernameClient
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  basePath: "/api/auth",
  
  plugins: [
    twoFactorClient(),
    organizationClient(),
    adminClient(),
    multiSessionClient(),
    oneTapClient({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
    }),
    usernameClient(),
  ],
});

// Export hooks for easy use in components
export const {
  useSession,
  useActiveOrganization,
  useListOrganizations,
  useListSessions,
  signIn,
  signUp,
  signOut,
} = authClient;

// Helper function to check if user has specific role
export function hasRole(session: any, role: string | string[]): boolean {
  if (!session?.user?.role) return false;
  
  if (Array.isArray(role)) {
    return role.includes(session.user.role);
  }
  
  return session.user.role === role;
}

// Helper function to check if user has specific permission
export function hasPermission(session: any, permission: string): boolean {
  if (!session?.user) return false;
  
  const permissions: Record<string, boolean> = {
    canDelete: session.user.canDelete,
    canApprove: session.user.canApprove,
    canManageFinancial: session.user.canManageFinancial,
    canManageUsers: session.user.canManageUsers,
    canManageProjects: session.user.canManageProjects,
    canManageContracts: session.user.canManageContracts,
    canViewReports: session.user.canViewReports,
    canExportData: session.user.canExportData,
    canManageSettings: session.user.canManageSettings,
  };
  
  return permissions[permission] || false;
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

// Check if user has minimum role level
export function hasMinimumRole(session: any, minimumRole: string): boolean {
  if (!session?.user?.role) return false;
  
  const userLevel = roleHierarchy[session.user.role] || 0;
  const requiredLevel = roleHierarchy[minimumRole] || 0;
  
  return userLevel >= requiredLevel;
}

// Check if user is in specific organization
export function isInOrganization(session: any, organizationId: string): boolean {
  if (!session?.user?.activeOrganization) return false;
  return session.user.activeOrganization.id === organizationId;
}

// Check if user has organization role
export function hasOrganizationRole(session: any, role: string): boolean {
  if (!session?.user?.activeOrganization) return false;
  return session.user.activeOrganization.role === role;
}
