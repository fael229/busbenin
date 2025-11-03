import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Clock, 
  Star, 
  Heart, 
  Send,
  User 
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { useSession } from '../../contexts/SessionProvider';

export default function TrajetDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { session } = useSession();
  const [trajet, setTrajet] = useState(null);
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    utilisateur: '',
    commentaire: '',
    note: 5,
  });
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadTrajetDetails();
  }, [id]);

  const loadTrajetDetails = async () => {
    try {
      setLoading(true);
      
      // Trajet + compagnie name if available
      const { data: trajetRow, error: trajetError } = await supabase
        .from('trajets')
        .select('id, depart, arrivee, prix, horaires, gare, note, nb_avis, compagnies:compagnie_id(nom)')
        .eq('id', id)
        .single();
      if (trajetError) throw trajetError;
      const mappedTrajet = {
        ...trajetRow,
        compagnie: trajetRow?.compagnies?.nom ?? undefined,
        contact: undefined,
      };
      setTrajet(mappedTrajet);

      // Reviews for this trajet
      const { data: avisRows, error: avisError } = await supabase
        .from('avis')
        .select('id, note, commentaire, created_at')
        .eq('trajet_id', id)
        .order('created_at', { ascending: false });
      if (avisError) throw avisError;
      const mappedAvis = (avisRows ?? []).map((a) => ({
        id: a.id,
        note: a.note,
        commentaire: a.commentaire,
        utilisateur: 'Utilisateur',
        date: a.created_at,
      }));
      setAvis(mappedAvis);
    } catch (error) {
      console.error('Error loading trajet details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du trajet');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (telephone) => {
    Linking.openURL(`tel:${telephone}`);
  };

  const handleWhatsApp = (telephone) => {
    const cleanPhone = telephone.replace(/[^0-9]/g, '');
    const message = `Bonjour, je souhaite réserver une place pour le trajet ${trajet?.depart} → ${trajet?.arrivee}.`;
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`);
  };

  const submitReview = async () => {
    if (!newReview.utilisateur.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return;
    }
    try {
      if (!session?.user?.id) {
        Alert.alert('Connexion requise', 'Veuillez vous connecter pour laisser un avis.');
        return;
      }
      const { error } = await supabase.from('avis').insert({
        user_id: session.user.id,
        trajet_id: id,
        note: newReview.note,
        commentaire: newReview.commentaire || null,
      });
      if (error) throw error;
      await loadTrajetDetails();
      setNewReview({ utilisateur: '', commentaire: '', note: 5 });
      setShowReviewForm(false);
      Alert.alert('Succès', 'Votre avis a été ajouté avec succès');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer votre avis');
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorites storage (localStorage or backend)
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>Chargement...</Text>
      </View>
    );
  }

  if (!trajet) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <Text style={{ fontSize: 18, color: '#1F2937', marginBottom: 8 }}>Trajet introuvable</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: '#1E88E5',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#1F2937',
          }}
        >
          Détails du trajet
        </Text>
        
        <TouchableOpacity
          onPress={toggleFavorite}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heart 
            size={20} 
            color={isFavorite ? '#EF4444' : '#6B7280'}
            fill={isFavorite ? '#EF4444' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Route Info */}
        <View style={{ padding: 20 }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#1F2937',
                    marginBottom: 8,
                  }}
                >
                  {trajet.depart} → {trajet.arrivee}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: '#1E88E5',
                    fontWeight: '500',
                    marginBottom: 8,
                  }}
                >
                  {trajet.compagnie}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#6B7280',
                      marginLeft: 4,
                    }}
                  >
                    {trajet.note} ({trajet.nb_avis} avis)
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '600',
                  color: '#1E88E5',
                }}
              >
                {trajet.prix} FCFA
              </Text>
            </View>

            {/* Schedule */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Clock size={16} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                  Horaires de départ
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {trajet.horaires?.map((horaire, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: '#EBF8FF',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: '#1E88E5',
                        fontWeight: '500',
                      }}
                    >
                      {horaire}
                    </Text>
                  </View>
                )) || []}
              </View>
            </View>

            {/* Station */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MapPin size={16} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, color: '#6B7280', flex: 1 }}>
                {trajet.gare}
              </Text>
            </View>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#1F2937',
                }}
              >
                Avis des voyageurs
              </Text>
              <TouchableOpacity
                onPress={() => setShowReviewForm(!showReviewForm)}
                style={{
                  backgroundColor: '#1E88E5',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: '#FFFFFF',
                    fontWeight: '500',
                  }}
                >
                  Donner un avis
                </Text>
              </TouchableOpacity>
            </View>

            {/* Review Form */}
            {showReviewForm && (
              <View
                style={{
                  backgroundColor: '#F9FAFB',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <TextInput
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                  }}
                  placeholder="Votre nom"
                  value={newReview.utilisateur}
                  onChangeText={(text) => setNewReview({ ...newReview, utilisateur: text })}
                />
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#374151', marginRight: 12 }}>Note:</Text>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setNewReview({ ...newReview, note: star })}
                      style={{ marginRight: 4 }}
                    >
                      <Star
                        size={20}
                        color="#F59E0B"
                        fill={star <= newReview.note ? '#F59E0B' : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TextInput
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    height: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Votre commentaire (optionnel)"
                  multiline
                  value={newReview.commentaire}
                  onChangeText={(text) => setNewReview({ ...newReview, commentaire: text })}
                />
                
                <TouchableOpacity
                  onPress={submitReview}
                  style={{
                    backgroundColor: '#1E88E5',
                    borderRadius: 8,
                    paddingVertical: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                >
                  <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#FFFFFF',
                    }}
                  >
                    Envoyer l'avis
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Reviews List */}
            {avis.length === 0 ? (
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', paddingVertical: 20 }}>
                Aucun avis pour le moment
              </Text>
            ) : (
              avis.map((review) => (
                <View
                  key={review.id}
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                    paddingVertical: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#1E88E5',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 8,
                        }}
                      >
                        <User size={16} color="#FFFFFF" />
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#1F2937',
                        }}
                      >
                        {review.utilisateur}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#6B7280',
                          marginLeft: 2,
                        }}
                      >
                        {review.note}
                      </Text>
                    </View>
                  </View>
                  {review.commentaire && (
                    <Text
                      style={{
                        fontSize: 14,
                        color: '#374151',
                        lineHeight: 20,
                        marginBottom: 4,
                      }}
                    >
                      {review.commentaire}
                    </Text>
                  )}
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#9CA3AF',
                    }}
                  >
                    {new Date(review.date).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom,
          paddingTop: 16,
          paddingHorizontal: 20,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#1E88E5',
              borderRadius: 8,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              marginRight: 8,
            }}
            onPress={() => handleCall(trajet.contact)}
            activeOpacity={0.8}
          >
            <Phone size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#FFFFFF',
              }}
            >
              Appeler
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#10B981',
              borderRadius: 8,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              marginLeft: 8,
            }}
            onPress={() => handleWhatsApp(trajet.contact)}
            activeOpacity={0.8}
          >
            <MessageCircle size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#FFFFFF',
              }}
            >
              WhatsApp
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}