import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../../contexts/SessionProvider';

export default function ManageDestinations() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [items, setItems] = useState([]);
  const [nom, setNom] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from('destinations').select('id, nom').order('nom');
    if (!error) setItems(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const addDestination = async () => {
    if (!nom.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_upsert_destination', { p_nom: nom.trim() });
      if (error) throw error;
      setNom('');
      await load();
    } catch (e) {
      Alert.alert('Erreur', e.message ?? 'Impossible d\'ajouter');
    } finally { setLoading(false); }
  };

  const deleteDestination = async (id) => {
    Alert.alert('Confirmer', 'Supprimer cette destination ?', [
      { text: 'Annuler' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          const { error } = await supabase.rpc('admin_delete_destination', { p_id: id });
          if (error) throw error;
          await load();
        } catch (e) {
          Alert.alert('Erreur', e.message ?? 'Suppression impossible');
        }
      }}
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="dark" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
        <View style={{ paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
            <ArrowLeft size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937' }}>Gérer les destinations</Text>
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderColor: '#E5E7EB', borderWidth: 1 }}>
            <MapPin size={18} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Nom de la destination"
              placeholderTextColor="#9CA3AF"
              value={nom}
              onChangeText={setNom}
              style={{ flex: 1, fontSize: 14, color: '#111827' }}
            />
            <TouchableOpacity onPress={addDestination} disabled={loading || !nom.trim()} style={{ marginLeft: 8, backgroundColor: '#1E88E5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, opacity: loading || !nom.trim() ? 0.6 : 1 }}>
              <Plus size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {items.map((d) => (
            <View key={d.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10, borderColor: '#E5E7EB', borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, color: '#111827', fontWeight: '600' }}>{d.nom}</Text>
              <TouchableOpacity onPress={() => deleteDestination(d.id)} style={{ backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 }}>
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
