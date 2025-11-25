import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { supabase } from '../../../utils/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeProvider';
import BackButton from '../../../components/BackButton';

export default function LaisserAvis() {
  const { trajetId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [trajet, setTrajet] = useState(null);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [avisDeja, setAvisDeja] = useState(false);

  useEffect(() => {
    loadTrajet();
    checkAvisExistant();
  }, []);

  const loadTrajet = async () => {
    try {
      console.log('🔍 [LaisserAvis] Chargement trajet:', trajetId);
      const { data, error } = await supabase
        .from('trajets')
        .select('*, compagnies:compagnie_id(nom)')
        .eq('id', trajetId)
        .single();

      if (error) {
        console.error('❌ [LaisserAvis] Erreur chargement trajet:', error);
        return;
      }
      
      console.log('✅ [LaisserAvis] Trajet chargé:', data);
      setTrajet(data);
    } catch (error) {
      console.error('❌ [LaisserAvis] Exception:', error);
    }
  };

  const checkAvisExistant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ [LaisserAvis] Utilisateur non connecté');
        return;
      }

      console.log('🔍 [LaisserAvis] Vérification avis existant pour user:', user.id);
      const { data, error } = await supabase
        .from('avis')
        .select('id')
        .eq('trajet_id', trajetId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = pas de résultat (normal)
        console.error('❌ [LaisserAvis] Erreur vérification avis:', error);
      }

      if (data) {
        console.log('⚠️ [LaisserAvis] Avis déjà déposé:', data);
        setAvisDeja(true);
      } else {
        console.log('✅ [LaisserAvis] Pas d\'avis existant');
      }
    } catch (error) {
      console.error('❌ [LaisserAvis] Exception vérification:', error);
    }
  };

  const soumettreAvis = async () => {
    if (note === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note');
      return;
    }

    if (!commentaire.trim()) {
      Alert.alert('Erreur', 'Veuillez laisser un commentaire');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      console.log('📤 [LaisserAvis] Soumission avis:', {
        user_id: user.id,
        trajet_id: trajetId,
        note: note,
        commentaire_length: commentaire.trim().length
      });

      const { data, error } = await supabase
        .from('avis')
        .insert({
          user_id: user.id,
          trajet_id: trajetId,
          note: note,
          commentaire: commentaire.trim(),
        })
        .select();

      if (error) {
        console.error('❌ [LaisserAvis] Erreur insertion:', error);
        
        // Gérer l'erreur de contrainte unique
        if (error.code === '23505') {
          Alert.alert('Erreur', 'Vous avez déjà laissé un avis pour ce trajet');
        } else {
          throw error;
        }
        return;
      }

      console.log('✅ [LaisserAvis] Avis créé avec succès:', data);

      Alert.alert(
        'Merci !',
        'Votre avis a été publié avec succès',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('❌ [LaisserAvis] Exception soumission:', error);
      Alert.alert('Erreur', error.message || 'Impossible de publier votre avis');
    } finally {
      setLoading(false);
    }
  };

  if (avisDeja) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
        <BackButton 
          title="Avis déjà déposé"
          fallback={`/trajet/${trajetId}`}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Star size={64} color={theme.star} fill={theme.star} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginTop: 16, textAlign: 'center' }}>
            Vous avez déjà laissé un avis pour ce trajet
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 24 }}
          >
            <Text style={{ color: theme.textInverse, fontWeight: '600' }}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}>
      {/* Header */}
      <BackButton 
        title="Laisser un avis"
        fallback={`/trajet/${trajetId}`}
      />

      {/* Infos trajet */}
      {trajet && (
        <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Trajet</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
            {trajet.depart} → {trajet.arrivee}
          </Text>
          {trajet.compagnies && (
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>
              {trajet.compagnies.nom}
            </Text>
          )}
        </View>
      )}

      {/* Notation */}
      <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 }}>
          Comment évaluez-vous ce trajet ?
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 20 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setNote(star)}
              style={{ padding: 4 }}
            >
              <Star
                size={48}
                color={star <= note ? theme.star : theme.border}
                fill={star <= note ? theme.star : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>
        {note > 0 && (
          <Text style={{ textAlign: 'center', fontSize: 16, color: theme.textSecondary, marginTop: 8 }}>
            {note === 1 && '⭐ Très mauvais'}
            {note === 2 && '⭐⭐ Mauvais'}
            {note === 3 && '⭐⭐⭐ Moyen'}
            {note === 4 && '⭐⭐⭐⭐ Bon'}
            {note === 5 && '⭐⭐⭐⭐⭐ Excellent'}
          </Text>
        )}
      </View>

      {/* Commentaire */}
      <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
          Votre avis
        </Text>
        <TextInput
          value={commentaire}
          onChangeText={setCommentaire}
          placeholder="Partagez votre expérience avec ce trajet (confort, ponctualité, service...)"
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            fontSize: 16,
            minHeight: 120,
            color: theme.text,
          }}
        />
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
          {commentaire.length} / 500 caractères
        </Text>
      </View>

      {/* Bouton Soumettre */}
      <View style={{ marginHorizontal: 16 }}>
        <TouchableOpacity
          onPress={soumettreAvis}
          disabled={loading || note === 0 || !commentaire.trim()}
          style={{
            backgroundColor: (loading || note === 0 || !commentaire.trim()) ? theme.border : theme.primary,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: theme.textInverse, fontSize: 16, fontWeight: '600' }}>
            {loading ? 'Publication...' : 'Publier mon avis'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: theme.primaryLight, borderRadius: 12, padding: 12, opacity: 0.3 }}>
        <Text style={{ fontSize: 12, color: theme.primary, textAlign: 'center' }}>
          💡 Votre avis aidera les autres voyageurs à faire leur choix
        </Text>
      </View>
    </ScrollView>
  );
}
