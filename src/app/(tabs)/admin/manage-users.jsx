import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, UserCog, ShieldCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../../contexts/SessionProvider';

export default function ManageUsers() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [users, setUsers] = useState([]);

  const load = async () => {
    // Secured RPC returns profiles only if caller is admin
    const { data, error } = await supabase.rpc('admin_list_profiles');
    if (!error) setUsers((data ?? []).map(p => ({ id: p.id, email: p.email, admin: p.admin })));
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (userId, current) => {
    try {
      const { error } = await supabase.rpc('admin_set_user_admin', { p_user_id: userId, p_admin: !current });
      if (error) throw error;
      await load();
    } catch (e) {
      Alert.alert('Erreur', e.message ?? 'Action refusée');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="dark" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
        <View style={{ paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
            <ArrowLeft size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937' }}>Gérer les utilisateurs</Text>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {users.map((u) => (
            <View key={u.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10, borderColor: '#E5E7EB', borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 16, color: '#111827', fontWeight: '600' }}>{u.email || u.id}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>{u.admin ? 'Admin' : 'Utilisateur'}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleAdmin(u.id, u.admin)} style={{ backgroundColor: u.admin ? '#FEF2F2' : '#ECFDF5', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                {u.admin ? <ShieldCheck size={16} color="#EF4444" /> : <UserCog size={16} color="#10B981" />}
                <Text style={{ marginLeft: 6, color: u.admin ? '#EF4444' : '#10B981', fontWeight: '600' }}>{u.admin ? 'Retirer admin' : 'Rendre admin'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
