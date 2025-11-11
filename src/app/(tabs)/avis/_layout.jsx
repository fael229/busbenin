import { Stack } from 'expo-router';

export default function AvisLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[trajetId]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="liste/[trajetId]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
