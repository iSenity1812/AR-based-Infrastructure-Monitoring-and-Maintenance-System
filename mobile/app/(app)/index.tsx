import { router, useFocusEffect } from 'expo-router';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, Link2, UsersRound } from 'lucide-react-native';
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
    setLoading(true); setError(null);
    try {
      const [nextTickets, technicians] = await Promise.all([
        listTickets(session.accessToken),
        listTechnicians(session.accessToken).catch(() => []),
      ]);
      setTickets(nextTickets);
      setTechnicians(technicians);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sync technician workspace.');
    } finally { setLoading(false); }
  }, [session]);

  useFocusEffect(useCallback(() => { void loadDashboard(); }, [loadDashboard]));

  const activeTickets = useMemo(() => tickets.filter(isActive), [tickets]);
  const myTickets = useMemo(() => activeTickets.filter((ticket) => ticket.assigneeUserId === session?.user.userId), [activeTickets, session?.user.userId]);
  const teamTickets = useMemo(() => activeTickets.filter((ticket) => ticket.assigneeUserId && ticket.assigneeUserId !== session?.user.userId), [activeTickets, session?.user.userId]);
  const teamWorkloads = useMemo(() => {
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
      const urgentCount = sortedTickets.filter((ticket) => ['HIGH', 'CRITICAL'].includes(ticket.priority)).length;
      const criticalCount = sortedTickets.filter((ticket) => ticket.priority === 'CRITICAL').length;
      const inProgressCount = sortedTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
      return {
        technicianId,
        name: group.technician?.fullName ?? 'Unknown technician',
        isKnown: Boolean(group.technician),
        activeCount: sortedTickets.length,
        urgentCount,
        criticalCount,
        inProgressCount,
        focusTicket: sortedTickets[0],
      };
    }).sort((a, b) => b.criticalCount - a.criticalCount || b.urgentCount - a.urgentCount || b.activeCount - a.activeCount);
  }, [teamTickets, technicians]);
  const unassigned = useMemo(() => activeTickets.filter((ticket) => !ticket.assigneeUserId).length, [activeTickets]);
  const urgent = useMemo(() => myTickets.filter((ticket) => ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL').length, [myTickets]);
  const incidentTickets = useMemo(() => myTickets.filter((ticket) => ticket.incidentId).length, [myTickets]);
  const completed = tickets.filter((ticket) => ticket.assigneeUserId === session?.user.userId && ['RESOLVED', 'CLOSED'].includes(ticket.status)).length;
  const completionRate = Math.round((completed / Math.max(1, completed + myTickets.length)) * 100);
  const nextTickets = [...myTickets].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()).slice(0, 3);

  return (
    <Screen refreshing={loading} onRefresh={loadDashboard}>
      <AppHeader />
      <View style={styles.headingRow}><View><Text style={styles.eyebrow}>TODAY'S WORKSPACE</Text><Text style={styles.heading}>Good day, {firstName(session?.user.fullName)}</Text></View><Text style={styles.date}>{formatDate()}</Text></View>

      <View style={styles.hero}>
        <View style={styles.heroTop}><View><Text style={styles.heroLabel}>FIELD COMPLETION</Text><Text style={styles.heroValue}>{completionRate}%</Text></View><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View></View>
        <Text style={styles.heroCopy}>{myTickets.length ? `${myTickets.length} active tasks in your queue` : 'Your active queue is clear'}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${completionRate}%` }]} /></View>
        <View style={styles.heroStats}><HeroStat icon={Clock3} label="Active" value={myTickets.length} /><HeroStat icon={CircleAlert} label="Urgent" value={urgent} /><HeroStat icon={Link2} label="Incident" value={incidentTickets} /></View>
      </View>

      {error ? <View style={styles.errorBox}><CircleAlert color={colors.red} size={18} /><Text style={styles.error}>{error}</Text></View> : null}

      <View style={styles.kpiGrid}>
        <MiniKpi icon={UsersRound} label="Team active" value={teamTickets.length} tone={colors.purple} soft={colors.purpleSoft} />
        <MiniKpi icon={CircleAlert} label="Unassigned" value={unassigned} tone={colors.amber} soft={colors.amberSoft} />
        <MiniKpi icon={CheckCircle2} label="Completed" value={completed} tone={colors.green} soft={colors.greenSoft} />
      </View>

      <SectionHeader title="My next tickets" action="View all" onPress={() => router.push('/(app)/tickets')} />
      <View style={styles.list}>{nextTickets.length ? nextTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={() => router.push(`/(app)/tickets/${ticket.id}`)} />) : <EmptyCard text="No active tickets assigned to you." />}</View>

      <SectionHeader title="Ticket flow" subtitle="Current team distribution" />
      <CyberCard><TicketStatusChart tickets={tickets} /></CyberCard>

      <SectionHeader title="Priority pressure" subtitle="Open workload across the team" />
      <CyberCard><PriorityBars tickets={activeTickets} /></CyberCard>

      <SectionHeader title="Team workload" subtitle={`${teamWorkloads.length} technicians · ${teamTickets.length} active tickets`} />
      <View style={styles.teamList}>{teamWorkloads.slice(0, 4).map((workload, index) => {
        const state = workloadState(workload, colors);
        return <View key={workload.technicianId} style={[styles.teamRow, index === Math.min(teamWorkloads.length, 4) - 1 && styles.teamRowLast]}><View style={[styles.teamAvatar, index % 2 === 1 && styles.teamAvatarAlt]}><Text style={[styles.teamInitial, index % 2 === 1 && styles.teamInitialAlt]}>{workload.isKnown ? initials(workload.name) : '?'}</Text></View><View style={styles.teamCopy}><View style={styles.teamNameRow}><Text numberOfLines={1} style={styles.teamName}>{workload.name}</Text><View style={[styles.workloadPill, { backgroundColor: state.soft }]}><View style={[styles.workloadDot, { backgroundColor: state.color }]} /><Text style={[styles.workloadLabel, { color: state.color }]}>{state.label}</Text></View></View><Text style={styles.teamMetrics}>{workload.isKnown ? `${workload.activeCount} active · ${workload.urgentCount} urgent` : `${workload.activeCount} active · assignee unavailable`}</Text><Text numberOfLines={1} style={styles.teamTask}>Focus: {workload.focusTicket.title}</Text></View></View>;
      })}{!teamWorkloads.length ? <View style={styles.teamEmpty}><UsersRound color={colors.green} size={22} /><View><Text style={styles.teamEmptyTitle}>Team queue is clear</Text><Text style={styles.teamEmptyCopy}>No other technician has active tickets.</Text></View></View> : null}</View>
    </Screen>
  );

  function HeroStat({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: number }) { return <View style={styles.heroStat}><Icon color="#AFC1FF" size={16} /><View><Text style={styles.heroStatValue}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View></View>; }
  function MiniKpi({ icon: Icon, label, value, tone, soft }: { icon: typeof Clock3; label: string; value: number; tone: string; soft: string }) { return <View style={styles.kpi}><View style={[styles.kpiIcon, { backgroundColor: soft }]}><Icon color={tone} size={18} /></View><Text style={styles.kpiValue}>{value}</Text><Text style={styles.kpiLabel}>{label}</Text></View>; }
  function EmptyCard({ text }: { text: string }) { return <View style={styles.empty}><CheckCircle2 color={colors.green} size={28} /><Text style={styles.emptyText}>{text}</Text></View>; }
}

function SectionHeader({ title, subtitle, action, onPress }: { title: string; subtitle?: string; action?: string; onPress?: () => void }) { const { colors } = useTheme(); return <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{title}</Text>{subtitle ? <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 3 }}>{subtitle}</Text> : null}</View>{action ? <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Text style={{ color: colors.cyan, fontSize: 11, fontWeight: '800' }}>{action}</Text><ArrowRight color={colors.cyan} size={14} /></Pressable> : null}</View>; }
function isActive(ticket: TicketProps) { return !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status); }
function priorityRank(priority: TicketProps['priority']) { return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[priority]; }
function initials(name: string) { return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase(); }
function workloadState(workload: { activeCount: number; urgentCount: number; criticalCount: number; inProgressCount: number; isKnown: boolean }, colors: ThemeColors) {
  if (!workload.isKnown) return { label: 'Reassign', color: colors.red, soft: colors.redSoft };
  if (workload.criticalCount) return { label: 'Critical', color: colors.red, soft: colors.redSoft };
  if (workload.activeCount >= 3 || workload.urgentCount >= 2) return { label: 'High load', color: colors.amber, soft: colors.amberSoft };
  if (workload.inProgressCount) return { label: 'In field', color: colors.cyan, soft: colors.cyanSoft };
  return { label: 'Active', color: colors.green, soft: colors.greenSoft };
}
function firstName(name?: string) { return name?.trim().split(/\s+/).slice(-1)[0] ?? 'Technician'; }
function formatDate() { return new Intl.DateTimeFormat('en', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date()); }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headingRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { color: colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  heading: { marginTop: 4, color: colors.text, fontSize: 24, fontWeight: '900' },
  date: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  hero: { gap: spacing.md, padding: spacing.xl, overflow: 'hidden', borderRadius: radii.xxl, backgroundColor: colors.hero },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between' }, heroLabel: { color: '#8EA5D6', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, heroValue: { marginTop: 5, color: colors.heroText, fontSize: 38, fontWeight: '800' }, heroCopy: { color: '#C5D0E8', fontSize: 12, fontWeight: '600' },
  livePill: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4BE0A5' }, liveText: { color: '#DDE6F8', fontSize: 8, fontWeight: '900' },
  progressTrack: { height: 9, overflow: 'hidden', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.13)' }, progressFill: { height: '100%', minWidth: 6, borderRadius: 999, backgroundColor: '#5D82FF' },
  heroStats: { flexDirection: 'row', paddingTop: 4 }, heroStat: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 7, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' }, heroStatValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }, heroStatLabel: { color: '#8EA5D6', fontSize: 9 },
  errorBox: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.redSoft }, error: { flex: 1, color: colors.red, fontSize: 12, fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', gap: spacing.sm }, kpi: { alignItems: 'center', flex: 1, gap: 5, paddingVertical: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, kpiIcon: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 14 }, kpiValue: { color: colors.text, fontSize: 20, fontWeight: '900' }, kpiLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  list: { gap: spacing.md }, empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, emptyText: { color: colors.textMuted, fontSize: 12 },
  teamList: { overflow: 'hidden', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, teamRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }, teamRowLast: { borderBottomWidth: 0 }, teamAvatar: { alignItems: 'center', justifyContent: 'center', width: 46, height: 46, borderRadius: 17, backgroundColor: colors.purpleSoft }, teamAvatarAlt: { backgroundColor: colors.cyanSoft }, teamInitial: { color: colors.purple, fontSize: 12, fontWeight: '900' }, teamInitialAlt: { color: colors.cyan }, teamCopy: { flex: 1, gap: 3 }, teamNameRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, teamName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '900' }, teamMetrics: { color: colors.text, fontSize: 10, fontWeight: '700' }, teamTask: { color: colors.textMuted, fontSize: 10 }, workloadPill: { alignItems: 'center', flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }, workloadDot: { width: 5, height: 5, borderRadius: 3 }, workloadLabel: { fontSize: 8, fontWeight: '900' }, teamEmpty: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg }, teamEmptyTitle: { color: colors.text, fontSize: 12, fontWeight: '800' }, teamEmptyCopy: { marginTop: 3, color: colors.textMuted, fontSize: 10 },
});
