import { Redirect, Tabs } from 'expo-router';
import { CircleUserRound, Home, Tickets } from 'lucide-react-native';

import { useAuth } from '../../src/auth/auth-context';
import { colors } from '../../src/theme/tokens';

export default function AppLayout() {
  const { loading, session } = useAuth();

  if (!loading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          height: 72,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          backgroundColor: colors.bgElevated,
          paddingTop: 8,
          paddingBottom: 12,
          shadowColor: colors.black,
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -8 },
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tickets/index"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, size }) => <Tickets color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <CircleUserRound color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tickets/new"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tickets/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="incidents/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="incidents/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
