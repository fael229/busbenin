import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import {
  MapPin,
  Clock,
  DollarSign,
  Star,
  Heart,
  Phone,
  Building2,
  Navigation,
  MessageCircle,
  Edit3,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../../contexts/SessionProvider';
import { useTheme } from '../../../contexts/ThemeProvider';
import BackButton from '../../../components/BackButton';

export default function TrajetDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { session } = useSession();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();
  const [trajet, setTrajet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const trajetId = params.id;
  const fromCompagnie = params.fromCompagnie; // ID de la compagnie si on vient de là
  const fromTrajets = params.fromTrajets; // true si on vient de la page trajets
  const fromFavoris = params.fromFavoris; // true si on vient de la page favoris

  // Charger les détails du trajet
  useEffect(() => {
    if (isFocused && trajetId) {
      loadTrajetDetails();
      if (session?.user?.id) {
        checkIfFavorite();
      }
    }
  }, [isFocused, trajetId, session?.user?.id]);

  const loadTrajetDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trajets')
        .select(`
          id,
          depart,
          arrivee,
          prix,
          horaires,
          gare,
          note,
          nb_avis,
          compagnies:compagnie_id (
            id,
            nom,
            logo_url,
            telephone
          )
        `)
        .eq('id', trajetId)
        .single();

      if (error) throw error;
      setTrajet(data);
    } catch (error) {
      console.error('Erreur lors du chargement du trajet:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du trajet');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('favoris')
        .select('trajet_id')
        .eq('user_id', session.user.id)
        .eq('trajet_id', trajetId)
        .single();

      setIsFavorite(!!data);
    } catch (error) {
      setIsFavorite(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrajetDetails();
    if (session?.user?.id) {
      await checkIfFavorite();
    }
    setRefreshing(false);
  };

  const toggleFavorite = async () => {
    if (!session?.user?.id) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour ajouter des favoris');
      return;
    }

    try {
      if (isFavorite) {
        // Retirer des favoris
        const { error } = await supabase
          .from('favoris')
          .delete()
          .eq('user_id', session.user.id)
          .eq('trajet_id', trajetId);

        if (error) throw error;
        setIsFavorite(false);
      } else {
        // Ajouter aux favoris
        const { error } = await supabase
          .from('favoris')
          .insert({ user_id: session.user.id, trajet_id: trajetId });

        if (error && error.code !== '23505') throw error;
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Erreur favoris:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.backgroundSecondary }}>
        <Text style={{ fontSize: 16, color: theme.textSecondary }}>Chargement...</Text>
      </View>
    );
  }

  if (!trajet) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.backgroundSecondary }}>
        <Text style={{ fontSize: 16, color: theme.textSecondary }}>Trajet introuvable</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 20,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton 
            fallback={
              fromCompagnie ? `/compagnie/${fromCompagnie}` :
              fromTrajets ? '/(tabs)/trajets' :
              fromFavoris ? '/(tabs)/favoris' :
              '/(tabs)/'
            }
            buttonStyle={{ marginLeft: -8 }} 
          />

          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, flex: 1, textAlign: 'center' }}>
            Détails du trajet
          </Text>

          <TouchableOpacity
            onPress={toggleFavorite}
            style={{
              padding: 8,
              marginRight: -8,
            }}
          >
            <Heart size={24} color={isFavorite ? theme.error : theme.textTertiary} fill={isFavorite ? theme.error : 'none'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        {/* Route principale */}
        <View style={{ backgroundColor: theme.surface, padding: 20, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Départ</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={20} color={theme.primary} />
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginLeft: 8 }}>
                  {trajet.depart}
                </Text>
              </View>
            </View>

            <View style={{ marginHorizontal: 12 }}>
              <Navigation size={24} color={theme.textTertiary} />
            </View>

            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Arrivée</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginRight: 8 }}>
                  {trajet.arrivee}
                </Text>
                <MapPin size={20} color={theme.success} />
              </View>
            </View>
          </View>

          {/* Prix */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DollarSign size={20} color={theme.success} />
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.success, marginLeft: 4 }}>
                {trajet.prix} FCFA
              </Text>
            </View>
          </View>

          {/* Note et avis - Cliquable */}
          <TouchableOpacity
            onPress={() => router.push(`/avis/liste/${trajetId}`)}
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}
          >
            <Star size={18} color={theme.warning} fill={theme.warning} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginLeft: 4 }}>
              {trajet.note > 0 ? trajet.note.toFixed(1) : '0.0'}
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 4 }}>
              ({trajet.nb_avis || 0} avis)
            </Text>
            <MessageCircle size={14} color={theme.primary} style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          {/* Bouton laisser un avis */}
          <TouchableOpacity
            onPress={() => router.push(`/avis/${trajetId}`)}
            style={{
              marginTop: 12,
              backgroundColor: theme.primaryLight,
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
            }}
          >
            <Edit3 size={14} color={theme.commun} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.commun, marginLeft: 6 }}>
              Laisser un avis
            </Text>
          </TouchableOpacity>
        </View>

        {/* Gare de départ */}
        {trajet.gare && (
          <View style={{ backgroundColor: theme.surface, padding: 20, marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 }}>
              Gare de départ
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MapPin size={18} color={theme.textSecondary} />
              <Text style={{ fontSize: 14, color: theme.text, marginLeft: 8 }}>{trajet.gare}</Text>
            </View>
          </View>
        )}

        {/* Horaires */}
        {trajet.horaires && trajet.horaires.length > 0 && (
          <View style={{ backgroundColor: theme.surface, padding: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Clock size={20} color={theme.primary} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginLeft: 8 }}>
                Horaires disponibles
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {trajet.horaires.map((horaire, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: theme.primaryLight,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.primary,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.commun }}>
                    {horaire}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Informations compagnie */}
        {trajet.compagnies && (
          <View style={{ backgroundColor: theme.surface, padding: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Building2 size={20} color={theme.primary} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginLeft: 8 }}>
                Compagnie
              </Text>
            </View>

            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 12 }}>
              {trajet.compagnies.nom}
            </Text>

            {trajet.compagnies.telephone && (
              <TouchableOpacity
                onPress={() => handleCall(trajet.compagnies.telephone)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.primaryLight,
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 12,
                }}
              >
                <Phone size={18} color={theme.commun} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.commun, marginLeft: 8 }}>
                  {trajet.compagnies.telephone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bouton de réservation fixe en bas */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.surface,
          padding: 20,
          paddingBottom: insets.bottom + 20,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push(`/reservation/${trajet.id}`)}
          style={{
            backgroundColor: theme.primary,
            padding: 16,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textInverse }}>
            Réserver ce trajet
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
