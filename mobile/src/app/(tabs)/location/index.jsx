import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../utils/supabase";
import { Car, Search, Plus, MapPin } from "lucide-react-native";
import { useTheme } from "../../../contexts/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LocationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchVehicules();
  }, []);

  const fetchVehicules = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicules_location")
        .select("*")
        .eq("disponible", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicules(data);
    } catch (error) {
      console.error("Erreur lors du chargement des véhicules:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicules = vehicules.filter(
    (v) =>
      v.marque.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modele.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      onPress={() => router.push(`/location/reserver/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.placeholderImage,
              { backgroundColor: theme.background },
            ]}
          >
            <Car size={48} color={theme.textSecondary} />
          </View>
        )}
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>
            {item.prix_par_jour.toLocaleString()} FCFA / jour
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          {item.marque} {item.modele}
        </Text>
        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          {item.annee}
        </Text>

        {item.description ? (
          <Text
            style={[styles.cardDescription, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Location
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Louez ou proposez un véhicule
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push("/location/ajouter")}
        >
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Search
          size={20}
          color={theme.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Rechercher une marque, un modèle..."
          placeholderTextColor={theme.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredVehicules}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Car size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                Aucun véhicule trouvé
              </Text>
              <Text
                style={[styles.emptySubtext, { color: theme.textSecondary }]}
              >
                Soyez le premier à proposer un véhicule !
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 14,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageContainer: {
    height: 200,
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
  priceTag: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});
