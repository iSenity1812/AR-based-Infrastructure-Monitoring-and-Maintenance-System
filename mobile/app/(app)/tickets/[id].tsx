import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Check, CheckCircle2, Clock3, Link2, MessageSquare, MoreHorizontal, ScanLine } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getIncident } from '../../../src/api/incidents';
import { acknowledgeTicket, addTicketComment, attachTicketEvidence, createEvidenceUploadUrl, getTicket, resolveTicket } from '../../../src/api/tickets';
import { useAuth } from '../../../src/auth/auth-context';
import { ActionButton } from '../../../src/components/action-button';
import { CyberCard } from '../../../src/components/cyber-card';
import { FieldInput } from '../../../src/components/field-input';
import { Screen } from '../../../src/components/screen';
import { StatusPill } from '../../../src/components/status-pill';
import { relativeTime, statusTone } from '../../../src/components/ticket-card';
import { PERMISSIONS } from '../../../src/constants/permissions';
import { openWebAr } from '../../../src/ar/open-webar';
import { useTheme } from '../../../src/theme/theme-context';
import { radii, spacing, type ThemeColors } from '../../../src/theme/tokens';
import type { IncidentProps } from '../../../src/types/incident';
import type { TicketProps } from '../../../src/types/ticket';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, can } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [ticket, setTicket] = useState<TicketProps | null>(null);
  const [incident, setIncident] = useState<IncidentProps | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setBusy(true);
    try {
      const next = await getTicket(id, session.accessToken); setTicket(next);
      setIncident(next.incidentId ? await getIncident(next.incidentId, session.accessToken).catch(() => null) : null);
    } catch (caught) { Alert.alert('Ticket unavailable', caught instanceof Error ? caught.message : 'Could not load ticket.'); }
    finally { setBusy(false); }
  }, [id, session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const comments = useMemo(() => (ticket?.activities ?? []).filter((item) => item.type === 'COMMENT_ADDED' && item.message).slice().reverse(), [ticket]);
  const evidence = useMemo(() => (ticket?.evidence ?? []).slice().reverse(), [ticket]);

  async function runAction(action: () => Promise<unknown>, failure: string) { setBusy(true); try { await action(); await load(); } catch (caught) { Alert.alert(failure, caught instanceof Error ? caught.message : failure); } finally { setBusy(false); } }
  async function submitComment() { if (!session || !ticket || !comment.trim()) return; const value = comment.trim(); setComment(''); await runAction(() => addTicketComment(ticket.id, value, session.accessToken), 'Could not add update'); }
  function completeWork() { if (!session || !ticket) return; Alert.alert('Complete field work?', 'The operations team will be notified that this ticket is ready for review.', [{ text: 'Not yet', style: 'cancel' }, { text: 'Complete', onPress: () => void runAction(() => resolveTicket(ticket.id, session.accessToken), 'Could not complete ticket') }]); }
  async function handleOpenWebAr() { try { await openWebAr(); } catch (caught) { Alert.alert('Could not open WebAR', caught instanceof Error ? caught.message : 'Check the configured WebAR URL and try again.'); } }

  async function uploadEvidence() {
    if (!session || !ticket) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Photo permission required', 'Allow photo access to attach field evidence.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0]; const fileName = asset.fileName ?? `field-evidence-${Date.now()}.jpg`; const mimeType = asset.mimeType ?? 'image/jpeg';
    await runAction(async () => { const upload = await createEvidenceUploadUrl(ticket.id, fileName, mimeType, session.accessToken); const blob = await (await fetch(asset.uri)).blob(); const response = await fetch(upload.uploadUrl, { method: 'PUT', headers: upload.headers, body: blob }); if (!response.ok) throw new Error(`Upload failed (${response.status}).`); await attachTicketEvidence(ticket.id, { type: upload.type, storageKey: upload.storageKey, url: upload.objectUrl, fileName, mimeType }, session.accessToken); }, 'Could not attach evidence');
  }

  if (!ticket) return <Screen refreshing={busy} onRefresh={load}><DetailHeader title="Ticket details" styles={styles} colors={colors} /><CyberCard><Text style={styles.muted}>Loading field workflow…</Text></CyberCard></Screen>;
  const isMine = ticket.assigneeUserId === session?.user.userId;
  const resolved = ['RESOLVED', 'CLOSED'].includes(ticket.status);
  return (
    <Screen refreshing={busy} onRefresh={load}>
      <DetailHeader title={ticket.ticketCode} styles={styles} colors={colors} />
      <View style={styles.titleBlock}><View style={styles.pills}><StatusPill label={ticket.priority} tone={ticket.priority === 'CRITICAL' ? 'red' : ticket.priority === 'HIGH' ? 'amber' : 'cyan'} /><StatusPill label={ticket.status} tone={statusTone(ticket.status)} /></View><Text style={styles.title}>{ticket.title}</Text><Text style={styles.description}>{ticket.description ?? 'No field instructions were recorded.'}</Text></View>

      {incident ? <Pressable onPress={() => router.push(`/(app)/incidents/${incident.id}`)} style={styles.incidentCard}><View style={styles.incidentIcon}><Link2 color={colors.purple} size={20} /></View><View style={styles.incidentCopy}><Text style={styles.incidentLabel}>SOURCE INCIDENT · {incident.incidentCode}</Text><Text numberOfLines={2} style={styles.incidentTitle}>{incident.title}</Text></View><StatusPill label={incident.severity} tone={incident.severity === 'CRITICAL' ? 'red' : 'amber'} /></Pressable> : null}

      <CyberCard><Text style={styles.sectionTitle}>Work progress</Text><View style={styles.steps}><Step label="Assigned" done /><View style={[styles.stepLine, ticket.acknowledgedAt && styles.stepLineDone]} /><Step label="Acknowledged" done={Boolean(ticket.acknowledgedAt)} /><View style={[styles.stepLine, resolved && styles.stepLineDone]} /><Step label="Completed" done={resolved} /></View><View style={styles.timeRow}><Clock3 color={colors.textMuted} size={14} /><Text style={styles.timeText}>Updated {relativeTime(ticket.updatedAt)}</Text></View></CyberCard>

      <View style={styles.actionGrid}>
        <Pressable accessibilityHint="Opens the WebAR experience in your browser" accessibilityRole="button" onPress={() => void handleOpenWebAr()} style={styles.arAction}><ScanLine color="#FFFFFF" size={23} /><View><Text style={styles.arTitle}>Open WebAR</Text><Text style={styles.arSubtitle}>Launch browser AR view</Text></View></Pressable>
        {isMine && !ticket.acknowledgedAt && can(PERMISSIONS.TICKETS_ACKNOWLEDGE) ? <Pressable disabled={busy} onPress={() => session && runAction(() => acknowledgeTicket(ticket.id, session.accessToken), 'Could not acknowledge ticket')} style={styles.secondaryAction}><Check color={colors.cyan} size={22} /><Text style={styles.secondaryActionText}>Acknowledge</Text></Pressable> : null}
      </View>
      {isMine && ticket.acknowledgedAt && !resolved && can(PERMISSIONS.TICKETS_RESOLVE) ? <ActionButton disabled={busy} icon={CheckCircle2} label="Mark field work completed" onPress={completeWork} /> : null}

      <CyberCard><View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Field updates</Text><Text style={styles.sectionSubtitle}>{comments.length} notes from the workflow</Text></View><MessageSquare color={colors.cyan} size={20} /></View>{can(PERMISSIONS.TICKETS_COMMENT) ? <><FieldInput label="Add a work note" multiline value={comment} onChangeText={setComment} placeholder="What did you inspect or repair?" style={styles.commentInput} /><ActionButton disabled={busy || !comment.trim()} label="Post update" variant="secondary" onPress={() => void submitComment()} /></> : null}<View style={styles.timeline}>{comments.slice(0, 5).map((item) => <View key={item.id} style={styles.timelineItem}><View style={styles.timelineDot} /><View style={styles.timelineCopy}><Text style={styles.comment}>{item.message}</Text><Text style={styles.commentMeta}>{formatDate(item.createdAt)}</Text></View></View>)}{!comments.length ? <Text style={styles.muted}>No field updates yet.</Text> : null}</View></CyberCard>

      <CyberCard><View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Evidence</Text><Text style={styles.sectionSubtitle}>{evidence.length} attachments</Text></View><Camera color={colors.cyan} size={20} /></View><View style={styles.evidenceGrid}>{evidence.map((item) => item.url && item.mimeType?.startsWith('image/') ? <Image key={item.id} source={{ uri: item.url }} style={styles.evidenceImage} /> : <View key={item.id} style={styles.evidenceFile}><Camera color={colors.textMuted} size={20} /><Text numberOfLines={1} style={styles.evidenceName}>{item.fileName ?? item.type}</Text></View>)}</View>{can(PERMISSIONS.TICKETS_EVIDENCE_ATTACH) ? <ActionButton disabled={busy} icon={Camera} label="Attach field photo" variant="secondary" onPress={() => void uploadEvidence()} /> : null}</CyberCard>
    </Screen>
  );

  function Step({ label, done }: { label: string; done?: boolean }) { return <View style={styles.step}><View style={[styles.stepDot, done && styles.stepDotDone]}>{done ? <Check color="#FFFFFF" size={13} /> : null}</View><Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{label}</Text></View>; }
}

function DetailHeader({ title, styles, colors }: { title: string; styles: ReturnType<typeof createStyles>; colors: ThemeColors }) { return <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.headerButton}><ArrowLeft color={colors.text} size={20} /></Pressable><Text style={styles.headerTitle}>{title}</Text><View style={styles.headerButton}><MoreHorizontal color={colors.text} size={20} /></View></View>; }
function formatDate(value: string) { return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, headerButton: { alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, headerTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  titleBlock: { gap: spacing.md }, pills: { flexDirection: 'row', gap: spacing.sm }, title: { color: colors.text, fontSize: 26, fontWeight: '900', lineHeight: 32 }, description: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  incidentCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radii.xl, backgroundColor: colors.purpleSoft }, incidentIcon: { alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 15, backgroundColor: colors.panel }, incidentCopy: { flex: 1, gap: 3 }, incidentLabel: { color: colors.purple, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }, incidentTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, sectionSubtitle: { marginTop: 3, color: colors.textMuted, fontSize: 10 },
  steps: { alignItems: 'flex-start', flexDirection: 'row', marginTop: spacing.sm }, step: { alignItems: 'center', width: 74, gap: 7 }, stepDot: { alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 10, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.cardDark }, stepDotDone: { borderColor: colors.green, backgroundColor: colors.green }, stepLabel: { color: colors.textSubtle, fontSize: 8, fontWeight: '700', textAlign: 'center' }, stepLabelDone: { color: colors.text }, stepLine: { flex: 1, height: 2, marginTop: 12, backgroundColor: colors.border }, stepLineDone: { backgroundColor: colors.green }, timeRow: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 5, marginTop: spacing.sm }, timeText: { color: colors.textMuted, fontSize: 10 },
  actionGrid: { flexDirection: 'row', gap: spacing.md }, arAction: { alignItems: 'center', flex: 2, flexDirection: 'row', gap: spacing.md, minHeight: 68, paddingHorizontal: spacing.lg, borderRadius: radii.xl, backgroundColor: colors.hero }, arTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' }, arSubtitle: { marginTop: 2, color: '#9FB1D7', fontSize: 9 }, secondaryAction: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 5, minHeight: 68, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, secondaryActionText: { color: colors.cyan, fontSize: 10, fontWeight: '800' },
  commentInput: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: 'top' }, timeline: { gap: spacing.md }, timelineItem: { flexDirection: 'row', gap: spacing.md }, timelineDot: { width: 9, height: 9, marginTop: 5, borderRadius: 5, backgroundColor: colors.cyan }, timelineCopy: { flex: 1, gap: 4, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, comment: { color: colors.text, fontSize: 12, lineHeight: 18 }, commentMeta: { color: colors.textSubtle, fontSize: 9 }, muted: { color: colors.textMuted, fontSize: 12 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, evidenceImage: { width: 88, height: 88, borderRadius: radii.lg, backgroundColor: colors.cardDark }, evidenceFile: { alignItems: 'center', justifyContent: 'center', gap: 5, width: 88, height: 88, padding: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.cardDark }, evidenceName: { color: colors.textMuted, fontSize: 8 },
});
