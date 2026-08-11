import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter } from 'expo-router';

import { TabBar } from '@/ui';

/**
 * Tab shell.
 *
 * The bar itself is `ui/TabBar` — four destinations either side of a raised
 * Post action. See that file for why posting is not a tab, and for where
 * Messages went.
 *
 * `chat` stays REGISTERED here even though the bar does not draw it. Removing
 * the screen would break every `router.push('/chat/...')` in the app and the
 * notification deep link with it; `href: null` only removes it from the bar's
 * route list, which `TabBar` already filters for anyway. Belt and braces, and
 * the cheaper of the two to get wrong.
 *
 * The owner surface (listings, leads, agreements) is NOT a tab. It is reached
 * from Profile, because it applies only to accounts with the `owner` role and
 * a permanently disabled tab would be worse than no tab.
 */
export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} onPost={() => router.push('/owner/property/new')} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
