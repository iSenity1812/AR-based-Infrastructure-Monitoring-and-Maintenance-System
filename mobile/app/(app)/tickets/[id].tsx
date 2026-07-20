import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Camera, CheckCircle2, ChevronDown, MessageSquare, UserPlus, UserRound } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  acknowledgeTicket,
  addTicketComment,
  assignTicket,
  attachTicketEvidence,
  closeTicket,
  createEvidenceUploadUrl,
  getTicket,
  listTickets,
  resolveTicket,
} from '../../../src/api/tickets';
import { listTechnicians, type TechnicianOption } from '../../../src/api/technicians';
import { useAuth } from '../../../src/auth/auth-context';
import { ActionButton } from '../../../src/components/action-button';
import { BrandHeader } from '../../../src/components/brand-header';
import { CyberCard } from '../../../src/components/cyber-card';
import { FieldInput } from '../../../src/components/field-input';
import { Screen } from '../../../src/components/screen';
import { StatusPill } from '../../../src/components/status-pill';
import { PERMISSIONS } from '../../../src/constants/permissions';
import { colors, spacing, typography } from '../../../src/theme/tokens';
import type { TicketProps } from '../../../src/types/ticket';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, can } = useAuth();
  const [ticket, setTicket] = useState<TicketProps | null>(null);
  const [comment, setComment] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [technicianDropdownOpen, setTechnicianDropdownOpen] = useState(false);
  const [technicianLoadError, setTechnicianLoadError] = useState<string | null>(null);
  const [assignmentTickets, setAssignmentTickets] = useState<TicketProps[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const comments = useMemo(
    () =>
      (ticket?.activities ?? [])
        .filter((activity) => activity.type === 'COMMENT_ADDED' && activity.message)
        .slice()
        .reverse(),
    [ticket?.activities],
  );
  const evidenceItems = useMemo(
    () => (ticket?.evidence ?? []).slice().reverse(),
    [ticket?.evidence],
  );
  const selectedTechnician = useMemo(
    () => technicians.find((technician) => technician.id === assigneeUserId) ?? null,
    [assigneeUserId, technicians],
  );

  useEffect(() => {
    if (!session) return;

    let mounted = true;
    const nextNames: Record<string, string> = {
      [session.user.userId]: session.user.fullName,
    };

    void (async () => {
      try {
        const technicians = await listTechnicians(session.accessToken);
        if (mounted) {
          setTechnicians(technicians);
          setTechnicianLoadError(null);
        }

        for (const technician of technicians) {
          nextNames[technician.id] = technician.fullName;
        }
      } catch (caught) {
        if (mounted) {
          setTechnicians([]);
          setTechnicianLoadError(
            caught instanceof Error ? caught.message : 'Could not load technicians.',
          );
        }
      }

      try {
        const tickets = await listTickets(session.accessToken);
        if (mounted) {
          setAssignmentTickets(tickets);
        }
      } catch {
        if (mounted) {
          setAssignmentTickets([]);
        }
      }

      if (mounted) {
        setUserNames(nextNames);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session?.accessToken, session?.user.fullName, session?.user.userId]);

  async function loadAssignmentTickets() {
    if (!session) return;

    try {
      setAssignmentTickets(await listTickets(session.accessToken));
    } catch {
      setAssignmentTickets([]);
    }
  }

  async function loadTicket() {
    if (!session || !id) return;
    setBusy(true);
    try {
      const nextTicket = await getTicket(id, session.accessToken);
      setTicket(nextTicket);
      setAssigneeUserId(nextTicket.assigneeUserId ?? '');
    } catch (caught) {
      Alert.alert('Ticket load failed', caught instanceof Error ? caught.message : 'Could not load ticket.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadTicket();
  }, [id, session?.accessToken]);

  useFocusEffect(
    useCallback(() => {
      if (!session || !id) return;
      void loadTicket();
      void loadAssignmentTickets();
    }, [id, session?.accessToken]),
  );

  async function handleAssign() {
    if (!session || !ticket || !assigneeUserId.trim()) return;

    const selectedActiveTickets = assignmentTickets.filter(
      (item) =>
        item.id !== ticket.id &&
        item.assigneeUserId === assigneeUserId &&
        isActiveTicket(item),
    );

    if (selectedActiveTickets.length > 0) {
      const technicianName = selectedTechnician?.fullName ?? resolveUserName(assigneeUserId);
      Alert.alert(
        'Technician has active tickets',
        `${technicianName} is already handling ${selectedActiveTickets.length} active ticket(s). You can still assign this ticket to them. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Assign anyway',
            onPress: () => void performAssign(),
          },
        ],
      );
      return;
    }

    await performAssign();
  }

  async function performAssign() {
    if (!session || !ticket || !assigneeUserId.trim()) return;

    setBusy(true);
    try {
      setTicket(await assignTicket(ticket.id, assigneeUserId.trim(), session.accessToken));
      await loadAssignmentTickets();
    } catch (caught) {
      Alert.alert('Assign failed', caught instanceof Error ? caught.message : 'Could not assign ticket.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAcknowledge() {
    if (!session || !ticket) return;
    setBusy(true);
    try {
      await acknowledgeTicket(ticket.id, session.accessToken);
      await loadTicket();
      await loadAssignmentTickets();
    } catch (caught) {
      Alert.alert('Acknowledge failed', caught instanceof Error ? caught.message : 'Could not acknowledge ticket.');
    } finally {
      setBusy(false);
    }
  }

  async function handleComment() {
    if (!session || !ticket || !comment.trim()) return;
    setBusy(true);
    try {
      await addTicketComment(ticket.id, comment.trim(), session.accessToken);
      setComment('');
      await loadTicket();
    } catch (caught) {
      Alert.alert('Comment failed', caught instanceof Error ? caught.message : 'Could not add comment.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve() {
    if (!session || !ticket) return;

    Alert.alert(
      'Mark ticket as completed?',
      'This will notify the operator that field work is done and the ticket is ready for final confirmation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete work',
          onPress: () => void performResolve(),
        },
      ],
    );
  }

  async function performResolve() {
    if (!session || !ticket) return;

    setBusy(true);
    try {
      await resolveTicket(ticket.id, session.accessToken);
      await loadTicket();
      await loadAssignmentTickets();
    } catch (caught) {
      Alert.alert('Resolve failed', caught instanceof Error ? caught.message : 'Could not mark ticket as resolved.');
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    if (!session || !ticket) return;

    Alert.alert(
      'Final confirmation',
      'Confirm this ticket is fully completed and remove it from the active ticket list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm and close',
          onPress: () => void performClose(),
        },
      ],
    );
  }

  async function performClose() {
    if (!session || !ticket) return;

    setBusy(true);
    try {
      await closeTicket(ticket.id, session.accessToken);
      router.replace('/(app)/tickets');
    } catch (caught) {
      Alert.alert('Close failed', caught instanceof Error ? caught.message : 'Could not close ticket.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadEvidence() {
    if (!session || !ticket) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Photo access is required for evidence upload.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.86,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const fileName = asset.fileName ?? `evidence-${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? 'image/jpeg';
    setBusy(true);

    try {
      const upload = await createEvidenceUploadUrl(
        ticket.id,
        fileName,
        mimeType,
        session.accessToken,
      );
      const fileResponse = await fetch(asset.uri);
      const blob = await fileResponse.blob();
      const uploadResponse = await fetch(upload.uploadUrl, {
        method: upload.method,
        headers: upload.headers,
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`R2 upload failed with ${uploadResponse.status}.`);
      }

      await attachTicketEvidence(
        ticket.id,
        {
          type: upload.type,
          storageKey: upload.storageKey,
          url: upload.objectUrl,
          fileName,
          mimeType,
        },
        session.accessToken,
      );
      await loadTicket();
    } catch (caught) {
      Alert.alert('Evidence upload failed', caught instanceof Error ? caught.message : 'Could not upload evidence.');
    } finally {
      setBusy(false);
    }
  }

  function resolveUserName(userId?: string | null) {
    if (!userId) return 'Unknown user';

    return userNames[userId] ?? 'Unknown user';
  }

  function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  function selectedTechnicianSubtitle() {
    if (selectedTechnician) {
      return selectedTechnician.email;
    }

    if (assigneeUserId) {
      return 'Assigned technician is no longer in the active technician list.';
    }

    return 'Tap to select a technician';
  }

  if (!ticket) {
    return (
      <Screen refreshing={busy} onRefresh={loadTicket}>
        <BrandHeader
          title="Ticket detail"
          subtitle="Loading workflow state."
          back
          backHref="/(app)/tickets"
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={busy} onRefresh={loadTicket}>
      <BrandHeader
        eyebrow={ticket.ticketCode}
        title={ticket.title}
        subtitle={ticket.description ?? 'No description recorded.'}
        back
        backHref="/(app)/tickets"
      />

      <CyberCard active>
        <View style={styles.pillRow}>
          <StatusPill label={ticket.status} tone={statusTone(ticket.status)} />
          <StatusPill label={ticket.priority} tone={ticket.priority === 'CRITICAL' ? 'red' : 'amber'} />
          {ticket.acknowledgedAt ? <StatusPill label="acknowledged" tone="green" /> : null}
        </View>
      </CyberCard>

      {can(PERMISSIONS.TICKETS_ASSIGN) ? (
        <CyberCard>
          <Text style={styles.section}>Assignment</Text>
          <View style={styles.dropdownWrap}>
            <Text style={styles.dropdownLabel}>Assignee Technician</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setTechnicianDropdownOpen((open) => !open)}
            >
              <View style={styles.assigneeIcon}>
                <UserRound color={colors.text} size={18} />
              </View>
              <View style={styles.assigneeCopy}>
                <Text style={styles.assigneeName}>
                  {selectedTechnician?.fullName ?? (assigneeUserId ? resolveUserName(assigneeUserId) : 'Select technician')}
                </Text>
                <Text style={styles.assigneeMeta}>{selectedTechnicianSubtitle()}</Text>
              </View>
              <ChevronDown color={colors.textMuted} size={18} />
            </Pressable>
            {technicianLoadError ? (
              <Text style={styles.dropdownError}>{technicianLoadError}</Text>
            ) : null}
            {technicianDropdownOpen ? (
              <View style={styles.dropdownMenu}>
                {technicians.length === 0 ? (
                  <View style={styles.dropdownItem}>
                    <Text style={styles.dropdownItemTitle}>No technicians available</Text>
                    <Text style={styles.dropdownItemMeta}>Try refreshing this ticket.</Text>
                  </View>
                ) : null}
                {technicians.map((technician) => {
                  const activeCount = assignmentTickets.filter(
                    (item) =>
                      item.id !== ticket.id &&
                      item.assigneeUserId === technician.id &&
                      isActiveTicket(item),
                  ).length;

                  return (
                    <Pressable
                      key={technician.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setAssigneeUserId(technician.id);
                        setTechnicianDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownItemTitle}>{technician.fullName}</Text>
                      <Text style={styles.dropdownItemMeta}>
                        {technician.jobTitle ?? technician.username} - {technician.email}
                      </Text>
                      {activeCount > 0 ? (
                        <Text style={styles.dropdownBusy}>
                          Handling {activeCount} active ticket(s) - confirmation required
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
          <ActionButton
            disabled={busy || !assigneeUserId}
            icon={UserPlus}
            label="Assign"
            variant="secondary"
            onPress={handleAssign}
          />
        </CyberCard>
      ) : null}

      {can(PERMISSIONS.TICKETS_ACKNOWLEDGE) && ticket.assigneeUserId === session?.user.userId ? (
        <ActionButton
          disabled={busy || Boolean(ticket.acknowledgedAt)}
          icon={CheckCircle2}
          label={ticket.acknowledgedAt ? 'Acknowledged' : 'Acknowledge'}
          onPress={handleAcknowledge}
        />
      ) : null}

      {can(PERMISSIONS.TICKETS_RESOLVE) &&
      ticket.assigneeUserId === session?.user.userId &&
      Boolean(ticket.acknowledgedAt) &&
      ticket.status !== 'RESOLVED' &&
      ticket.status !== 'CLOSED' ? (
        <ActionButton
          disabled={busy}
          icon={CheckCircle2}
          label="Mark work completed"
          onPress={handleResolve}
        />
      ) : null}

      {can(PERMISSIONS.TICKETS_CLOSE) && ticket.status === 'RESOLVED' ? (
        <ActionButton
          disabled={busy}
          icon={CheckCircle2}
          label="Confirm completion"
          onPress={handleClose}
        />
      ) : null}

      <CyberCard>
        <Text style={styles.section}>Field updates</Text>
        {can(PERMISSIONS.TICKETS_COMMENT) ? (
          <>
            <FieldInput
              label="Comment"
              multiline
              style={styles.multiLine}
              value={comment}
              onChangeText={setComment}
            />
            <ActionButton
              disabled={busy}
              icon={MessageSquare}
              label="Add comment"
              variant="secondary"
              onPress={handleComment}
            />
          </>
        ) : null}
        <View style={styles.commentList}>
          {comments.length === 0 ? (
            <Text style={styles.emptyText}>No comments yet.</Text>
          ) : null}
          {comments.map((activity) => (
            <View key={activity.id} style={styles.commentItem}>
              <Text style={styles.commentMessage}>{activity.message}</Text>
              <Text style={styles.commentMeta}>
                By {resolveUserName(activity.actorUserId)} - {formatTimestamp(activity.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      </CyberCard>

      <CyberCard>
        <Text style={styles.section}>Evidence</Text>
        <View style={styles.evidenceList}>
          {evidenceItems.length === 0 ? (
            <Text style={styles.emptyText}>No evidence attached yet.</Text>
          ) : null}
          {evidenceItems.map((evidence) => {
            const isImage = evidence.url && evidence.mimeType?.startsWith('image/');

            return (
              <View key={evidence.id} style={styles.evidenceItem}>
                {isImage ? (
                  <Image source={{ uri: evidence.url }} style={styles.preview} />
                ) : null}
                <Text style={styles.evidenceTitle}>
                  {evidence.fileName ?? evidence.storageKey ?? evidence.type}
                </Text>
                <Text style={styles.evidenceMeta}>
                  By {resolveUserName(evidence.attachedByUserId)} - {formatTimestamp(evidence.createdAt)}
                </Text>
                {evidence.storageKey ? (
                  <Text numberOfLines={1} style={styles.evidencePath}>
                    {evidence.storageKey}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
        {can(PERMISSIONS.TICKETS_EVIDENCE_ATTACH) ? (
          <ActionButton
            disabled={busy}
            icon={Camera}
            label="Attach photo"
            onPress={handleUploadEvidence}
          />
        ) : null}
      </CyberCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pillRow: {
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
  multiLine: {
    minHeight: 88,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: colors.black,
  },
  commentList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  commentItem: {
    gap: 4,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardDark,
  },
  commentMessage: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  commentMeta: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: '800',
  },
  evidenceList: {
    gap: spacing.md,
  },
  evidenceItem: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.cardDark,
  },
  evidenceTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  evidenceMeta: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: '700',
  },
  evidencePath: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
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
  dropdownBusy: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '800',
  },
});

function isActiveTicket(ticket: TicketProps) {
  return !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status);
}

function statusTone(status: TicketProps['status']) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'green';
  if (status === 'CANCELLED') return 'muted';
  if (status === 'WAITING_FOR_INFO') return 'amber';
  if (status === 'OPEN') return 'cyan';
  return 'purple';
}
