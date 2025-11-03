import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, Users, MapPinPlus, Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSession } from '../../../contexts/SessionProvider';
import { supabase } from '../../../utils/supabase';

export default function AdminHome() {
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Shield size={24} color="#1E88E5" />
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', marginLeft: 8 }}>Admin</Text>
          </View>
          <Text style={{ marginTop: 8, fontSize: 14, color: '#6B7280' }}>
            Tableau de bord d'administration
          </Text>
        </View>

        {!isAdmin ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#EF4444', textAlign: 'center' }}>
              Accès refusé. Votre compte n'a pas les droits administrateur.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Destinations */}
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

            {/* Utilisateurs */}
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

            {/* Compagnies / Trajets */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/admin/manage-compagnies')}
              activeOpacity={0.8}
              style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
            >
              <Building2 size={22} color="#1E88E5" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>Gérer les compagnies et trajets</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Ajout de trajets, modification, suppression</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
