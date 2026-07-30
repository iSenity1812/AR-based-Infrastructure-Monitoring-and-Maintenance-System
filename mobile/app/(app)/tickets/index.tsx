import { router, useFocusEffect } from 'expo-router';
import { CheckCircle2, CircleAlert, RotateCcw, Search, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { listTickets } from '../../../src/api/tickets';
import { useAuth } from '../../../src/auth/auth-context';
import { AppHeader } from '../../../src/components/app-header';
import { Screen } from '../../../src/components/screen';
import { TicketCard } from '../../../src/components/ticket-card';
import { useTheme } from '../../../src/theme/theme-context';
import { radii, spacing, type ThemeColors } from '../../../src/theme/tokens';
import type { TicketProps } from '../../../src/types/ticket';

type Filter = 'ALL' | 'IN_PROGRESS' | 'INCIDENT' | 'URGENT' | 'WAITING';
const filters: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All active' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'URGENT', label: 'Urgent' },
  { key: 'INCIDENT', label: 'From incident' },
  { key: 'WAITING', label: 'Waiting' },
];

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
    setLoading(true);
    setError(null);
    try {
      const all = await listTickets(session.accessToken);
      setTickets(all.filter((ticket) => ticket.assigneeUserId === session.user.userId && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load tickets.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { void loadTickets(); }, [loadTickets]));

  const visible = useMemo(() => tickets.filter((ticket) => {
    if (filter === 'IN_PROGRESS' && ticket.status !== 'IN_PROGRESS') return false;
    if (filter === 'INCIDENT' && !ticket.incidentId) return false;
    if (filter === 'URGENT' && !['HIGH', 'CRITICAL'].includes(ticket.priority)) return false;
    if (filter === 'WAITING' && ticket.status !== 'WAITING_FOR_INFO') return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${ticket.ticketCode} ${ticket.title} ${ticket.description ?? ''} ${ticket.assetRef?.code ?? ''}`.toLowerCase().includes(needle);
  }).sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [filter, query, tickets]);

  const hasActiveFilter = filter !== 'ALL' || Boolean(query.trim());

  return (
    <Screen refreshing={loading} onRefresh={loadTickets}>
      <AppHeader title="Tickets" subtitle={assignmentLabel(tickets.length)} compact />

      <View style={styles.intro}>
        <Text style={styles.eyebrow}>MY FIELD QUEUE</Text>
        <View style={styles.introRow}><Text style={styles.heading}>Work to handle</Text><Text style={styles.priorityHint}>Priority first</Text></View>
      </View>

      <View style={styles.search}>
        <Search color={colors.textSubtle} size={19} />
        <TextInput
          accessibilityLabel="Search tickets"
          value={query}
          onChangeText={setQuery}
          placeholder="Code, title, asset or details"
          placeholderTextColor={colors.textSubtle}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clearSearch}><X color={colors.textMuted} size={17} /></Pressable> : null}
      </View>

      <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false} style={styles.filterScroller}>
        {filters.map((item) => (
          <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filter, filter === item.key && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.resultRow}>
        <Text style={styles.result}>{ticketCountLabel(visible.length)}</Text>
        {hasActiveFilter ? <Pressable onPress={() => { setFilter('ALL'); setQuery(''); }} style={styles.resetFilter}><RotateCcw color={colors.cyan} size={14} /><Text style={styles.resetText}>Reset</Text></Pressable> : <Text style={styles.resultHint}>Updated queue</Text>}
      </View>

      {error ? (
        <View style={styles.errorBox}><CircleAlert color={colors.red} size={19} /><View style={styles.errorCopy}><Text style={styles.errorTitle}>Tickets unavailable</Text><Text numberOfLines={2} style={styles.error}>{error}</Text></View><Pressable accessibilityLabel="Retry loading tickets" onPress={() => void loadTickets()} style={styles.retry}><RotateCcw color={colors.red} size={17} /></Pressable></View>
      ) : null}

      <View style={styles.list}>
        {visible.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={() => router.push(`/(app)/tickets/${ticket.id}`)} />)}
        {!loading && !error && visible.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><CheckCircle2 color={colors.green} size={25} /></View>
            <Text style={styles.emptyTitle}>{hasActiveFilter ? 'No matching tickets' : 'Your queue is clear'}</Text>
            <Text style={styles.emptyCopy}>{hasActiveFilter ? 'Try another search or reset the active filters.' : 'New assignments will appear here automatically.'}</Text>
            {hasActiveFilter ? <Pressable onPress={() => { setFilter('ALL'); setQuery(''); }} style={styles.emptyAction}><Text style={styles.emptyActionText}>Show all active</Text></Pressable> : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function assignmentLabel(count: number) { return count === 1 ? '1 active assignment' : `${count} active assignments`; }
function ticketCountLabel(count: number) { return count === 1 ? '1 ticket' : `${count} tickets`; }
function priorityRank(priority: TicketProps['priority']) { return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[priority]; }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  intro: { gap: 4 }, eyebrow: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, introRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, heading: { color: colors.text, fontSize: 27, fontWeight: '900' }, priorityHint: { paddingBottom: 4, color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  search: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 50, paddingHorizontal: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, searchInput: { flex: 1, minHeight: 48, color: colors.text, fontSize: 14 }, clearSearch: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.cardDark },
  filterScroller: { flexGrow: 0, flexShrink: 0, height: 42 }, filters: { alignItems: 'center', gap: spacing.sm, minHeight: 42, paddingRight: spacing.lg }, filter: { alignItems: 'center', justifyContent: 'center', height: 38, paddingHorizontal: spacing.lg, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, filterActive: { borderColor: colors.cyan, backgroundColor: colors.cyanSoft }, filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' }, filterTextActive: { color: colors.cyan, fontWeight: '900' },
  resultRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 28 }, result: { color: colors.text, fontSize: 13, fontWeight: '900' }, resultHint: { color: colors.textMuted, fontSize: 11 }, resetFilter: { alignItems: 'center', flexDirection: 'row', gap: 5, minHeight: 36, paddingHorizontal: spacing.sm }, resetText: { color: colors.cyan, fontSize: 11, fontWeight: '800' }, list: { gap: spacing.md },
  errorBox: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.red, backgroundColor: colors.redSoft }, errorCopy: { flex: 1, gap: 2 }, errorTitle: { color: colors.red, fontSize: 12, fontWeight: '900' }, error: { color: colors.textMuted, fontSize: 11 }, retry: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: radii.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: 42, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, emptyIcon: { alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 18, backgroundColor: colors.greenSoft }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, emptyCopy: { maxWidth: 280, color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' }, emptyAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.md, backgroundColor: colors.cyanSoft }, emptyActionText: { color: colors.cyan, fontSize: 11, fontWeight: '900' },
});
