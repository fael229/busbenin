import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { useSession } from '../../contexts/SessionProvider';
import { useTheme } from '../../contexts/ThemeProvider';
import { checkTransactionStatus } from '../../utils/fedapay';

export default function MesReservationsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadReservations();
    }
  }, [isFocused]);

  const loadReservations = async () => {
    if (!session?.user?.id) {
      setReservations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          nb_places,
          horaire,
          montant_total,
          nom_passager,
          telephone_passager,
          statut,
          statut_paiement,
          fedapay_transaction_id,
          created_at,
          trajets:trajet_id (
            id,
            depart,
            arrivee,
            compagnies:compagnie_id (nom)
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReservations(data || []);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      Alert.alert('Erreur', 'Impossible de charger vos réservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const verifierStatutPaiement = async (reservation) => {
    if (!reservation.fedapay_transaction_id) {
      Alert.alert('Information', 'Aucune transaction de paiement trouvée');
      return;
    }

    try {
      const result = await checkTransactionStatus(reservation.fedapay_transaction_id);

      if (result.success) {
        // Mettre à jour le statut local
        const { error } = await supabase.rpc('update_reservation_payment', {
          p_reservation_id: reservation.id,
          p_fedapay_transaction_id: reservation.fedapay_transaction_id,
          p_fedapay_token: reservation.fedapay_token || '',
          p_statut_paiement: result.status,
        });

        if (!error) {
          Alert.alert(
            'Statut du paiement',
            `Statut: ${getStatutLabel(result.status)}`
          );
          loadReservations(); // Recharger la liste
        }
      } else {
        Alert.alert('Erreur', 'Impossible de vérifier le statut du paiement');
      }
    } catch (error) {
      console.error('Erreur vérification paiement:', error);
      Alert.alert('Erreur', error.message);
    }
  };

  const annulerReservation = async (reservationId) => {
    Alert.alert(
      'Annuler la réservation',
      'Êtes-vous sûr de vouloir annuler cette réservation ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc('cancel_reservation', {
                p_reservation_id: reservationId,
              });

              if (error) throw error;

              if (data) {
                Alert.alert('Succès', 'Réservation annulée');
                loadReservations();
              } else {
                Alert.alert(
                  'Impossible d\'annuler',
                  'Cette réservation ne peut pas être annulée (déjà confirmée ou déjà annulée)'
                );
              }
            } catch (error) {
              console.error('Erreur annulation:', error);
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const getStatutLabel = (statut) => {
    const labels = {
      pending: 'En attente',
      approved: 'Payé',
      declined: 'Refusé',
      canceled: 'Annulé',
      en_attente: 'En attente',
      confirmee: 'Confirmée',
      annulee: 'Annulée',
      expiree: 'Expirée',
    };
    return labels[statut] || statut;
  };

  const getStatutColor = (statut) => {
    const colors = {
      pending: theme.warning,
      approved: theme.success,
      declined: theme.error,
      canceled: theme.textSecondary,
      en_attente: theme.warning,
      confirmee: theme.success,
      annulee: theme.textSecondary,
      expiree: theme.error,
    };
    return colors[statut] || theme.textSecondary;
  };

  const getStatutIcon = (statut) => {
    switch (statut) {
      case 'approved':
      case 'confirmee':
        return <CheckCircle size={20} color={theme.success} />;
      case 'declined':
      case 'annulee':
      case 'expiree':
        return <XCircle size={20} color={theme.error} />;
      default:
        return <AlertCircle size={20} color={theme.warning} />;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.backgroundSecondary }}>
        <Text style={{ color: theme.textSecondary }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingBottom: 20,
          paddingHorizontal: 20,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }}>
          Mes réservations
        </Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: theme.textSecondary }}>
          {reservations.length} réservation{reservations.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReservations(); }} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        {reservations.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Calendar size={48} color={theme.borderLight} />
            <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: theme.textSecondary }}>
              Aucune réservation
            </Text>
            <Text style={{ marginTop: 8, fontSize: 14, color: theme.textTertiary, textAlign: 'center' }}>
              Vos réservations apparaîtront ici
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/trajets')}
              style={{
                marginTop: 24,
                backgroundColor: theme.primary,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Rechercher un trajet
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          reservations.map((reservation) => (
            <View
              key={reservation.id}
              style={{
                backgroundColor: theme.surface,
                marginHorizontal: 20,
                marginTop: 12,
                borderRadius: 12,
                padding: 16,
                shadowColor: theme.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: theme.shadowOpacity,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {/* Trajet */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <MapPin size={18} color={theme.primary} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginLeft: 8, flex: 1 }}>
                  {reservation.trajets?.depart} → {reservation.trajets?.arrivee}
                </Text>
                {getStatutIcon(reservation.statut_paiement)}
              </View>

              {/* Compagnie */}
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
                {reservation.trajets?.compagnies?.nom}
              </Text>

              {/* Détails */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Users size={14} color={theme.textSecondary} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginLeft: 4 }}>
                    {reservation.nb_places} place{reservation.nb_places > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={14} color={theme.textSecondary} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginLeft: 4 }}>
                    {reservation.horaire}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <DollarSign size={14} color={theme.success} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.success, marginLeft: 2 }}>
                    {reservation.montant_total} FCFA
                  </Text>
                </View>
              </View>

              {/* Statuts */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    backgroundColor: `${getStatutColor(reservation.statut)}20`,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: getStatutColor(reservation.statut) }}>
                    {getStatutLabel(reservation.statut)}
                  </Text>
                </View>
                <View
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    backgroundColor: `${getStatutColor(reservation.statut_paiement)}20`,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: getStatutColor(reservation.statut_paiement) }}>
                    {getStatutLabel(reservation.statut_paiement)}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {reservation.statut_paiement === 'pending' && (
                  <TouchableOpacity
                    onPress={() => verifierStatutPaiement(reservation)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.primaryLight,
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    <RefreshCw size={16} color={theme.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary, marginLeft: 6 }}>
                      Vérifier
                    </Text>
                  </TouchableOpacity>
                )}
                {reservation.statut === 'en_attente' && (
                  <TouchableOpacity
                    onPress={() => annulerReservation(reservation.id)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.errorLight,
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    <XCircle size={16} color={theme.error} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.error, marginLeft: 6 }}>
                      Annuler
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
