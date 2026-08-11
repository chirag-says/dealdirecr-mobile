/**
 * DM Sans, scoped to the Home redesign.
 *
 * Every other screen in the app deliberately leaves `fontFamily` unset so iOS
 * and Android resolve their own system face (see `typography.ts`). Home's
 * brief calls for DM Sans specifically, as a one-screen brand statement rather
 * than an app-wide typeface change, so the mapping lives here and is consumed
 * only by `features/home/components/HomeText`, never by the base `Text`
 * primitive.
 *
 * Keyed by weight rather than by usage, so any `typography` token can resolve
 * its DM Sans face by reading its own `fontWeight` — see `HomeText`.
 */

export const dmSans = {
  '400': 'DMSans_400Regular',
  '500': 'DMSans_500Medium',
  '600': 'DMSans_600SemiBold',
  '700': 'DMSans_700Bold',
} as const;

export type DMSansWeight = keyof typeof dmSans;

/** Passed to `useFonts` in the root layout. */
export { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
