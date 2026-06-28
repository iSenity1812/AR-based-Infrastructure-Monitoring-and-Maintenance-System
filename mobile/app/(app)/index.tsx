import { StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '../../src/components/brand-header';
import { Screen } from '../../src/components/screen';
import { colors, spacing } from '../../src/theme/tokens';

export default function OverviewScreen() {
  return (
    <Screen>
      <BrandHeader
        eyebrow="AR-IMMS Field"
        title="Overview"
        subtitle="Overview dashboard will be added later."
      />
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No overview content</Text>
        <Text style={styles.emptyText}>
          Use the Ticket tab to view and manage ticket workflow.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    gap: spacing.sm,
    borderRadius: 24,
    backgroundColor: colors.panel,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.textMuted,
    maxWidth: 260,
    textAlign: 'center',
    lineHeight: 20,
  },
});
