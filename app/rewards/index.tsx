import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';

import { ApiError } from '@/api';
import { useAuth } from '@/auth';
import { useReferral, useRedeemReward, useRewardsStore, useTransactions, useWallet } from '@/features/rewards';
import { useTheme } from '@/theme';
import type { RewardTransaction, StoreReward } from '@/types/backend/rewards';
import { Badge, Button, Card, EmptyState, Refreshable, Screen, Skeleton, Text } from '@/ui';

/**
 * Rewards: wallet, transactions, referrals and the store, one screen.
 *
 * `transactions` and `referrals` read from a service result spread directly
 * into the envelope (see the rewards feature hooks), so a missing or
 * differently-named field degrades to an empty section rather than a crash.
 */
export default function RewardsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { status } = useAuth();

  const wallet = useWallet();
  const transactions = useTransactions();
  const referral = useReferral();
  const store = useRewardsStore();

  if (status !== 'authenticated') {
    return (
      <Screen>
        <EmptyState
          title="Sign in to see your rewards"
          description="Earn points for reporting listings and referring friends."
          actionLabel="Sign in"
          onAction={() => router.push('/(auth)/login')}
        />
      </Screen>
    );
  }

  const isRefreshing = wallet.isLoading || transactions.isRefreshing;

  return (
    <Screen>
      <View className="flex-row items-center px-lg pt-md pb-sm">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
          hitSlop={12}
          className="mr-sm -ml-xs h-9 w-9 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="title2">Rewards</Text>
      </View>

      <Refreshable
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshing={isRefreshing}
        onRefresh={() => {
          wallet.refresh();
          transactions.refresh();
        }}
      >
        <Card className="items-center py-lg">
          <Text variant="footnote" tone="secondary">
            Your balance
          </Text>
          {wallet.isLoading ? (
            <Skeleton width={120} height={36} className="mt-sm" />
          ) : (
            <Text variant="display" className="mt-xs">
              {wallet.balance.toLocaleString('en-IN')}
            </Text>
          )}
          <Text variant="caption" tone="muted">
            points
          </Text>
        </Card>

        <ReferralCard
          code={referral.referralCode}
          link={referral.referralLink}
          totalReferred={referral.totalReferred}
        />

        <StoreSection rewards={store.rewards} isLoading={store.isLoading} />

        <TransactionsSection
          transactions={transactions.transactions}
          isLoading={transactions.isLoading}
        />
      </Refreshable>
    </Screen>
  );
}

function ReferralCard({
  code,
  link,
  totalReferred,
}: {
  code: string | null;
  link: string | null;
  totalReferred: number;
}) {
  const handleShare = () => {
    if (!link && !code) return;
    void Share.share({
      message: link
        ? `Join DealDirect and skip the brokerage. Use my code ${code ?? ''}: ${link}`
        : `Join DealDirect and skip the brokerage. Use my referral code: ${code}`,
    });
  };

  return (
    <Card className="mt-base">
      <Text variant="bodyEmphasis">Invite friends</Text>
      <Text variant="footnote" tone="secondary" className="mt-xs mb-base">
        {totalReferred > 0
          ? `${totalReferred} friend${totalReferred === 1 ? '' : 's'} joined so far.`
          : 'Earn points when someone signs up with your code.'}
      </Text>

      {code ? (
        <View className="mb-base flex-row items-center justify-between rounded-lg bg-surface-muted px-base py-sm">
          <Text variant="bodyEmphasis" className="tracking-wide">
            {code}
          </Text>
          <Ionicons name="share-outline" size={18} color="#6B7280" />
        </View>
      ) : null}

      <Button label="Share invite" variant="secondary" onPress={handleShare} disabled={!code} />
    </Card>
  );
}

function StoreSection({ rewards, isLoading }: { rewards: StoreReward[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <View className="mt-lg">
        <Text variant="title3" className="mb-base">
          Redeem
        </Text>
        <Skeleton height={80} radius={12} />
      </View>
    );
  }

  if (rewards.length === 0) return null;

  return (
    <View className="mt-lg">
      <Text variant="title3" className="mb-base">
        Redeem
      </Text>
      {rewards.map((reward) => (
        <StoreRewardRow key={reward.slug ?? reward.name} reward={reward} />
      ))}
    </View>
  );
}

function StoreRewardRow({ reward }: { reward: StoreReward }) {
  const { redeem, isPending, error, reset } = useRedeemReward();
  const [redeemedSlug, setRedeemedSlug] = useState<string | null>(null);

  const handleRedeem = () => {
    if (!reward.slug) return;

    Alert.alert(
      reward.name ?? 'Redeem reward',
      `Redeem for ${reward.points ?? '—'} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            reset();
            try {
              await redeem({ rewardSlug: reward.slug! });
              setRedeemedSlug(reward.slug!);
            } catch {
              // surfaced via `error` below
            }
          },
        },
      ]
    );
  };

  return (
    <Card className="mb-base flex-row items-center justify-between">
      <View className="flex-1 pr-base">
        <Text variant="bodyEmphasis">{reward.name ?? 'Reward'}</Text>
        <Text variant="footnote" tone="secondary" className="mt-xs">
          {reward.points ?? '—'} points
        </Text>
        {redeemedSlug === reward.slug ? (
          <Badge label="Redeemed" tone="success" className="mt-xs" />
        ) : null}
        {error instanceof ApiError && redeemedSlug !== reward.slug ? (
          <Text variant="footnote" tone="danger" className="mt-xs">
            {error.message}
          </Text>
        ) : null}
      </View>
      <Button
        label="Redeem"
        size="sm"
        variant="secondary"
        loading={isPending}
        disabled={!reward.slug || redeemedSlug === reward.slug}
        onPress={handleRedeem}
      />
    </Card>
  );
}

function TransactionsSection({
  transactions,
  isLoading,
}: {
  transactions: RewardTransaction[];
  isLoading: boolean;
}) {
  return (
    <View className="mt-lg">
      <Text variant="title3" className="mb-base">
        Activity
      </Text>
      {isLoading ? (
        <Skeleton height={56} radius={12} />
      ) : transactions.length === 0 ? (
        <Text variant="callout" tone="secondary">
          No activity yet.
        </Text>
      ) : (
        transactions.map((tx, index) => <TransactionRow key={tx._id ?? index} tx={tx} />)
      )}
    </View>
  );
}

function TransactionRow({ tx }: { tx: RewardTransaction }) {
  const points = typeof tx.points === 'number' ? tx.points : 0;
  const positive = points >= 0;

  return (
    <View className="mb-sm flex-row items-center justify-between border-b border-border pb-sm">
      <View className="flex-1 pr-base">
        <Text variant="body">{tx.description ?? tx.type ?? 'Transaction'}</Text>
        {tx.createdAt ? (
          <Text variant="caption" tone="muted">
            {new Date(tx.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </Text>
        ) : null}
      </View>
      <Text variant="bodyEmphasis" tone={positive ? 'success' : 'danger'}>
        {positive ? '+' : ''}
        {points}
      </Text>
    </View>
  );
}
