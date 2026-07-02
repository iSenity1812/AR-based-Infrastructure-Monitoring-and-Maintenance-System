import { router, type Href } from 'expo-router';
import { ChevronLeft, Grid2X2, LogOut, MoreHorizontal } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/auth-context';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface BrandHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  back?: boolean;
  backHref?: Href;
  showStatusRow?: boolean;
}

export function BrandHeader({
  eyebrow,
  title,
  subtitle,
  back,
  backHref,
  showStatusRow = false,
}: BrandHeaderProps) {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.wrap}>
      {showStatusRow ? (
        <View style={styles.statusRow}>
          <Text style={styles.time}>9:41</Text>
          <View style={styles.statusDots}>
            <View style={styles.signal} />
            <View style={styles.signalSmall} />
            <View style={styles.battery} />
          </View>
        </View>
      ) : null}

      <View style={styles.navRow}>
        <Pressable
          style={styles.iconButton}
          onPress={() => {
            if (backHref) {
              router.replace(backHref);
              return;
            }

            if (back) {
              router.back();
              return;
            }

            router.push('/(app)');
          }}
        >
          {back ? (
            <ChevronLeft color={colors.text} size={20} />
          ) : (
            <Grid2X2 color={colors.text} size={18} />
          )}
        </Pressable>

        <View style={styles.titleBlock}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>

        <Pressable style={styles.iconButton} onPress={session ? signOut : undefined}>
          {session ? (
            <LogOut color={colors.text} size={18} />
          ) : (
            <MoreHorizontal color={colors.text} size={20} />
          )}
        </Pressable>
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  statusDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  signal: {
    width: 13,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.text,
    opacity: 0.9,
  },
  signalSmall: {
    width: 8,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  battery: {
    width: 18,
    height: 8,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.text,
  },
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.cardDark,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    color: colors.textSubtle,
    fontSize: typography.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
