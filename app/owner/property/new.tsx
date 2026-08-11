import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ApiError } from '@/api';
import {
  EMPTY_LISTING_FORM,
  ListingForm,
  clearListingDraft,
  hasListingDraft,
  loadListingDraft,
  saveListingDraft,
  useAddListing,
  type CategorizedPhoto,
} from '@/features/listings';
import { useTheme } from '@/theme';
import { Screen, Text } from '@/ui';

/**
 * Add listing.
 *
 * Draft autosave writes on every field change via `saveListingDraft`, cheap
 * because MMKV is synchronous. A resumed draft is offered once on mount
 * rather than silently applied, since a stale abandoned draft overwriting a
 * fresh start would be worse than asking.
 */
export default function NewPropertyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { add, isPending, error } = useAddListing();

  const [values, setValues] = useState(EMPTY_LISTING_FORM);
  const [newPhotos, setNewPhotos] = useState<CategorizedPhoto[]>([]);

  useEffect(() => {
    if (!hasListingDraft()) return;
    Alert.alert('Resume draft?', 'You have an unfinished listing. Continue where you left off?', [
      { text: 'Start over', style: 'destructive', onPress: () => clearListingDraft() },
      { text: 'Resume', onPress: () => setValues(loadListingDraft()) },
    ]);
    // Only on mount.
  }, []);

  const handleChange = (next: typeof values) => {
    setValues(next);
    saveListingDraft(next);
  };

  const handleSubmit = async () => {
    try {
      const response = await add({ values, newPhotos });
      clearListingDraft();
      router.replace(`/property/${response.data._id}`);
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <Screen edges={['top']}>
      <View className="flex-row items-center px-lg pt-md pb-sm">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={() => router.back()}
          hitSlop={12}
          className="mr-sm -ml-xs h-9 w-9 items-center justify-center"
        >
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="title2">Add listing</Text>
      </View>

      <ListingForm
        values={values}
        onChange={handleChange}
        existingPhotos={[]}
        onChangeExistingPhotos={() => {}}
        newPhotos={newPhotos}
        onChangeNewPhotos={setNewPhotos}
        onSubmit={() => void handleSubmit()}
        submitLabel="Publish listing"
        isSubmitting={isPending}
        submitError={error instanceof ApiError ? error.message : undefined}
      />
    </Screen>
  );
}
