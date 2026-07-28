import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../src/auth/auth-context';
import { TechnicianTabBar } from '../../src/components/technician-tab-bar';

export default function AppLayout() {
  const { loading, session } = useAuth();
  if (!loading && !session) return <Redirect href="/(auth)/login" />;
  return (
    <Tabs tabBar={(props) => <TechnicianTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Overview' }} />
      <Tabs.Screen name="tickets/index" options={{ title: 'Tickets' }} />
      <Tabs.Screen name="activity" options={{ title: 'History' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="tickets/new" options={{ href: null }} />
      <Tabs.Screen name="tickets/[id]" options={{ href: null }} />
      <Tabs.Screen name="incidents/index" options={{ href: null }} />
      <Tabs.Screen name="incidents/[id]" options={{ href: null }} />
      <Tabs.Screen name="ar/[nodeId]" options={{ href: null }} />
    </Tabs>
  );
}
