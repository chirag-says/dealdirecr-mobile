import React from 'react';
import { Pressable, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Surface container.
 *
 * Shadow values come from the elevation tokens rather than being written per
 * call site, so an iOS shadow and an Android elevation stay visually matched
 * despite being different underlying properties.
 */

export type CardRadius = 'md' | 'lg' | 'xl' | '2xl';

const radiusClass: Record<CardRadius, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

export interface CardProps extends ViewProps {
  onPress?: () => void;
  /** Flat cards read as grouped rows; raised cards read as separate objects. */
  raised?: boolean;
  /**
   * Hairline outline.
   *
   * On by default only because it is what every existing call site already
   * gets. Prefer `bordered={false}`: the page sits one step down the neutral
   * ramp from `surface` precisely so a raised surface can separate by being
   * brighter than its background, and a card that has both a border and a
   * shadow is stating its edge twice.
   */
  bordered?: boolean;
  /** Larger surfaces take larger radii. See the radius tokens. */
  radius?: CardRadius;
  className?: string;
}

export function Card({
  onPress,
  raised = true,
  bordered = true,
  radius = 'lg',
  className = '',
  children,
  ...rest
}: CardProps) {
  const theme = useTheme();
  const { card } = theme.elevation;

  const shadowStyle = raised
    ? {
        shadowColor: '#000',
        shadowOpacity: card.shadowOpacity,
        shadowRadius: card.shadowRadius,
        shadowOffset: { width: 0, height: card.shadowOffsetY },
        elevation: card.elevation,
      }
    : undefined;

  const content = (
    <View
      className={[
        radiusClass[radius],
        bordered ? 'border border-border' : '',
        'bg-surface',
        className,
      ].join(' ')}
      style={shadowStyle}
      {...rest}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
    >
      {content}
    </Pressable>
  );
}
