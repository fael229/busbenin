import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SessionProvider, useSession } from "../contexts/SessionProvider";
import { ThemeProvider } from "../contexts/ThemeProvider";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === "(tabs)";
    const inAuthGroup = segments[0] === "(auth)";

    if (session && !inTabsGroup) {
      // Rediriger vers l'accueil (index) au lieu de trajets
      router.replace("/(tabs)");
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    }

    // Cacher le splash screen après la navigation
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 500);
  }, [session, loading, segments, router]);

  return (
    <View style={{ flex: 1 }}>
      {/* Fond fixe pour la barre de statut - appliqué globalement */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: "#f5f5f5ff",
          zIndex: 1000,
        }}
      />
      {/* Barre de statut avec texte blanc */}
      <StatusBar style="light" />
      <Slot />
    </View>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <InitialLayout />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
