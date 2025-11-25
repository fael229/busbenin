import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  ChevronRight,
  Calendar,
} from 'lucide-react-native';
import { supabase } from '../../../utils/supabase';
import { useTheme } from '../../../contexts/ThemeProvider';
import BackButton from '../../../components/BackButton';

export default function CompagnieDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [compagnie, setCompagnie] = useState(null);
  const [trajets, setTrajets] = useState([]);
  const [stats, setStats] = useState({ totalTrajets: 0, notesMoyenne: 0, totalAvis: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCompagnieDetails();
  }, [id]);

  const loadCompagnieDetails = async () => {
    try {
      setLoading(true);

      // Charger les informations de la compagnie
      const { data: compagnieData, error: compagnieError } = await supabase
        .from('compagnies')
        .select('*')
        .eq('id', id)
        .single();

      if (compagnieError) throw compagnieError;

      // Charger les trajets de la compagnie
      const { data: trajetsData, error: trajetsError } = await supabase
        .from('trajets')
        .select('*')
        .eq('compagnie_id', id)
        .order('created_at', { ascending: false });

      if (trajetsError) throw trajetsError;

      // Calculer les statistiques
      const totalTrajets = trajetsData?.length || 0;
      const trajetsAvecNote = trajetsData?.filter(t => t.nb_avis > 0) || [];
      const notesMoyenne = trajetsAvecNote.length > 0
        ? (trajetsAvecNote.reduce((sum, t) => sum + (t.note || 0), 0) / trajetsAvecNote.length).toFixed(1)
        : 0;
      const totalAvis = trajetsData?.reduce((sum, t) => sum + (t.nb_avis || 0), 0) || 0;

      setCompagnie(compagnieData);
      setTrajets(trajetsData || []);
      setStats({ totalTrajets, notesMoyenne, totalAvis });
    } catch (error) {
      console.error('Erreur chargement compagnie:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations de la compagnie');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (compagnie?.telephone) {
      Linking.openURL(`tel:${compagnie.telephone}`);
    }
  };

  const handleWhatsApp = () => {
    if (compagnie?.telephone) {
      const cleanPhone = compagnie.telephone.replace(/[^0-9]/g, '');
      const message = `Bonjour ${compagnie.nom}, je souhaite avoir des informations sur vos trajets.`;
      Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`);
    }
  };

  const handleEmail = () => {
    if (compagnie?.email) {
      Linking.openURL(`mailto:${compagnie.email}`);
    }
  };

  const handleTrajetPress = (trajetId) => {
    // Passer l'ID de la compagnie pour permettre le retour
    router.push(`/trajet/${trajetId}?fromCompagnie=${id}`);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompagnieDetails();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.backgroundSecondary }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 12, color: theme.textSecondary }}>Chargement...</Text>
      </View>
    );
  }

  if (!compagnie) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <BackButton fallback="/(tabs)/compagnies" />

        {/* Hero Section */}
        <View style={{ backgroundColor: theme.surface, paddingHorizontal: 20, paddingVertical: 24, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}
            >
              <Building2 size={40} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }}>
                {compagnie.nom}
              </Text>
              {compagnie.telephone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Phone size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                    {compagnie.telephone}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.primary }}>
                {stats.totalTrajets}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                Trajets
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Star size={20} color="#FCD34D" fill="#FCD34D" />
                <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginLeft: 4 }}>
                  {stats.notesMoyenne}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                Note moyenne
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.success }}>
                {stats.totalAvis}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                Avis
              </Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={{ backgroundColor: theme.surface, paddingHorizontal: 20, paddingVertical: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 16 }}>
            Contacter la compagnie
          </Text>

          <View style={{ gap: 12 }}>
            {compagnie.telephone && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleCall}
                  style={{
                    flex: 1,
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Phone size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                    Appeler
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleWhatsApp}
                  style={{
                    flex: 1,
                    backgroundColor: theme.success,
                    borderRadius: 12,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 18, marginRight: 6 }}>💬</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                    WhatsApp
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {compagnie.email && (
              <TouchableOpacity
                onPress={handleEmail}
                style={{
                  backgroundColor: theme.surfaceSecondary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.8}
              >
                <Mail size={18} color={theme.text} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
                  Envoyer un email
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Trajets */}
        <View style={{ backgroundColor: theme.surface, paddingTop: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, paddingHorizontal: 20, marginBottom: 16 }}>
            Tous les trajets ({trajets.length})
          </Text>

          {trajets.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <MapPin size={48} color={theme.borderLight} />
              <Text style={{ fontSize: 16, color: theme.textSecondary, marginTop: 12 }}>
                Aucun trajet disponible
              </Text>
            </View>
          ) : (
            <View>
              {trajets.map((trajet) => (
                <TouchableOpacity
                  key={trajet.id}
                  onPress={() => handleTrajetPress(trajet.id)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      {/* Route */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                            {trajet.depart}
                          </Text>
                        </View>
                        <View style={{ marginHorizontal: 12 }}>
                          <ChevronRight size={20} color={theme.textTertiary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, textAlign: 'right' }}>
                            {trajet.arrivee}
                          </Text>
                        </View>
                      </View>

                      {/* Info */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Clock size={14} color={theme.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                            {trajet.horaires ? trajet.horaires.join(", ") : "N/A"}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.primary }}>
                            {trajet.prix} FCFA
                          </Text>
                        </View>
                        {trajet.nb_avis > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Star size={14} color="#FCD34D" fill="#FCD34D" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                              {trajet.note?.toFixed(1)} ({trajet.nb_avis})
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <ChevronRight size={20} color={theme.textTertiary} style={{ marginLeft: 12 }} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Description (si disponible) */}
        {compagnie.description && (
          <View style={{ backgroundColor: theme.surface, paddingHorizontal: 20, paddingVertical: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 }}>
              À propos
            </Text>
            <Text style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 20 }}>
              {compagnie.description}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
