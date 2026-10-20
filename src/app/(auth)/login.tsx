import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  TextInputProps,
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import FadeInView from '@/components/FadeInView';
import { auth, db } from '@/config/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';
import { Alert } from 'react-native';

// Komponen kustom untuk input yang menangani state fokusnya sendiri
// dan memberikan animasi transisi warna border yang sangat halus.
interface AnimatedInputProps extends TextInputProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

const AnimatedInput = React.forwardRef<TextInput, AnimatedInputProps>(
  ({ label, iconName, isPassword, ...props }, ref) => {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(focusAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 250,
        useNativeDriver: false, // backgroundColor/borderColor tidak support native driver di RN lama, tapi di modern RN bisa. Kita set false untuk aman interpolasi warna.
      }).start();
    }, [isFocused]);

    const borderColor = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E5E7EB', '#3B82F6'],
    });

    const backgroundColor = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#F9FAFB', '#EFF6FF'],
    });

    const shadowOpacity = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.12],
    });

    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { fontFamily: theme.typography.fontFamilyMedium }]}>
          {label}
        </Text>
        <Animated.View
          style={[
            styles.inputContainer,
            {
              borderColor,
              backgroundColor,
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity,
              shadowRadius: 8,
              elevation: isFocused ? 2 : 0,
            },
          ]}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={isFocused ? theme.colors.primary : theme.colors.textMuted}
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
        </Animated.View>
      </View>
    );
  }
);

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const [errorPopupVisible, setErrorPopupVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [forgotSuccessVisible, setForgotSuccessVisible] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorPopupVisible(true);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setIsLoading(true);
    try {
      // Ambil semua data users untuk dicari manual (menghindari error .indexOn)
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (!snapshot.exists()) {
        throw new Error('Database pengguna kosong.');
      }
      
      const usersData = snapshot.val();
      let userEmail = null;
      
      // Cari manual username yang cocok
      for (const key in usersData) {
        if (usersData[key].username === username.trim()) {
          userEmail = usersData[key].email;
          break;
        }
      }
      
      if (!userEmail) {
        throw new Error('Username tidak ditemukan.');
      }

      await signInWithEmailAndPassword(auth, userEmail, password);
      
      // Workaround for RN Android bug: FLAG_SECURE bleeds to other screens
      // if unmounted while secureTextEntry is true. We unmount the password field first.
      setIsNavigating(true);
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 50);
    } catch (error: any) {
      const msg = error.message || 'Terjadi kesalahan saat masuk.';
      if (msg.includes('auth/invalid-credential')) {
        showError('Kata sandi yang Anda masukkan salah.');
      } else {
        showError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      showError('Harap masukkan alamat email Anda.');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      showError('Format email tidak valid.');
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotPasswordVisible(false);
      setForgotEmail('');
      setForgotSuccessVisible(true);
    } catch (error: any) {
      const msg = error.message || 'Gagal mengirim email reset kata sandi.';
      if (msg.includes('user-not-found') || msg.includes('invalid-email') || msg.includes('auth/invalid-email')) {
        showError('Email tersebut tidak terdaftar di sistem kami.');
      } else {
        showError(msg);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient Header */}
      <LinearGradient
        colors={['#1D4ED8', '#3B82F6', '#60A5FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.decorCircle3} />

        <FadeInView delay={100}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Image source={require('../../../assets/favicon.png')} style={{ width: 42, height: 42 }} resizeMode="contain" />
            </View>
            <Text style={styles.logoTitle}>HoaxBuster</Text>
            <Text style={styles.logoSubtitle}>Deteksi Hoaks dengan Kecerdasan Buatan</Text>
          </View>
        </FadeInView>
      </LinearGradient>

      {/* Form Card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                Masuk ke Akun
              </Text>
              <Text style={[styles.formSubtitle, { fontFamily: theme.typography.fontFamily }]}>
                Selamat datang kembali! Silakan masuk untuk melanjutkan.
              </Text>

              <FadeInView delay={300}>
                <AnimatedInput
                  label="Username"
                  iconName="person-outline"
                  placeholder="Masukkan username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </FadeInView>

              {/* We hide the password input when navigating to clear FLAG_SECURE in Android */}
              {!isNavigating ? (
                <FadeInView delay={400}>
                  <AnimatedInput
                    ref={passwordRef}
                    label="Kata Sandi"
                    iconName="lock-closed-outline"
                    isPassword
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                </FadeInView>
              ) : (
                <View style={{ height: 80 }} />
              )}

              {/* Forgot Password */}
              <FadeInView delay={450}>
                <TouchableOpacity 
                  style={styles.forgotButton} 
                  activeOpacity={0.7}
                  onPress={() => setForgotPasswordVisible(true)}
                >
                  <Text style={[styles.forgotText, { fontFamily: theme.typography.fontFamilyMedium }]}>
                    Lupa Kata Sandi?
                  </Text>
                </TouchableOpacity>
              </FadeInView>

              {/* Login Button */}
              <FadeInView delay={500}>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (!username.trim() || !password.trim()) && styles.loginButtonDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={handleLogin}
                  disabled={isLoading || !username.trim() || !password.trim()}
                >
                  <LinearGradient
                    colors={
                      !username.trim() || !password.trim()
                        ? ['#93C5FD', '#93C5FD']
                        : ['#2563EB', '#3B82F6']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={[styles.loginButtonText, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                          Masuk
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </FadeInView>

              {/* Divider */}
              <FadeInView delay={550}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={[styles.dividerText, { fontFamily: theme.typography.fontFamily }]}>
                    atau
                  </Text>
                  <View style={styles.dividerLine} />
                </View>
              </FadeInView>

              {/* Register Link */}
              <FadeInView delay={600}>
                <View style={styles.registerContainer}>
                  <Text style={[styles.registerText, { fontFamily: theme.typography.fontFamily }]}>
                    Belum punya akun?{' '}
                  </Text>
                  <Link href="/(auth)/register" asChild>
                    <TouchableOpacity activeOpacity={0.7}>
                      <Text style={[styles.registerLink, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                        Daftar Sekarang
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </FadeInView>
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Error Popup */}
      <Modal
        visible={errorPopupVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorPopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadows.lg]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="alert-circle" size={64} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Gagal Login
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

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotPasswordVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setForgotPasswordVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, theme.shadows.lg]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="key-outline" size={54} color="#3B82F6" />
            </View>
            <Text style={[styles.modalTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Lupa Kata Sandi?
            </Text>
            <Text style={[styles.modalMessage, { fontFamily: theme.typography.fontFamily, marginBottom: 16 }]}>
              Masukkan email yang terdaftar pada akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
            </Text>
            
            <View style={{ width: '100%', marginBottom: 20 }}>
              <View style={[styles.inputContainer, { height: 50, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: theme.typography.fontFamily }]}
                  placeholder="Alamat Email"
                  placeholderTextColor={theme.colors.textMuted}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, backgroundColor: '#F3F4F6' }]}
                activeOpacity={0.8}
                onPress={() => {
                  setForgotPasswordVisible(false);
                  setForgotEmail('');
                }}
              >
                <View style={[styles.modalButtonGradient, { backgroundColor: 'transparent' }]}>
                  <Text style={[styles.modalButtonText, { fontFamily: theme.typography.fontFamilySemiBold, color: '#4B5563' }]}>
                    Batal
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1 }]}
                activeOpacity={0.8}
                onPress={handleForgotPassword}
                disabled={isSendingReset || !forgotEmail.trim()}
              >
                <LinearGradient
                  colors={!forgotEmail.trim() ? ['#93C5FD', '#93C5FD'] : ['#2563EB', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  {isSendingReset ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={[styles.modalButtonText, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                      Kirim Tautan
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Forgot Password Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={forgotSuccessVisible}
        onRequestClose={() => setForgotSuccessVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadows.lg]}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={{
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
              }}
            >
              <Ionicons name="mail-open" size={42} color="#FFFFFF" />
            </LinearGradient>
            
            <Text style={[styles.modalTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Email Terkirim!
            </Text>
            
            <Text style={[styles.modalMessage, { fontFamily: theme.typography.fontFamily, marginBottom: 32 }]}>
              Tautan untuk mengatur ulang kata sandi Anda telah dikirim ke email. Silakan periksa kotak masuk atau folder spam Anda.
            </Text>

            <TouchableOpacity 
              style={[styles.modalButton, { overflow: 'hidden', borderRadius: 16 }]}
              activeOpacity={0.8}
              onPress={() => setForgotSuccessVisible(false)}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.modalButtonGradient, { paddingVertical: 16 }]}
              >
                <Text style={[styles.modalButtonText, { fontFamily: theme.typography.fontFamilySemiBold, fontSize: 16, color: '#FFFFFF' }]}>
                  Mengerti
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
    paddingTop: 72,
    paddingBottom: 60,
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -40,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: 20,
    left: -30,
  },
  decorCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: 60,
    left: '40%',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  logoSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  formWrapper: {
    flex: 1,
    marginTop: -28,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
  },
  formTitle: {
    fontSize: 24,
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 28,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
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
    height: 52,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: '#3B82F6',
  },
  loginButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  loginButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#9CA3AF',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  registerLink: {
    fontSize: 14,
    color: '#3B82F6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});
