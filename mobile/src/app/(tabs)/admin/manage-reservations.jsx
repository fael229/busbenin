import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import BackButton from '../../../components/BackButton';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  Phone,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react-native';
import { supabase } from '../../../utils/supabase';
import { checkTransactionStatus } from '../../../utils/fedapay';

export default function ManageReservations() {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'complete', 'failed'
  const [isAdmin, setIsAdmin] = useState(false);
  const [userCompagnieId, setUserCompagnieId] = useState(null);

  useEffect(() => {
    if (isFocused) {
      checkUserRole();
      loadReservations();
    }
  }, [isFocused]);

  useEffect(() => {
    filterReservations();
  }, [reservations, searchQuery, statusFilter]);

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
        setIsAdmin(!!profile.admin);
        setUserCompagnieId(profile.compagnie_id);
      }
    } catch (error) {
      console.error('Erreur vérification rôle:', error);
    }
  };

  const loadReservations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('admin, compagnie_id')
        .eq('id', user.id)
        .single();

      let query;
      const selectStatement = `
        *,
        trajets:trajet_id (
          id,
          depart,
          arrivee,
          prix,
          compagnie_id,
          compagnies:compagnie_id (
            id,
            nom
          )
        )
      `;

      if (!profile?.admin && profile?.compagnie_id) {
        // Compagnie: filter by their trajets
        const { data: trajets, error: trajetsError } = await supabase
          .from('trajets')
          .select('id')
          .eq('compagnie_id', profile.compagnie_id);

        if (trajetsError) throw trajetsError;

        const trajetIds = trajets.map(t => t.id);

        // Then, get reservations for those trajets
        query = supabase
          .from('reservations')
          .select(selectStatement)
          .in('trajet_id', trajetIds);
      } else {
        // Admin sees all
        query = supabase
          .from('reservations')
          .select(selectStatement);
      }

      const { data: reservationsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setReservations(reservationsData || []);

    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      Alert.alert('Erreur', 'Impossible de charger les réservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterReservations = () => {
    let filtered = [...reservations];

    // Filtrer par statut
    if (statusFilter !== 'all') {
      if (statusFilter === 'failed') {
        filtered = filtered.filter(r => ['failed', 'declined', 'canceled'].includes(r.statut_paiement));
      } else if (statusFilter === 'complete') {
        // Inclure à la fois 'complete' et 'approved' pour les paiements réussis
        filtered = filtered.filter(r => r.statut_paiement === 'complete' || r.statut_paiement === 'approved');
      } else {
        filtered = filtered.filter(r => r.statut_paiement === statusFilter);
      }
    }

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.nom_passager?.toLowerCase().includes(query) ||
        r.telephone_passager?.toLowerCase().includes(query) ||
        r.email_passager?.toLowerCase().includes(query) ||
        r.trajets?.depart?.toLowerCase().includes(query) ||
        r.trajets?.arrivee?.toLowerCase().includes(query) ||
        r.trajets?.compagnies?.nom?.toLowerCase().includes(query)
      );
    }

    console.log(`Filtrage: ${statusFilter} - Total: ${reservations.length}, Filtrées: ${filtered.length}`);
    setFilteredReservations(filtered);
  };

  const verifierPaiementReservation = async (reservation) => {
    if (!reservation.fedapay_transaction_id) {
      Alert.alert('Erreur', 'Aucune transaction FedaPay associée');
      return;
    }

    try {
      Alert.alert('Vérification...', 'Vérification du statut du paiement en cours...');
      
      const result = await checkTransactionStatus(reservation.fedapay_transaction_id);
      
      if (result.success) {
        const nouveauStatut = result.status === 'approved' ? 'complete' : result.status;
        
        // Mettre à jour dans Supabase
        const { error } = await supabase
          .from('reservations')
          .update({ statut_paiement: nouveauStatut })
          .eq('id', reservation.id);

        if (error) throw error;

        Alert.alert(
          'Statut mis à jour',
          `Statut du paiement : ${nouveauStatut === 'complete' ? 'Payé ✅' : nouveauStatut}`
        );
        
        loadReservations();
      } else {
        Alert.alert('Erreur', 'Impossible de vérifier le statut');
      }
    } catch (error) {
      console.error('Erreur vérification paiement:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la vérification');
    }
  };

  const annulerReservation = async (reservation) => {
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
              const { error } = await supabase
                .from('reservations')
                .update({ statut_paiement: 'canceled' })
                .eq('id', reservation.id);

              if (error) throw error;

              Alert.alert('Succès', 'Réservation annulée');
              loadReservations();
            } catch (error) {
              console.error('Erreur annulation:', error);
              Alert.alert('Erreur', "Impossible d'annuler la réservation");
            }
          },
        },
      ]
    );
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'complete':
      case 'approved':
        return { bg: '#ECFDF5', text: '#059669', icon: CheckCircle };
      case 'pending':
        return { bg: '#FEF3C7', text: '#D97706', icon: Clock };
      case 'failed':
      case 'declined':
      case 'canceled':
        return { bg: '#FEE2E2', text: '#DC2626', icon: XCircle };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', icon: Clock };
    }
  };

  const getStatutLabel = (statut) => {
    switch (statut) {
      case 'complete':
      case 'approved':
        return 'Payé';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échoué';
      case 'declined':
        return 'Refusé';
      case 'canceled':
        return 'Annulé';
      default:
        return statut;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusCounts = {
    pending: reservations.filter(r => r.statut_paiement === 'pending').length,
    complete: reservations.filter(r => r.statut_paiement === 'complete' || r.statut_paiement === 'approved').length,
    failed: reservations.filter(r => ['failed', 'declined', 'canceled'].includes(r.statut_paiement)).length,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Chargement des réservations...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <BackButton 
          title="Gestion des réservations"
          fallback="/(tabs)/admin/dashboard"
          style={{ paddingHorizontal: 0, paddingVertical: 0, marginBottom: 16 }}
        />

        {/* Recherche */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 }}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Rechercher (nom, téléphone, trajet...)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, padding: 12, fontSize: 14, color: '#1F2937' }}
          />
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => setStatusFilter('all')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: statusFilter === 'all' ? '#1E88E5' : '#F3F4F6',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: statusFilter === 'all' ? '#FFFFFF' : '#6B7280' }}>
              Toutes ({reservations.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatusFilter('pending')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: statusFilter === 'pending' ? '#D97706' : '#F3F4F6',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: statusFilter === 'pending' ? '#FFFFFF' : '#6B7280' }}>
              En attente ({statusCounts.pending})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatusFilter('complete')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: statusFilter === 'complete' ? '#059669' : '#F3F4F6',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: statusFilter === 'complete' ? '#FFFFFF' : '#6B7280' }}>
              Payées ({statusCounts.complete})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatusFilter('failed')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: statusFilter === 'failed' ? '#DC2626' : '#F3F4F6',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: statusFilter === 'failed' ? '#FFFFFF' : '#6B7280' }}>
              Échouées ({statusCounts.failed})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Liste des réservations */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReservations(); }} />
        }
      >
        {filteredReservations.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Calendar size={48} color="#9CA3AF" />
            <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 12 }}>
              {searchQuery || statusFilter !== 'all' ? 'Aucune réservation trouvée' : 'Aucune réservation'}
            </Text>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {filteredReservations.map((reservation) => {
              const statutStyle = getStatutColor(reservation.statut_paiement);
              const StatutIcon = statutStyle.icon;

              return (
                <View
                  key={reservation.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  {/* Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>
                        {reservation.trajets?.depart} → {reservation.trajets?.arrivee}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {formatDate(reservation.created_at)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: statutStyle.bg,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                      }}
                    >
                      <StatutIcon size={16} color={statutStyle.text} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: statutStyle.text, marginLeft: 4 }}>
                        {getStatutLabel(reservation.statut_paiement)}
                      </Text>
                    </View>
                  </View>

                  {/* Infos passager */}
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <User size={16} color="#6B7280" />
                      <Text style={{ fontSize: 14, color: '#4B5563', marginLeft: 8 }}>
                        {reservation.nom_passager}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Phone size={16} color="#6B7280" />
                      <Text style={{ fontSize: 14, color: '#4B5563', marginLeft: 8 }}>
                        {reservation.telephone_passager}
                      </Text>
                    </View>
                    {isAdmin && reservation.trajets?.compagnies?.nom && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MapPin size={16} color="#6B7280" />
                        <Text style={{ fontSize: 14, color: '#4B5563', marginLeft: 8 }}>
                          {reservation.trajets.compagnies.nom}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Détails */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    <View>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Places</Text>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                        {reservation.nb_places}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Montant</Text>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E88E5' }}>
                        {reservation.montant_total?.toLocaleString()} FCFA
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Horaire</Text>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                        {reservation.horaire}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                    {reservation.statut_paiement === 'pending' && (
                      <>
                        <TouchableOpacity
                          onPress={() => verifierPaiementReservation(reservation)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#1E88E5',
                            padding: 10,
                            borderRadius: 8,
                          }}
                        >
                          <CheckCircle size={16} color="#FFFFFF" />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginLeft: 6 }}>
                            Vérifier
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => annulerReservation(reservation)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FEE2E2',
                            padding: 10,
                            borderRadius: 8,
                          }}
                        >
                          <XCircle size={16} color="#DC2626" />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#DC2626', marginLeft: 6 }}>
                            Annuler
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {reservation.statut_paiement === 'complete' && (
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                        <CheckCircle size={16} color="#059669" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669', marginLeft: 6 }}>
                          Paiement confirmé
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
