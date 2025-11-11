import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Alert, Pressable, Text, TextInput, View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, Bus, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../utils/supabase';
import { useTheme } from '../../contexts/ThemeProvider';

export default function Login() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Utilisateur déjà connecté, rediriger vers l'accueil
        router.replace('/(tabs)/index' as any);
      }
    } catch (error) {
      console.error('Erreur vérification session:', error);
    }
  };

  const validateForm = () => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'L\'email est requis';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });

      if (error) {
        Alert.alert('Erreur de connexion', error.message);
      } else {
        router.replace('/(tabs)/index' as any);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec icône */}
        <View style={{ alignItems: 'center', marginBottom: 40, marginTop: 20 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Bus size={40} color={theme.textInverse} />
          </View>
          <Text style={{ 
            fontSize: 32, 
            fontWeight: '800', 
            color: theme.text,
            marginBottom: 8
          }}>
            Bon retour !
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: theme.textSecondary,
            textAlign: 'center'
          }}>
            Connectez-vous pour continuer
          </Text>
        </View>

        {/* Formulaire */}
        <View style={{ marginBottom: 24 }}>
          {/* Email */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '600', 
              color: theme.text,
              marginBottom: 8
            }}>
              Email
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: errors.email ? theme.error : theme.border,
              paddingHorizontal: 16,
            }}>
              <Mail size={20} color={theme.textSecondary} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  color: theme.text,
                }}
                placeholder="votre@email.com"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors({ ...errors, email: '' });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
            </View>
            {errors.email ? (
              <Text style={{ fontSize: 12, color: theme.error, marginTop: 4, marginLeft: 4 }}>
                {errors.email}
              </Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '600', 
              color: theme.text,
              marginBottom: 8
            }}>
              Mot de passe
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: errors.password ? theme.error : theme.border,
              paddingHorizontal: 16,
            }}>
              <Lock size={20} color={theme.textSecondary} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  color: theme.text,
                }}
                placeholder="••••••••"
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors({ ...errors, password: '' });
                }}
                secureTextEntry={!showPassword}
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 4 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={theme.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={{ fontSize: 12, color: theme.error, marginTop: 4, marginLeft: 4 }}>
                {errors.password}
              </Text>
            ) : null}
          </View>

          {/* Mot de passe oublié */}
          <TouchableOpacity 
            onPress={() => Alert.alert('Récupération', 'Fonctionnalité à venir')}
            style={{ alignSelf: 'flex-end', padding: 4 }}
          >
            <Text style={{ fontSize: 14, color: theme.primary, fontWeight: '600' }}>
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bouton de connexion */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: loading ? theme.border : theme.primary,
            borderRadius: 12,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={theme.textInverse} />
          ) : (
            <>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '700', 
                color: theme.textInverse,
                marginRight: 8
              }}>
                Se connecter
              </Text>
              <ArrowRight size={20} color={theme.textInverse} />
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: 24 
        }}>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          <Text style={{ 
            marginHorizontal: 16, 
            fontSize: 14, 
            color: theme.textSecondary 
          }}>
            ou
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        </View>

        {/* Lien inscription */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.border,
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16, color: theme.text }}>
            Pas de compte ?{' '}
            <Text style={{ fontWeight: '700', color: theme.primary }}>
              Inscrivez-vous
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 12, 
            color: theme.textTertiary,
            textAlign: 'center',
            lineHeight: 18
          }}>
            En vous connectant, vous acceptez nos{' \n'}
            <Text style={{ color: theme.primary, fontWeight: '600' }}>
              Conditions d'utilisation
            </Text>
            {' '}et notre{' '}
            <Text style={{ color: theme.primary, fontWeight: '600' }}>
              Politique de confidentialité
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
