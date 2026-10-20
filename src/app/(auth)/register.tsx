import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInputProps,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import FadeInView from '@/components/FadeInView';

import { auth, db } from '@/config/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { Alert, Animated as RNAnimated } from 'react-native';

interface AnimatedInputProps extends TextInputProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  errorText?: string;
}

const AnimatedInput = React.forwardRef<TextInput, AnimatedInputProps>(
  ({ label, iconName, isPassword, errorText, ...props }, ref) => {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const focusAnim = useRef(new RNAnimated.Value(0)).current;

    React.useEffect(() => {
      RNAnimated.timing(focusAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }, [isFocused]);

    const borderColor = errorText 
      ? '#EF4444' 
      : focusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['#E5E7EB', '#3B82F6'],
        });

    const backgroundColor = errorText
      ? '#FEF2F2'
      : focusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['#F9FAFB', '#EFF6FF'],
        });

    const shadowOpacity = errorText ? 0 : focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.12],
    });

    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { fontFamily: theme.typography.fontFamilyMedium }]}>
          {label}
        </Text>
        <RNAnimated.View
          style={[
            styles.inputContainer,
            {
              borderColor,
              backgroundColor,
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity,
              shadowRadius: 8,
              elevation: isFocused && !errorText ? 2 : 0,
            },
          ]}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={errorText ? '#EF4444' : isFocused ? theme.colors.primary : theme.colors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            ref={ref}
            style={[styles.input, { fontFamily: theme.typography.fontFamily }]}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry={isPassword && !showPassword}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {isPassword && (
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textMuted}
              />
            </Pressable>
          )}
        </RNAnimated.View>
        {errorText ? (
          <Text style={[styles.errorText, { fontFamily: theme.typography.fontFamily }]}>
            {errorText}
          </Text>
        ) : null}
      </View>
    );
  }
);

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [errorPopupVisible, setErrorPopupVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const isFormValid =
    fullname.trim() &&
    username.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim() &&
    password === confirmPassword;

  const handleRegister = async () => {
    if (!isFormValid) return;
    setIsLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      await set(ref(db, 'users/' + user.uid), {
        name: fullname.trim(),
        username: username.trim(),
        email: email.trim(),
        createdAt: Date.now(),
      });
      
      // Sign out immediately so they have to login manually
      await signOut(auth);
      
      setShowSuccessPopup(true);
    } catch (error: any) {
      let msg = 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.';
      if (error.code === 'auth/invalid-email') {
        msg = 'Format email tidak valid. Harap periksa kembali penulisan email Anda.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'Kata sandi terlalu lemah. Gunakan kombinasi yang lebih rumit (minimal 6 karakter).';
      } else if (error.code === 'auth/email-already-in-use') {
        msg = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk dengan akun Anda.';
      } else if (error.message) {
        msg = error.message;
      }
      setErrorMessage(msg);
      setErrorPopupVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setIsNavigating(true);
    setTimeout(() => {
      router.back();
    }, 50);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1D4ED8', '#3B82F6', '#60A5FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <FadeInView delay={100}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </FadeInView>

        <FadeInView delay={150}>
          <View style={styles.headerContent}>
            <View style={styles.logoIcon}>
              <Ionicons name="person-add" size={28} color="#3B82F6" />
            </View>
            <Text style={styles.headerTitle}>Buat Akun Baru</Text>
            <Text style={styles.headerSubtitle}>
              Bergabung dan mulai verifikasi berita dengan AI
            </Text>
          </View>
        </FadeInView>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formWrapper}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <FadeInView delay={200}>
            <View style={[styles.formCard, theme.shadows.lg]}>
              <Text style={[styles.formTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
                Informasi Akun
              </Text>
              <Text style={[styles.formSubtitle, { fontFamily: theme.typography.fontFamily }]}>
                Lengkapi data di bawah untuk mendaftar
              </Text>

              <FadeInView delay={250}>
                <AnimatedInput
                  label="Nama Lengkap"
                  iconName="person-outline"
                  placeholder="Masukkan nama lengkap"
                  value={fullname}
                  onChangeText={setFullname}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => usernameRef.current?.focus()}
                />
              </FadeInView>

              <FadeInView delay={300}>
                <AnimatedInput
                  ref={usernameRef}
                  label="Username"
                  iconName="at-outline"
                  placeholder="Pilih username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </FadeInView>

              <FadeInView delay={350}>
                <AnimatedInput
                  ref={emailRef}
                  label="Email"
                  iconName="mail-outline"
                  placeholder="contoh@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </FadeInView>

              {/* Hide password inputs when navigating to prevent FLAG_SECURE leak */}
              {!isNavigating ? (
                <>
                  <FadeInView delay={400}>
                    <AnimatedInput
                      ref={passwordRef}
                      label="Kata Sandi"
                      iconName="lock-closed-outline"
                      isPassword
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChangeText={setPassword}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    />
                  </FadeInView>

                  <FadeInView delay={450}>
                    <AnimatedInput
                      ref={confirmPasswordRef}
                      label="Konfirmasi Kata Sandi"
                      iconName="lock-closed-outline"
                      isPassword
                      placeholder="Ketik ulang kata sandi"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                      errorText={password !== confirmPassword && confirmPassword.length > 0 ? '*Kata sandi tidak cocok' : undefined}
                    />
                  </FadeInView>
                </>
              ) : (
                <View style={{ height: 160 }} />
              )}

              {password.length > 0 && (
                <FadeInView delay={0} duration={300}>
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              password.length >= 2 ? '#EF4444' : '#E5E7EB',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              password.length >= 4 ? '#F59E0B' : '#E5E7EB',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              password.length >= 6 ? '#10B981' : '#E5E7EB',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              password.length >= 8 && /[!@#$%^&*]/.test(password)
                                ? '#10B981'
                                : '#E5E7EB',
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.strengthText,
                        { fontFamily: theme.typography.fontFamily },
                      ]}
                    >
                      {password.length < 4
                        ? 'Lemah'
                        : password.length < 6
                          ? 'Sedang'
                          : password.length < 8
                            ? 'Kuat'
                            : 'Sangat Kuat'}
                    </Text>
                  </View>
                </FadeInView>
              )}

              <FadeInView delay={500}>
                <TouchableOpacity
                  style={[
                    styles.registerButton,
                    !isFormValid && styles.registerButtonDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={handleRegister}
                  disabled={isLoading || !isFormValid}
                >
                  <LinearGradient
                    colors={!isFormValid ? ['#93C5FD', '#93C5FD'] : ['#2563EB', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.registerButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text
                          style={[
                            styles.registerButtonText,
                            { fontFamily: theme.typography.fontFamilySemiBold },
                          ]}
                        >
                          Daftar Sekarang
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </FadeInView>

              <FadeInView delay={550}>
                <View style={styles.loginContainer}>
                  <Text style={[styles.loginText, { fontFamily: theme.typography.fontFamily }]}>
                    Sudah punya akun?{' '}
                  </Text>
                  <Link href="/(auth)/login" asChild>
                    <TouchableOpacity activeOpacity={0.7}>
                      <Text style={[styles.loginLink, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                        Masuk
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </FadeInView>
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessPopup}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadows.lg]}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.modalIconContainer}
            >
              <Ionicons name="checkmark-circle" size={48} color="#FFFFFF" />
            </LinearGradient>
            
            <Text style={[styles.modalTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Pendaftaran Berhasil!
            </Text>
            
            <Text style={[styles.modalMessage, { fontFamily: theme.typography.fontFamily }]}>
              Selamat datang di Hoax Buster. Akun Anda telah siap digunakan untuk membasmi hoaks.
            </Text>

            <TouchableOpacity 
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={handleBack}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalButtonGradient}
              >
                <Text style={[styles.modalButtonText, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                  Menuju Login
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ERROR MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorPopupVisible}
        onRequestClose={() => setErrorPopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadows.lg]}>
            <View style={{ marginBottom: 16 }}>
              <Ionicons name="alert-circle" size={64} color="#EF4444" />
            </View>
            
            <Text style={[styles.modalTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Gagal Mendaftar
            </Text>
            
            <Text style={[styles.modalMessage, { fontFamily: theme.typography.fontFamily }]}>
              {errorMessage}
            </Text>

            <TouchableOpacity 
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={() => setErrorPopupVisible(false)}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalButtonGradient}
              >
                <Text style={[styles.modalButtonText, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                  Coba Lagi
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingTop: 56,
    paddingBottom: 52,
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -30,
    right: -50,
  },
  decorCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: 10,
    left: -20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  formWrapper: {
    flex: 1,
    marginTop: -24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  formTitle: {
    fontSize: 20,
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 50,
  },
  inputContainerFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: -8,
    paddingHorizontal: 4,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    color: '#6B7280',
  },
  registerButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    marginTop: 4,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
  },
  registerButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#3B82F6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    maxWidth: 400,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 24,
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
