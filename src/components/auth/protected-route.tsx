"use client";

import { useSession } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push(`${redirectTo}?redirect=${window.location.pathname}`);
    }
  }, [session, isPending, router, redirectTo]);

  // Check role
  if (requiredRole && session?.user) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(session.user.role)) {
      if (fallback) {
        return <>{fallback}</>;
      }
      router.push("/unauthorized");
      return null;
    }
  }

  // Check permission
  if (requiredPermission && session?.user) {
    if (!(session.user as any)[requiredPermission]) {
      if (fallback) {
        return <>{fallback}</>;
      }
      router.push("/unauthorized");
      return null;
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
