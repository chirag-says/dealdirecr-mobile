import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { LEAD_STATUSES, statusLabel, statusTone, useLeads } from '@/features/leads';
import { useTheme } from '@/theme';
import type { Lead, LeadStatus } from '@/types/backend/lead';
import { Avatar, Badge, Card, Chip, EmptyState, ErrorState, PriceLabel, Screen, Skeleton, Text } from '@/ui';

/** The stats block's shape, read from `leadController.getLeads`. */
interface LeadStats {
  total?: number;
  today?: number;
  new?: number;
}

export default function LeadsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [filter, setFilter] = useState<LeadStatus | undefined>(undefined);
  const { leads, stats, isLoading, isRefreshing, isFetchingMore, error, refresh, loadMore } =
    useLeads(filter);

  const s = (stats ?? {}) as LeadStats;

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
        <Text variant="title2">Leads</Text>
      </View>

      {stats ? (
        <View className="flex-row px-lg pb-base">
          <StatPill label="Total" value={s.total ?? 0} />
          <StatPill label="New" value={s.new ?? 0} />
          <StatPill label="Today" value={s.today ?? 0} />
        </View>
      ) : null}

      <FlatList
        data={[undefined, ...LEAD_STATUSES] as (LeadStatus | undefined)[]}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item ?? 'all'}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
        renderItem={({ item }) => (
          <Chip
            label={item ? statusLabel(item) : 'All'}
            selected={filter === item}
            onPress={() => setFilter(item)}
            className="mr-sm"
          />
        )}
      />

      {isLoading ? (
        <View className="px-lg">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={88} className="mb-base" radius={12} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Could not load leads" onRetry={refresh} />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="When a buyer marks interest in your listing, they will show up here."
        />
      ) : (
        <FlashList
          data={leads}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          refreshing={isRefreshing}
          onRefresh={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingMore ? <Skeleton height={88} radius={12} /> : null}
          renderItem={({ item }) => <LeadRow lead={item} onPress={() => router.push(`/owner/leads/${item._id}`)} />}
        />
      )}
    </Screen>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View className="mr-base items-center">
      <Text variant="title3">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function LeadRow({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const property = typeof lead.property === 'object' ? lead.property : undefined;
  const title = property?.title ?? lead.propertySnapshot?.title ?? 'Listing';
  const price = property?.price ?? lead.propertySnapshot?.price;

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className="mb-base flex-row items-center">
        <Avatar uri={lead.userSnapshot.profileImage} name={lead.userSnapshot.name} />
        <View className="ml-base flex-1">
          <View className="flex-row items-center justify-between">
            <Text variant="bodyEmphasis" numberOfLines={1} className="flex-1 pr-sm">
              {lead.userSnapshot.name}
            </Text>
            {!lead.isViewed ? <Badge label="New" tone="accent" /> : null}
          </View>
          <Text variant="footnote" tone="secondary" numberOfLines={1}>
            {title}
          </Text>
          <View className="mt-xs flex-row items-center justify-between">
            {price ? <PriceLabel price={price} variant="footnote" /> : <View />}
            <Badge label={lead.status} tone={statusTone(lead.status)} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
