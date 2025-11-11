import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, User, Bell, Lock, Info, LogOut, Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeProvider';
import { ThemeSwitch } from '../../components/ThemeToggle';
import { useSession } from '../../contexts/SessionProvider';
import { supabase } from '../../utils/supabase';
import { router } from 'expo-router';

export default function ParametresScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { session } = useSession();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const menuItems = [
    {
      section: 'Apparence',
      items: [
        {
          id: 'theme',
          icon: isDark ? Moon : Sun,
          label: 'Thème',
          component: <ThemeSwitch />,
        },
      ],
    },
    {
      section: 'Compte',
      items: [
        {
          id: 'profile',
          icon: User,
          label: 'Mon profil',
          onPress: () => console.log('Profil'),
        },
        {
          id: 'notifications',
          icon: Bell,
          label: 'Notifications',
          onPress: () => console.log('Notifications'),
        },
        {
          id: 'security',
          icon: Lock,
          label: 'Sécurité',
          onPress: () => console.log('Sécurité'),
        },
      ],
    },
    {
      section: 'À propos',
      items: [
        {
          id: 'about',
          icon: Info,
          label: 'À propos',
          onPress: () => console.log('À propos'),
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Settings size={28} color={theme.primary} />
            <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text }}>
              Paramètres
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>
            Personnalisez votre expérience
          </Text>
        </View>

        {/* Menu Sections */}
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={{ marginBottom: 24 }}>
            {/* Section Title */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: theme.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                paddingHorizontal: 20,
                marginBottom: 8,
              }}
            >
              {section.section}
            </Text>

            {/* Section Items */}
            <View
              style={{
                backgroundColor: theme.surface,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.border,
              }}
            >
              {section.items.map((item, itemIndex) => (
                <View key={item.id}>
                  {item.component ? (
                    <View style={{ paddingHorizontal: 20 }}>
                      {item.component}
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={item.onPress}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <item.icon size={20} color={theme.textSecondary} />
                        <Text style={{ fontSize: 16, color: theme.text }}>
                          {item.label}
                        </Text>
                      </View>
                      {/* Chevron ou autre indicateur pourrait être ajouté ici */}
                    </TouchableOpacity>
                  )}

                  {/* Separator */}
                  {itemIndex < section.items.length - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: theme.borderLight,
                        marginLeft: 52,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Déconnexion */}
        {session && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              activeOpacity={0.7}
            >
              <LogOut size={20} color={theme.error} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.error }}>
                Déconnexion
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Version */}
        <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 12, color: theme.textTertiary }}>
            Version 1.0.0
          </Text>
          <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 4 }}>
            © 2025 Bus Pro
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
