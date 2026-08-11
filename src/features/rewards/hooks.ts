/**
 * Rewards: wallet, transactions, referrals and the redemption store.
 *
 * `transactions` and `referrals` are typed loosely in the contract because
 * their controllers spread a service result directly into the envelope (see
 * `src/types/backend/rewards.ts`). The adapters here read defensively —
 * several plausible key names are tried — rather than assuming one, so a
 * screen does not go blank if the actual key differs from the guess until
 * this is pinned down against a live response.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { call, propertiesEndpoints, qk, rewardsEndpoints } from '@/api';
import { useAuth } from '@/auth';
import type { ObjectId } from '@/types/backend/common';
import type { RedeemRewardRequest, RewardTransaction, StoreReward } from '@/types/backend/rewards';

export function useWallet() {
  const { status } = useAuth();
  const enabled = status === 'authenticated';

  const query = useQuery({
    queryKey: qk.rewardsWallet(),
    queryFn: async () => {
      const response = await call(rewardsEndpoints.wallet);
      return response.wallet;
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    wallet: query.data ?? null,
    balance: query.data?.balance ?? 0,
    isLoading: enabled && query.isPending,
    error: query.error,
    refresh: () => void query.refetch(),
    requiresAuth: !enabled,
  };
}

/** Reads whichever array-shaped key the spread service result actually used. */
function pickTransactions(response: Record<string, unknown>): RewardTransaction[] {
  const candidate = response.transactions ?? response.data ?? response.history;
  return Array.isArray(candidate) ? (candidate as RewardTransaction[]) : [];
}

export function useTransactions() {
  const { status } = useAuth();
  const enabled = status === 'authenticated';

  const query = useQuery({
    queryKey: qk.rewardsTransactions(),
    queryFn: async () => {
      const response = await call(rewardsEndpoints.transactions, { data: { limit: 50 } });
      return pickTransactions(response as unknown as Record<string, unknown>);
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    transactions: query.data ?? [],
    isLoading: enabled && query.isPending,
    isRefreshing: query.isRefetching,
    error: query.error,
    refresh: () => void query.refetch(),
  };
}

export function useReferral() {
  const { status } = useAuth();
  const enabled = status === 'authenticated';

  const codeQuery = useQuery({
    queryKey: qk.rewardsReferralCode(),
    queryFn: () => call(rewardsEndpoints.referralCode),
    enabled,
    staleTime: 60_000,
  });

  const statsQuery = useQuery({
    queryKey: qk.rewardsReferrals(),
    queryFn: () => call(rewardsEndpoints.referrals),
    enabled,
    staleTime: 60_000,
  });

  return {
    referralCode: codeQuery.data?.referralCode ?? null,
    // Points at the WEBSITE (built from the backend's CLIENT_URL), not a deep
    // link. Share it as-is.
    referralLink: codeQuery.data?.referralLink ?? null,
    totalReferred: statsQuery.data?.totalReferred ?? 0,
    totalPointsEarned: statsQuery.data?.totalPointsEarned ?? 0,
    isLoading: enabled && (codeQuery.isPending || statsQuery.isPending),
    error: codeQuery.error ?? statsQuery.error,
  };
}

export function useRewardsStore() {
  const query = useQuery({
    queryKey: qk.rewardsStore(),
    queryFn: async () => {
      const response = await call(rewardsEndpoints.store);
      return response.rewards;
    },
    staleTime: 5 * 60_000,
  });

  return {
    rewards: query.data ?? ([] as StoreReward[]),
    isLoading: query.isPending,
    error: query.error,
    refresh: () => void query.refetch(),
  };
}

/**
 * A business-rule failure (insufficient balance, etc.) is a normal HTTP 400
 * with `success:false`, not a thrown exception distinct from a real error —
 * `call()` still rejects on it, so callers branch on `ApiError.message` the
 * same way as any other 400.
 */
export function useRedeemReward() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: RedeemRewardRequest) => call(rewardsEndpoints.redeem, { data: request }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.rewardsWallet() });
      void queryClient.invalidateQueries({ queryKey: qk.rewardsTransactions() });
    },
  });

  return {
    redeem: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Claims the reward for an approved close-deal verification — the other half
 * of `useCloseDeal` (`features/listings`). Reached from a `deal_reward`
 * notification (see `features/notifications/targets.ts`), never from a
 * standing list: there is no "my verifications" endpoint on this backend, so
 * the notification IS the only route to a claimable reward.
 */
export function useClaimDealReward() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (verificationId: ObjectId) =>
      call(propertiesEndpoints.claimDealReward, { params: { verificationId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.rewardsWallet() });
      void queryClient.invalidateQueries({ queryKey: qk.rewardsTransactions() });
    },
  });

  return {
    claim: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
