import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Building2, Plus, Trash2, Edit2, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import BackButton from '../../../components/BackButton';

export default function ManageCompagnies() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [compagnies, setCompagnies] = useState([]);
  const [selectedCompagnie, setSelectedCompagnie] = useState(null);
  const [trajets, setTrajets] = useState([]);
  const [form, setForm] = useState({ depart: '', arrivee: '', prix: '', compagnie_id: null });
  const [isAdmin, setIsAdmin] = useState(false);
  const [userCompagnieId, setUserCompagnieId] = useState(null);
  const [activeTab, setActiveTab] = useState('trajets'); // 'compagnies' ou 'trajets'
  const [showCompagnieModal, setShowCompagnieModal] = useState(false);
  const [compagnieForm, setCompagnieForm] = useState({ id: null, nom: '', logo_url: '', telephone: '' });
  const [editingCompagnie, setEditingCompagnie] = useState(null);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('admin, compagnie_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const isAdminUser = !!profile.admin;
        setIsAdmin(isAdminUser);
        setUserCompagnieId(profile.compagnie_id);
        
        // Si c'est un admin, charger toutes les compagnies
        if (isAdminUser) {
          await loadCompagnies();
        }
        // Si c'est une compagnie, charger automatiquement ses données
        else if (profile.compagnie_id) {
          await loadUserCompagnie(profile.compagnie_id);
        }
      }
    } catch (error) {
      console.error('Erreur vérification rôle:', error);
    }
  };

  const loadUserCompagnie = async (compagnieId) => {
    // Charger les infos de la compagnie
    const { data: compagnie, error: compError } = await supabase
      .from('compagnies')
      .select('id, nom')
      .eq('id', compagnieId)
      .single();
    
    if (!compError && compagnie) {
      setCompagnies([compagnie]);
      setSelectedCompagnie(compagnie.id);
      setForm((f) => ({ ...f, compagnie_id: compagnie.id }));
      await loadTrajets(compagnie.id);
    }
  };

  const loadCompagnies = async () => {
    const { data, error } = await supabase.from('compagnies').select('id, nom, logo_url, telephone, created_at').order('nom');
    if (error) {
      console.error('Erreur chargement compagnies:', error);
      return;
    }
    console.log('Compagnies chargées:', data);
    setCompagnies(data ?? []);
  };

  const openAddCompagnieModal = () => {
    setEditingCompagnie(null);
    setCompagnieForm({ id: null, nom: '', logo_url: '', telephone: '' });
    setShowCompagnieModal(true);
  };

  const openEditCompagnieModal = (compagnie) => {
    setEditingCompagnie(compagnie);
    setCompagnieForm({
      id: compagnie.id,
      nom: compagnie.nom || '',
      logo_url: compagnie.logo_url || '',
      telephone: compagnie.telephone || ''
    });
    setShowCompagnieModal(true);
  };

  const saveCompagnie = async () => {
    const { nom, logo_url, telephone } = compagnieForm;
    if (!nom.trim()) {
      Alert.alert('Erreur', 'Le nom de la compagnie est obligatoire');
      return;
    }

    try {
      if (editingCompagnie) {
        // Mise à jour
        const { error } = await supabase
          .from('compagnies')
          .update({ nom: nom.trim(), logo_url: logo_url.trim() || null, telephone: telephone.trim() || null })
          .eq('id', editingCompagnie.id);
        if (error) throw error;
        Alert.alert('Succès', 'Compagnie mise à jour');
      } else {
        // Création
        const { error } = await supabase
          .from('compagnies')
          .insert({ nom: nom.trim(), logo_url: logo_url.trim() || null, telephone: telephone.trim() || null });
        if (error) throw error;
        Alert.alert('Succès', 'Compagnie créée');
      }
      setShowCompagnieModal(false);
      await loadCompagnies();
    } catch (e) {
      Alert.alert('Erreur', e.message ?? 'Opération impossible');
    }
  };

  const deleteCompagnie = async (compagnie) => {
    Alert.alert(
      'Confirmer la suppression',
      `Supprimer "${compagnie.nom}" ?\n\n⚠️ Tous les trajets de cette compagnie seront également supprimés.`,
      [
        { text: 'Annuler' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('compagnies').delete().eq('id', compagnie.id);
              if (error) throw error;
              Alert.alert('Succès', 'Compagnie supprimée');
              await loadCompagnies();
              if (selectedCompagnie === compagnie.id) {
                setSelectedCompagnie(null);
                setTrajets([]);
              }
            } catch (e) {
              Alert.alert('Erreur', e.message ?? 'Suppression impossible');
            }
          }
        }
      ]
    );
  };

  const loadTrajets = async (compagnieId) => {
    const { data, error } = await supabase.from('trajets').select('id, depart, arrivee, prix').eq('compagnie_id', compagnieId).order('id', { ascending: false });
    if (!error) setTrajets(data ?? []);
  };

  useEffect(() => { 
    if (isFocused) {
      checkUserRole();
    }
  }, [isFocused]);

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
        {/* Header */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <BackButton 
            title={isAdmin ? 'Gérer compagnies & trajets' : 'Gérer mes trajets'}
            fallback="/(tabs)/admin/dashboard"
            style={{ paddingHorizontal: 0, paddingVertical: 0, marginBottom: 12 }}
          />

          {/* Onglets pour Admin */}
          {isAdmin && (
            <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <TouchableOpacity
                onPress={() => setActiveTab('compagnies')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: activeTab === 'compagnies' ? '#1E88E5' : 'transparent',
                }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '600', color: activeTab === 'compagnies' ? '#FFFFFF' : '#6B7280' }}>
                  Compagnies
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('trajets')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: activeTab === 'trajets' ? '#1E88E5' : 'transparent',
                }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '600', color: activeTab === 'trajets' ? '#FFFFFF' : '#6B7280' }}>
                  Trajets
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ONGLET COMPAGNIES */}
        {isAdmin && activeTab === 'compagnies' && (
          <View style={{ paddingHorizontal: 16 }}>
            {/* Bouton Ajouter */}
            <TouchableOpacity
              onPress={openAddCompagnieModal}
              style={{ backgroundColor: '#10B981', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Ajouter une compagnie</Text>
            </TouchableOpacity>

            {/* Liste des compagnies */}
            <Text style={{ marginBottom: 12, color: '#374151', fontWeight: '600', fontSize: 16 }}>
              Compagnies ({compagnies.length})
            </Text>

            {compagnies.map((c) => (
              <View
                key={c.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
                      {c.nom}
                    </Text>
                    {c.telephone && (
                      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>
                        📞 {c.telephone}
                      </Text>
                    )}
                    {c.logo_url && (
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                        🖼️ Logo configuré
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => openEditCompagnieModal(c)}
                      style={{ backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8 }}
                    >
                      <Edit2 size={18} color="#1E88E5" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteCompagnie(c)}
                      style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 }}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {compagnies.length === 0 && (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Building2 size={48} color="#D1D5DB" />
                <Text style={{ marginTop: 12, color: '#6B7280', textAlign: 'center' }}>
                  Aucune compagnie. Cliquez sur "Ajouter" pour créer la première.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ONGLET TRAJETS */}
        {(activeTab === 'trajets' || !isAdmin) && (
          <>
            {/* Choix de la compagnie - Admin uniquement */}
            {isAdmin && compagnies.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <Text style={{ marginBottom: 6, color: '#374151', fontWeight: '600' }}>Sélectionner une compagnie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {compagnies.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => onSelectCompagnie(c.id)}
                      style={{
                        backgroundColor: selectedCompagnie === c.id ? '#1E88E5' : '#FFFFFF',
                        borderRadius: 12,
                        padding: 12,
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: selectedCompagnie === c.id ? '#1E88E5' : '#E5E7EB',
                      }}
                    >
                      <Text style={{ color: selectedCompagnie === c.id ? '#FFFFFF' : '#111827', fontWeight: '600' }}>
                        {c.nom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Nom de la compagnie - Compagnie uniquement */}
            {!isAdmin && compagnies.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 }}>
                  <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 4 }}>Compagnie</Text>
                  <Text style={{ color: '#111827', fontWeight: '700', fontSize: 18 }}>{compagnies[0]?.nom}</Text>
                </View>
              </View>
            )}

            {/* Ajout de trajet */}
            {selectedCompagnie && (
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <Text style={{ marginBottom: 6, color: '#374151', fontWeight: '600' }}>Ajouter un trajet</Text>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderColor: '#E5E7EB', borderWidth: 1 }}>
                  <TextInput placeholder="Départ" value={form.depart} onChangeText={(t) => setForm((f) => ({ ...f, depart: t }))} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 8 }} />
                  <TextInput placeholder="Arrivée" value={form.arrivee} onChangeText={(t) => setForm((f) => ({ ...f, arrivee: t }))} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 8 }} />
                  <TextInput placeholder="Prix (FCFA)" value={form.prix} onChangeText={(t) => setForm((f) => ({ ...f, prix: t }))} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 8 }} />
                  <TouchableOpacity onPress={addTrajet} style={{ backgroundColor: '#1E88E5', borderRadius: 8, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                    <Plus size={18} color="#FFFFFF" />
                    <Text style={{ marginLeft: 6, color: '#FFFFFF', fontWeight: '600' }}>Ajouter le trajet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Liste trajets */}
            {selectedCompagnie && (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={{ marginBottom: 12, color: '#374151', fontWeight: '600', fontSize: 16 }}>
                  Trajets ({trajets.length})
                </Text>
                {trajets.length > 0 ? (
                  trajets.map((t) => (
                    <View key={t.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderColor: '#E5E7EB', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#111827', fontWeight: '600', fontSize: 16 }}>{t.depart} → {t.arrivee}</Text>
                        <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 14, marginTop: 4 }}>{t.prix} FCFA</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteTrajet(t.id)} style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 }}>
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <Text style={{ color: '#6B7280', textAlign: 'center' }}>Aucun trajet pour cette compagnie</Text>
                  </View>
                )}
              </View>
            )}

            {!selectedCompagnie && (isAdmin || !compagnies.length) && (
              <View style={{ paddingHorizontal: 16 }}>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Building2 size={48} color="#D1D5DB" />
                  <Text style={{ marginTop: 12, color: '#6B7280', textAlign: 'center' }}>
                    {isAdmin
                      ? 'Sélectionnez une compagnie pour gérer ses trajets'
                      : 'Aucune compagnie associée à votre compte'}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Ajouter/Modifier Compagnie */}
      <Modal
        visible={showCompagnieModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompagnieModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingBottom: insets.bottom + 20 }}>
            {/* Header Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                {editingCompagnie ? 'Modifier la compagnie' : 'Nouvelle compagnie'}
              </Text>
              <TouchableOpacity onPress={() => setShowCompagnieModal(false)} style={{ padding: 8 }}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Formulaire */}
            <ScrollView style={{ maxHeight: 400, paddingHorizontal: 20 }}>
              <Text style={{ marginBottom: 6, color: '#374151', fontWeight: '600' }}>Nom de la compagnie *</Text>
              <TextInput
                placeholder="Ex: Air Bénin Transport"
                value={compagnieForm.nom}
                onChangeText={(t) => setCompagnieForm((f) => ({ ...f, nom: t }))}
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 }}
              />

              <Text style={{ marginBottom: 6, color: '#374151', fontWeight: '600' }}>Téléphone</Text>
              <TextInput
                placeholder="Ex: +229 XX XX XX XX"
                value={compagnieForm.telephone}
                onChangeText={(t) => setCompagnieForm((f) => ({ ...f, telephone: t }))}
                keyboardType="phone-pad"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 }}
              />

              <Text style={{ marginBottom: 6, color: '#374151', fontWeight: '600' }}>URL du logo</Text>
              <TextInput
                placeholder="Ex: https://example.com/logo.png"
                value={compagnieForm.logo_url}
                onChangeText={(t) => setCompagnieForm((f) => ({ ...f, logo_url: t }))}
                autoCapitalize="none"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 }}
              />

              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>
                * Champ obligatoire
              </Text>
            </ScrollView>

            {/* Boutons */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowCompagnieModal(false)}
                style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#374151', fontWeight: '600', fontSize: 16 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveCompagnie}
                style={{ flex: 1, backgroundColor: '#1E88E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
                  {editingCompagnie ? 'Enregistrer' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
