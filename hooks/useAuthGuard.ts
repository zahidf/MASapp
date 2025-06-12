import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { useEffect } from "react";

interface UseAuthGuardOptions {
  requireAdmin?: boolean;
  allowDev?: boolean;
}

/**
 * Hook to guard routes that require authentication
 * Redirects unauthenticated users to login screen
 */
export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { requireAdmin = false, allowDev = true } = options;

  const { user } = useAuth();
  const isDev = __DEV__;

  useEffect(() => {
    // In development mode, allow access if allowDev is true
    if (isDev && allowDev) {
      return;
    }

    // Check if user is authenticated
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Check if admin access is required
    if (requireAdmin && !user.isAdmin) {
      router.push("/auth/login");
      return;
    }
  }, [user, requireAdmin, allowDev, isDev]);

  // Return authentication status
  return {
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false,
    isLoading: false, // We could add loading state here if needed
    user,
  };
}
