import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../../utils/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(tabs)/trajets');
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Login</Text>

      <TextInput
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={{ borderWidth: 1, padding: 8, marginBottom: 16 }}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        style={{ backgroundColor: 'blue', padding: 12, alignItems: 'center' }}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={{ color: 'white' }}>{loading ? 'Loading...' : 'Login'}</Text>
      </Pressable>

      <Pressable
        style={{ marginTop: 16 }}
        onPress={() => router.push('/(auth)/register')}
      >
        <Text style={{ textAlign: 'center', color: 'blue' }}>
          Don't have an account? Register
        </Text>
      </Pressable>
    </View>
  );
}
