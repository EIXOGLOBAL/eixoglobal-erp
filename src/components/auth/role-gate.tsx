"use client";

import { hasRole, hasPermission, hasMinimumRole } from "@/lib/auth/client";
import { useSession } from "@/lib/auth/client";

interface RoleGateProps {
  children: React.ReactNode;
  role?: string | string[];
  permission?: string;
  minimumRole?: string;
  fallback?: React.ReactNode;
}

export function RoleGate({
  children,
  role,
  permission,
  minimumRole,
  fallback = null,
}: RoleGateProps) {
  const { data: session } = useSession();

  if (!session) {
    return <>{fallback}</>;
  }

  // Check role
  if (role && !hasRole(session, role)) {
    return <>{fallback}</>;
  }

  // Check permission
  if (permission && !hasPermission(session, permission)) {
    return <>{fallback}</>;
  }

  // Check minimum role
  if (minimumRole && !hasMinimumRole(session, minimumRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
