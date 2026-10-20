import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import FadeInView from '@/components/FadeInView';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/config/firebase';
import { updatePassword } from 'firebase/auth';

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, updateProfileData } = useAuth();

  const [firstName, setFirstName] = useState(profile?.firstname || '');
  const [lastName, setLastName] = useState(profile?.lastname || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successPopupVisible, setSuccessPopupVisible] = useState(false);
  const [errorPopupVisible, setErrorPopupVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '#E5E7EB' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Lemah', color: '#EF4444' };
    if (score === 2) return { score: 2, label: 'Sedang', color: '#F59E0B' };
    if (score === 3) return { score: 3, label: 'Kuat', color: '#3B82F6' };
    return { score: 4, label: 'Sangat Kuat', color: '#10B981' };
  };

  const strength = getPasswordStrength(password);
  const strengthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(strengthAnim, {
      toValue: strength.score,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [strength.score]);

  const widthInterpolate = strengthAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['0%', '25%', '50%', '75%', '100%']
  });

  // Jika belum ada firstname/lastname tapi ada name (data lama), pisahkan string name
  useEffect(() => {
    if (profile && !profile.firstname && !profile.lastname && profile.name) {
      const parts = profile.name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      setErrorMessage('Nama Depan tidak boleh kosong.');
      setErrorPopupVisible(true);
      return;
    }

    if (password) {
      if (password.length < 6) {
        setErrorMessage('Kata sandi baru minimal 6 karakter.');
        setErrorPopupVisible(true);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Konfirmasi kata sandi tidak cocok dengan kata sandi baru.');
        setErrorPopupVisible(true);
        return;
      }
    }

    setIsLoading(true);
    try {
      // 1. Update Profile in DB
      const newFullName = lastName.trim() ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim();
      await updateProfileData({
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        name: newFullName
      });

      // 2. Update Password if provided
      if (password && auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, password);
        } catch (error: any) {
          if (error.code === 'auth/requires-recent-login') {
            setErrorMessage('Untuk alasan keamanan, silakan Logout lalu Login kembali sebelum Anda dapat mengubah kata sandi.');
            setErrorPopupVisible(true);
            setIsLoading(false);
            return; // Jangan lanjutkan ke pop-up Sukses
          }
          throw error;
        }
      }

      setSuccessPopupVisible(true);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'Terjadi kesalahan saat menyimpan profil.');
      setErrorPopupVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setShowPassword(true);
    setShowConfirmPassword(true);
    setTimeout(() => {
      router.back();
    }, 50);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
          Edit Profil
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: 60 }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FadeInView delay={50}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={[{ width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, backgroundColor: '#DBEAFE', borderColor: '#DBEAFE' }, theme.shadows.md]}>
                <Ionicons name="person-outline" size={48} color="#3B82F6" />
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={100}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontFamily: theme.typography.fontFamilyMedium }]}>Username</Text>
              <View style={[styles.inputContainer, theme.shadows.sm, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="at-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: theme.typography.fontFamily, color: '#6B7280' }]}
                  value={profile?.username ? `@${profile.username}` : ''}
                  editable={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontFamily: theme.typography.fontFamilyMedium }]}>Nama Depan</Text>
              <View style={[styles.inputContainer, theme.shadows.sm]}>
                <Ionicons name="person-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: theme.typography.fontFamily }]}
                  placeholder="Masukkan nama depan"
                  placeholderTextColor={theme.colors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontFamily: theme.typography.fontFamilyMedium }]}>Nama Belakang (Opsional)</Text>
              <View style={[styles.inputContainer, theme.shadows.sm]}>
                <Ionicons name="person-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: theme.typography.fontFamily }]}
                  placeholder="Masukkan nama belakang"
                  placeholderTextColor={theme.colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontFamily: theme.typography.fontFamilyMedium }]}>Kata Sandi Baru</Text>
              <View style={[styles.inputContainer, theme.shadows.sm]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: theme.typography.fontFamily, flex: 1 }]}
                  placeholder="Biarkan kosong jika tak diubah"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4, marginLeft: 8 }}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color={theme.colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>Kekuatan Sandi:</Text>
                    <Text style={{ fontSize: 12, color: strength.color, fontFamily: theme.typography.fontFamilyBold }}>{strength.label}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                    <Animated.View style={{ height: '100%', backgroundColor: strength.color, width: widthInterpolate, borderRadius: 3 }} />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontFamily: theme.typography.fontFamilyMedium }]}>Konfirmasi Kata Sandi Baru</Text>
              <View style={[styles.inputContainer, theme.shadows.sm, password !== confirmPassword && confirmPassword.length > 0 ? { borderColor: '#EF4444' } : null]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: theme.typography.fontFamily, flex: 1 }]}
                  placeholder="Ketik ulang kata sandi baru"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ padding: 4, marginLeft: 8 }}
                >
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color={theme.colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
              {password !== confirmPassword && confirmPassword.length > 0 && (
                <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 6, marginLeft: 4, fontFamily: theme.typography.fontFamily }}>
                  *Kata sandi tidak cocok
                </Text>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.colors.primary }, theme.shadows.md]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[styles.saveButtonText, { fontFamily: theme.typography.fontFamilySemiBold }]}>Simpan Perubahan</Text>
              )}
            </TouchableOpacity>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Custom Modal */}
      <Modal
        visible={successPopupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSuccessPopupVisible(false);
          handleBack();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadows.lg]}>
            <View style={[styles.modalIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={36} color="#10B981" />
            </View>
            <Text style={[styles.modalTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Berhasil Disimpan!
            </Text>
            <Text style={[styles.modalMessage, { fontFamily: theme.typography.fontFamily }]}>
              Profil Anda telah sukses diperbarui.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: '#10B981', flex: 1 }]}
                onPress={() => {
                  setSuccessPopupVisible(false);
                  handleBack();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF', fontFamily: theme.typography.fontFamilySemiBold }]}>Mengerti</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Custom Modal */}
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
              Gagal Disimpan
            </Text>
            
            <Text style={[styles.modalMessage, { fontFamily: theme.typography.fontFamily }]}>
              {errorMessage}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: '#EF4444', flex: 1 }]}
                onPress={() => setErrorPopupVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF', fontFamily: theme.typography.fontFamilySemiBold }]}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#111827',
  },
  content: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
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
  saveButton: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
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
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  modalButtonConfirm: {
    backgroundColor: '#3B82F6',
  },
  modalButtonText: {
    fontSize: 15,
  },
});
