import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';

interface StatusPillProps {
  label: string;
  tone?: 'green' | 'cyan' | 'amber' | 'red' | 'muted' | 'purple';
}

export function StatusPill({ label, tone = 'cyan' }: StatusPillProps) {
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={[styles.label, styles[`${tone}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  green: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  cyan: { borderColor: colors.cyan, backgroundColor: colors.cyanSoft },
  amber: { borderColor: colors.amber, backgroundColor: colors.amberSoft },
  red: { borderColor: colors.red, backgroundColor: colors.redSoft },
  muted: { borderColor: colors.border, backgroundColor: colors.bgElevated },
  purple: { borderColor: colors.purple, backgroundColor: colors.purpleSoft },
  greenText: { color: colors.green },
  cyanText: { color: colors.cyan },
  amberText: { color: colors.amber },
  redText: { color: colors.red },
  mutedText: { color: colors.textMuted },
  purpleText: { color: colors.purple },
});
