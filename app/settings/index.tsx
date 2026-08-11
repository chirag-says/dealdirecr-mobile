import Ionicons from '@expo/vector-icons/Ionicons';
import type * as ImagePickerModule from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ApiError } from '@/api';
import { useAuth } from '@/auth';
import { optionalNativeModule } from '@/config/optionalNative';
import { useUpdateProfile } from '@/features/profile';
import { useTheme } from '@/theme';
import { Avatar, Button, Card, Input, KeyboardAvoider, Refreshable, Screen, Select, Text } from '@/ui';

/**
 * Optional: absent in Expo Go. A top-level import would throw while Expo
 * Router evaluates this route file to build its route tree, which breaks
 * routing rather than just this screen. See `config/optionalNative.ts`.
 */
const ImagePicker = optionalNativeModule(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require('expo-image-picker') as typeof ImagePickerModule,
  'expo-image-picker',
  'Changing your profile photo needs a full build of the app.'
);

/** Excludes the schema's `''` member — that is "unset", represented here by
 *  `undefined` rather than an offered chip. Widened back to `UserGender` only
 *  at the API boundary in `handleSave`. */
type SelectableGender = 'Male' | 'Female' | 'Other';

const GENDER_OPTIONS: readonly { label: string; value: SelectableGender }[] = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

/**
 * Settings.
 *
 * Profile editing lives here inline rather than on its own route: no such
 * route was scaffolded, the form is short (name, phone, bio, photo), and a
 * save button that is visibly "dirty or not" is clearer than a navigation
 * round-trip for four fields.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();

  if (!user) {
    return (
      <Screen>
        <Text variant="body" className="p-lg">
          Sign in to view settings.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-row items-center px-lg pt-md pb-sm">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
          hitSlop={12}
          className="mr-sm -ml-xs h-9 w-9 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="title2">Settings</Text>
      </View>

      <KeyboardAvoider className="flex-1">
        <Refreshable contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <EditProfileCard />

          <Card className="mt-lg p-0" raised={false}>
            <Row
              icon="lock-closed-outline"
              label="Change password"
              onPress={() => router.push('/settings/change-password')}
            />
            <Row
              icon="phone-portrait-outline"
              label="Active devices"
              onPress={() => router.push('/settings/sessions')}
            />
            <Row
              icon="trash-outline"
              label="Delete account"
              danger
              onPress={() => router.push('/settings/delete-account')}
              last
            />
          </Card>
        </Refreshable>
      </KeyboardAvoider>
    </Screen>
  );

  function Row({
    icon,
    label,
    onPress,
    last = false,
    danger = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    last?: boolean;
    danger?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={`flex-row items-center px-base py-md ${last ? '' : 'border-b border-border'}`}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? theme.colors.danger : theme.colors.textSecondary}
        />
        <Text variant="body" tone={danger ? 'danger' : 'primary'} className="ml-base flex-1">
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </Pressable>
    );
  }
}

function EditProfileCard() {
  const { user, refreshUser } = useAuth();
  const { update, isPending, error } = useUpdateProfile();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [alternatePhone, setAlternatePhone] = useState(user?.alternatePhone ?? '');
  const [addressLine1, setAddressLine1] = useState(user?.address?.line1 ?? '');
  const [addressLine2, setAddressLine2] = useState(user?.address?.line2 ?? '');
  const [addressCity, setAddressCity] = useState(user?.address?.city ?? '');
  const [addressState, setAddressState] = useState(user?.address?.state ?? '');
  const [addressPincode, setAddressPincode] = useState(user?.address?.pincode ?? '');
  // YYYY-MM-DD text entry rather than a native date picker — no date-picker
  // module is installed, and adding one is a native-module decision on its
  // own (docs/HANDOFF.md §5.1), not something this form should force.
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : ''
  );
  const [gender, setGender] = useState<SelectableGender | undefined>(
    user?.gender ? (user.gender as SelectableGender) : undefined
  );
  const [bio, setBio] = useState(user?.bio ?? '');
  const [emailNotifications, setEmailNotifications] = useState(
    user?.preferences?.emailNotifications !== false
  );
  const [smsNotifications, setSmsNotifications] = useState(
    user?.preferences?.smsNotifications === true
  );
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  const pickImage = async () => {
    if (!ImagePicker) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const trimmedDob = dateOfBirth.trim();
  const dobValid = trimmedDob === '' || /^\d{4}-\d{2}-\d{2}$/.test(trimmedDob);

  const handleSave = async () => {
    setSaved(false);
    try {
      await update({
        name: name.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim(),
        address: {
          line1: addressLine1.trim(),
          line2: addressLine2.trim(),
          city: addressCity.trim(),
          state: addressState.trim(),
          pincode: addressPincode.trim(),
        },
        dateOfBirth: dobValid && trimmedDob ? trimmedDob : undefined,
        gender: gender ?? '',
        bio,
        emailNotifications,
        smsNotifications,
        imageUri,
      });
      setImageUri(undefined);
      setSaved(true);
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        onPress={() => void pickImage()}
        className="mb-lg items-center"
      >
        <Avatar uri={imageUri ?? user?.profileImage} name={name || user?.name} size="lg" />
        <Text variant="footnote" tone="accent" className="mt-sm">
          Change photo
        </Text>
      </Pressable>

      <Input label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Input
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        containerClassName="mt-base"
      />
      <Input
        label="Alternate phone"
        value={alternatePhone}
        onChangeText={setAlternatePhone}
        keyboardType="phone-pad"
        containerClassName="mt-base"
      />
      <Input
        label="Date of birth"
        placeholder="YYYY-MM-DD"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        keyboardType="numbers-and-punctuation"
        error={!dobValid ? 'Use the format YYYY-MM-DD' : undefined}
        containerClassName="mt-base"
      />
      <View className="mt-base">
        <Select
          label="Gender"
          placeholder="Select"
          value={gender}
          options={GENDER_OPTIONS}
          onChange={setGender}
        />
      </View>
      <Input
        label="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={3}
        maxLength={500}
        containerClassName="mt-base"
      />

      <Text variant="subhead" tone="secondary" className="mb-xs mt-lg">
        Address
      </Text>
      <Input
        placeholder="Address line 1"
        value={addressLine1}
        onChangeText={setAddressLine1}
      />
      <Input
        placeholder="Address line 2"
        value={addressLine2}
        onChangeText={setAddressLine2}
        containerClassName="mt-sm"
      />
      <View className="mt-sm flex-row gap-sm">
        <View className="flex-1">
          <Input placeholder="City" value={addressCity} onChangeText={setAddressCity} />
        </View>
        <View className="flex-1">
          <Input placeholder="State" value={addressState} onChangeText={setAddressState} />
        </View>
      </View>
      <Input
        placeholder="Pincode"
        value={addressPincode}
        onChangeText={setAddressPincode}
        keyboardType="number-pad"
        containerClassName="mt-sm"
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => setEmailNotifications((v) => !v)}
        className="mt-lg flex-row items-center justify-between py-sm"
      >
        <Text variant="body">Email notifications</Text>
        <Ionicons
          name={emailNotifications ? 'checkbox' : 'square-outline'}
          size={22}
          color={emailNotifications ? '#2563EB' : '#9CA3AF'}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => setSmsNotifications((v) => !v)}
        className="flex-row items-center justify-between py-sm"
      >
        <Text variant="body">SMS notifications</Text>
        <Ionicons
          name={smsNotifications ? 'checkbox' : 'square-outline'}
          size={22}
          color={smsNotifications ? '#2563EB' : '#9CA3AF'}
        />
      </Pressable>

      {error instanceof ApiError ? (
        <Text variant="footnote" tone="danger" className="mt-sm">
          {error.message}
        </Text>
      ) : null}
      {saved ? (
        <Text variant="footnote" tone="success" className="mt-sm">
          Saved.
        </Text>
      ) : null}

      <Button
        label="Save changes"
        className="mt-lg"
        loading={isPending}
        disabled={!dobValid}
        onPress={() => void handleSave()}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => void refreshUser()}
        className="mt-sm items-center py-xs"
      >
        <Text variant="footnote" tone="secondary">
          Refresh from server
        </Text>
      </Pressable>
    </Card>
  );
}
