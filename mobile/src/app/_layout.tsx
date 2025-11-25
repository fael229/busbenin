import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { SessionProvider, useSession } from "../contexts/SessionProvider";
import { ThemeProvider } from "../contexts/ThemeProvider";
import * as SplashScreen from 'expo-splash-screen';

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

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

  return <Slot />;
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <InitialLayout />
      </SessionProvider>
    </ThemeProvider>
  );
}
