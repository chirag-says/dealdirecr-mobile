import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { gesture, useTheme } from '@/theme';
import { Text } from '@/ui';

/**
 * A titled Home section, with an optional "View all".
 *
 * Home is a stack of these, so the heading treatment, the gap above it and the
 * action alignment are decided once. Repeating that per section is how the
 * fourth one ends up 4px off and the page starts reading as assembled rather
 * than designed.
 *
 * The action is a real target with a chevron, not bare coloured text: on a
 * screen that is entirely navigation, the affordance has to be unambiguous.
 *
 * "View all" reads in `textPrimary`, not the app's blue `accent`. Blue is the
 * action colour everywhere else in the app; on Home it would be the second
 * colour competing with the brand red for attention, on a screen whose brief
 * is a restrained, mostly-red-mostly-neutral palette. The chevron alone
 * carries a hint of brand red, which is enough to mark the row as tappable
 * without spending a second hue on it.
 */

export interface SectionProps {
  title: string;
  /** Optional one-line clarification under the title. */
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}

export function Section({ title, subtitle, actionLabel, onAction, children }: SectionProps) {
  const theme = useTheme();

  return (
    <View className="pt-2xl">
      <View className="flex-row items-center justify-between px-lg">
        <View className="flex-1 pr-md">
          <Text variant="title2">{title}</Text>
          {subtitle ? (
            <Text variant="subhead" tone="muted" className="mt-xs">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel}, ${title}`}
            hitSlop={gesture.hitSlop}
            onPress={onAction}
            className="flex-row items-center"
            style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
          >
            <Text variant="callout" style={{ color: theme.colors.brand, fontWeight: '600' }}>
              {actionLabel}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.brand} />
          </Pressable>
        ) : null}
      </View>

      <View className="pt-md">{children}</View>
    </View>
  );
}
