import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { supabase } from "../../../utils/supabase";
import {
  Car,
  Calendar,
  Star,
  User,
  ArrowLeft,
  Shield,
  CheckCircle,
  Info,
} from "lucide-react-native";
import { useTheme } from "../../../contexts/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function LocationDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [vehicule, setVehicule] = useState(null);
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moyenne, setMoyenne] = useState(0);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      // Fetch véhicule
      const { data: vehiculeData, error: vehiculeError } = await supabase
        .from("vehicules_location")
        .select("*, profiles(full_name, avatar_url, updated_at)")
        .eq("id", id)
        .single();

      if (vehiculeError) throw vehiculeError;
      setVehicule(vehiculeData);

      // Fetch avis
      const { data: avisData, error: avisError } = await supabase
        .from("avis_location")
        .select("*")
        .eq("vehicule_id", id)
        .order("created_at", { ascending: false });

      if (avisError) throw avisError;

      // Si des avis existent, charger les profils des utilisateurs
      if (avisData && avisData.length > 0) {
        const userIds = [...new Set(avisData.map(a => a.user_id))];
        
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        // Fusionner les données
        const avisWithProfiles = avisData.map(avis => ({
          ...avis,
          profiles: profilesData?.find(p => p.id === avis.user_id) || null
        }));

        setAvis(avisWithProfiles);

        const total = avisData.reduce((acc, curr) => acc + curr.note, 0);
        setMoyenne(total / avisData.length);
      }
    } catch (error) {
      console.error("Erreur chargement détails:", error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!vehicule) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image */}
        <View style={styles.imageContainer}>
          {vehicule.photo_url ? (
            <Image
              source={{ uri: vehicule.photo_url }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.placeholderImage,
                { backgroundColor: theme.surfaceSecondary },
              ]}
            >
              <Car size={64} color={theme.textSecondary} />
            </View>
          )}

          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.priceTag}>
            <Text style={styles.priceText}>
              {vehicule.prix_par_jour.toLocaleString()} FCFA
              <Text style={{ fontSize: 12, fontWeight: "normal" }}>
                {" "}
                / jour
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Titre et Info */}
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: theme.text }]}>
              {vehicule.marque} {vehicule.modele}
            </Text>
            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.surfaceSecondary },
                ]}
              >
                <Calendar size={14} color={theme.text} />
                <Text style={[styles.badgeText, { color: theme.text }]}>
                  {vehicule.annee}
                </Text>
              </View>
              {moyenne > 0 && (
                <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
                  <Star size={14} color="#D97706" fill="#D97706" />
                  <Text style={[styles.badgeText, { color: "#92400E" }]}>
                    {moyenne.toFixed(1)} ({avis.length} avis)
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Description
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {vehicule.description || "Aucune description disponible."}
            </Text>
          </View>

          {/* Caractéristiques */}
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Caractéristiques
            </Text>
            <View style={styles.featuresGrid}>
              <View
                style={[
                  styles.featureItem,
                  { backgroundColor: theme.surfaceSecondary },
                ]}
              >
                <Shield size={20} color="#3B82F6" />
                <Text style={[styles.featureText, { color: theme.text }]}>
                  Assurance
                </Text>
              </View>
              <View
                style={[
                  styles.featureItem,
                  { backgroundColor: theme.surfaceSecondary },
                ]}
              >
                <CheckCircle size={20} color="#10B981" />
                <Text style={[styles.featureText, { color: theme.text }]}>
                  Vérifié
                </Text>
              </View>
              <View
                style={[
                  styles.featureItem,
                  { backgroundColor: theme.surfaceSecondary },
                ]}
              >
                <Info size={20} color="#8B5CF6" />
                <Text style={[styles.featureText, { color: theme.text }]}>
                  Support 24/7
                </Text>
              </View>
            </View>
          </View>

          {/* Propriétaire */}
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Propriétaire
            </Text>
            <View style={styles.ownerRow}>
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: theme.surfaceSecondary },
                ]}
              >
                {vehicule.profiles?.avatar_url ? (
                  <Image
                    source={{ uri: vehicule.profiles.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <User size={24} color={theme.textSecondary} />
                )}
              </View>
              <View>
                <Text style={[styles.ownerName, { color: theme.text }]}>
                  {vehicule.profiles?.full_name || "Partenaire BusPro"}
                </Text>
                <Text
                  style={[styles.ownerSubtext, { color: theme.textSecondary }]}
                >
                  Membre depuis{" "}
                  {new Date(
                    vehicule.profiles?.updated_at || new Date()
                  ).getFullYear()}
                </Text>
              </View>
            </View>
          </View>

          {/* Avis */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Avis des locataires
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: theme.surfaceSecondary },
                ]}
              >
                <Text
                  style={[styles.countText, { color: theme.textSecondary }]}
                >
                  {avis.length}
                </Text>
              </View>
            </View>

            {avis.length === 0 ? (
              <Text style={[styles.noReviews, { color: theme.textSecondary }]}>
                Aucun avis pour le moment.
              </Text>
            ) : (
              avis.map((review) => (
                <View
                  key={review.id}
                  style={[
                    styles.reviewCard,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View
                        style={[
                          styles.smallAvatar,
                          { backgroundColor: theme.surfaceSecondary },
                        ]}
                      >
                        {review.profiles?.avatar_url ? (
                          <Image
                            source={{ uri: review.profiles.avatar_url }}
                            style={styles.avatar}
                          />
                        ) : (
                          <User size={16} color={theme.textSecondary} />
                        )}
                      </View>
                      <View>
                        <Text
                          style={[styles.reviewerName, { color: theme.text }]}
                        >
                          {review.profiles?.full_name || "Utilisateur"}
                        </Text>
                        <Text
                          style={[
                            styles.reviewDate,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {new Date(review.created_at).toLocaleDateString(
                            "fr-FR"
                          )}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.starsRow}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          color={i < review.note ? "#FBBF24" : theme.border}
                          fill={i < review.note ? "#FBBF24" : "transparent"}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.reviewComment, { color: theme.text }]}>
                    {review.commentaire}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer Action */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <View>
          <Text
            style={[styles.footerPriceLabel, { color: theme.textSecondary }]}
          >
            Total par jour
          </Text>
          <Text style={[styles.footerPrice, { color: theme.text }]}>
            {vehicule.prix_par_jour.toLocaleString()}{" "}
            <Text style={{ fontSize: 14, fontWeight: "normal" }}>FCFA</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bookButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push(`/location/reserver/${vehicule.id}`)}
        >
          <Text style={styles.bookButtonText}>Réserver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    height: 300,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  priceTag: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  content: {
    padding: 20,
  },
  headerInfo: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    borderBottomWidth: 1,
    paddingBottom: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  featuresGrid: {
    flexDirection: "row",
    gap: 12,
  },
  featureItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: "500",
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  ownerSubtext: {
    fontSize: 13,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noReviews: {
    fontStyle: "italic",
  },
  reviewCard: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: "row",
    gap: 10,
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "600",
  },
  reviewDate: {
    fontSize: 11,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 10,
  },
  footerPriceLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: "bold",
  },
  bookButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  bookButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
