import { router } from 'expo-router';
import { Fingerprint, ScanLine, ShieldCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/auth-context';
import { ActionButton } from '../../src/components/action-button';
import { FieldInput } from '../../src/components/field-input';
import { Screen } from '../../src/components/screen';
import { useTheme } from '../../src/theme/theme-context';
import { radii, spacing, type ThemeColors } from '../../src/theme/tokens';

export default function LoginScreen() {
  const { signIn, loading, error } = useAuth(); const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('technician01@example.com'); const [password, setPassword] = useState('Technician01@123456');
  async function login() { try { await signIn(email, password); router.replace('/(app)'); } catch (caught) { Alert.alert('Sign in failed', caught instanceof Error ? caught.message : error ?? 'Check your account and service connection.'); } }
  return <Screen><KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.wrap}><View style={styles.visual}><View style={styles.brandIcon}><ScanLine color="#FFFFFF" size={32} /></View><Text style={styles.brand}>AR-IMMS Field</Text><Text style={styles.tagline}>Technician workspace for faster, safer maintenance.</Text><View style={styles.trust}><ShieldCheck color="#9FB7FF" size={15} /><Text style={styles.trustText}>Secure field operations</Text></View></View><View style={styles.form}><View><Text style={styles.welcome}>Welcome back</Text><Text style={styles.copy}>Sign in with your technician account.</Text></View><FieldInput autoCapitalize="none" keyboardType="email-address" label="Work email" value={email} onChangeText={setEmail} /><FieldInput label="Password" secureTextEntry value={password} onChangeText={setPassword} />{error ? <Text style={styles.error}>{error}</Text> : null}<ActionButton disabled={loading} icon={Fingerprint} label={loading ? 'Signing in…' : 'Sign in securely'} onPress={() => void login()} /></View><Text style={styles.footer}>AR-assisted infrastructure maintenance</Text></KeyboardAvoidingView></Screen>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ wrap: { flex: 1, justifyContent: 'center', gap: spacing.xl }, visual: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, borderRadius: radii.xxl, backgroundColor: colors.hero }, brandIcon: { alignItems: 'center', justifyContent: 'center', width: 68, height: 68, borderRadius: 24, backgroundColor: colors.cyan }, brand: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' }, tagline: { maxWidth: 280, color: '#AFC0DF', fontSize: 12, lineHeight: 18, textAlign: 'center' }, trust: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: spacing.sm }, trustText: { color: '#9FB7FF', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }, form: { gap: spacing.lg, padding: spacing.xl, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, welcome: { color: colors.text, fontSize: 22, fontWeight: '900' }, copy: { marginTop: 4, color: colors.textMuted, fontSize: 12 }, error: { color: colors.red, fontSize: 12, fontWeight: '700' }, footer: { color: colors.textSubtle, fontSize: 10, textAlign: 'center' } });
