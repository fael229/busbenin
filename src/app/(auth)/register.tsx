import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../../utils/supabase';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      try {
        const userId = data?.user?.id;
        if (userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: userId, email })
            .select()
            .single();
          if (profileError && profileError.code !== '23505') {
            // 23505: unique_violation -> profile already exists
            throw profileError;
          }
        }
      } catch (e: any) {
        Alert.alert('Profile Error', e?.message ?? 'Failed to create profile.');
      } finally {
        router.push('/(auth)/login');
      }
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Register</Text>

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
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={{ color: 'white' }}>{loading ? 'Loading...' : 'Register'}</Text>
      </Pressable>

      <Pressable
        style={{ marginTop: 16 }}
        onPress={() => router.push('/(auth)/login')}
      >
        <Text style={{ textAlign: 'center', color: 'blue' }}>
          Already have an account? Login
        </Text>
      </Pressable>
    </View>
  );
}
