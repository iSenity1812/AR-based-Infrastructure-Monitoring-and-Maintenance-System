import { Text, TextInput, TextInputProps, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';

interface FieldInputProps extends TextInputProps {
  label: string;
}

export function FieldInput({ label, style, ...props }: FieldInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardDark,
    color: colors.text,
    fontSize: 16,
  },
});
