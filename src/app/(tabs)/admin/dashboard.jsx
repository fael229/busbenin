import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Building2, Users, MapPinPlus, Shield, Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSession } from '../../../contexts/SessionProvider';
import { supabase } from '../../../utils/supabase';

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const isFocused = useIsFocused();
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
    if (isFocused) {
      load();
    }
  }, [isFocused, session?.user?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isCompagnie ? (
              <Building2 size={24} color="#1E88E5" />
            ) : (
              <Shield size={24} color="#1E88E5" />
            )}
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', marginLeft: 8 }}>
              {isCompagnie ? 'Gestion Compagnie' : 'Admin'}
            </Text>
          </View>
          <Text style={{ marginTop: 8, fontSize: 14, color: '#6B7280' }}>
            {isCompagnie ? 'Gérez vos trajets et réservations' : 'Tableau de bord d\'administration'}
          </Text>
        </View>

        {!isAdmin && !isCompagnie ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#EF4444', textAlign: 'center' }}>
              Accès refusé. Votre compte n'a pas les droits d'accès.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Destinations - Admin uniquement */}
            {isAdmin && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/admin/manage-destinations')}
                activeOpacity={0.8}
                style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
              >
                <MapPinPlus size={22} color="#1E88E5" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>Gérer les destinations</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Ajouter, modifier, supprimer</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Utilisateurs - Admin uniquement */}
            {isAdmin && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/admin/manage-users')}
                activeOpacity={0.8}
                style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
              >
                <Users size={22} color="#1E88E5" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>Gérer les utilisateurs</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Activer / désactiver, rôles</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Compagnies / Trajets */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/admin/manage-compagnies')}
              activeOpacity={0.8}
              style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
            >
              <Building2 size={22} color="#1E88E5" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                  {isCompagnie ? 'Gérer mes trajets' : 'Gérer les compagnies et trajets'}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {isCompagnie ? 'Vos trajets, horaires, prix' : 'Ajout de trajets, modification, suppression'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Réservations */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/admin/manage-reservations')}
              activeOpacity={0.8}
              style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
            >
              <Calendar size={22} color="#10B981" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                  {isCompagnie ? 'Mes réservations' : 'Gérer les réservations'}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {isCompagnie ? 'Réservations de vos trajets' : 'Voir, vérifier et gérer toutes les réservations'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
