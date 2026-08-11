import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { statusLabel, statusTone, useLeadAnalytics } from '@/features/leads';
import { useTheme } from '@/theme';
import type { LeadStatus } from '@/types/backend/lead';
import { Badge, Card, ErrorState, Refreshable, Screen, Skeleton, Text } from '@/ui';

/**
 * Lead analytics. No chart library is added for this — the mobile app has
 * none installed, and a dependency for five numbers and a status breakdown
 * is not worth it. Bars are plain `View`s sized by proportion.
 */
export default function AnalyticsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { analytics, isLoading, error, refresh } = useLeadAnalytics(30);

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
        <Text variant="title2">Analytics</Text>
      </View>

      {isLoading ? (
        <View className="px-lg">
          <Skeleton height={300} radius={16} />
        </View>
      ) : error ? (
        <ErrorState title="Could not load analytics" onRetry={refresh} />
      ) : !analytics ? null : (
        <Refreshable contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <View className="mb-base flex-row flex-wrap">
            <SummaryTile label="Total leads" value={analytics.totalLeads} />
            <SummaryTile label="This week" value={analytics.newLeadsThisWeek} />
            <SummaryTile label="Unread" value={analytics.unreadLeads} />
            <SummaryTile
              label="Conversion"
              value={`${Math.round((analytics.conversionRate ?? 0) * 100) / 100}%`}
            />
          </View>

          <Card>
            <Text variant="bodyEmphasis" className="mb-base">
              By status
            </Text>
            <StatusBreakdown statusStats={analytics.statusStats} />
          </Card>

          {analytics.dailyLeads?.length > 0 ? (
            <Card className="mt-base">
              <Text variant="bodyEmphasis" className="mb-base">
                Last 30 days
              </Text>
              <DailyTrend data={analytics.dailyLeads} />
            </Card>
          ) : null}
        </Refreshable>
      )}
    </Screen>
  );
}

function SummaryTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="mb-base mr-base w-[47%]" raised={false}>
      <Text variant="title2">{value}</Text>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
    </Card>
  );
}

function StatusBreakdown({ statusStats }: { statusStats: Partial<Record<LeadStatus, number>> }) {
  const entries = Object.entries(statusStats) as [LeadStatus, number][];
  const max = Math.max(1, ...entries.map(([, count]) => count ?? 0));

  return (
    <View>
      {entries.map(([status, count]) => (
        <View key={status} className="mb-base">
          <View className="mb-xs flex-row items-center justify-between">
            <Badge label={statusLabel(status)} tone={statusTone(status)} />
            <Text variant="footnote" tone="secondary">
              {count ?? 0}
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <View
              className="h-2 rounded-full bg-accent"
              style={{ width: `${Math.max(4, ((count ?? 0) / max) * 100)}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function DailyTrend({ data }: { data: { _id: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const recent = data.slice(-14);

  return (
    <View className="flex-row items-end" style={{ height: 100 }}>
      {recent.map((day) => (
        <View key={day._id} className="mr-xs flex-1 items-center justify-end" style={{ height: '100%' }}>
          <View
            className="w-full rounded-t bg-accent"
            style={{ height: `${Math.max(4, (day.count / max) * 100)}%` }}
          />
        </View>
      ))}
    </View>
  );
}
