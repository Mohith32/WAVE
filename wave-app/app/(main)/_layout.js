import { Tabs } from 'expo-router';
import { Ionicons } from '@expo-google-fonts/inter'; // Wait, let me keep Ionicons from expo vector icons
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme, ghostBorder } from '../../utils/theme';
import { Ionicons as Icons } from '@expo/vector-icons';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0, // Removed traditional 1px border
          elevation: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
            <BlurView tint="dark" intensity={60} style={[StyleSheet.absoluteFill, ghostBorder, { borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surfaceBase }]} />
          </View>
        ),
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.textVariant,
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontSemiBold,
          fontSize: theme.fontSize.xs,
          letterSpacing: theme.typography.trackingLabel,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Icons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <Icons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icons name="person-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="group-chat/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="create-group"
        options={{ href: null }}
      />
    </Tabs>
  );
}
