import { Box, ChevronRight, Clock3, Link2, MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/theme-context';
import { radii, shadow, spacing, type ThemeColors } from '../theme/tokens';
import type { TicketPriority, TicketProps, TicketStatus } from '../types/ticket';
import { StatusPill, type StatusTone } from './status-pill';

interface TicketCardProps { ticket: TicketProps; onPress?: () => void; assigneeName?: string; }

export function TicketCard({ ticket, onPress, assigneeName }: TicketCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const priorityColor = priorityColors(ticket.priority, colors);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.rail, { backgroundColor: priorityColor }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.code}>{ticket.ticketCode}</Text>
          <StatusPill label={ticket.status} tone={statusTone(ticket.status)} />
        </View>
        <Text numberOfLines={2} style={styles.title}>{ticket.title}</Text>
        <View style={styles.metaRow}>
          {ticket.incidentId ? <View style={styles.meta}><Link2 color={colors.purple} size={13} /><Text style={styles.incident}>From incident</Text></View> : null}
          {ticket.assetRef ? <View style={styles.meta}><Box color={colors.cyan} size={13} /><Text numberOfLines={1} style={styles.asset}>{ticket.assetRef.code}</Text></View> : null}
          <View style={styles.meta}><Clock3 color={colors.textSubtle} size={13} /><Text style={styles.metaText}>{relativeTime(ticket.updatedAt)}</Text></View>
        </View>
        <View style={styles.footer}>
          <View style={styles.meta}><MapPin color={colors.textSubtle} size={13} /><Text numberOfLines={1} style={styles.metaText}>{assigneeName ?? 'Assigned to you'}</Text></View>
          <Text style={[styles.priority, { color: priorityColor }]}>{ticket.priority}</Text>
          <ChevronRight color={colors.textSubtle} size={18} />
        </View>
      </View>
    </Pressable>
  );
}

export function statusTone(status: TicketStatus): StatusTone {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'green';
  if (status === 'CANCELLED') return 'muted';
  if (status === 'WAITING_FOR_INFO') return 'amber';
  if (status === 'OPEN') return 'cyan';
  return 'purple';
}

function priorityColors(priority: TicketPriority, colors: ThemeColors) {
  if (priority === 'CRITICAL') return colors.red;
  if (priority === 'HIGH') return colors.amber;
  if (priority === 'MEDIUM') return colors.cyan;
  return colors.green;
}

export function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return 'Just updated';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { flexDirection: 'row', overflow: 'hidden', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, ...shadow },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  rail: { width: 5 },
  content: { flex: 1, gap: spacing.sm, padding: spacing.lg },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  code: { color: colors.textSubtle, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  metaRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  meta: { alignItems: 'center', flexDirection: 'row', gap: 5, flexShrink: 1 },
  metaText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  incident: { color: colors.purple, fontSize: 11, fontWeight: '700' },
  asset: { color: colors.cyan, fontSize: 11, fontWeight: '700' },
  footer: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  priority: { marginLeft: 'auto', fontSize: 10, fontWeight: '900' },
});
