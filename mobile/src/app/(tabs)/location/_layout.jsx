import { Stack } from "expo-router";

export default function LocationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="ajouter" />
      <Stack.Screen name="reserver/[id]" />
      <Stack.Screen name="paiement/[id]" />
    </Stack>
  );
}
