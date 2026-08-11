import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { useRevokeSession, useSessions } from '@/features/profile';
import { useTheme } from '@/theme';
import type { UserSessionSummary } from '@/types/backend/user';
import { Badge, Card, EmptyState, ErrorState, Screen, Skeleton, Text } from '@/ui';

/**
 * Active devices. `GET /users/sessions` returns every session that would
 * otherwise be silently trusted, so this is also the recovery path for "I
 * think someone else is signed into my account."
 */
export default function SessionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { sessions, isLoading, isRefreshing, error, refresh } = useSessions();
  const { revoke, pendingId } = useRevokeSession();

  const handleRevoke = (session: UserSessionSummary) => {
    Alert.alert(
      'Sign out this device?',
      `This ends the session on ${describeDevice(session)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => revoke(session.id) },
      ]
    );
  };

  return (
    <Screen>
      <View className="flex-row items-center px-lg pt-md pb-sm">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={12}
          className="mr-sm -ml-xs h-9 w-9 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="title2">Active devices</Text>
      </View>

      {isLoading ? (
        <View className="px-lg">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} className="mb-base" radius={12} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Could not load your devices" onRetry={refresh} />
      ) : sessions.length === 0 ? (
        <EmptyState title="No active sessions" />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          refreshing={isRefreshing}
          onRefresh={refresh}
          renderItem={({ item }) => (
            <Card className="mb-base flex-row items-start justify-between">
              <View className="flex-1 pr-base">
                <View className="flex-row items-center">
                  <Text variant="bodyEmphasis">{describeDevice(item)}</Text>
                  {item.isCurrent ? (
                    <Badge label="This device" tone="accent" className="ml-sm" />
                  ) : null}
                </View>
                <Text variant="footnote" tone="secondary" className="mt-xs">
                  {item.ipAddress} · last active{' '}
                  {new Date(item.lastActivity).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Text>
              </View>

              {!item.isCurrent ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleRevoke(item)}
                  disabled={pendingId === item.id}
                  hitSlop={8}
                >
                  <Text variant="footnote" tone="danger">
                    {pendingId === item.id ? 'Signing out…' : 'Sign out'}
                  </Text>
                </Pressable>
              ) : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

function describeDevice(session: UserSessionSummary): string {
  const { device } = session;
  const platform = device.platform ?? (device.isMobile ? 'Mobile' : 'Desktop');
  return device.browser ? `${platform} · ${device.browser}` : platform;
}
