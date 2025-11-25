import React from 'react';
import { TouchableOpacity, View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeProvider';

/**
 * Composant BackButton réutilisable - Version simplifiée
 */
export default function BackButton({ 
  title, 
  onPress, 
  fallback,
  color, // Sera défini automatiquement avec le thème si non fourni
  size = 24,
  showTitle = true,
  style,
  buttonStyle 
}) {
  const { theme } = useTheme();
  const iconColor = color || theme.text; // Utilise le thème si pas de couleur fournie
  const handlePress = () => {
    try {
      console.log('🔙 BackButton clicked', { onPress: !!onPress, fallback });
      
      if (onPress) {
        // Fonction personnalisée
        console.log('↩️ Custom onPress');
        onPress();
      } else if (fallback) {
        // Si fallback fourni, l'utiliser TOUJOURS (priorité sur l'historique)
        console.log('📍 Navigating to fallback:', fallback);
        router.replace(fallback);
      } else {
        // Sinon, utiliser l'historique de navigation
        console.log('⬅️ Using router.back()');
        router.back();
      }
    } catch (error) {
      console.error('❌ BackButton error:', error);
      Alert.alert('Erreur', 'Navigation impossible: ' + error.message);
    }
  };

  if (title && showTitle) {
    // Bouton avec titre
    return (
      <View 
        style={[
          { 
            flexDirection: 'row', 
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }, 
          style
        ]}
      >
        <TouchableOpacity 
          onPress={handlePress}
          style={[
            {
              padding: 8,
              marginRight: 8,
              borderRadius: 8,
              backgroundColor: 'transparent',
            },
            buttonStyle
          ]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={size} color={iconColor} />
        </TouchableOpacity>
        <Text 
          style={{ 
            fontSize: 20, 
            fontWeight: '700', 
            color: iconColor,
            flex: 1
          }}
        >
          {title}
        </Text>
      </View>
    );
  }

  // Bouton simple sans titre
  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[
        {
          padding: 8,
          borderRadius: 8,
          backgroundColor: 'transparent',
        },
        buttonStyle
      ]}
      activeOpacity={0.7}
    >
      <ArrowLeft size={size} color={iconColor} />
    </TouchableOpacity>
  );
}
