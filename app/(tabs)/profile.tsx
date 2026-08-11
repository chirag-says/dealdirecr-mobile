import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ApiError } from '@/api';
import { useAuth } from '@/auth';
import { useOwnerUpgrade } from '@/features/profile';
import { useWallet } from '@/features/rewards';
import { useTheme } from '@/theme';
import { Avatar, Badge, Button, Card, Input, Refreshable, Screen, Sheet, Text } from '@/ui';

/**
 * Profile tab.
 *
 * The account hub: identity, the rewards summary, the owner surface (either
 * an entry point if already an owner, or the upgrade CTA if not), and
 * settings. Guests see a sign-in prompt instead of a broken authenticated
 * screen — nothing here has a public reading.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { status, user, logout } = useAuth();

  if (status !== 'authenticated' || !user) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-xl">
          <Text variant="title2" className="text-center">
            Sign in to manage your account
          </Text>
          <Text variant="callout" tone="secondary" className="mt-sm mb-xl text-center">
            Your profile, rewards, and listings live here once you are signed in.
          </Text>
          <Button label="Sign in" onPress={() => router.push('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  const isOwner = user.role === 'owner';

  const handleLogout = () => {
    Alert.alert('Log out', 'You will need to sign in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <Screen>
      <Refreshable contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View className="mb-lg flex-row items-center">
          <Avatar uri={user.profileImage} name={user.name} size="lg" />
          <View className="ml-base flex-1">
            <Text variant="title3">{user.name}</Text>
            <Text variant="footnote" tone="secondary">
              {user.email}
            </Text>
            <View className="mt-xs flex-row items-center">
              <Badge
                label={isOwner ? 'Owner' : user.isVerified ? 'Verified' : 'Unverified'}
                tone={isOwner ? 'accent' : user.isVerified ? 'success' : 'warning'}
              />
            </View>
          </View>
        </View>

        <RewardsSummaryCard />

        {isOwner ? <OwnerCard /> : <UpgradeCard />}

        <Card className="mt-lg p-0" raised={false}>
          <MenuRow
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/settings')}
          />
          <MenuRow
            icon="gift-outline"
            label="Rewards"
            onPress={() => router.push('/rewards')}
          />
          <MenuRow
            icon="business-outline"
            label="Projects"
            onPress={() => router.push('/projects')}
          />
          <MenuRow
            icon="calendar-outline"
            label="My bookings"
            onPress={() => router.push('/projects/bookings')}
            last
          />
        </Card>

        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          className="mt-lg items-center py-md"
        >
          <Text variant="bodyEmphasis" tone="danger">
            Log out
          </Text>
        </Pressable>
      </Refreshable>
    </Screen>
  );

  function MenuRow({
    icon,
    label,
    onPress,
    last = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    last?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={`flex-row items-center px-base py-md ${last ? '' : 'border-b border-border'}`}
      >
        <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
        <Text variant="body" className="ml-base flex-1">
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </Pressable>
    );
  }
}

function RewardsSummaryCard() {
  const router = useRouter();
  const { balance, isLoading } = useWallet();

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/rewards')}>
      <Card className="mt-lg flex-row items-center justify-between">
        <View>
          <Text variant="footnote" tone="secondary">
            Reward points
          </Text>
          <Text variant="title2" className="mt-xs">
            {isLoading ? '—' : balance.toLocaleString('en-IN')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9AA0A6" />
      </Card>
    </Pressable>
  );
}

function OwnerCard() {
  const router = useRouter();

  return (
    <Card className="mt-lg p-0" raised={false}>
      <OwnerRow
        icon="home-outline"
        label="My listing"
        onPress={() => router.push('/owner/properties')}
      />
      <OwnerRow
        icon="people-outline"
        label="Leads"
        onPress={() => router.push('/owner/leads')}
      />
      <OwnerRow
        icon="bar-chart-outline"
        label="Analytics"
        onPress={() => router.push('/owner/analytics')}
        last
      />
    </Card>
  );

  function OwnerRow({
    icon,
    label,
    onPress,
    last = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    last?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={`flex-row items-center px-base py-md ${last ? '' : 'border-b border-border'}`}
      >
        <Ionicons name={icon} size={20} color="#6B7280" />
        <Text variant="body" className="ml-base flex-1">
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#9AA0A6" />
      </Pressable>
    );
  }
}

/**
 * Buyer/user role: the upgrade entry point. The two-step OTP flow runs inside
 * a sheet so leaving it mid-flow does not lose the screen underneath.
 */
function UpgradeCard() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <Card className="mt-lg">
        <Text variant="bodyEmphasis">List your property on DealDirect</Text>
        <Text variant="footnote" tone="secondary" className="mt-xs mb-base">
          Upgrade to an owner account to post a listing and manage leads directly.
        </Text>
        <Button
          label="Become an owner"
          variant="secondary"
          disabled={!user?.isVerified}
          onPress={() => setOpen(true)}
        />
        {!user?.isVerified ? (
          <Text variant="footnote" tone="secondary" className="mt-sm">
            Verify your email first to unlock this.
          </Text>
        ) : null}
      </Card>

      <OwnerUpgradeSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function OwnerUpgradeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { otpSent, sendOtp, isSending, sendError, verifyOtp, isVerifying, verifyError, reset } =
    useOwnerUpgrade();
  const [otp, setOtp] = useState('');

  const close = () => {
    reset();
    setOtp('');
    onClose();
  };

  const handleSend = async () => {
    try {
      await sendOtp();
    } catch {
      // surfaced via sendError below
    }
  };

  const handleVerify = async () => {
    try {
      await verifyOtp(otp);
      close();
    } catch {
      // surfaced via verifyError below
    }
  };

  return (
    <Sheet visible={visible} onClose={close} title="Become an owner">
      <View className="px-lg pb-lg">
        {!otpSent ? (
          <>
            <Text variant="callout" tone="secondary" className="mb-lg">
              We will send a one-time code to your registered email to confirm the upgrade.
            </Text>
            {sendError instanceof ApiError ? (
              <Text variant="footnote" tone="danger" className="mb-base">
                {sendError.message}
              </Text>
            ) : null}
            <Button label="Send code" loading={isSending} onPress={() => void handleSend()} />
          </>
        ) : (
          <>
            <Text variant="callout" tone="secondary" className="mb-base">
              Enter the code we just sent you.
            </Text>
            <Input
              label="Verification code"
              placeholder="6-digit code"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
              error={verifyError instanceof ApiError ? verifyError.message : undefined}
            />
            <Button
              label="Confirm"
              className="mt-base"
              loading={isVerifying}
              disabled={otp.length < 4}
              onPress={() => void handleVerify()}
            />
          </>
        )}
      </View>
    </Sheet>
  );
}
