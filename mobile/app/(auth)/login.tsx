import { router } from 'expo-router';
import { Hexagon, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/auth/auth-context';
import { ActionButton } from '../../src/components/action-button';
import { CyberCard } from '../../src/components/cyber-card';
import { FieldInput } from '../../src/components/field-input';
import { Screen } from '../../src/components/screen';
import { colors, spacing } from '../../src/theme/tokens';

export default function LoginScreen() {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('technician01@example.com');
  const [password, setPassword] = useState('Technician@123456');

  async function handleLogin() {
    try {
      await signIn(email, password);
      router.replace('/(app)');
    } catch {
      Alert.alert('Login failed', error ?? 'Please check the account and service URL.');
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.wrap}
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoBox}>
            <Hexagon color={colors.text} size={34} />
          </View>
          <Text style={styles.appName}>AR-IMMS</Text>
          <Text style={styles.appSubtitle}>Field Ticket Console</Text>
        </View>

        <CyberCard>
          <FieldInput
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            value={email}
            onChangeText={setEmail}
          />
          <FieldInput
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <ActionButton
            disabled={loading}
            icon={Lock}
            label={loading ? 'Signing in' : 'Sign in'}
            onPress={handleLogin}
          />
        </CyberCard>

      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  logoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 78,
    height: 78,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: colors.cyan,
  },
  appName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  appSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  error: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '700',
  },
});
