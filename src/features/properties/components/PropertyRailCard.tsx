import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback } from 'react';
import { View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';
import { Image, PressableScale, PriceLabel, Text } from '@/ui';
import type { PropertySummary } from '../types';

/**
 * The card used in every horizontal rail on Home.
 *
 * Distinct from `PropertyCard`, which is the full-width one on the browse
 * screen. They are genuinely different problems: the browse card has the whole
 * screen width and sits in a vertical list where the photo alone separates one
 * row from the next, so it needs no container. This one sits in a rail, where
 * a container is what makes a card feel like an object you could pick up.
 *
 * A hairline border rather than a shadow. The Home redesign's brief is
 * explicit about restraint — minimal borders, almost no shadow — and a soft
 * drop shadow under every card in a rail of eight is a small cost repeated
 * often enough to read as "generated app" rather than "designed one". A 1px
 * `border` costs nothing at scroll and separates the card from the page just
 * as clearly.
 *
 * ---------------------------------------------------------------------------
 * THE HEART IS OPT-IN, AND IT IS NOT A BOOKMARK
 *
 * This card originally had no favourite control at all, because the version it
 * was ported from called `POST /api/users/save-property`, a route that does
 * not exist in this backend.
 *
 * There IS a working list, and the heart now drives it — but it does not mean
 * what a heart usually means, and that is worth stating where the control
 * lives. `POST /properties/interested/:id` pushes the user into the listing's
 * `interestedUsers`, CREATES A LEAD FOR THE OWNER, and EMAILS THEM. The
 * owner receives the user's name, email and phone. The backend also caps the
 * list at five across the whole app and rejects the sixth.
 *
 * So a tap here is not private, not free, and not unlimited — which is the
 * opposite of every one of a heart's usual connotations. See
 * `features/properties/interest.ts` for the full argument.
 *
 * It is therefore OPT-IN: no `onToggleSave`, no heart. The browse and detail
 * surfaces keep the labelled button with its consequence copy, which is the
 * honest control. Home renders the heart because the design calls for it, and
 * the caller owns that decision rather than this component making it silently.
 */

const IMAGE_HEIGHT = 180;

/**
 * The fields this card actually draws, and nothing more.
 *
 * Deliberately NOT `PropertySummary`. Two different things feed these rails: a
 * live `PropertySummary` from the API, and a `ViewedProperty` replayed from
 * disk, which stores only the handful of fields needed to redraw the card (see
 * `recentlyViewed.ts` for why it snapshots instead of refetching).
 *
 * Typing the prop as the full summary would force the history row to fabricate
 * a dozen fields it never captured, or to cast the difference away. A
 * structural subset lets both satisfy the same contract honestly, and it
 * documents the card's real dependencies: adding a field here is a deliberate
 * act that immediately shows which callers cannot supply it.
 */
export type RailProperty = Pick<
  PropertySummary,
  'id' | 'title' | 'priceRupees' | 'intent' | 'coverImage' | 'locationLabel'
> &
  Partial<
    Pick<
      PropertySummary,
      'bhk' | 'bedrooms' | 'propertyTypeName' | 'subcategoryName' | 'areaSqft' | 'bathrooms'
    >
  >;

export interface PropertyRailCardProps {
  property: RailProperty;
  /** Supplied by `Rail`, so the card and the snap interval cannot disagree. */
  width: number;
  onPress: (id: string) => void;
  /** Filled heart. Ignored unless `onToggleSave` is also supplied. */
  saved?: boolean;
  /**
   * Omit to hide the heart entirely. Supplying it is a statement that this
   * surface accepts what the action actually does — see the note above.
   */
  onToggleSave?: (id: string) => void;
}

/** "3 BHK Apartment", the card's second-most scanned fact after price. */
function typeLine(property: RailProperty): string | undefined {
  const bhk = property.bhk
    ? (/bhk/i.test(property.bhk) ? property.bhk : `${property.bhk} BHK`)
    : property.bedrooms
      ? `${property.bedrooms} BHK`
      : undefined;

  // `propertyTypeName` and never the populated `propertyType` ref: the
  // denormalised string is correct on every live listing, the ref is null or
  // points at the wrong document on all of them.
  const type = property.propertyTypeName ?? property.subcategoryName;

  return [bhk, type].filter(Boolean).join(' ') || undefined;
}

/** One icon-and-label pair on the card's bottom row. */
function MetaFact({
  icon,
  label,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View className="flex-row items-center" style={{ gap: spacing.xs + 1 }}>
      <Ionicons name={icon} size={13} color={theme.colors.textMuted} />
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function PropertyRailCardComponent({
  property,
  width,
  onPress,
  saved = false,
  onToggleSave,
}: PropertyRailCardProps) {
  const theme = useTheme();
  const type = typeLine(property);
  const handlePress = useCallback(() => onPress(property.id), [onPress, property.id]);
  const handleToggleSave = useCallback(
    () => onToggleSave?.(property.id),
    [onToggleSave, property.id]
  );

  return (
    <PressableScale
      accessibilityLabel={property.title}
      onPress={handlePress}
      style={{
        width,
        borderRadius: radius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ height: IMAGE_HEIGHT }}>
        {property.coverImage ? (
          <Image uri={property.coverImage} size="thumb" style={{ width: '100%', height: '100%' }} />
        ) : (
          <View className="h-full w-full items-center justify-center bg-surface-muted">
            <Ionicons name="image-outline" size={26} color={theme.colors.textMuted} />
            <Text variant="caption" tone="muted" className="mt-xs">
              No photo
            </Text>
          </View>
        )}

        {/*
          Near-black rather than a colour-coded fill. An earlier version tinted
          this green for sale and blue for rent, which spent two more hues on a
          screen where red is the only accent. The label carries the
          distinction; the fill exists only so it survives whatever the owner
          photographed behind it, and dark is the one value that works over a
          bright sky and a white wall alike.
        */}
        {property.intent ? (
          <View
            className="absolute"
            style={{
              left: spacing.md,
              top: spacing.md,
              paddingHorizontal: spacing.sm + 2,
              paddingVertical: spacing.xs,
              borderRadius: radius.sm,
              backgroundColor: 'rgba(10,10,10,0.78)',
            }}
          >
            <Text variant="overline" style={{ color: '#FFFFFF' }}>
              {property.intent === 'rent' ? 'FOR RENT' : 'FOR SALE'}
            </Text>
          </View>
        ) : null}

        {onToggleSave ? (
          <PressableScale
            accessibilityLabel={
              saved
                ? `Remove ${property.title} from your interest list`
                : `Tell the owner of ${property.title} you are interested`
            }
            onPress={handleToggleSave}
            style={{
              position: 'absolute',
              right: spacing.md,
              top: spacing.md,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: 'rgba(255,255,255,0.94)',
            }}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={19}
              color={saved ? theme.colors.brand : theme.colors.textPrimary}
            />
          </PressableScale>
        ) : null}
      </View>

      <View style={{ padding: spacing.md }}>
        {/*
          Price first and largest. It is the field a feed is scanned by, and
          the ported original set it below a bolded title, which produced two
          competing dark bars with nowhere for the eye to land.
        */}
        <PriceLabel
          price={property.priceRupees}
          variant="title3"
          suffix={property.intent === 'rent' ? '/mo' : undefined}
        />

        {type ? (
          <Text variant="bodyEmphasis" numberOfLines={1} className="mt-xs">
            {type}
          </Text>
        ) : null}

        <View className="mt-xs flex-row items-center" style={{ gap: spacing.xs }}>
          <Ionicons name="location-outline" size={13} color={theme.colors.brand} />
          <Text variant="footnote" tone="secondary" numberOfLines={1} className="flex-1">
            {property.locationLabel}
          </Text>
        </View>

        {/*
          Each fact gets its own glyph rather than sharing one line of text,
          because area and bathrooms are scanned independently — a buyer
          filtering on size never reads the bath count and vice versa. Absent
          fields drop out entirely rather than rendering a dash, so a listing
          that never captured its area does not advertise the omission.
        */}
        {property.areaSqft || property.bathrooms ? (
          <View className="mt-sm flex-row items-center" style={{ gap: spacing.md }}>
            {property.areaSqft ? (
              <MetaFact
                icon="expand-outline"
                label={`${property.areaSqft.toLocaleString('en-IN')} sq.ft`}
                theme={theme}
              />
            ) : null}

            {property.areaSqft && property.bathrooms ? (
              <View
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: radius.full,
                  backgroundColor: theme.colors.textMuted,
                }}
              />
            ) : null}

            {property.bathrooms ? (
              <MetaFact
                icon="water-outline"
                label={`${property.bathrooms} Bath${property.bathrooms === 1 ? '' : 's'}`}
                theme={theme}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

/** Memoised: this renders once per rail item, multiplied by every rail. */
export const PropertyRailCard = memo(PropertyRailCardComponent);
