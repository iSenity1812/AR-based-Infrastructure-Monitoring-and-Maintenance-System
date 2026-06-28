import { ShieldCheck, UserRound } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/auth/auth-context';
import { ActionButton } from '../../src/components/action-button';
import { BrandHeader } from '../../src/components/brand-header';
import { CyberCard } from '../../src/components/cyber-card';
import { Screen } from '../../src/components/screen';
import { StatusPill } from '../../src/components/status-pill';
import { colors, spacing, typography } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  return (
    <Screen>
      <BrandHeader
        eyebrow="Access"
        title="Profile"
        subtitle={session?.user.email}
      />
      <CyberCard active style={styles.userCard}>
        <View style={styles.avatar}>
          <UserRound color={colors.text} size={26} />
        </View>
        <View style={styles.userCopy}>
          <Text style={styles.name}>{session?.user.fullName ?? 'User profile'}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
        </View>
      </CyberCard>
      <CyberCard>
        <Text style={styles.section}>Roles</Text>
        <View style={styles.pills}>
          {session?.user.roles.map((role) => (
            <StatusPill key={role} label={role.replaceAll('_', ' ')} tone="cyan" />
          ))}
        </View>
      </CyberCard>
      <ActionButton icon={ShieldCheck} label="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  userCard: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: colors.cyan,
  },
  userCopy: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  email: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
