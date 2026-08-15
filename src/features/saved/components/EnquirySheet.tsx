import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { spacing, useTheme } from '@/theme';
import { Button, Sheet, Text } from '@/ui';
import { INTEREST_LIMIT } from '../hooks';
import type { SaveToggle } from '../saveToggle';

/**
 * What happens when you enquire, said BEFORE it happens.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A CONFIRMATION, WHICH IS NORMALLY THE WRONG ANSWER
 *
 * The standing rule is that a confirmation dialog is an admission the action
 * cannot be taken back, and the fix is reversibility rather than better
 * wording. That rule assumes reversal is available. Here it is not, and the
 * audit in `saveToggle.ts` says exactly which parts are not: the `Lead`
 * carrying the user's name, email and phone, the owner's notification, and the
 * WhatsApp message all survive a withdrawal.
 *
 * The previous pass shipped the other model — one tap, then a toast with
 * "Undo" — and it failed on both counts. It fired an irreversible disclosure
 * from a heart icon, and then claimed to have undone it.
 *
 * So this states the consequence at the only moment it can be acted on. Three
 * conditions make a confirmation correct here rather than lazy, and all three
 * have to hold or this should go back to one tap:
 *
 *  1. The action is genuinely irreversible.
 *  2. The consequence is one the user cannot infer from the control.
 *  3. It is rare. Enquiries are capped at five, so this is a sheet a user sees
 *     at most five times, not one standing between them and every scroll.
 *
 * ---------------------------------------------------------------------------
 * IT LISTS FACTS, NOT A WARNING
 *
 * No "are you sure", no alert colouring, no exclamation. Sending an enquiry is
 * the thing the app is for and the sheet should not read as talking the user
 * out of it. Three lines saying what the owner receives, and the quota, and
 * the button says the verb.
 *
 * The quota line is the part users cannot discover anywhere else at the moment
 * they need it. Five is small enough that the fourth one is a decision.
 */
export function EnquirySheet({ save }: { save: SaveToggle }) {
  const theme = useTheme();
  const property = save.pending;

  // Counted as it will be AFTER this enquiry, because that is the number the
  // user is deciding about.
  const remainingAfter = Math.max(0, save.remaining - 1);

  return (
    <Sheet
      visible={property !== null}
      onClose={save.cancel}
      title="Send enquiry?"
      // The default 0.6. Sized against the tallest state — three two-line
      // consequences, the quota line and two buttons — on the shortest phone
      // still shipping (667pt), where 0.6 leaves about 40pt of headroom.
      // Anything past the default accessibility text sizes will need this to
      // become a scroll; flagged rather than pre-built.
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        {property ? (
          <Text variant="callout" tone="secondary" numberOfLines={2}>
            {property.locationLabel || property.title}
          </Text>
        ) : null}

        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Consequence icon="person-outline">
            The owner gets your name, email and phone number.
          </Consequence>
          <Consequence icon="notifications-outline">
            They are notified straight away, on WhatsApp and in the app.
          </Consequence>
          <Consequence icon="time-outline">
            Withdrawing later frees your slot, but the owner keeps the enquiry
            they have already received.
          </Consequence>
        </View>

        <View
          className="flex-row items-center"
          style={{
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <Ionicons name="mail-outline" size={15} color={theme.colors.textMuted} />
          <Text variant="footnote" tone="muted" className="ml-sm flex-1">
            {remainingAfter} of {INTEREST_LIMIT} enquiries left after this one.
          </Text>
        </View>

        <Button
          label="Send enquiry"
          className="mt-lg"
          fullWidth
          onPress={save.confirm}
        />
        <Button
          label="Cancel"
          variant="ghost"
          align="center"
          className="mt-xs"
          onPress={save.cancel}
        />
      </View>
    </Sheet>
  );
}

function Consequence({
  icon,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View className="flex-row items-start">
      <Ionicons
        name={icon}
        size={17}
        color={theme.colors.textSecondary}
        style={{ marginTop: 2 }}
      />
      <Text variant="callout" className="ml-md flex-1">
        {children}
      </Text>
    </View>
  );
}
