import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Building2, Plus, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../../utils/supabase';

export default function ManageCompagnies() {
  const insets = useSafeAreaInsets();
  const [compagnies, setCompagnies] = useState([]);
  const [selectedCompagnie, setSelectedCompagnie] = useState(null);
  const [trajets, setTrajets] = useState([]);
  const [form, setForm] = useState({ depart: '', arrivee: '', prix: '', compagnie_id: null });

  const loadCompagnies = async () => {
    const { data, error } = await supabase.from('compagnies').select('id, nom').order('nom');
    if (!error) setCompagnies(data ?? []);
  };

  const loadTrajets = async (compagnieId) => {
    const { data, error } = await supabase.from('trajets').select('id, depart, arrivee, prix').eq('compagnie_id', compagnieId).order('id', { ascending: false });
    if (!error) setTrajets(data ?? []);
  };

  useEffect(() => { loadCompagnies(); }, []);

  const onSelectCompagnie = async (id) => {
    setSelectedCompagnie(id);
    setForm((f) => ({ ...f, compagnie_id: id }));
    await loadTrajets(id);
  };

  const addTrajet = async () => {
    const payload = { depart: form.depart.trim(), arrivee: form.arrivee.trim(), prix: Number(form.prix), compagnie_id: form.compagnie_id };
    if (!payload.depart || !payload.arrivee || !payload.prix || !payload.compagnie_id) return;
    try {
      const { error } = await supabase.rpc('admin_upsert_trajet', { p_depart: payload.depart, p_arrivee: payload.arrivee, p_prix: payload.prix, p_compagnie_id: payload.compagnie_id });
      if (error) throw error;
      setForm((f) => ({ ...f, depart: '', arrivee: '', prix: '' }));
      await loadTrajets(payload.compagnie_id);
    } catch (e) {
      Alert.alert('Erreur', e.message ?? 'Ajout impossible');
    }
  };

  const deleteTrajet = async (id) => {
    Alert.alert('Confirmer', 'Supprimer ce trajet ?', [
      { text: 'Annuler' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          const { error } = await supabase.rpc('admin_delete_trajet', { p_trajet_id: id });
          if (error) throw error;
          await loadTrajets(selectedCompagnie);
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
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937' }}>Gérer compagnies & trajets</Text>
        </View>

        {/* Choix de la compagnie */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={{ marginBottom: 6, color: '#374151', fontWeight: '600' }}>Compagnie</Text>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
            {compagnies.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => onSelectCompagnie(c.id)} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: selectedCompagnie === c.id ? '#F3F4F6' : '#FFFFFF' }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>{c.nom}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ajout de trajet */}
        {selectedCompagnie && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ marginBottom: 6, color: '#374151', fontWeight: '600' }}>Ajouter un trajet</Text>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderColor: '#E5E7EB', borderWidth: 1 }}>
              <TextInput placeholder="Départ" value={form.depart} onChangeText={(t) => setForm((f) => ({ ...f, depart: t }))} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 8 }} />
              <TextInput placeholder="Arrivée" value={form.arrivee} onChangeText={(t) => setForm((f) => ({ ...f, arrivee: t }))} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 8 }} />
              <TextInput placeholder="Prix" value={form.prix} onChangeText={(t) => setForm((f) => ({ ...f, prix: t }))} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 8 }} />
              <TouchableOpacity onPress={addTrajet} style={{ backgroundColor: '#1E88E5', borderRadius: 8, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                <Plus size={18} color="#FFFFFF" />
                <Text style={{ marginLeft: 6, color: '#FFFFFF', fontWeight: '600' }}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Liste trajets */}
        {selectedCompagnie && (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={{ marginBottom: 6, color: '#374151', fontWeight: '600' }}>Trajets</Text>
            {trajets.map((t) => (
              <View key={t.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10, borderColor: '#E5E7EB', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>{t.depart} → {t.arrivee} · {t.prix} FCFA</Text>
                <TouchableOpacity onPress={() => deleteTrajet(t.id)} style={{ backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 }}>
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
