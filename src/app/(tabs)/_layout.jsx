import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Home, Navigation, Building2, Heart, Shield } from 'lucide-react-native';
import { useSession } from '../../contexts/SessionProvider';
import { supabase } from '../../utils/supabase';

export default function TabLayout() {
  const { session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!session?.user?.id) { setIsAdmin(false); return; }
        const { data, error } = await supabase
          .from('profiles')
          .select('admin')
          .eq('id', session.user.id)
          .single();
        if (error) throw error;
        setIsAdmin(!!data?.admin);
      } catch (e) {
        setIsAdmin(false);
      }
    };
    load();
  }, [session?.user?.id]);

  return (
    <Tabs
      screenOptions={{
        // Masque l'en-tête de l'écran pour tous les onglets
        headerShown: false,
        // Style de la barre d'onglets
        tabBarStyle: {
          // Couleur de fond de la barre d'onglets
          backgroundColor: '#FFFFFF',
          // Largeur de la bordure supérieure de la barre d'onglets
          borderTopWidth: 1,
          // Couleur de la bordure supérieure de la barre d'onglets
          borderColor: '#E5E7EB',
          // Marge intérieure en haut de la barre d'onglets
          paddingTop: 4,
          // Hauteur de la barre d'onglets
          height: 68,
        },
        // Couleur du texte et de l'icône de l'onglet actif
        tabBarActiveTintColor: '#1E88E5',
        // Couleur du texte et de l'icône des onglets inactifs
        tabBarInactiveTintColor: '#6B7280',
        // Style du texte des labels des onglets
        tabBarLabelStyle: {
          // Taille de la police du texte des labels
          fontSize: 12,
          // Graisse de la police du texte des labels
          fontWeight: '500',
        },
      }}
    >
      {/* Onglet "Accueil" */}
      <Tabs.Screen
        name="index"
        options={{
          // Titre de l'onglet
          title: 'Accueil',
          // Icône de l'onglet
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={24} />
          ),
        }}
      />
      {/* Onglet "Trajets" */}
      <Tabs.Screen
        name="trajets"
        options={{
          // Titre de l'onglet
          title: 'Trajets',
          // Icône de l'onglet
          tabBarIcon: ({ color, size }) => (
            <Navigation color={color} size={24} />
          ),
        }}
      />
      {/* Onglet "Compagnies" */}
      <Tabs.Screen
        name="compagnies"
        options={{
          // Titre de l'onglet
          title: 'Compagnies',
          // Icône de l'onglet
          tabBarIcon: ({ color, size }) => (
            <Building2 color={color} size={24} />
          ),
        }}
      />
      {/* Onglet "Favoris" */}
      <Tabs.Screen
        name="favoris"
        options={{
          // Titre de l'onglet
          title: 'Favoris',
          // Icône de l'onglet
          tabBarIcon: ({ color, size }) => (
            <Heart color={color} size={24} />
          ),
        }}
      />
      {(isAdmin == true) && (
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <Shield color={color} size={24} />
            ),
          }}
        />
      )}
     
    </Tabs>
  );
}