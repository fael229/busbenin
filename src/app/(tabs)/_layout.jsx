import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Home, Navigation, Building2, Heart, Shield, Calendar, Settings } from 'lucide-react-native';
import { useSession } from '../../contexts/SessionProvider';
import { useTheme } from '../../contexts/ThemeProvider';
import { supabase } from '../../utils/supabase';

export default function TabLayout() {
  const { session } = useSession();
  const { theme } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCompagnie, setIsCompagnie] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!session?.user?.id) { 
          setIsAdmin(false); 
          setIsCompagnie(false);
          return; 
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('admin, compagnie_id')
          .eq('id', session.user.id)
          .single();
        if (error) throw error;
        setIsAdmin(!!data?.admin);
        setIsCompagnie(!data?.admin && !!data?.compagnie_id);
      } catch (e) {
        setIsAdmin(false);
        setIsCompagnie(false);
      }
    };
    load();
  }, [session?.user?.id]);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        // Masque l'en-tête de l'écran pour tous les onglets
        headerShown: false,
        // Style de la barre d'onglets
        tabBarStyle: {
          // Couleur de fond de la barre d'onglets
          backgroundColor: theme.surface,
          // Largeur de la bordure supérieure de la barre d'onglets
          borderTopWidth: 1,
          // Couleur de la bordure supérieure de la barre d'onglets
          borderColor: theme.border,
          // Marge intérieure en haut de la barre d'onglets
          paddingTop: 4,
          // Hauteur de la barre d'onglets
          height: 68,
        },
        // Couleur du texte et de l'icône de l'onglet actif
        tabBarActiveTintColor: theme.primary,
        // Couleur du texte et de l'icône des onglets inactifs
        tabBarInactiveTintColor: theme.textSecondary,
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
      {/* Onglet "Mes réservations" */}
      <Tabs.Screen
        name="mes-reservations"
        options={{
          // Titre de l'onglet
          title: 'Réservations',
          // Icône de l'onglet
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={24} />
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
      {/* Onglet "Paramètres" */}
      <Tabs.Screen
        name="parametres"
        options={{
          // Titre de l'onglet
          title: 'Paramètres',
          // Icône de l'onglet
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={24} />
          ),
        }}
      />
      {/* Masquer les routes de navigation interne de la TabBar */}
      <Tabs.Screen name="trajet" options={{ href: null }} />
      <Tabs.Screen name="reservation" options={{ href: null }} />
      <Tabs.Screen name="paiement" options={{ href: null }} />
      <Tabs.Screen name="avis" options={{ href: null }} />
      <Tabs.Screen name="compagnie" options={{ href: null }} />
      
      {/* Masquer toutes les routes admin par défaut pour éviter les icônes auto-générées */}
      <Tabs.Screen name="admin/dashboard" options={{ 
        href: (isAdmin || isCompagnie) ? undefined : null, 
        title: isCompagnie ? 'Gestion' : 'Admin', 
        tabBarIcon: ({ color, size }) => (isCompagnie ? <Building2 color={color} size={24} /> : <Shield color={color} size={24} />) 
      }} />
      <Tabs.Screen name="admin/manage-destinations" options={{ href: null }} />
      <Tabs.Screen name="admin/manage-users" options={{ href: null }} />
      <Tabs.Screen name="admin/manage-compagnies" options={{ href: null }} />
      <Tabs.Screen name="admin/manage-reservations" options={{ href: null }} />
    </Tabs>
  );
}