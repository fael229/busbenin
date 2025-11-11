import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react-native';
import { supabase } from '../../../utils/supabase';
import { checkTransactionStatus } from '../../../utils/fedapay';

export default function PaiementScreen() {
  const { transactionId, reservationId, paymentUrl } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', 'pending'
  const [checking, setChecking] = useState(false);

  // Vérifier le statut de la transaction
  const verifierPaiement = async () => {
    setChecking(true);
    try {
      const result = await checkTransactionStatus(transactionId);
      
      if (result.success) {
        const status = result.status;
        
        // Mettre à jour le statut dans Supabase
        const { error } = await supabase
          .from('reservations')
          .update({ 
            statut_paiement: status === 'approved' ? 'complete' : status 
          })
          .eq('id', reservationId);

        if (error) {
          console.error('Erreur mise à jour réservation:', error);
        }

        // Mettre à jour l'état local
        if (status === 'approved') {
          setPaymentStatus('success');
        } else if (status === 'declined' || status === 'canceled') {
          setPaymentStatus('failed');
        } else {
          setPaymentStatus('pending');
        }
      }
    } catch (error) {
      console.error('Erreur vérification paiement:', error);
      Alert.alert('Erreur', 'Impossible de vérifier le statut du paiement');
    } finally {
      setChecking(false);
    }
  };

  // Gérer la navigation dans la WebView
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    console.log('WebView URL:', url);

    // Détecter si le paiement est terminé (page de succès ou échec)
    if (url.includes('/success') || url.includes('/approved')) {
      setPaymentStatus('success');
      verifierPaiement();
    } else if (url.includes('/failed') || url.includes('/declined') || url.includes('/canceled')) {
      setPaymentStatus('failed');
      verifierPaiement();
    }
  };

  // Retour à la page des réservations
  const retourReservations = () => {
    router.replace('/(tabs)/mes-reservations');
  };

  // Affichage du résultat du paiement
  if (paymentStatus === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <CheckCircle size={80} color="#10B981" />
          <Text style={styles.resultTitle}>Paiement réussi !</Text>
          <Text style={styles.resultMessage}>
            Votre réservation a été confirmée. Vous recevrez un SMS de confirmation.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={retourReservations}
          >
            <Text style={styles.buttonText}>Voir mes réservations</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <XCircle size={80} color="#EF4444" />
          <Text style={styles.resultTitle}>Paiement échoué</Text>
          <Text style={styles.resultMessage}>
            Le paiement n'a pas pu être effectué. Veuillez réessayer ou contacter le support.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.errorButton]}
            onPress={retourReservations}
          >
            <Text style={styles.buttonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Annuler le paiement ?',
              'Êtes-vous sûr de vouloir annuler le paiement ?',
              [
                { text: 'Non', style: 'cancel' },
                { 
                  text: 'Oui', 
                  onPress: retourReservations,
                  style: 'destructive'
                }
              ]
            );
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement Mobile Money</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* WebView */}
      {paymentUrl ? (
        <WebView
          source={{ uri: paymentUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1E88E5" />
              <Text style={styles.loadingText}>Chargement du paiement...</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.errorContainer}>
          <XCircle size={60} color="#EF4444" />
          <Text style={styles.errorText}>URL de paiement invalide</Text>
          <TouchableOpacity
            style={[styles.button, styles.errorButton]}
            onPress={retourReservations}
          >
            <Text style={styles.buttonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bouton de vérification */}
      {!paymentStatus && !loading && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Paiement en cours ? Vérifiez le statut
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.checkButton]}
            onPress={verifierPaiement}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Vérifier le paiement</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Overlay de chargement */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  resultMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  errorButton: {
    backgroundColor: '#EF4444',
  },
  checkButton: {
    backgroundColor: '#1E88E5',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
