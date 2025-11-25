import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../utils/supabase';

export default function Index() {
  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Petit délai pour s'assurer que la navigation est prête
      setTimeout(() => {
        if (session?.user) {
          // Utilisateur connecté : aller vers l'accueil
          console.log('Redirection vers accueil (index)');
          // Navigation directe vers l'onglet index
          router.replace('/(tabs)');
        } else {
          // Utilisateur non connecté : aller vers login
          console.log('Redirection vers login');
          router.replace('/(auth)/login');
        }
      }, 100);
    } catch (error) {
      console.error('Erreur vérification session:', error);
      setTimeout(() => {
        router.push('/(auth)/login');
      }, 100);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color="#1E88E5" />
    </View>
  );
}
