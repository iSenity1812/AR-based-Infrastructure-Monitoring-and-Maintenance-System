import { router, useFocusEffect } from 'expo-router';
import { CheckCircle2, Clock3 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { listTickets } from '../../src/api/tickets';
import { useAuth } from '../../src/auth/auth-context';
import { AppHeader } from '../../src/components/app-header';
import { Screen } from '../../src/components/screen';
import { TicketCard } from '../../src/components/ticket-card';
import { useTheme } from '../../src/theme/theme-context';
import { radii, spacing, type ThemeColors } from '../../src/theme/tokens';
import type { TicketProps } from '../../src/types/ticket';

export default function ActivityScreen() {
  const { session } = useAuth(); const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  const [tickets, setTickets] = useState<TicketProps[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!session) return; setLoading(true); setError(null); try { const all = await listTickets(session.accessToken); setTickets(all.filter((ticket) => ticket.assigneeUserId === session.user.userId && ['RESOLVED', 'CLOSED'].includes(ticket.status)).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())); } catch (caught) { setTickets([]); setError(caught instanceof Error ? caught.message : 'Could not load work history.'); } finally { setLoading(false); } }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <Screen refreshing={loading} onRefresh={load}><AppHeader title="Work history" subtitle="Completed field work" compact /><View><Text style={styles.eyebrow}>PERFORMANCE LOG</Text><Text style={styles.heading}>Completed tickets</Text></View><View style={styles.summary}><View style={styles.summaryIcon}><CheckCircle2 color={colors.green} size={24} /></View><View style={styles.summaryCopy}><Text style={styles.summaryValue}>{tickets.length}</Text><Text style={styles.summaryLabel}>Tasks completed</Text></View><View style={styles.period}><Clock3 color={colors.textMuted} size={14} /><Text style={styles.periodText}>All time</Text></View></View>{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.list}>{tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={() => router.push(`/(app)/tickets/${ticket.id}`)} />)}{!loading && !error && !tickets.length ? <Text style={styles.empty}>Completed tickets will appear here.</Text> : null}</View></Screen>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  eyebrow: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, heading: { marginTop: 4, color: colors.text, fontSize: 28, fontWeight: '900' }, summary: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radii.xl, backgroundColor: colors.panel }, summaryIcon: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 18, backgroundColor: colors.greenSoft }, summaryCopy: { flex: 1 }, summaryValue: { color: colors.text, fontSize: 24, fontWeight: '900' }, summaryLabel: { color: colors.textMuted, fontSize: 11 }, period: { alignItems: 'center', flexDirection: 'row', gap: 5 }, periodText: { color: colors.textMuted, fontSize: 10 }, list: { gap: spacing.md }, error: { padding: spacing.md, borderRadius: radii.lg, color: colors.red, backgroundColor: colors.redSoft, fontSize: 11, fontWeight: '700' }, empty: { padding: spacing.xl, color: colors.textMuted, textAlign: 'center' },
});
