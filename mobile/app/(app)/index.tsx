import { router, useFocusEffect } from 'expo-router';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, Link2, QrCode, RotateCcw, UsersRound } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { listTechnicians, type TechnicianOption } from '../../src/api/technicians';
import { listTickets } from '../../src/api/tickets';
import { useAuth } from '../../src/auth/auth-context';
import { AppHeader } from '../../src/components/app-header';
import { CyberCard } from '../../src/components/cyber-card';
import { Screen } from '../../src/components/screen';
import { PriorityBars, TicketStatusChart } from '../../src/components/ticket-charts';
import { TicketCard } from '../../src/components/ticket-card';
import { useTheme } from '../../src/theme/theme-context';
import { radii, spacing, type ThemeColors } from '../../src/theme/tokens';
import type { TicketProps } from '../../src/types/ticket';

export default function OverviewScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tickets, setTickets] = useState<TicketProps[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [nextTickets, technicianDirectory] = await Promise.all([
        listTickets(session.accessToken),
        listTechnicians(session.accessToken).catch(() => []),
      ]);
      setTickets(nextTickets);
      setTechnicians(technicianDirectory);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sync technician workspace.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { void loadDashboard(); }, [loadDashboard]));

  const activeTickets = useMemo(() => tickets.filter(isActive), [tickets]);
  const myTickets = useMemo(
    () => activeTickets.filter((ticket) => ticket.assigneeUserId === session?.user.userId),
    [activeTickets, session?.user.userId],
  );
  const teamTickets = useMemo(
    () => activeTickets.filter((ticket) => ticket.assigneeUserId && ticket.assigneeUserId !== session?.user.userId),
    [activeTickets, session?.user.userId],
  );
  const nextTickets = useMemo(
    () => [...myTickets].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()).slice(0, 3),
    [myTickets],
  );
  const urgent = myTickets.filter((ticket) => ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL').length;
  const incidentTickets = myTickets.filter((ticket) => ticket.incidentId).length;
  const unassigned = activeTickets.filter((ticket) => !ticket.assigneeUserId).length;
  const completedToday = tickets.filter((ticket) => ticket.assigneeUserId === session?.user.userId && ['RESOLVED', 'CLOSED'].includes(ticket.status) && isToday(ticket.updatedAt)).length;
  const teamWorkloads = useMemo(() => buildTeamWorkloads(teamTickets, technicians), [teamTickets, technicians]);

  return (
    <Screen refreshing={loading} onRefresh={loadDashboard}>
      <AppHeader />
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={styles.heading}>Good day, {firstName(session?.user.fullName)}</Text>
          <Text style={styles.headingSubtitle}>{formatDate()}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <CircleAlert color={colors.red} size={19} />
          <View style={styles.errorCopy}><Text style={styles.errorTitle}>Workspace could not sync</Text><Text numberOfLines={2} style={styles.error}>{error}</Text></View>
          <Pressable accessibilityLabel="Retry dashboard sync" onPress={() => void loadDashboard()} style={styles.retry}><RotateCcw color={colors.red} size={17} /></Pressable>
        </View>
      ) : null}

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>FIELD STATUS</Text></View>
          <Text style={styles.heroCount}>{myTickets.length ? `${myTickets.length} active` : 'Available'}</Text>
        </View>
        <Text style={styles.heroTitle}>{myTickets.length ? 'Your queue is ready' : 'No assigned work'}</Text>
        <Text style={styles.heroCopy}>{myTickets.length ? nextActionCopy(nextTickets[0], urgent) : 'You are available for a new assignment or an asset scan.'}</Text>
        <Pressable
          onPress={() => myTickets.length ? router.push(`/(app)/tickets/${nextTickets[0].id}`) : router.push('/(app)/ar/scan')}
          style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}
        >
          {myTickets.length ? <Clock3 color="#FFFFFF" size={17} /> : <QrCode color="#FFFFFF" size={17} />}
          <Text style={styles.heroActionText}>{myTickets.length ? 'Open next ticket' : 'Scan an asset'}</Text>
          <ArrowRight color="#FFFFFF" size={16} />
        </Pressable>
        <View style={styles.heroStats}>
          <HeroStat icon={Clock3} label="My active" value={myTickets.length} />
          <HeroStat icon={CircleAlert} label="Urgent" value={urgent} />
          <HeroStat icon={CheckCircle2} label="Done today" value={completedToday} last />
        </View>
      </View>

      <SectionHeader title="My next tickets" subtitle="Ordered by operational priority" action="View all" onPress={() => router.push('/(app)/tickets')} />
      <View style={styles.list}>
        {nextTickets.length ? nextTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={() => router.push(`/(app)/tickets/${ticket.id}`)} />) : <EmptyAssignment onScan={() => router.push('/(app)/ar/scan')} />}
      </View>

      <SectionHeader title="Team context" subtitle="Work waiting across field operations" />
      <View style={styles.contextGrid}>
        <ContextMetric icon={UsersRound} label="Other active" value={teamTickets.length} tone={colors.purple} soft={colors.purpleSoft} />
        <ContextMetric icon={CircleAlert} label="Unassigned" value={unassigned} tone={colors.amber} soft={colors.amberSoft} />
        <ContextMetric icon={Link2} label="My incidents" value={incidentTickets} tone={colors.cyan} soft={colors.cyanSoft} />
      </View>

      <SectionHeader title="Ticket flow" subtitle="Current team distribution" />
      <CyberCard><TicketStatusChart tickets={tickets} /></CyberCard>

      {activeTickets.length ? (
        <>
          <SectionHeader title="Priority pressure" subtitle="Open workload across the team" />
          <CyberCard><PriorityBars tickets={activeTickets} /></CyberCard>
        </>
      ) : null}

      <SectionHeader title="Other technicians" subtitle={`${teamWorkloads.length} technicians · ${teamTickets.length} active tickets`} />
      <View style={styles.teamList}>
        {teamWorkloads.slice(0, 4).map((workload, index) => {
          const state = workloadState(workload, colors);
          return (
            <View key={workload.technicianId} style={[styles.teamRow, index === Math.min(teamWorkloads.length, 4) - 1 && styles.teamRowLast]}>
              <View style={styles.teamAvatar}><Text style={styles.teamInitial}>{workload.isKnown ? initials(workload.name) : '?'}</Text></View>
              <View style={styles.teamCopy}>
                <View style={styles.teamNameRow}><Text numberOfLines={1} style={styles.teamName}>{workload.name}</Text><View style={[styles.workloadPill, { backgroundColor: state.soft }]}><View style={[styles.workloadDot, { backgroundColor: state.color }]} /><Text style={[styles.workloadLabel, { color: state.color }]}>{state.label}</Text></View></View>
                <Text style={styles.teamMetrics}>{workload.isKnown ? `${workload.activeCount} active · ${workload.urgentCount} urgent` : `${workload.activeCount} active · assignee unavailable`}</Text>
                <Text numberOfLines={1} style={styles.teamTask}>Focus: {workload.focusTicket.title}</Text>
              </View>
            </View>
          );
        })}
        {!teamWorkloads.length ? <View style={styles.teamEmpty}><UsersRound color={colors.green} size={22} /><View style={styles.teamEmptyCopyWrap}><Text style={styles.teamEmptyTitle}>Other queues are clear</Text><Text style={styles.teamEmptyCopy}>No other technician currently has active work.</Text></View></View> : null}
      </View>
    </Screen>
  );

  function HeroStat({ icon: Icon, label, value, last }: { icon: typeof Clock3; label: string; value: number; last?: boolean }) {
    return <View style={[styles.heroStat, last && styles.heroStatLast]}><Icon color="#AFC1FF" size={16} /><View><Text style={styles.heroStatValue}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View></View>;
  }
  function ContextMetric({ icon: Icon, label, value, tone, soft }: { icon: typeof Clock3; label: string; value: number; tone: string; soft: string }) {
    return <View style={styles.contextMetric}><View style={[styles.contextIcon, { backgroundColor: soft }]}><Icon color={tone} size={18} /></View><Text style={styles.contextValue}>{value}</Text><Text numberOfLines={1} style={styles.contextLabel}>{label}</Text></View>;
  }
  function EmptyAssignment({ onScan }: { onScan: () => void }) {
    return <View style={styles.empty}><View style={styles.emptyIcon}><CheckCircle2 color={colors.green} size={24} /></View><View style={styles.emptyCopy}><Text style={styles.emptyTitle}>You are available</Text><Text style={styles.emptyText}>No active tickets are assigned to you.</Text></View><Pressable onPress={onScan} style={styles.emptyAction}><QrCode color={colors.cyan} size={16} /><Text style={styles.emptyActionText}>Scan asset</Text></Pressable></View>;
  }
}

function SectionHeader({ title, subtitle, action, onPress }: { title: string; subtitle?: string; action?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>{subtitle ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>{subtitle}</Text> : null}</View>{action ? <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 }}><Text style={{ color: colors.cyan, fontSize: 12, fontWeight: '800' }}>{action}</Text><ArrowRight color={colors.cyan} size={15} /></Pressable> : null}</View>;
}

function buildTeamWorkloads(teamTickets: TicketProps[], technicians: TechnicianOption[]) {
  const directory = new Map(technicians.map((technician) => [technician.id, technician]));
  const groups = new Map<string, { technician?: TechnicianOption; tickets: TicketProps[] }>();
  for (const ticket of teamTickets) {
    const technicianId = ticket.assigneeUserId;
    if (!technicianId) continue;
    const group = groups.get(technicianId) ?? { technician: directory.get(technicianId), tickets: [] };
    group.tickets.push(ticket);
    groups.set(technicianId, group);
  }
  return [...groups.entries()].map(([technicianId, group]) => {
    const sortedTickets = [...group.tickets].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
    return {
      technicianId,
      name: group.technician?.fullName ?? 'Unknown technician',
      isKnown: Boolean(group.technician),
      activeCount: sortedTickets.length,
      urgentCount: sortedTickets.filter((ticket) => ['HIGH', 'CRITICAL'].includes(ticket.priority)).length,
      criticalCount: sortedTickets.filter((ticket) => ticket.priority === 'CRITICAL').length,
      inProgressCount: sortedTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
      focusTicket: sortedTickets[0],
    };
  }).sort((a, b) => b.criticalCount - a.criticalCount || b.urgentCount - a.urgentCount || b.activeCount - a.activeCount);
}

function nextActionCopy(ticket: TicketProps | undefined, urgentCount: number) {
  if (!ticket) return 'Review your active queue and continue field work.';
  if (ticket.priority === 'CRITICAL') return `Critical work requires attention: ${ticket.ticketCode}.`;
  if (urgentCount) return `${urgentCount} urgent ${urgentCount === 1 ? 'ticket needs' : 'tickets need'} attention.`;
  return `Continue with ${ticket.ticketCode} when you are ready.`;
}
function isActive(ticket: TicketProps) { return !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status); }
function priorityRank(priority: TicketProps['priority']) { return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[priority]; }
function isToday(value: string) { const date = new Date(value); const today = new Date(); return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate(); }
function initials(name: string) { return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase(); }
function workloadState(workload: { activeCount: number; urgentCount: number; criticalCount: number; inProgressCount: number; isKnown: boolean }, colors: ThemeColors) {
  if (!workload.isKnown) return { label: 'Reassign', color: colors.red, soft: colors.redSoft };
  if (workload.criticalCount) return { label: 'Critical', color: colors.red, soft: colors.redSoft };
  if (workload.activeCount >= 3 || workload.urgentCount >= 2) return { label: 'High load', color: colors.amber, soft: colors.amberSoft };
  if (workload.inProgressCount) return { label: 'In field', color: colors.cyan, soft: colors.cyanSoft };
  return { label: 'Active', color: colors.green, soft: colors.greenSoft };
}
function firstName(name?: string) { return name?.trim().split(/\s+/).slice(-1)[0] ?? 'Technician'; }
function formatDate() { return new Intl.DateTimeFormat('en', { weekday: 'long', day: '2-digit', month: 'short' }).format(new Date()); }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, headingCopy: { flex: 1 }, eyebrow: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, heading: { marginTop: 4, color: colors.text, fontSize: 26, fontWeight: '900' }, headingSubtitle: { marginTop: 4, color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  errorBox: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.red, backgroundColor: colors.redSoft }, errorCopy: { flex: 1, gap: 2 }, errorTitle: { color: colors.red, fontSize: 12, fontWeight: '900' }, error: { color: colors.textMuted, fontSize: 11 }, retry: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: radii.md },
  hero: { gap: spacing.md, padding: spacing.xl, overflow: 'hidden', borderRadius: radii.xxl, backgroundColor: colors.hero }, heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, livePill: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.09)' }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4BE0A5' }, liveText: { color: '#C7D4EE', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }, heroCount: { color: '#AFC1E8', fontSize: 11, fontWeight: '800' }, heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' }, heroCopy: { color: '#C5D0E8', fontSize: 13, lineHeight: 19 }, heroAction: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radii.md, backgroundColor: colors.blue }, heroActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  heroStats: { flexDirection: 'row', paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }, heroStat: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 7, paddingTop: spacing.md, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' }, heroStatLast: { borderRightWidth: 0 }, heroStatValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }, heroStatLabel: { color: '#8EA5D6', fontSize: 9 },
  list: { gap: spacing.md }, empty: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, emptyIcon: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 17, backgroundColor: colors.greenSoft }, emptyCopy: { flex: 1, gap: 3 }, emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, emptyText: { color: colors.textMuted, fontSize: 11 }, emptyAction: { alignItems: 'center', flexDirection: 'row', gap: 5, minHeight: 40, paddingHorizontal: spacing.sm }, emptyActionText: { color: colors.cyan, fontSize: 10, fontWeight: '900' },
  contextGrid: { flexDirection: 'row', gap: spacing.sm }, contextMetric: { alignItems: 'center', flex: 1, gap: 5, paddingVertical: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, contextIcon: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 14 }, contextValue: { color: colors.text, fontSize: 20, fontWeight: '900' }, contextLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  teamList: { overflow: 'hidden', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, teamRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }, teamRowLast: { borderBottomWidth: 0 }, teamAvatar: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 16, backgroundColor: colors.purpleSoft }, teamInitial: { color: colors.purple, fontSize: 12, fontWeight: '900' }, teamCopy: { flex: 1, gap: 3 }, teamNameRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, teamName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '900' }, teamMetrics: { color: colors.text, fontSize: 10, fontWeight: '700' }, teamTask: { color: colors.textMuted, fontSize: 10 }, workloadPill: { alignItems: 'center', flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }, workloadDot: { width: 5, height: 5, borderRadius: 3 }, workloadLabel: { fontSize: 8, fontWeight: '900' }, teamEmpty: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg }, teamEmptyCopyWrap: { flex: 1 }, teamEmptyTitle: { color: colors.text, fontSize: 13, fontWeight: '800' }, teamEmptyCopy: { marginTop: 3, color: colors.textMuted, fontSize: 11 },
});
