// Définition des couleurs pour les thèmes clair et dark

export const lightTheme = {
  mode: 'light',
  
  // Couleurs principales
  primary: '#1E88E5',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',
  
  // Couleurs d'arrière-plan
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundCard: '#FFFFFF',
  
  // Couleurs de surface
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  
  // Couleurs de texte
  text: '#1F2937',
  commun: '#FFFFFF',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Couleurs des bordures
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Couleurs d'état
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Couleurs d'accent
  accent: '#8B5CF6',
  
  // Couleurs pour les notes/avis
  star: '#FCD34D',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Shadow
  shadow: '#000000',
  shadowOpacity: 0.1,
};

export const darkTheme = {
  mode: 'dark',
  
  // Couleurs principales
  primary: '#42A5F5',
  primaryDark: '#1E88E5',
  primaryLight: '#64B5F6',
  
  // Couleurs d'arrière-plan
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  backgroundCard: '#1E293B',
  
  // Couleurs de surface
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  
  // Couleurs de texte
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  commun: '#FFFFFF',
  textTertiary: '#94A3B8',
  textInverse: '#1F2937',
  
  // Couleurs des bordures
  border: '#334155',
  borderLight: '#475569',
  
  // Couleurs d'état
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  
  // Couleurs d'accent
  accent: '#A78BFA',
  
  // Couleurs pour les notes/avis
  star: '#FCD34D',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  // Shadow
  shadow: '#000000',
  shadowOpacity: 0.3,
};

// Helper pour obtenir les couleurs selon le thème
export const getTheme = (isDark) => isDark ? darkTheme : lightTheme;
