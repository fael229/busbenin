import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Star, User, MessageCircle, Send, X, Edit3 } from 'lucide-react-native';
import { supabase } from '../../../../utils/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../contexts/ThemeProvider';
import BackButton from '../../../../components/BackButton';

export default function ListeAvis() {
  const { trajetId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [trajet, setTrajet] = useState(null);
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [compagnieId, setCompagnieId] = useState(null);
  const [showReponseModal, setShowReponseModal] = useState(false);
  const [selectedAvis, setSelectedAvis] = useState(null);
  const [reponseText, setReponseText] = useState('');

  useEffect(() => {
    checkUserRole();
    loadData();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('admin, compagnie_id')
      .eq('id', user.id)
      .single();

    if (profile) {
      setIsAdmin(!!profile.admin);
      setCompagnieId(profile.compagnie_id);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await loadTrajet();
    await loadAvis();
    setLoading(false);
  };

  const loadTrajet = async () => {
    try {
      console.log('🔍 Chargement trajet:', trajetId);
      const { data, error } = await supabase
        .from('trajets')
        .select('*, compagnies:compagnie_id(nom)')
        .eq('id', trajetId)
        .single();

      if (error) {
        console.error('❌ Erreur chargement trajet:', error);
        Alert.alert('Erreur', 'Impossible de charger les informations du trajet');
        return;
      }
      
      console.log('✅ Trajet chargé:', data);
      setTrajet(data);
    } catch (error) {
      console.error('❌ Exception chargement trajet:', error);
    }
  };

  const loadAvis = async () => {
    try {
      console.log('🔍 Chargement avis pour trajet:', trajetId);
      
      const { data, error } = await supabase
        .from('avis')
        .select(`
          id,
          user_id,
          trajet_id,
          note,
          commentaire,
          reponse,
          reponse_par,
          reponse_at,
          created_at
        `)
        .eq('trajet_id', trajetId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement avis:', error);
        Alert.alert('Erreur', `Impossible de charger les avis: ${error.message}`);
        setAvis([]);
        return;
      }
      
      console.log(`✅ ${data?.length || 0} avis chargés:`, data);
      setAvis(data || []);
    } catch (error) {
      console.error('❌ Exception chargement avis:', error);
      setAvis([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const ouvrirModalReponse = (avisItem) => {
    setSelectedAvis(avisItem);
    setReponseText(avisItem.reponse || '');
    setShowReponseModal(true);
  };

  const envoyerReponse = async () => {
    if (!reponseText.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une réponse');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('repondre_avis', {
        p_avis_id: selectedAvis.id,
        p_reponse: reponseText.trim(),
      });

      if (error) throw error;

      Alert.alert('Succès', 'Réponse publiée');
      setShowReponseModal(false);
      await loadAvis();
    } catch (error) {
      console.error('Erreur réponse:', error);
      Alert.alert('Erreur', error.message || 'Impossible de publier la réponse');
    }
  };

  const canRepondre = (avisItem) => {
    if (isAdmin) return true;
    if (compagnieId && trajet && trajet.compagnie_id === compagnieId) return true;
    return false;
  };

  const renderStars = (note) => {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            color={star <= note ? theme.star : theme.border}
            fill={star <= note ? theme.star : 'transparent'}
          />
        ))}
      </View>
    );
  };

  const moyenneNote = avis.length > 0 ? (avis.reduce((sum, a) => sum + a.note, 0) / avis.length).toFixed(1) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}
      >
        {/* Header */}
        <BackButton 
          title="Avis des voyageurs"
          fallback={`/trajet/${trajetId}`}
        />

        {/* Infos trajet */}
        {trajet && (
          <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
              {trajet.depart} → {trajet.arrivee}
            </Text>
            {trajet.compagnies && (
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 12 }}>
                {trajet.compagnies.nom}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Star size={24} color={theme.star} fill={theme.star} />
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }}>
                {moyenneNote}
              </Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                ({avis.length} {avis.length > 1 ? 'avis' : 'avis'})
              </Text>
            </View>
          </View>
        )}

        {/* État de chargement */}
        {loading && avis.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 12 }}>
              Chargement des avis...
            </Text>
          </View>
        ) : avis.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <MessageCircle size={64} color={theme.border} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginTop: 16, textAlign: 'center' }}>
              Aucun avis pour le moment
            </Text>
            <Text style={{ fontSize: 14, color: theme.textTertiary, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>
              Ce trajet n'a pas encore été évalué.{'\n'}
              Soyez le premier à partager votre expérience !
            </Text>
            
            {/* Bouton pour laisser un avis */}
            <TouchableOpacity
              onPress={() => router.push(`/avis/${trajetId}`)}
              style={{
                marginTop: 24,
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 24,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Edit3 size={20} color={theme.textInverse} />
              <Text style={{ color: theme.textInverse, fontSize: 16, fontWeight: '600' }}>
                Laisser le premier avis
              </Text>
            </TouchableOpacity>
            
            {/* Info debug */}
            <View style={{ marginTop: 24, backgroundColor: theme.warning, borderRadius: 8, padding: 12, maxWidth: 300, opacity: 0.2 }}>
              <Text style={{ fontSize: 12, color: theme.text, textAlign: 'center' }}>
                💡 Consultez la console pour voir les logs de chargement
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ marginHorizontal: 16 }}>
            {avis.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                {/* Header avis */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <User size={16} color={theme.textSecondary} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                        Voyageur
                      </Text>
                    </View>
                    {renderStars(item.note)}
                  </View>
                  <Text style={{ fontSize: 12, color: theme.textTertiary }}>
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>

                {/* Commentaire */}
                <Text style={{ fontSize: 14, color: theme.text, lineHeight: 20 }}>
                  {item.commentaire}
                </Text>

                {/* Réponse existante */}
                {item.reponse && (
                  <View style={{ marginTop: 12, backgroundColor: theme.surfaceSecondary, borderRadius: 8, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <MessageCircle size={14} color={theme.primary} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>
                        Réponse de la compagnie
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: theme.text }}>
                      {item.reponse}
                    </Text>
                    {item.reponse_at && (
                      <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 4 }}>
                        {new Date(item.reponse_at).toLocaleDateString('fr-FR')}
                      </Text>
                    )}
                  </View>
                )}

                {/* Bouton Répondre */}
                {canRepondre(item) && (
                  <TouchableOpacity
                    onPress={() => ouvrirModalReponse(item)}
                    style={{
                      marginTop: 12,
                      backgroundColor: theme.primaryLight,
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      opacity: 0.5,
                    }}
                  >
                    <MessageCircle size={16} color={theme.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.primary }}>
                      {item.reponse ? 'Modifier la réponse' : 'Répondre'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Réponse */}
      <Modal
        visible={showReponseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReponseModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingBottom: insets.bottom + 20 }}>
            {/* Header Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
                Répondre à l'avis
              </Text>
              <TouchableOpacity onPress={() => setShowReponseModal(false)} style={{ padding: 8 }}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Avis original */}
            {selectedAvis && (
              <View style={{ marginHorizontal: 20, backgroundColor: theme.backgroundSecondary, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {renderStars(selectedAvis.note)}
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    par un voyageur
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.text }} numberOfLines={3}>
                  {selectedAvis.commentaire}
                </Text>
              </View>
            )}

            {/* Champ réponse */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
                Votre réponse
              </Text>
              <TextInput
                value={reponseText}
                onChangeText={setReponseText}
                placeholder="Répondez à cet avis de manière professionnelle..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  backgroundColor: theme.backgroundSecondary,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  fontSize: 14,
                  minHeight: 100,
                  color: theme.text,
                }}
              />
            </View>

            {/* Boutons */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowReponseModal(false)}
                style={{ flex: 1, backgroundColor: theme.surfaceSecondary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={envoyerReponse}
                style={{ flex: 1, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              >
                <Send size={16} color={theme.textInverse} />
                <Text style={{ color: theme.textInverse, fontWeight: '600' }}>Publier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
