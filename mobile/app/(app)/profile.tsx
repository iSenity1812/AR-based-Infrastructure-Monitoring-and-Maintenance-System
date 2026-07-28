import { CheckCircle2, ChevronRight, HelpCircle, LogOut, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useAuth } from '../../src/auth/auth-context';
import { AppHeader } from '../../src/components/app-header';
import { Screen } from '../../src/components/screen';
import { useTheme } from '../../src/theme/theme-context';
import { radii, spacing, type ThemeColors } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const initials = (session?.user.fullName ?? 'Technician').split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();
  return (
    <Screen>
      <AppHeader title="Profile & settings" subtitle="Technician account" compact />
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text><View style={styles.verified}><CheckCircle2 color="#FFFFFF" size={13} /></View></View>
        <Text style={styles.name}>{session?.user.fullName ?? 'Field technician'}</Text>
        <Text style={styles.email}>{session?.user.email}</Text>
        <View style={styles.role}><ShieldCheck color={colors.cyan} size={14} /><Text style={styles.roleText}>Maintenance technician</Text></View>
      </View>

      <View><Text style={styles.sectionLabel}>APPEARANCE</Text><View style={styles.group}><View style={styles.row}><View style={[styles.rowIcon, { backgroundColor: colors.purpleSoft }]}>{isDark ? <Moon color={colors.purple} size={19} /> : <Sun color={colors.purple} size={19} />}</View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Dark mode</Text><Text style={styles.rowSubtitle}>{isDark ? 'Optimized for low-light field work' : 'Light interface is active'}</Text></View><View style={styles.switchSlot}><Switch accessibilityLabel="Dark mode" value={isDark} onValueChange={toggleTheme} trackColor={{ false: colors.border, true: colors.cyan }} thumbColor="#FFFFFF" style={styles.switch} /></View></View></View></View>

      <View><Text style={styles.sectionLabel}>ACCOUNT</Text><View style={styles.group}><SettingRow icon={UserRound} title="Account details" subtitle={session?.user.username ?? 'Technician'} /><SettingRow icon={ShieldCheck} title="Permissions" subtitle={`${session?.user.permissions.length ?? 0} workflow permissions`} /><SettingRow icon={HelpCircle} title="Help & field guide" subtitle="Ticket and WebAR instructions" last /></View></View>

      <Pressable onPress={() => void signOut()} style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}><LogOut color={colors.red} size={19} /><Text style={styles.signOutText}>Sign out</Text></Pressable>
      <Text style={styles.version}>AR-IMMS Field · Version 0.1.0</Text>
    </Screen>
  );

  function SettingRow({ icon: Icon, title, subtitle, last }: { icon: typeof UserRound; title: string; subtitle: string; last?: boolean }) { return <Pressable style={[styles.row, !last && styles.rowBorder]}><View style={styles.rowIcon}><Icon color={colors.cyan} size={19} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowSubtitle}>{subtitle}</Text></View><ChevronRight color={colors.textSubtle} size={18} /></Pressable>; }
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  profileCard: { alignItems: 'center', gap: 5, padding: spacing.xl, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  avatar: { alignItems: 'center', justifyContent: 'center', width: 82, height: 82, marginBottom: spacing.sm, borderRadius: 30, backgroundColor: colors.cyanSoft }, avatarText: { color: colors.cyan, fontSize: 24, fontWeight: '900' }, verified: { position: 'absolute', right: -2, bottom: -2, alignItems: 'center', justifyContent: 'center', width: 25, height: 25, borderRadius: 10, borderWidth: 3, borderColor: colors.panel, backgroundColor: colors.green },
  name: { color: colors.text, fontSize: 20, fontWeight: '900' }, email: { color: colors.textMuted, fontSize: 12 }, role: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.cyanSoft }, roleText: { color: colors.cyan, fontSize: 10, fontWeight: '800' },
  sectionLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs, color: colors.textSubtle, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, group: { overflow: 'hidden', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 70, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border }, rowIcon: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 15, backgroundColor: colors.cyanSoft }, rowCopy: { flex: 1, gap: 3 }, rowTitle: { color: colors.text, fontSize: 13, fontWeight: '800' }, rowSubtitle: { color: colors.textMuted, fontSize: 10 }, switchSlot: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', width: 54 }, switch: { alignSelf: 'center', transform: [{ scale: 0.88 }] },
  signOut: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 52, borderRadius: radii.lg, backgroundColor: colors.redSoft }, signOutText: { color: colors.red, fontSize: 13, fontWeight: '900' }, version: { color: colors.textSubtle, fontSize: 10, textAlign: 'center' },
});
