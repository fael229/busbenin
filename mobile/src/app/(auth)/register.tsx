import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Alert, Text, TextInput, View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, Bus, ArrowRight, User, CheckCircle } from 'lucide-react-native';
import { supabase } from '../../utils/supabase';
import { useTheme } from '../../contexts/ThemeProvider';

export default function Register() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({ 
    nom: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });

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
    const newErrors = { nom: '', email: '', password: '', confirmPassword: '' };
    let isValid = true;

    if (!nom.trim()) {
      newErrors.nom = 'Le nom est requis';
      isValid = false;
    } else if (nom.trim().length < 2) {
      newErrors.nom = 'Minimum 2 caractères';
      isValid = false;
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmez le mot de passe';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim().toLowerCase(), 
        password,
        options: {
          data: {
            nom: nom.trim(),
          }
        }
      });

      if (error) {
        Alert.alert('Erreur d\'inscription', error.message);
        return;
      }

      if (data?.user?.id) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ 
              id: data.user.id, 
              email: email.trim().toLowerCase(),
              nom: nom.trim()
            })
            .select()
            .single();

          if (profileError && profileError.code !== '23505') {
            console.error('Profile error:', profileError);
            // Continue anyway, the trigger might have created it
          }
        } catch (e: any) {
          console.error('Profile creation error:', e);
          // Continue anyway
        }

        Alert.alert(
          'Inscription réussie ! \ud83c\udf89',
          'Vérifiez votre email pour confirmer votre compte.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: theme.textTertiary };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Faible', color: theme.error };
    if (strength <= 3) return { strength: 2, label: 'Moyen', color: theme.warning };
    return { strength: 3, label: 'Fort', color: theme.success };
  };

  const passwordStrength = getPasswordStrength();

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
        <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 20 }}>
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
            Créer un compte
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: theme.textSecondary,
            textAlign: 'center'
          }}>
            Rejoignez-nous pour réserver vos trajets
          </Text>
        </View>

        {/* Formulaire */}
        <View style={{ marginBottom: 24 }}>
          {/* Nom */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '600', 
              color: theme.text,
              marginBottom: 8
            }}>
              Nom complet
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: errors.nom ? theme.error : theme.border,
              paddingHorizontal: 16,
            }}>
              <User size={20} color={theme.textSecondary} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  color: theme.text,
                }}
                placeholder="Votre nom"
                placeholderTextColor={theme.textTertiary}
                value={nom}
                onChangeText={(text) => {
                  setNom(text);
                  setErrors({ ...errors, nom: '' });
                }}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
            {errors.nom ? (
              <Text style={{ fontSize: 12, color: theme.error, marginTop: 4, marginLeft: 4 }}>
                {errors.nom}
              </Text>
            ) : null}
          </View>

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
          <View style={{ marginBottom: 20 }}>
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
                autoComplete="password-new"
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
            ) : password.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginRight: 8 }}>
                    Force:
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1, 2, 3].map((level) => (
                    <View 
                      key={level}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: level <= passwordStrength.strength 
                          ? passwordStrength.color 
                          : theme.border
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '600', 
              color: theme.text,
              marginBottom: 8
            }}>
              Confirmer le mot de passe
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: errors.confirmPassword ? theme.error : theme.border,
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
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors({ ...errors, confirmPassword: '' });
                }}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ padding: 4 }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={theme.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={{ fontSize: 12, color: theme.error, marginTop: 4, marginLeft: 4 }}>
                {errors.confirmPassword}
              </Text>
            ) : confirmPassword && password === confirmPassword ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: 4 }}>
                <CheckCircle size={14} color={theme.success} />
                <Text style={{ fontSize: 12, color: theme.success, marginLeft: 4 }}>
                  Les mots de passe correspondent
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bouton d'inscription */}
        <TouchableOpacity
          onPress={handleRegister}
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
                S'inscrire
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

        {/* Lien connexion */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
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
            Déjà un compte ?{' '}
            <Text style={{ fontWeight: '700', color: theme.primary }}>
              Connectez-vous
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 12, 
            color: theme.textTertiary,
            textAlign: 'center',
            lineHeight: 18
          }}>
            En créant un compte, vous acceptez nos{' \n'}
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
