import '../global.css';
import 'react-native-gesture-handler';

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createQueryClient, PERSIST_MAX_AGE, queryPersister, shouldPersistQuery } from '@/api';
import { AuthProvider } from '@/auth';
import { PushBridge } from '@/notifications';
import { SocketProvider } from '@/socket';
import { ThemeProvider } from '@/theme';
import { OfflineBanner } from '@/ui';

// Held open until DM Sans (loaded for the Home redesign, see `theme/fonts.ts`)
// is ready, so Home never flashes the system face before swapping to it.
void SplashScreen.preventAutoHideAsync();

/**
 * Root layout and provider stack.
 *
 * Order matters:
 *   GestureHandlerRootView    must wrap anything using a gesture
 *   SafeAreaProvider          must sit above anything reading insets
 *   PersistQueryClientProvider must sit above AuthProvider, which clears the cache
 *   AuthProvider              must sit above every screen that reads the session
 *   SocketProvider            must sit below AuthProvider, which it reads `status` from
 *
 * The query client is created in state rather than at module scope so a Fast
 * Refresh does not swap it for a new one mid-session and drop the cache.
 *
 * M12: `PersistQueryClientProvider` replaces the plain `QueryClientProvider`
 * and rehydrates the cache from MMKV (`src/api/persistence.ts`) before first
 * paint, so a cold start with no connectivity still shows the last-known
 * properties/projects/leads/etc. rather than a blank loading screen. Chat is
 * excluded — see `shouldPersistQuery`'s doc comment for why.
 */
export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const onLayout = useCallback(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: PERSIST_MAX_AGE,
            dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
          }}
        >
          <ThemeProvider>
            <AuthProvider>
              <SocketProvider>
                <PushBridge />
                <StatusBar style="auto" />
                {/*
                  Only routes needing non-default options are declared. Every
                  other file under app/ is picked up automatically.

                  `property` and `chat` were declared here in M1 and warned on
                  every render: neither is a route node. Without an
                  `app/property/_layout.tsx` the children register under their own
                  full names (`property/[id]/index`, `property/[id]/gallery`,
                  `property/[id]/map`, `chat/[conversationId]`), so the parent
                  names matched nothing and their options were discarded. They
                  also asked for `presentation: 'card'`, which is already the
                  default, so the declarations were inert even in principle.
                  Removed rather than propped up with layout files that exist only
                  to make a no-op valid. M4 can add `app/property/_layout.tsx` if
                  it wants gallery and map nested under the detail screen.
                */}
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                </Stack>
                <OfflineBanner />
              </SocketProvider>
            </AuthProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
