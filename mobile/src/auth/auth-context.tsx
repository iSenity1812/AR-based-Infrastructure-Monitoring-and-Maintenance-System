import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loginWithPassword } from '../api/auth';
import type { AuthSession, PermissionCode } from '../types/auth';
import { deleteStoredSession, getStoredSession, setStoredSession } from './session-storage';

const SESSION_KEY = 'ar-imms-mobile-session';

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (permission: PermissionCode) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getStoredSession(SESSION_KEY)
      .then((rawSession) => {
        if (!mounted || !rawSession) return;
        setSession(JSON.parse(rawSession) as AuthSession);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const persistSession = useCallback(async (nextSession: AuthSession) => {
    setSession(nextSession);
    await setStoredSession(SESSION_KEY, JSON.stringify(nextSession));
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setLoading(true);

      try {
        await persistSession(await loginWithPassword(email.trim(), password));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Login failed.');
        throw caught;
      } finally {
        setLoading(false);
      }
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    setSession(null);
    await deleteStoredSession(SESSION_KEY);
  }, []);

  const can = useCallback(
    (permission: PermissionCode) =>
      Boolean(session?.user.permissions.includes(permission)),
    [session],
  );

  const value = useMemo(
    () => ({ session, loading, error, signIn, signOut, can }),
    [can, error, loading, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
