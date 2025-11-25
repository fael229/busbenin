import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../../utils/supabase';
import { useSession } from '../../../../contexts/SessionProvider';
import { useTheme } from '../../../../contexts/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditCard, Smartphone, CheckCircle, XCircle, Shield } from 'lucide-react-native';
import BackButton from '../../../../components/BackButton';
import { createTransaction, checkTransactionStatus } from '../../../../utils/fedapay';

export default function LocationPaymentScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useSession();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');

  useEffect(() => {
    loadReservation();
  }, [id]);

  const loadReservation = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations_location')
        .select('*, vehicules_location(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data.statut === 'confirmee') {
        setPaymentStatus('success');
      }

      setReservation(data);
    } catch (error) {
      console.error('Error loading reservation:', error);
      Alert.alert('Erreur', 'Impossible de charger la réservation');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    setPaymentStatus(null);

    try {
      // Créer la transaction FedaPay
      const result = await createTransaction({
        amount: reservation.montant_total,
        description: `Location ${reservation.vehicules_location.marque} ${reservation.vehicules_location.modele}`,
        customerId: session.user.id,
        customerEmail: session.user.email,
        customerName: session.user.user_metadata?.full_name || 'Client',
        mobileMoneyOperator: paymentMethod === 'mobile_money' ? 'mtn' : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création de la transaction');
      }

      // Sauvegarder l'ID de transaction
      await supabase
        .from('reservations_location')
        .update({
          transaction_id: result.transactionId,
        })
        .eq('id', id);

      // Ouvrir le lien de paiement
      if (result.paymentUrl) {
        await Linking.openURL(result.paymentUrl);
      }

      Alert.alert(
        'Paiement en cours',
        'Une fenêtre de paiement s\'est ouverte. Après avoir payé, revenez ici.',
        [{ text: 'OK' }]
      );

      // Vérifier le statut
      checkStatusLoop(result.transactionId);

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      Alert.alert('Erreur', error.message);
      setProcessing(false);
    }
  };

  const checkStatusLoop = async (transactionId) => {
    let attempts = 0;
    const maxAttempts = 60; // 1 minute (assuming 1s interval) - maybe increase
    
    const interval = setInterval(async () => {
        attempts++;
        const statusCheck = await checkTransactionStatus(transactionId);
        
        if (statusCheck.success && statusCheck.status === 'approved') {
            clearInterval(interval);
            await updateReservationStatus('confirmee', transactionId);
            setPaymentStatus('success');
            setProcessing(false);
            Alert.alert('Succès', 'Paiement réussi ! Votre location est confirmée.', [
                { text: 'OK', onPress: () => router.replace('/location') }
            ]);
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setProcessing(false);
            setPaymentStatus('error');
            Alert.alert('Délai dépassé', 'Le paiement n\'a pas été confirmé à temps. Veuillez vérifier votre transaction.');
        }
    }, 2000);
  };

  const updateReservationStatus = async (status, transactionId) => {
    try {
      await supabase
        .from('reservations_location')
        .update({
          statut: status,
          transaction_id: transactionId,
        })
        .eq('id', id);
    } catch (error) {
      console.error('Error updating reservation:', error);
    }
  };

  if (loading || !reservation) {
      return (
          <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
              <ActivityIndicator size="large" color={theme.primary} />
          </View>
      );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.summaryCard}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>Récapitulatif</Text>
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Véhicule</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{reservation.vehicules_location.marque} {reservation.vehicules_location.modele}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Période</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                    {new Date(reservation.date_debut).toLocaleDateString()} - {new Date(reservation.date_fin).toLocaleDateString()}
                </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total à payer</Text>
                <Text style={[styles.totalValue, { color: theme.primary }]}>{reservation.montant_total.toLocaleString()} FCFA</Text>
            </View>
        </View>

        {paymentStatus === 'success' ? (
            <View style={[styles.statusCard, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}>
                <CheckCircle size={32} color="#4CAF50" />
                <Text style={[styles.statusTitle, { color: '#2E7D32' }]}>Paiement réussi</Text>
                <Text style={[styles.statusText, { color: '#1B5E20' }]}>Votre location est confirmée.</Text>
            </View>
        ) : (
            <View style={styles.paymentMethods}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Moyen de paiement</Text>
                
                <TouchableOpacity
                    style={[
                        styles.methodCard, 
                        { backgroundColor: theme.surface, borderColor: paymentMethod === 'mobile_money' ? theme.primary : theme.border },
                        paymentMethod === 'mobile_money' && { backgroundColor: theme.primary + '10' }
                    ]}
                    onPress={() => setPaymentMethod('mobile_money')}
                >
                    <View style={styles.methodIcon}>
                        <Smartphone size={24} color={theme.primary} />
                    </View>
                    <View style={styles.methodInfo}>
                        <Text style={[styles.methodTitle, { color: theme.text }]}>Mobile Money</Text>
                        <Text style={[styles.methodSubtitle, { color: theme.textSecondary }]}>MTN, Moov</Text>
                    </View>
                    {paymentMethod === 'mobile_money' && <CheckCircle size={20} color={theme.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.methodCard, 
                        { backgroundColor: theme.surface, borderColor: paymentMethod === 'card' ? theme.primary : theme.border },
                        paymentMethod === 'card' && { backgroundColor: theme.primary + '10' }
                    ]}
                    onPress={() => setPaymentMethod('card')}
                >
                    <View style={styles.methodIcon}>
                        <CreditCard size={24} color={theme.primary} />
                    </View>
                    <View style={styles.methodInfo}>
                        <Text style={[styles.methodTitle, { color: theme.text }]}>Carte Bancaire</Text>
                        <Text style={[styles.methodSubtitle, { color: theme.textSecondary }]}>Visa, Mastercard</Text>
                    </View>
                    {paymentMethod === 'card' && <CheckCircle size={20} color={theme.primary} />}
                </TouchableOpacity>
            </View>
        )}

        <View style={[styles.securityNote, { backgroundColor: theme.surface }]}>
            <Shield size={16} color={theme.textSecondary} />
            <Text style={[styles.securityText, { color: theme.textSecondary }]}>Paiement sécurisé par FedaPay</Text>
        </View>
      </View>

      {paymentStatus !== 'success' && (
        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
                style={[styles.payButton, { backgroundColor: theme.primary, opacity: processing ? 0.7 : 1 }]}
                onPress={handlePayment}
                disabled={processing}
            >
                {processing ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.payButtonText}>Payer {reservation.montant_total.toLocaleString()} FCFA</Text>
                )}
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
      justifyContent: 'center',
      alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFF', // Force white for card look or use theme.surface
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paymentMethods: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  methodIcon: {
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  methodSubtitle: {
    fontSize: 12,
  },
  statusCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  securityText: {
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  payButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
