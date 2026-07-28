import { ChartNoAxesColumnIncreasing, ClipboardList, Home, ScanLine, UserRound } from 'lucide-react-native';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openWebAr } from '../ar/open-webar';
import { useTheme } from '../theme/theme-context';
import { radii, shadow, spacing, type ThemeColors } from '../theme/tokens';

const visibleRoutes = [
  { name: 'index', label: 'Overview', icon: Home },
  { name: 'tickets/index', label: 'Tickets', icon: ClipboardList },
  { name: 'activity', label: 'History', icon: ChartNoAxesColumnIncreasing },
  { name: 'profile', label: 'Profile', icon: UserRound },
];

type TechnicianTabBarProps = {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void };
};

export function TechnicianTabBar({ state, navigation }: TechnicianTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const activeRoute = state.routes[state.index]?.name;
  if (activeRoute?.startsWith('ar/')) return null;

  async function handleOpenWebAr() {
    try {
      await openWebAr();
    } catch (caught) {
      Alert.alert('Could not open WebAR', caught instanceof Error ? caught.message : 'Check the configured WebAR URL and try again.');
    }
  }

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.row}>
        {visibleRoutes.slice(0, 2).map((item) => <TabItem key={item.name} {...item} active={activeRoute === item.name} colors={colors} onPress={() => navigation.navigate(item.name)} />)}
        <View style={styles.centerSlot} />
        {visibleRoutes.slice(2).map((item) => <TabItem key={item.name} {...item} active={activeRoute === item.name} colors={colors} onPress={() => navigation.navigate(item.name)} />)}
      </View>
      <Pressable accessibilityHint="Opens the WebAR experience in your browser" accessibilityLabel="Open WebAR" accessibilityRole="button" onPress={() => void handleOpenWebAr()} style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}>
        <ScanLine color="#FFFFFF" size={26} strokeWidth={2.3} />
      </Pressable>
      <Text pointerEvents="none" style={styles.scanLabel}>WebAR</Text>
    </View>
  );
}

function TabItem({ label, icon: Icon, active, colors, onPress }: { label: string; icon: typeof Home; active: boolean; colors: ThemeColors; onPress: () => void }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.item}><View style={[styles.iconWrap, active && styles.iconActive]}><Icon color={active ? colors.cyan : colors.textSubtle} size={20} strokeWidth={active ? 2.5 : 2} /></View><Text style={[styles.label, active && styles.labelActive]}>{label}</Text></Pressable>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  shell: { position: 'relative', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.nav, ...shadow },
  row: { flexDirection: 'row', minHeight: 70, paddingTop: 8, paddingHorizontal: spacing.sm },
  item: { alignItems: 'center', flex: 1, gap: 3 },
  centerSlot: { flex: 1 },
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 38, height: 30, borderRadius: 13 },
  iconActive: { backgroundColor: colors.cyanSoft },
  label: { color: colors.textSubtle, fontSize: 9, fontWeight: '700' },
  labelActive: { color: colors.cyan, fontWeight: '900' },
  scanButton: { position: 'absolute', top: -25, left: '50%', marginLeft: -30, alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 23, borderWidth: 5, borderColor: colors.bg, backgroundColor: colors.cyan, shadowColor: colors.cyan, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  scanLabel: { position: 'absolute', top: 42, left: '50%', width: 60, marginLeft: -30, color: colors.cyan, fontSize: 9, fontWeight: '900', textAlign: 'center' },
  pressed: { transform: [{ scale: 0.94 }] },
});
