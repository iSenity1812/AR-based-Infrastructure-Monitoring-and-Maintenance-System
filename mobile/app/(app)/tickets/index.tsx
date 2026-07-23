import { router, useFocusEffect } from 'expo-router';
import { CheckCircle2, Search, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { listTickets } from '../../../src/api/tickets';
import { useAuth } from '../../../src/auth/auth-context';
import { AppHeader } from '../../../src/components/app-header';
import { Screen } from '../../../src/components/screen';
import { TicketCard } from '../../../src/components/ticket-card';
import { useTheme } from '../../../src/theme/theme-context';
import { radii, spacing, type ThemeColors } from '../../../src/theme/tokens';
import type { TicketProps } from '../../../src/types/ticket';

type Filter = 'ALL' | 'INCIDENT' | 'URGENT' | 'WAITING';
const filters: { key: Filter; label: string }[] = [{ key: 'ALL', label: 'My tasks' }, { key: 'INCIDENT', label: 'From incident' }, { key: 'URGENT', label: 'Urgent' }, { key: 'WAITING', label: 'Waiting' }];

export default function TicketListScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tickets, setTickets] = useState<TicketProps[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    if (!session) return;
    setLoading(true); setError(null);
    try {
      const all = await listTickets(session.accessToken);
      setTickets(all.filter((ticket) => ticket.assigneeUserId === session.user.userId && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status)));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load tickets.'); }
    finally { setLoading(false); }
  }, [session]);

  useFocusEffect(useCallback(() => { void loadTickets(); }, [loadTickets]));

  const visible = useMemo(() => tickets.filter((ticket) => {
    if (filter === 'INCIDENT' && !ticket.incidentId) return false;
    if (filter === 'URGENT' && !['HIGH', 'CRITICAL'].includes(ticket.priority)) return false;
    if (filter === 'WAITING' && ticket.status !== 'WAITING_FOR_INFO') return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${ticket.ticketCode} ${ticket.title} ${ticket.description ?? ''}`.toLowerCase().includes(needle);
  }).sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority)), [filter, query, tickets]);

  return (
    <Screen refreshing={loading} onRefresh={loadTickets}>
      <AppHeader title="My ticket queue" subtitle={`${tickets.length} active assignments`} compact />
      <View style={styles.titleRow}><View><Text style={styles.eyebrow}>FIELD OPERATIONS</Text><Text style={styles.heading}>Tickets</Text></View><View style={styles.filterIcon}><SlidersHorizontal color={colors.cyan} size={19} /></View></View>
      <View style={styles.search}><Search color={colors.textSubtle} size={19} /><TextInput value={query} onChangeText={setQuery} placeholder="Search code, title or details" placeholderTextColor={colors.textSubtle} style={styles.searchInput} /></View>
      <View style={styles.filters}>{filters.map((item) => <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filter, filter === item.key && styles.filterActive]}><Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text></Pressable>)}</View>
      <View style={styles.resultRow}><Text style={styles.result}>{visible.length} tickets</Text><Text style={styles.sort}>Priority first</Text></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.list}>{visible.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={() => router.push(`/(app)/tickets/${ticket.id}`)} />)}{!loading && !error && visible.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><CheckCircle2 color={colors.green} size={26} /></View><Text style={styles.emptyTitle}>Queue is clear</Text><Text style={styles.emptyCopy}>No ticket matches this filter.</Text></View> : null}</View>
    </Screen>
  );
}

function priorityRank(priority: TicketProps['priority']) { return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[priority]; }
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  titleRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' }, eyebrow: { color: colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, heading: { marginTop: 3, color: colors.text, fontSize: 30, fontWeight: '900' }, filterIcon: { alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: radii.lg, backgroundColor: colors.cyanSoft },
  search: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 54, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  filters: { flexDirection: 'row', gap: spacing.sm }, filter: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingHorizontal: 7, borderRadius: 14, backgroundColor: colors.cardDark }, filterActive: { backgroundColor: colors.hero }, filterText: { color: colors.textMuted, fontSize: 9, fontWeight: '700', textAlign: 'center' }, filterTextActive: { color: '#FFFFFF', fontWeight: '900' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between' }, result: { color: colors.text, fontSize: 13, fontWeight: '800' }, sort: { color: colors.textMuted, fontSize: 11 }, list: { gap: spacing.md }, error: { color: colors.red, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: 44, borderRadius: radii.xl, backgroundColor: colors.panel }, emptyIcon: { alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 20, backgroundColor: colors.greenSoft }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, emptyCopy: { color: colors.textMuted, fontSize: 12 },
});
