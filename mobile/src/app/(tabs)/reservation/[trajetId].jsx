import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import {
  MapPin,
  Users,
  Clock,
  DollarSign,
  CreditCard,
  Phone,
  Mail,
  User,
  Calendar,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../../contexts/SessionProvider';
import { useTheme } from '../../../contexts/ThemeProvider';
import { createTransaction, getPaymentUrl } from '../../../utils/fedapay';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import BackButton from '../../../components/BackButton';

export default function ReservationScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { session } = useSession();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();

  const trajetId = params.trajetId;

  const [trajet, setTrajet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Formulaire
  const [nbPlaces, setNbPlaces] = useState('1');
  const [horaireSelectionne, setHoraireSelectionne] = useState('');
  const [dateVoyage, setDateVoyage] = useState('');
  const [nomPassager, setNomPassager] = useState('');
  const [telephonePassager, setTelephonePassager] = useState('');
  const [emailPassager, setEmailPassager] = useState('');
  const [operateurMobile, setOperateurMobile] = useState('');
  const [showIOSDatePicker, setShowIOSDatePicker] = useState(false);

  const formatISODate = (date) => {
    if (!date) return '';
    const local = new Date(date.getTime());
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    return local.toISOString().split('T')[0];
  };

  const formatDisplayDate = (isoString) => {
    if (!isoString) return 'Sélectionnez une date';
    try {
      return format(new Date(isoString), 'dd/MM/yyyy');
    } catch (error) {
      return isoString;
    }
  };

  const openDatePicker = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = dateVoyage ? new Date(dateVoyage) : today;

    const onChange = (_event, selectedDate) => {
      if (!selectedDate) {
        if (Platform.OS === 'ios') setShowIOSDatePicker(false);
        return;
      }

      const iso = formatISODate(selectedDate);
      setDateVoyage(iso);
      if (Platform.OS === 'ios') setShowIOSDatePicker(false);
    };

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentDate,
        mode: 'date',
        minimumDate: today,
        onChange,
      });
    } else {
      setShowIOSDatePicker(true);
    }
  };

  useEffect(() => {
    if (isFocused && trajetId) {
      loadTrajet();
    }
  }, [isFocused, trajetId]);

  const loadTrajet = async () => {
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
          compagnies:compagnie_id (nom)
        `)
        .eq('id', trajetId)
        .single();

      if (error) throw error;
      setTrajet(data);

      // Pré-remplir avec les infos du profil si disponibles
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nom, telephone, email')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          if (profile.nom) setNomPassager(profile.nom);
          if (profile.telephone) setTelephonePassager(profile.telephone);
          if (profile.email) setEmailPassager(profile.email);
        } else if (session.user.email) {
          setEmailPassager(session.user.email);
        }
      }
    } catch (error) {
      console.error('Erreur chargement trajet:', error);
      Alert.alert('Erreur', 'Impossible de charger le trajet');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const calculerMontantTotal = () => {
    if (!trajet || !nbPlaces) return 0;
    const places = parseInt(nbPlaces) || 0;
    return trajet.prix * places;
  };

  const validerFormulaire = () => {
    if (!horaireSelectionne) {
      Alert.alert('Erreur', 'Veuillez sélectionner un horaire');
      return false;
    }

    if (!dateVoyage) {
      Alert.alert('Erreur', 'Veuillez sélectionner une date de voyage');
      return false;
    }

    // Vérifier que la date n'est pas dans le passé
    const selectedDate = new Date(dateVoyage);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      Alert.alert('Erreur', 'La date de voyage ne peut pas être dans le passé');
      return false;
    }

    const places = parseInt(nbPlaces);
    if (!places || places < 1 || places > 10) {
      Alert.alert('Erreur', 'Le nombre de places doit être entre 1 et 10');
      return false;
    }

    if (!nomPassager.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return false;
    }

    if (!telephonePassager.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone');
      return false;
    }

    // Valider le format du téléphone (+22901XXXXXXXX)
    const phoneRegex = /^\+229\d{10}$/;
    if (!phoneRegex.test(telephonePassager)) {
      Alert.alert(
        'Erreur',
        'Le numéro doit être au format +22901XXXXXXXX (exemple: +22997123456)'
      );
      return false;
    }

    if (!operateurMobile) {
      Alert.alert('Erreur', 'Veuillez sélectionner votre opérateur Mobile Money');
      return false;
    }

    return true;
  };

  const procederAuPaiement = async () => {
    if (!session?.user?.id) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour réserver');
      return;
    }

    if (!validerFormulaire()) return;

    try {
      setProcessing(true);

      const montantTotal = calculerMontantTotal();

      // 1. Créer la réservation dans Supabase
      const { data: reservationId, error: reservationError } = await supabase.rpc(
        'create_reservation',
        {
          p_trajet_id: trajetId,
          p_nb_places: parseInt(nbPlaces),
          p_horaire: horaireSelectionne,
          p_date_voyage: dateVoyage,
          p_nom_passager: nomPassager.trim(),
          p_telephone_passager: telephonePassager.trim(),
          p_email_passager: emailPassager.trim() || null,
        }
      );

      if (reservationError) throw reservationError;

      // 2. Créer la transaction FedaPay
      const transactionResult = await createTransaction({
        amount: montantTotal,
        description: `Réservation ${trajet.depart} → ${trajet.arrivee} - ${nbPlaces} place(s)`,
        customerEmail: emailPassager || session.user.email,
        customerName: nomPassager,
        customerPhone: telephonePassager,
        // callback_url est optionnel - on vérifiera le statut manuellement
        mobileMoneyOperator: operateurMobile,
        reservationId: reservationId, // Pour référence interne
      });

      if (!transactionResult.success) {
        throw new Error(transactionResult.error);
      }

      // 3. Mettre à jour la réservation avec les infos FedaPay
      // IMPORTANT: L'ordre des paramètres doit correspondre à la définition de la fonction SQL
      const { error: updateError } = await supabase.rpc('update_reservation_payment', {
        p_fedapay_token: transactionResult.token,
        p_fedapay_transaction_id: transactionResult.transactionId,
        p_reservation_id: reservationId,
        p_statut_paiement: 'pending',
      });

      if (updateError) throw updateError;

      // 4. Construire l'URL de paiement FedaPay (avec fallback si /menu)
      let paymentUrl = transactionResult.paymentUrl;
      if (!paymentUrl || paymentUrl.includes('/menu')) {
        paymentUrl = getPaymentUrl(transactionResult.token);
      }

      setProcessing(false);

      // Rediriger vers la page de paiement dans l'app
      // Le groupe (tabs) ne fait pas partie de l'URL publique, on utilise donc simplement /paiement/[transactionId]
      router.push({
        pathname: '/paiement/[transactionId]',
        params: {
          transactionId: transactionResult.transactionId,
          reservationId: reservationId,
          paymentUrl: paymentUrl,
        },
      });
    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la réservation');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Chargement...</Text>
      </View>
    );
  }

  if (!trajet) {
    return null;
  }

  const montantTotal = calculerMontantTotal();

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 20,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}
      >
        <BackButton 
          title="Réservation" 
          fallback={`/trajet/${trajetId}`}
          style={{ paddingHorizontal: 0, paddingVertical: 0 }}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Informations du trajet */}
        <View style={{ backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
            Trajet sélectionné
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MapPin size={18} color="#1E88E5" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
              {trajet.depart} → {trajet.arrivee}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            {trajet.compagnies?.nom}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <DollarSign size={18} color="#10B981" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#10B981', marginLeft: 4 }}>
              {trajet.prix} FCFA / place
            </Text>
          </View>
        </View>

        {/* Nombre de places */}
        <View style={{ backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Users size={20} color="#1E88E5" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
              Nombre de places
            </Text>
          </View>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              color: '#1F2937',
            }}
            placeholder="1"
            keyboardType="number-pad"
            value={nbPlaces}
            onChangeText={setNbPlaces}
            maxLength={2}
          />
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Maximum 10 places par réservation
          </Text>
        </View>

        {/* Sélection de l'horaire */}
        {trajet.horaires && trajet.horaires.length > 0 && (
          <View style={{ backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Clock size={20} color="#1E88E5" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
                Horaire de départ
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {trajet.horaires.map((horaire, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setHoraireSelectionne(horaire)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: horaireSelectionne === horaire ? '#1E88E5' : '#D1D5DB',
                    backgroundColor: horaireSelectionne === horaire ? '#EFF6FF' : '#FFFFFF',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: horaireSelectionne === horaire ? '#1E40AF' : '#6B7280',
                    }}
                  >
                    {horaire}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sélection de la date de voyage */}
        <View style={{ backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Calendar size={20} color="#1E88E5" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
              Date de voyage *
            </Text>
          </View>
          <TouchableOpacity
            onPress={openDatePicker}
            activeOpacity={0.7}
            style={{
              borderWidth: 1,
              borderColor: dateVoyage ? '#1E88E5' : '#D1D5DB',
              borderRadius: 8,
              padding: 12,
              backgroundColor: '#FFFFFF',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: dateVoyage ? '#1F2937' : '#9CA3AF',
              }}
            >
              {formatDisplayDate(dateVoyage)}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            La date ne peut pas être dans le passé. Appuyez pour sélectionner.
          </Text>
          {Platform.OS === 'ios' && showIOSDatePicker && (
            <View style={{ marginTop: 12 }}>
              <DateTimePicker
                value={dateVoyage ? new Date(dateVoyage) : new Date()}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  if (!selectedDate) {
                    setShowIOSDatePicker(false);
                    return;
                  }
                  const iso = formatISODate(selectedDate);
                  setDateVoyage(iso);
                }}
                style={{ backgroundColor: '#FFFFFF' }}
              />
              <TouchableOpacity
                onPress={() => setShowIOSDatePicker(false)}
                style={{
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: '#1E88E5',
                }}
              >
                <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sélection de l'opérateur Mobile Money */}
        <View style={{ backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <CreditCard size={20} color="#1E88E5" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
              Opérateur Mobile Money *
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {/* MTN Mobile Money */}
            <TouchableOpacity
              onPress={() => setOperateurMobile('mtn')}
              style={{
                flex: 1,
                minWidth: '45%',
                padding: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: operateurMobile === 'mtn' ? '#FFCC00' : '#D1D5DB',
                backgroundColor: operateurMobile === 'mtn' ? '#FFF9E6' : '#FFFFFF',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#FFCC00',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#000' }}>MTN</Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: operateurMobile === 'mtn' ? '#1F2937' : '#6B7280',
                  textAlign: 'center',
                }}
              >
                MTN Mobile Money
              </Text>
            </TouchableOpacity>

            {/* Moov Money */}
            <TouchableOpacity
              onPress={() => setOperateurMobile('moov')}
              style={{
                flex: 1,
                minWidth: '45%',
                padding: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: operateurMobile === 'moov' ? '#009CDE' : '#D1D5DB',
                backgroundColor: operateurMobile === 'moov' ? '#E6F7FF' : '#FFFFFF',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#009CDE',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF' }}>moov</Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: operateurMobile === 'moov' ? '#1F2937' : '#6B7280',
                  textAlign: 'center',
                }}
              >
                Moov Money
              </Text>
            </TouchableOpacity>

            {/* Celtiis Cash */}
            <TouchableOpacity
              onPress={() => setOperateurMobile('celtiis')}
              style={{
                flex: 1,
                minWidth: '45%',
                padding: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: operateurMobile === 'celtiis' ? '#FF6B00' : '#D1D5DB',
                backgroundColor: operateurMobile === 'celtiis' ? '#FFF3E6' : '#FFFFFF',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#FF6B00',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>Celtiis</Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: operateurMobile === 'celtiis' ? '#1F2937' : '#6B7280',
                  textAlign: 'center',
                }}
              >
                Celtiis Cash
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 12 }}>
            Le numéro de téléphone doit correspondre à votre compte Mobile Money
          </Text>
        </View>

        {/* Informations du passager */}
        <View style={{ backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16 }}>
            Informations du passager
          </Text>

          {/* Nom */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <User size={16} color="#6B7280" />
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginLeft: 6 }}>
                Nom complet *
              </Text>
            </View>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: '#1F2937',
              }}
              placeholder="Votre nom complet"
              value={nomPassager}
              onChangeText={setNomPassager}
            />
          </View>

          {/* Téléphone */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Phone size={16} color="#6B7280" />
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginLeft: 6 }}>
                Téléphone (Mobile Money) *
              </Text>
            </View>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: '#1F2937',
              }}
              placeholder="+22901xxxxxxxx"
              placeholderTextColor="#808080"

              keyboardType="phone-pad"
              value={telephonePassager}
              onChangeText={setTelephonePassager}
            />
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              Format: +22901XXXXXXXX (ce numéro sera utilisé pour le paiement Mobile Money)
            </Text>
          </View>

          {/* Email */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Mail size={16} color="#6B7280" />
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginLeft: 6 }}>
                Email (optionnel)
              </Text>
            </View>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: '#1F2937',
              }}
              placeholder="votre@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailPassager}
              onChangeText={setEmailPassager}
            />
          </View>
        </View>

        {/* Récapitulatif */}
        <View style={{ backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
            Récapitulatif
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>Prix par place</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
              {trajet.prix} FCFA
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>Nombre de places</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
              {nbPlaces || 0}
            </Text>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              paddingTop: 12,
              marginTop: 4,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
              Montant total
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#10B981' }}>
              {montantTotal} FCFA
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bouton de paiement fixe en bas */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          padding: 20,
          paddingBottom: insets.bottom + 20,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        }}
      >
        <TouchableOpacity
          onPress={procederAuPaiement}
          disabled={processing}
          style={{
            backgroundColor: processing ? '#9CA3AF' : '#1E88E5',
            padding: 16,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <CreditCard size={20} color="#FFFFFF" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginLeft: 8 }}>
                Payer {montantTotal} FCFA
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8 }}>
          Paiement sécurisé par FedaPay (Mobile Money)
        </Text>
      </View>
    </View>
  );
}
