import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });

  const login = useCallback(
    async (params?: { name?: string; email?: string }) => {
      const res = await loginMutation.mutateAsync(params);
      await utils.auth.me.invalidate();
      return res;
    },
    [loginMutation, utils]
  );

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      utils.auth.me.setData(undefined, null);
    }
  }, [logoutMutation, utils]);

  const user = meQuery.data ?? null;
  const loading = meQuery.isLoading;
  const isAuthenticated = Boolean(user);

  return useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      login,
      logout,
      refetch: meQuery.refetch,
    }),
    [user, loading, isAuthenticated, login, logout, meQuery.refetch]
  );
}
