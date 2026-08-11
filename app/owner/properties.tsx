import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { adaptProperty } from '@/features/properties';
import { CloseDealSheet, useDeleteListing, useMyProperties } from '@/features/listings';
import { useTheme } from '@/theme';
import type { Property } from '@/types/backend/property';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Image,
  PriceLabel,
  Refreshable,
  Screen,
  Skeleton,
  Text,
} from '@/ui';

/**
 * My listing(s).
 *
 * An owner account is capped at ONE property server-side — see
 * `useMyProperties`'s doc comment — so in practice this renders zero or one
 * card, plural naming aside. Written against the list response anyway, so a
 * future relaxation of that cap needs no change here.
 */
export default function MyPropertiesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { properties, isLoading, isRefreshing, error, refresh } = useMyProperties();
  const { remove, isPending: isDeleting } = useDeleteListing();
  const [closingDeal, setClosingDeal] = useState<Property | null>(null);

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete listing', `Remove "${title}" permanently? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void remove(id),
      },
    ]);
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-lg pt-md pb-sm">
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
            hitSlop={12}
            className="mr-sm -ml-xs h-9 w-9 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text variant="title2">My listing</Text>
        </View>
        {properties.length === 0 && !isLoading ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/owner/property/new')}
            hitSlop={8}
          >
            <Ionicons name="add-circle" size={28} color={theme.colors.accent} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="px-lg">
          <Skeleton height={220} radius={16} />
        </View>
      ) : error ? (
        <ErrorState title="Could not load your listing" onRetry={refresh} />
      ) : properties.length === 0 ? (
        <EmptyState
          title="You have no listing yet"
          description="Owner accounts can post one property. Add yours to start receiving leads."
          actionLabel="Add a listing"
          onAction={() => router.push('/owner/property/new')}
        />
      ) : (
        <Refreshable
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          refreshing={isRefreshing}
          onRefresh={refresh}
        >
          {properties.map((property) => {
            const summary = adaptProperty(property);
            return (
              <Card key={property._id} className="mb-base p-0 overflow-hidden">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/property/${property._id}`)}
                >
                  {summary.coverImage ? (
                    <Image uri={summary.coverImage} size="medium" style={{ height: 180, width: '100%' }} />
                  ) : (
                    <View className="h-[180px] w-full items-center justify-center bg-surface-muted">
                      <Ionicons name="home-outline" size={32} color={theme.colors.textMuted} />
                    </View>
                  )}
                </Pressable>

                <View className="p-base">
                  <View className="mb-xs flex-row items-center justify-between">
                    <Badge
                      label={property.status ?? 'active'}
                      tone={property.status === 'sold' || property.status === 'rented' ? 'success' : 'accent'}
                    />
                    <Text variant="footnote" tone="secondary">
                      {property.views ?? 0} views
                    </Text>
                  </View>

                  <Text variant="bodyEmphasis" numberOfLines={1}>
                    {summary.headline ?? summary.title}
                  </Text>
                  <PriceLabel
                    price={summary.priceRupees}
                    suffix={summary.intent === 'rent' ? '/month' : undefined}
                    className="mt-xs"
                  />

                  <View className="mt-base flex-row">
                    <Button
                      label="Edit"
                      variant="secondary"
                      size="sm"
                      className="mr-sm flex-1"
                      onPress={() => router.push(`/owner/property/${property._id}/edit`)}
                    />
                    <Button
                      label="Delete"
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      loading={isDeleting}
                      onPress={() => handleDelete(property._id, property.title)}
                    />
                  </View>

                  {/* Matches the backend's own gate in `closeDeal`
                      (propertyController.js:2267) exactly, so this button
                      never offers an action the server would 400. */}
                  {!CLOSE_DEAL_BLOCKED_STATUSES.has(property.status ?? 'active') ? (
                    <Button
                      label="Close deal"
                      variant="secondary"
                      size="sm"
                      className="mt-sm"
                      onPress={() => setClosingDeal(property)}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </Refreshable>
      )}

      {closingDeal ? (
        <CloseDealSheet
          visible
          property={closingDeal}
          onClose={() => setClosingDeal(null)}
          onSuccess={() => {
            setClosingDeal(null);
            Alert.alert(
              'Submitted',
              'Your deal closure request has been submitted for admin verification. ' +
                "You'll be notified once it's approved."
            );
            refresh();
          }}
        />
      ) : null}
    </Screen>
  );
}

const CLOSE_DEAL_BLOCKED_STATUSES = new Set(['pending_verification', 'sold', 'rented']);
