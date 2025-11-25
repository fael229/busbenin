import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Heart, Clock, Star, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { useSession } from '../../contexts/SessionProvider';
import { useTheme } from '../../contexts/ThemeProvider';

export default function FavorisScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();

  const [favoris, setFavoris] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavoris = async () => {
    if (!session?.user?.id) {
      setFavoris([]);
      return;
    }
    const { data, error } = await supabase
      .from('favoris')
      .select(`
        trajet_id,
        created_at,
        trajets:trajet_id (
          id, depart, arrivee, prix, horaires, gare, note, nb_avis,
          compagnies:compagnie_id ( nom )
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) {
      setFavoris([]);
      return;
    }
    const mapped = (data ?? []).map((row) => ({
      id: row.trajets?.id,
      depart: row.trajets?.depart,
      arrivee: row.trajets?.arrivee,
      prix: row.trajets?.prix,
      horaires: row.trajets?.horaires,
      gare: row.trajets?.gare,
      note: row.trajets?.note,
      nb_avis: row.trajets?.nb_avis,
      compagnie: row.trajets?.compagnies?.nom,
    })).filter((t) => t.id);
    setFavoris(mapped);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavoris();
    setRefreshing(false);
  };

  // Recharge les favoris quand l'onglet reçoit le focus
  React.useEffect(() => {
    if (isFocused) {
      loadFavoris();
    }
  }, [isFocused, session?.user?.id]);

  // Realtime: refresh when user favorites or trajets change
  React.useEffect(() => {
    const userId = session?.user?.id;
    const channels = [];
    if (userId) {
      const favCh = supabase
        .channel('realtime-favoris-list')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'favoris', filter: `user_id=eq.${userId}` },
          () => {
            // reload list
            (async () => {
              const { data, error } = await supabase
                .from('favoris')
                .select(`
                  trajet_id, created_at,
                  trajets:trajet_id (
                    id, depart, arrivee, prix, horaires, gare, note, nb_avis,
                    compagnies:compagnie_id ( nom )
                  )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
              if (!error) {
                const mapped = (data ?? []).map((row) => ({
                  id: row.trajets?.id,
                  depart: row.trajets?.depart,
                  arrivee: row.trajets?.arrivee,
                  prix: row.trajets?.prix,
                  compagnie: row.trajets?.compagnies?.nom,
                  note: row.trajets?.note,
                  nb_avis: row.trajets?.nb_avis,
                  horaires: row.trajets?.horaires ?? [],
                  gare: row.trajets?.gare,
                  dateAjout: row.created_at,
                })).filter((t) => t.id);
                setFavoris(mapped);
              }
            })();
          }
        )
        .subscribe();
      channels.push(favCh);
    }
    const trajetsCh = supabase
      .channel('realtime-trajets-favoris')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trajets' },
        () => {
          // refresh for any change in trajets affecting details
          if (userId) {
            (async () => {
              const { data, error } = await supabase
                .from('favoris')
                .select(`
                  trajet_id, created_at,
                  trajets:trajet_id (
                    id, depart, arrivee, prix, horaires, gare, note, nb_avis,
                    compagnies:compagnie_id ( nom )
                  )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
              if (!error) {
                const mapped = (data ?? []).map((row) => ({
                  id: row.trajets?.id,
                  depart: row.trajets?.depart,
                  arrivee: row.trajets?.arrivee,
                  prix: row.trajets?.prix,
                  compagnie: row.trajets?.compagnies?.nom,
                  note: row.trajets?.note,
                  nb_avis: row.trajets?.nb_avis,
                  horaires: row.trajets?.horaires ?? [],
                  gare: row.trajets?.gare,
                  dateAjout: row.created_at,
                })).filter((t) => t.id);
                setFavoris(mapped);
              }
            })();
          }
        }
      )
      .subscribe();
    channels.push(trajetsCh);

    return () => {
      channels.forEach((ch) => {
        try { supabase.removeChannel(ch); } catch {}
      });
    };
  }, [session?.user?.id]);

  const removeFavori = async (trajetId) => {
    if (!session?.user?.id) return;
    const prev = favoris;
    setFavoris(favoris.filter((fav) => fav.id !== trajetId));
    const { error } = await supabase
      .from('favoris')
      .delete()
      .eq('user_id', session.user.id)
      .eq('trajet_id', trajetId);
    if (error) {
      setFavoris(prev); // rollback on error
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '600',
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Mes favoris
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textSecondary,
            }}
          >
            {favoris.length} trajet{favoris.length > 1 ? 's' : ''} sauvegardé{favoris.length > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Favorites List */}
        <View style={{ paddingHorizontal: 20 }}>
          {favoris.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: theme.errorLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <Heart size={32} color={theme.error} strokeWidth={1.5} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: 12,
                  textAlign: 'center',
                }}
              >
                Aucun favori
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: theme.textSecondary,
                  lineHeight: 24,
                  textAlign: 'center',
                  marginBottom: 32,
                  paddingHorizontal: 20,
                }}
              >
                Ajoutez vos trajets préférés pour les retrouver facilement ici
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  paddingHorizontal: 32,
                  paddingVertical: 16,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                onPress={() => router.push('/(tabs)/trajets')}
                activeOpacity={0.9}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}
                >
                  Rechercher des trajets
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            favoris.map((trajet) => (
              <View
                key={trajet.id}
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: theme.shadow,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: theme.shadowOpacity,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <TouchableOpacity
                  onPress={() => router.push(`/trajet/${trajet.id}?fromFavoris=true`)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: theme.text,
                          marginBottom: 4,
                        }}
                      >
                        {trajet.depart} → {trajet.arrivee}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: theme.primary,
                          fontWeight: '500',
                          marginBottom: 4,
                        }}
                      >
                        {trajet.compagnie}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Star size={14} color={theme.warning} fill={theme.warning} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.textSecondary,
                            marginLeft: 4,
                          }}
                        >
                          {trajet.note} ({trajet.nb_avis} avis)
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '600',
                        color: theme.primary,
                      }}
                    >
                      {trajet.prix} FCFA
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Clock size={14} color={theme.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      Départs: {trajet.horaires.join(', ')}
                    </Text>
                  </View>
                  
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.textSecondary,
                    }}
                  >
                    {trajet.gare}
                  </Text>
                </TouchableOpacity>

                {/* Action buttons */}
                <View style={{ marginTop: 12 }}>
                  {/* Reservation button */}
                  <TouchableOpacity
                    onPress={() => router.push(`/reservation/${trajet.id}`)}
                    style={{
                      backgroundColor: theme.primary,
                      padding: 12,
                      borderRadius: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                      Réserver
                    </Text>
                  </TouchableOpacity>

                  {/* Date and remove button */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.textTertiary,
                      }}
                    >
                      Ajouté le {new Date(trajet.dateAjout).toLocaleDateString('fr-FR')}
                    </Text>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: theme.errorLight,
                      }}
                      onPress={() => removeFavori(trajet.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color={theme.error} style={{ marginRight: 4 }} />
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.error,
                          fontWeight: '500',
                        }}
                      >
                        Retirer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}