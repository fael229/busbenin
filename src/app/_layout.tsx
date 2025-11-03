import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { SessionProvider, useSession } from "../contexts/SessionProvider";

const InitialLayout = () => {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === "(tabs)";
    const inAuthGroup = segments[0] === "(auth)";

    if (session && !inTabsGroup) {
      router.replace("/(tabs)/trajets");
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [session, loading, segments, router]);

  return <Slot />;
};

export default function RootLayout() {
  return (
    <SessionProvider>
      <InitialLayout />
    </SessionProvider>
  );
}
