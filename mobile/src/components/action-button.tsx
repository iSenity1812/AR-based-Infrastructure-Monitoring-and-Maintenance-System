import { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, shadow, spacing } from '../theme/tokens';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function ActionButton({
  label,
  onPress,
  icon: Icon,
  variant = 'primary',
  disabled,
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
    >
      {Icon ? <Icon color={variant === 'primary' ? colors.black : colors.text} size={18} /> : null}
      <Text style={[styles.label, variant === 'primary' && styles.primaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan,
    ...shadow,
  },
  secondary: {
    backgroundColor: colors.cardDark,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.42,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  primaryLabel: {
    color: colors.black,
  },
});
