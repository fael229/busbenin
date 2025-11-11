import React from 'react';
import { TouchableOpacity, View, Text, Animated } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeProvider';

export default function ThemeToggle({ style, showLabel = false }) {
  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.surfaceSecondary,
          borderRadius: 12,
          padding: 12,
          gap: 8,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {isDark ? (
        <Moon size={20} color={theme.primary} fill={theme.primary} />
      ) : (
        <Sun size={20} color={theme.primary} />
      )}
      
      {showLabel && (
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
          {isDark ? 'Mode sombre' : 'Mode clair'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// Variante avec switch
export function ThemeSwitch({ style }) {
  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {isDark ? (
          <Moon size={20} color={theme.textSecondary} />
        ) : (
          <Sun size={20} color={theme.textSecondary} />
        )}
        <Text style={{ fontSize: 16, color: theme.text }}>
          {isDark ? 'Mode sombre' : 'Mode clair'}
        </Text>
      </View>

      {/* Custom Switch */}
      <View
        style={{
          width: 50,
          height: 28,
          borderRadius: 14,
          backgroundColor: isDark ? theme.primary : theme.border,
          padding: 2,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            alignSelf: isDark ? 'flex-end' : 'flex-start',
          }}
        />
      </View>
    </TouchableOpacity>
  );
}
