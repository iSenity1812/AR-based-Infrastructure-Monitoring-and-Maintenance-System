import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, shadow, spacing } from '../theme/tokens';

interface CyberCardProps extends PropsWithChildren {
  style?: ViewStyle;
  active?: boolean;
  compact?: boolean;
}

export function CyberCard({ children, style, active, compact }: CyberCardProps) {
  return (
    <View style={[styles.card, compact && styles.compact, active && styles.active, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: 16,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    ...shadow,
  },
  compact: {
    padding: 12,
    borderRadius: radii.lg,
  },
  active: {
    borderColor: colors.borderBright,
    backgroundColor: colors.panelStrong,
  },
});
