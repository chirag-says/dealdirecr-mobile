import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, useTheme } from '@/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/**
 * The bottom bar: four destinations either side of a raised Post action.
 *
 * ---------------------------------------------------------------------------
 * WHY THE CENTRE BUTTON IS NOT A TAB
 *
 * Posting a property is a TASK, not a place. It opens a form, it is finished
 * or abandoned, and it has no state to come back to — so it has no business
 * holding a destination slot next to Home and Saved, which do. Rendering it
 * as a raised button rather than a fifth tab says that: it is the one control
 * here that starts something instead of navigating somewhere.
 *
 * It is drawn outside the tab list entirely and never receives a focus state,
 * so `state.index` continues to describe the four real destinations.
 *
 * ---------------------------------------------------------------------------
 * WHERE MESSAGES WENT
 *
 * The design this implements shows Home, Search, Post, Saved, Profile — five
 * slots, four of them destinations. This app has five destinations; Messages
 * is the one with nowhere to sit.
 *
 * It is NOT removed. The `chat` route still exists and is registered; it is
 * reached from the header on Home, which also carries its unread dot (see
 * `features/home/components/Hero.tsx`). That is a real demotion for a
 * marketplace where a deal happens in the thread, and it is the honest cost of
 * a five-slot bar with a task in the middle. Restoring it is one entry here
 * and one line in `_layout.tsx` — the alternative is six slots, which is about
 * 58pt each on a 360pt phone and below a comfortable target.
 */

/** Routes drawn in the bar, in order, with the gap for the action between. */
const LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Home', icon: 'home-outline' },
  search: { label: 'Search', icon: 'search-outline' },
  saved: { label: 'Saved', icon: 'heart-outline' },
  profile: { label: 'Profile', icon: 'person-outline' },
};

export interface TabBarProps extends BottomTabBarProps {
  onPost: () => void;
}

export function TabBar({ state, navigation, onPost }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Only the routes this bar draws, in the order declared above. A route
  // registered in the navigator but absent from LABELS (chat) is deliberately
  // skipped rather than rendered unlabelled.
  const visible = state.routes.filter((route) => LABELS[route.name]);
  const half = Math.ceil(visible.length / 2);

  const renderTab = (route: (typeof visible)[number]) => {
    // `visible` was filtered on this same lookup, so it is always present —
    // narrowed rather than asserted so a future route added to the filter but
    // not to LABELS fails here instead of rendering a blank slot.
    const spec = LABELS[route.name];
    if (!spec) return null;

    const focused = state.routes[state.index]?.key === route.key;

    return (
      <PressableScale
        key={route.key}
        accessibilityLabel={spec.label}
        accessibilityState={focused ? { selected: true } : {}}
        activeScale={0.92}
        onPress={() => {
          // `navigate` rather than a raw dispatch, so tapping the active tab
          // pops its stack to the root instead of pushing a duplicate.
          if (!focused) navigation.navigate(route.name);
        }}
        style={{
          flex: 1,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <Ionicons
          name={focused ? (spec.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : spec.icon}
          size={23}
          color={focused ? theme.colors.brand : theme.colors.textMuted}
        />
        <Text
          variant="caption"
          style={{
            color: focused ? theme.colors.brand : theme.colors.textMuted,
            fontWeight: focused ? '600' : '400',
          }}
        >
          {spec.label}
        </Text>

        {/* The active marker. A short rule under the label rather than a
            filled pill behind it, so the bar stays light. */}
        <View
          style={{
            marginTop: 2,
            width: 16,
            height: 2,
            borderRadius: radius.full,
            backgroundColor: focused ? theme.colors.brand : 'transparent',
          }}
        />
      </PressableScale>
    );
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: spacing.sm,
        // Background extends behind the home indicator; content does not.
        paddingBottom: Math.max(spacing.sm, insets.bottom),
        paddingHorizontal: spacing.xs,
      }}
    >
      {visible.slice(0, half).map(renderTab)}

      {/*
        The action sits in its own fixed-width column so the four tabs stay
        evenly distributed either side of it. It is NOT absolutely positioned:
        the column reserves the space, which is what keeps the button off the
        labels on a narrow screen.
      */}
      <View style={{ width: 64, alignItems: 'center' }}>
        <PressableScale
          accessibilityLabel="Post a property"
          onPress={onPost}
          activeScale={0.9}
          style={{
            // Rides above the bar's top edge, which is what marks it as the
            // one control here that is not a destination.
            marginTop: -22,
            width: 52,
            height: 52,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.brand,
            shadowColor: theme.colors.brand,
            shadowOpacity: 0.32,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
            // A ring in the page colour, so the circle reads as sitting in
            // front of the bar rather than punched through it.
            borderWidth: 4,
            borderColor: theme.colors.background,
          }}
        >
          <Ionicons name="add" size={26} color={theme.colors.textOnAccent} />
        </PressableScale>

        <Text variant="caption" tone="muted" style={{ marginTop: 1 }}>
          Post
        </Text>
      </View>

      {visible.slice(half).map(renderTab)}
    </View>
  );
}
