import { router, useLocalSearchParams } from 'expo-router';
import { ClipboardPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { getIncident } from '../../../src/api/incidents';
import { useAuth } from '../../../src/auth/auth-context';
import { ActionButton } from '../../../src/components/action-button';
import { BrandHeader } from '../../../src/components/brand-header';
import { CyberCard } from '../../../src/components/cyber-card';
import { Screen } from '../../../src/components/screen';
import { StatusPill } from '../../../src/components/status-pill';
import { PERMISSIONS } from '../../../src/constants/permissions';
import { colors, spacing, typography } from '../../../src/theme/tokens';
import type { IncidentProps } from '../../../src/types/incident';

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, can } = useAuth();
  const [incident, setIncident] = useState<IncidentProps | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadIncident() {
    if (!session || !id) return;
    setRefreshing(true);

    try {
      setIncident(await getIncident(id, session.accessToken));
    } catch (caught) {
      Alert.alert('Incident load failed', caught instanceof Error ? caught.message : 'Could not load incident.');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadIncident();
  }, [id, session?.accessToken]);

  if (!incident) {
    return (
      <Screen refreshing={refreshing} onRefresh={loadIncident}>
        <BrandHeader title="Incident detail" subtitle="Loading incident context." back />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={loadIncident}>
      <BrandHeader
        eyebrow={incident.incidentCode}
        title={incident.title}
        subtitle={incident.description ?? 'No incident description recorded.'}
        back
      />

      <CyberCard active>
        <View style={styles.pills}>
          <StatusPill label={incident.status} tone="purple" />
          <StatusPill label={incident.severity} tone="amber" />
          <StatusPill label={`${incident.ticketIds.length} linked tickets`} tone="cyan" />
        </View>
      </CyberCard>

      <CyberCard>
        <Text style={styles.section}>Linked work</Text>
        {incident.ticketIds.length === 0 ? (
          <Text style={styles.empty}>No ticket linked yet.</Text>
        ) : (
          incident.ticketIds.map((ticketId) => (
            <Text key={ticketId} style={styles.ticketId}>
              {ticketId}
            </Text>
          ))
        )}
      </CyberCard>

      {can(PERMISSIONS.TICKETS_CREATE) ? (
        <ActionButton
          icon={ClipboardPlus}
          label="Create follow-up ticket"
          onPress={() => router.push('/(app)/tickets/new')}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  section: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
  },
  ticketId: {
    color: colors.cyan,
    fontSize: 13,
    fontWeight: '800',
  },
});
