import { router, useFocusEffect } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { listTechnicians, type TechnicianOption } from '../../../src/api/technicians';
import { deleteTicket, listTickets } from '../../../src/api/tickets';
import { useAuth } from '../../../src/auth/auth-context';
import { ActionButton } from '../../../src/components/action-button';
import { BrandHeader } from '../../../src/components/brand-header';
import { CyberCard } from '../../../src/components/cyber-card';
import { DashboardCard } from '../../../src/components/dashboard-card';
import { Screen } from '../../../src/components/screen';
import { StatusPill } from '../../../src/components/status-pill';
import { PERMISSIONS } from '../../../src/constants/permissions';
import { colors, spacing, typography } from '../../../src/theme/tokens';
import type { TicketPriority, TicketProps, TicketStatus } from '../../../src/types/ticket';

type PriorityFilter = 'ALL' | TicketPriority;

const priorityFilters: PriorityFilter[] = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function statusTone(status: TicketStatus) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'green';
  if (status === 'CANCELLED') return 'muted';
  if (status === 'WAITING_FOR_INFO') return 'amber';
  if (status === 'OPEN') return 'cyan';
  return 'purple';
}

function priorityTone(priority: TicketPriority) {
  if (priority === 'CRITICAL') return 'red';
  if (priority === 'HIGH') return 'amber';
  if (priority === 'MEDIUM') return 'cyan';
  return 'green';
}

export default function TicketListScreen() {
  const { session, can } = useAuth();
  const [tickets, setTickets] = useState<TicketProps[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  const activeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status !== 'CLOSED'),
    [tickets],
  );
  const openTickets = useMemo(
    () =>
      activeTickets.filter(
        (ticket) => ticket.status !== 'RESOLVED' && ticket.status !== 'CANCELLED',
      ),
    [activeTickets],
  );
  const visibleTickets = useMemo(
    () =>
      priorityFilter === 'ALL'
        ? activeTickets
        : activeTickets.filter((ticket) => ticket.priority === priorityFilter),
    [activeTickets, priorityFilter],
  );
  const technicianNames = useMemo(() => {
    return Object.fromEntries(
      technicians.map((technician) => [technician.id, technician.fullName]),
    );
  }, [technicians]);

  async function loadTickets() {
    if (!session) return;
    setLoading(true);
    setError(null);

    try {
      const [nextTickets, nextTechnicians] = await Promise.all([
        listTickets(session.accessToken),
        listTechnicians(session.accessToken).catch(() => []),
      ]);
      const roleFiltered = session.user.permissions.includes('tickets.assign')
        ? nextTickets
        : nextTickets.filter((ticket) => ticket.assigneeUserId === session.user.userId);
      setTickets(roleFiltered);
      setTechnicians(nextTechnicians);
    } catch (caught) {
      setTickets([]);
      setError(caught instanceof Error ? caught.message : 'Could not load tickets.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, [session?.accessToken]);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      void loadTickets();
    }, [session?.accessToken]),
  );

  async function removeTicket(ticket: TicketProps) {
    if (!session) return;

    setDeletingTicketId(ticket.id);
    try {
      await deleteTicket(ticket.id, session.accessToken);
      setTickets((current) => current.filter((item) => item.id !== ticket.id));
    } catch (caught) {
      Alert.alert('Delete failed', caught instanceof Error ? caught.message : 'Could not delete ticket.');
    } finally {
      setDeletingTicketId(null);
    }
  }

  function handleDeleteTicket(ticket: TicketProps) {
    const assignedName = ticket.acknowledgedAt
      ? 'This ticket has already been acknowledged by a technician.'
      : 'This ticket will be removed from the workflow.';

    Alert.alert(
      'Delete ticket?',
      `${assignedName} Are you sure you want to delete ${ticket.ticketCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void removeTicket(ticket),
        },
      ],
    );
  }

  return (
    <Screen refreshing={loading} onRefresh={loadTickets}>
      <BrandHeader
        eyebrow="Ticket"
        title="Ticket workflow"
        subtitle="Filter by priority and manage field tickets."
      />

      <View style={styles.filterRow}>
        {priorityFilters.map((filter) => (
          <Pressable key={filter} onPress={() => setPriorityFilter(filter)}>
            <StatusPill
              label={filter === 'ALL' ? 'All' : filter}
              tone={priorityFilter === filter ? priorityToneForFilter(filter) : 'muted'}
            />
          </Pressable>
        ))}
      </View>

      <DashboardCard title="Task summary" action={loading ? 'Syncing' : 'Live'}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryValue}>{openTickets.length}</Text>
            <Text style={styles.summaryLabel}>Open tasks</Text>
          </View>
          <View>
            <Text style={styles.summaryValue}>{visibleTickets.length}</Text>
            <Text style={styles.summaryLabel}>Showing</Text>
          </View>
          {can(PERMISSIONS.TICKETS_CREATE) ? (
            <Pressable
              style={styles.addButton}
              onPress={() => router.push('/(app)/tickets/new')}
            >
              <Plus color={colors.text} size={20} />
            </Pressable>
          ) : null}
        </View>
      </DashboardCard>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        {!error && visibleTickets.length === 0 ? (
          <Text style={styles.empty}>No tickets found.</Text>
        ) : null}
        {visibleTickets.map((ticket) => (
          <Pressable
            key={ticket.id}
            onPress={() => router.push(`/(app)/tickets/${ticket.id}`)}
          >
            <CyberCard compact style={styles.ticketCard}>
              <View style={[styles.priorityRail, priorityRailStyle(ticket.priority)]} />
              <View style={styles.ticketContent}>
                <View style={styles.cardTop}>
                  <View style={styles.ticketIdentity}>
                    <Text style={styles.code}>{ticket.ticketCode}</Text>
                    <StatusPill label={ticket.status} tone={statusTone(ticket.status)} />
                  </View>
                  <View style={styles.cardActions}>
                    {can(PERMISSIONS.TICKETS_CANCEL) ? (
                      <Pressable
                        disabled={deletingTicketId === ticket.id}
                        style={styles.deleteButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleDeleteTicket(ticket);
                        }}
                      >
                        <Trash2 color={colors.red} size={17} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.title}>
                  {ticket.title}
                </Text>
                <Text numberOfLines={2} style={styles.description}>
                  {ticket.description ?? 'No description recorded.'}
                </Text>
                <Text numberOfLines={1} style={styles.metadata}>
                  {formatTicketMeta(ticket, technicianNames)}
                </Text>
              </View>
            </CyberCard>
          </Pressable>
        ))}
      </View>

      {can(PERMISSIONS.TICKETS_CREATE) ? (
        <ActionButton
          icon={Plus}
          label="Add ticket"
          onPress={() => router.push('/(app)/tickets/new')}
        />
      ) : null}
    </Screen>
  );
}

function priorityToneForFilter(priority: PriorityFilter) {
  if (priority === 'ALL') return 'cyan';
  return priorityTone(priority);
}

function priorityRailStyle(priority: TicketPriority) {
  if (priority === 'CRITICAL') return { backgroundColor: colors.red };
  if (priority === 'HIGH') return { backgroundColor: colors.amber };
  if (priority === 'MEDIUM') return { backgroundColor: colors.cyan };
  return { backgroundColor: colors.green };
}

function formatTicketMeta(
  ticket: TicketProps,
  technicianNames: Record<string, string>,
) {
  const assignee = ticket.assigneeUserId
    ? technicianNames[ticket.assigneeUserId] ?? 'Technician assigned'
    : 'Unassigned';
  const updatedAt = formatShortTime(ticket.updatedAt ?? ticket.createdAt);

  return `${assignee} · ${ticket.priority} · Updated ${updatedAt}`;
}

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.textSubtle,
    fontSize: typography.micro,
    fontWeight: '800',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    marginLeft: 'auto',
    borderRadius: 16,
    backgroundColor: colors.cyan,
  },
  list: {
    gap: spacing.md,
  },
  ticketCard: {
    flexDirection: 'row',
    padding: 0,
    overflow: 'hidden',
  },
  priorityRail: {
    width: 6,
  },
  ticketContent: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ticketIdentity: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.redSoft,
    backgroundColor: colors.cardDark,
  },
  code: {
    color: colors.textSubtle,
    fontSize: typography.micro,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  metadata: {
    color: colors.textSubtle,
    fontSize: typography.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  error: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
