import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { ApiError } from '@/api';
import { useTheme } from '@/theme';
import type { ObjectId } from '@/types/backend/common';
import type { Property } from '@/types/backend/property';
import { Avatar, Button, Chip, Image, Sheet, Text } from '@/ui';
import { pickListingImages } from '../imagePicker';
import { useCloseDeal } from '../hooks';

/**
 * Owner submits proof to close a deal — ported from the website's
 * `CloseDealModal.jsx`. Two differences from the website, both deliberate:
 *
 *  - Documents are photos, not arbitrary PDF/image uploads. The backend
 *    accepts either, but the only picker this app has is `expo-image-picker`
 *    (added in M8 for listing photos); adding `expo-document-picker` for
 *    this one screen would be a fourth native module stacked onto the
 *    pending dev-client rebuild (docs/HANDOFF.md §5.1) for a feature that
 *    photographing the same paperwork already serves.
 *  - No "at least 2 interested users" gate on the buyer list — the backend
 *    itself only requires the selected buyer to appear in
 *    `interestedUsers`, and an owner with exactly one interested user is a
 *    completely ordinary case, not an edge one.
 */
export interface CloseDealSheetProps {
  visible: boolean;
  property: Property;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_DOCUMENTS = 5;

export function CloseDealSheet({ visible, property, onClose, onSuccess }: CloseDealSheetProps) {
  const theme = useTheme();
  const { submit, isPending, error, reset } = useCloseDeal(property._id);

  const defaultClosingType = /rent/i.test(property.listingType ?? '') ? 'rented' : 'sold';
  const [closingType, setClosingType] = useState<'sold' | 'rented'>(defaultClosingType);
  const [buyerId, setBuyerId] = useState<ObjectId | undefined>(undefined);
  const [documentUris, setDocumentUris] = useState<string[]>([]);

  const interestedUsers = useMemo(
    () =>
      (property.interestedUsers ?? []).filter(
        (entry): entry is typeof entry & { user: Exclude<typeof entry.user, string> } =>
          typeof entry.user !== 'string'
      ),
    [property.interestedUsers]
  );

  const canSubmit = Boolean(buyerId) && documentUris.length > 0 && !isPending;

  const handlePickDocuments = async () => {
    const { uris, deniedPermission } = await pickListingImages({
      remainingSlots: MAX_DOCUMENTS - documentUris.length,
    });
    if (deniedPermission) {
      Alert.alert('Permission needed', 'Allow photo library access to attach documents.');
      return;
    }
    setDocumentUris((current) => [...current, ...uris].slice(0, MAX_DOCUMENTS));
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!buyerId) return;
    try {
      await submit({ buyerId, closingType, documentUris });
      setDocumentUris([]);
      setBuyerId(undefined);
      onSuccess();
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <Sheet visible={visible} onClose={handleClose} title="Close deal" heightRatio={0.85}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text variant="footnote" tone="secondary" className="mb-md">
          Submitted for admin verification. Once approved, you and the buyer can each claim a
          reward.
        </Text>

        <Text variant="subhead" tone="secondary" className="mb-sm">
          Outcome
        </Text>
        <View className="mb-lg flex-row gap-sm">
          <Chip label="Sold" selected={closingType === 'sold'} onPress={() => setClosingType('sold')} />
          <Chip
            label="Rented"
            selected={closingType === 'rented'}
            onPress={() => setClosingType('rented')}
          />
        </View>

        <Text variant="subhead" tone="secondary" className="mb-sm">
          Buyer / tenant
        </Text>
        {interestedUsers.length === 0 ? (
          <Text variant="footnote" tone="muted" className="mb-lg">
            Nobody has marked interest in this listing yet. A buyer must appear in your
            interested list before you can close a deal with them.
          </Text>
        ) : (
          <View className="mb-lg gap-sm">
            {interestedUsers.map(({ user }) => {
              const selected = buyerId === user._id;
              return (
                <Pressable
                  key={user._id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setBuyerId(user._id)}
                  className={[
                    'flex-row items-center rounded-xl border p-md',
                    selected ? 'border-accent bg-accent-muted' : 'border-border',
                  ].join(' ')}
                >
                  <Avatar uri={user.profileImage} name={user.name} size="sm" />
                  <View className="ml-md flex-1">
                    <Text variant="bodyEmphasis">{user.name ?? 'Unnamed'}</Text>
                    {user.phone ? (
                      <Text variant="footnote" tone="muted">
                        {user.phone}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? theme.colors.accent : theme.colors.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        <Text variant="subhead" tone="secondary" className="mb-sm">
          Proof documents
        </Text>
        <Text variant="footnote" tone="muted" className="mb-sm">
          Photograph the agreement, receipt, or other closing proof. At least one required.
        </Text>
        <View className="mb-lg flex-row flex-wrap gap-sm">
          {documentUris.map((uri, index) => (
            <View key={uri} className="relative">
              <Image uri={uri} size="thumb" style={THUMB_STYLE} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove document"
                onPress={() => setDocumentUris((current) => current.filter((_, i) => i !== index))}
                className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-black/70"
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
          {documentUris.length < MAX_DOCUMENTS ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add document photo"
              onPress={() => void handlePickDocuments()}
              className="items-center justify-center rounded-lg border border-dashed border-border"
              style={THUMB_STYLE}
            >
              <Ionicons name="add" size={22} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {error instanceof ApiError ? (
          <Text variant="footnote" tone="danger" className="mb-md">
            {error.message}
          </Text>
        ) : null}

        <Button label="Submit for verification" loading={isPending} disabled={!canSubmit} onPress={() => void handleSubmit()} />

        <View className="h-2xl" />
      </ScrollView>
    </Sheet>
  );
}

const THUMB_STYLE = { width: 72, height: 72, borderRadius: 8 } as const;
