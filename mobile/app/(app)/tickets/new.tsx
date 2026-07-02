import { router } from 'expo-router';
import { ChevronDown, Send, UserRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { listTechnicians, type TechnicianOption } from '../../../src/api/technicians';
import { createTicket } from '../../../src/api/tickets';
import { useAuth } from '../../../src/auth/auth-context';
import { ActionButton } from '../../../src/components/action-button';
import { BrandHeader } from '../../../src/components/brand-header';
import { DashboardCard } from '../../../src/components/dashboard-card';
import { FieldInput } from '../../../src/components/field-input';
import { Screen } from '../../../src/components/screen';
import { StatusPill } from '../../../src/components/status-pill';
import { colors, spacing } from '../../../src/theme/tokens';
import type { TicketPriority } from '../../../src/types/ticket';

const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function NewTicketScreen() {
  const { session } = useAuth();
  const [ticketCode, setTicketCode] = useState(`TCK-MOB-${Date.now().toString().slice(-4)}`);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianOption | null>(null);
  const [technicianDropdownOpen, setTechnicianDropdownOpen] = useState(false);
  const [technicianLoadError, setTechnicianLoadError] = useState<string | null>(null);
  const [priority, setPriority] = useState<TicketPriority>('HIGH');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadTechnicians() {
      if (!session) return;

      setTechnicianLoadError(null);
      try {
        const nextTechnicians = await listTechnicians(session.accessToken);
        setTechnicians(nextTechnicians);
        setSelectedTechnician((current) => current ?? nextTechnicians[0] ?? null);
      } catch (caught) {
        setTechnicians([]);
        setSelectedTechnician(null);
        setTechnicianLoadError(
          caught instanceof Error ? caught.message : 'Could not load technicians.',
        );
      }
    }

    void loadTechnicians();
  }, [session?.accessToken]);

  async function handleCreate() {
    if (!session) return;
    if (!title.trim()) {
      Alert.alert('Missing title', 'Ticket title is required.');
      return;
    }

    setSaving(true);
    try {
      await createTicket(
        {
          ticketCode,
          title,
          description,
          priority,
          assigneeUserId: selectedTechnician?.id,
        },
        session.accessToken,
      );
      router.replace('/(app)/tickets');
    } catch (caught) {
      Alert.alert('Create failed', caught instanceof Error ? caught.message : 'Could not create ticket.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <BrandHeader
        eyebrow="Add a plan"
        title="Create ticket"
        subtitle="Open a field workflow from an incident or alert handoff."
        back
        backHref="/(app)/tickets"
      />

      <DashboardCard title="Ticket details">
        <FieldInput label="Ticket code" value={ticketCode} onChangeText={setTicketCode} />
        <FieldInput label="Title" value={title} onChangeText={setTitle} />
        <FieldInput
          label="Description"
          multiline
          style={styles.multiLine}
          value={description}
          onChangeText={setDescription}
        />
        <View style={styles.dropdownWrap}>
          <Text style={styles.dropdownLabel}>Assign technician</Text>
          <Pressable
            style={styles.dropdownButton}
            onPress={() => setTechnicianDropdownOpen((open) => !open)}
          >
            <View style={styles.assigneeIcon}>
              <UserRound color={colors.text} size={18} />
            </View>
            <View style={styles.assigneeCopy}>
              <Text style={styles.assigneeName}>
                {selectedTechnician?.fullName ?? 'Unassigned'}
              </Text>
              <Text style={styles.assigneeMeta}>
                {selectedTechnician?.email ?? 'Tap to select a technician'}
              </Text>
            </View>
            <ChevronDown color={colors.textMuted} size={18} />
          </Pressable>
          {technicianLoadError ? (
            <Text style={styles.dropdownError}>{technicianLoadError}</Text>
          ) : null}
          {technicianDropdownOpen ? (
            <View style={styles.dropdownMenu}>
              <Pressable
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedTechnician(null);
                  setTechnicianDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownItemTitle}>Unassigned</Text>
                <Text style={styles.dropdownItemMeta}>Create without technician</Text>
              </Pressable>
              {technicians.map((technician) => (
                <Pressable
                  key={technician.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedTechnician(technician);
                    setTechnicianDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownItemTitle}>{technician.fullName}</Text>
                  <Text style={styles.dropdownItemMeta}>
                    {technician.jobTitle ?? technician.username} - {technician.email}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.priorityWrap}>
          {priorities.map((nextPriority) => (
            <Pressable key={nextPriority} onPress={() => setPriority(nextPriority)}>
              <StatusPill
                label={nextPriority}
                tone={priority === nextPriority ? 'cyan' : 'muted'}
              />
            </Pressable>
          ))}
        </View>

        <ActionButton
          disabled={saving}
          icon={Send}
          label={saving ? 'Creating' : 'Create ticket'}
          onPress={handleCreate}
        />
      </DashboardCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  multiLine: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  priorityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dropdownWrap: {
    gap: spacing.sm,
  },
  dropdownLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dropdownButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardDark,
  },
  assigneeIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.cyanSoft,
  },
  assigneeCopy: {
    flex: 1,
    gap: 2,
  },
  assigneeName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  assigneeMeta: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownError: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownMenu: {
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.black,
  },
  dropdownItem: {
    gap: 3,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  dropdownItemMeta: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
  },
});
