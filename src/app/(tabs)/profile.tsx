import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import FadeInView from '@/components/FadeInView';
import * as ImagePicker from 'expo-image-picker';
// Removed firebase/storage imports to bypass storage errors

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  delay: number;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  iconColor,
  iconBg,
  label,
  onPress,
  isDestructive,
  delay,
}) => {
  const theme = useTheme();

  return (
    <FadeInView delay={delay}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <View style={[styles.menuIconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text
          style={[
            styles.menuLabel,
            {
              fontFamily: theme.typography.fontFamilyMedium,
              color: isDestructive ? '#EF4444' : '#111827',
            },
          ]}
        >
          {label}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDestructive ? '#EF4444' : '#D1D5DB'}
        />
      </TouchableOpacity>
    </FadeInView>
  );
};

import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, logout, history, user, updateProfileData } = useAuth();
  const [logoutPopupVisible, setLogoutPopupVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate network delay for UX since AuthContext is realtime
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Izin ditolak', 'Anda harus memberikan izin akses galeri untuk mengganti foto profil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Terjadi kesalahan saat memilih foto.');
    }
  };

  const uploadImage = async (base64String: string | null | undefined) => {
    if (!user || !base64String) return;
    setIsUploading(true);
    try {
      // Bypassing Firebase Storage completely to avoid 'storage/unknown' 
      // and 'ArrayBuffer' errors in React Native.
      // We save the image directly as a base64 Data URI in the Realtime Database.
      const photoURL = `data:image/jpeg;base64,${base64String}`;
      
      await updateProfileData({ photoURL });
      
      Alert.alert('Sukses', 'Foto profil berhasil diperbarui!');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan foto profil.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    setLogoutPopupVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutPopupVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            progressViewOffset={60}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <FadeInView delay={100}>
            <Text style={[styles.headerTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Profil Saya
            </Text>
          </FadeInView>
        </View>

        {/* Profile Card */}
        <FadeInView delay={200}>
          <View style={[styles.profileCard, theme.shadows.md]}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { overflow: 'hidden' }]}>
                {isUploading ? (
                  <ActivityIndicator size="large" color="#3B82F6" />
                ) : profile?.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={{ width: 80, height: 80 }} />
                ) : (
                  <Ionicons name="person" size={36} color="#3B82F6" />
                )}
              </View>
              <TouchableOpacity 
                style={styles.editAvatarButton} 
                activeOpacity={0.7}
                onPress={handlePickImage}
                disabled={isUploading}
              >
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.profileName, { fontFamily: theme.typography.fontFamilyBold }]}>
              {profile ? profile.name : 'Loading...'}
            </Text>
            <Text style={[styles.profileUsername, { fontFamily: theme.typography.fontFamily }]}>
              {profile ? `@${profile.username}` : ''}
            </Text>
            <View style={styles.profileStats}>
              <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => router.push({ pathname: '/(tabs)/history', params: { filter: 'all' } })}>
                <Text style={[styles.statNumber, { fontFamily: theme.typography.fontFamilyBold }]}>
                  {history.length}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: theme.typography.fontFamily }]}>
                  Dicek
                </Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => router.push({ pathname: '/(tabs)/history', params: { filter: 'fact' } })}>
                <Text style={[styles.statNumber, { fontFamily: theme.typography.fontFamilyBold }]}>
                  {history.filter(item => item.status === 'fact').length}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: theme.typography.fontFamily }]}>
                  Fakta
                </Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => router.push({ pathname: '/(tabs)/history', params: { filter: 'hoax' } })}>
                <Text style={[styles.statNumber, { fontFamily: theme.typography.fontFamilyBold }]}>
                  {history.filter(item => item.status === 'hoax').length}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: theme.typography.fontFamily }]}>
                  Hoaks
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeInView>

        {/* Menu Section */}
        <FadeInView delay={300}>
          <Text style={[styles.sectionTitle, { fontFamily: theme.typography.fontFamilySemiBold }]}>
            Pengaturan
          </Text>
        </FadeInView>

        <View style={[styles.menuCard, theme.shadows.sm]}>
          <MenuItem
            icon="person-outline"
            iconColor="#3B82F6"
            iconBg="#DBEAFE"
            label="Edit Profil"
            onPress={() => router.push('/settings/edit-profile')}
            delay={350}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="sparkles-outline"
            iconColor="#8B5CF6"
            iconBg="#EDE9FE"
            label="Cara Kerja RAG"
            onPress={() => router.push('/settings/how-it-works')}
            delay={400}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="shield-checkmark-outline"
            iconColor="#10B981"
            iconBg="#D1FAE5"
            label="Privasi & Keamanan"
            onPress={() => router.push('/settings/privacy')}
            delay={450}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="information-circle-outline"
            iconColor="#F59E0B"
            iconBg="#FEF3C7"
            label="Tentang Aplikasi"
            onPress={() => router.push('/settings/about')}
            delay={475}
          />
        </View>

        {/* Logout */}
        <View style={[styles.menuCard, theme.shadows.sm, { marginTop: 16 }]}>
          <MenuItem
            icon="log-out-outline"
            iconColor="#EF4444"
            iconBg="#FEE2E2"
            label="Keluar"
            onPress={handleLogout}
            isDestructive
            delay={500}
          />
        </View>

        {/* App Version */}
        <FadeInView delay={550}>
          <Text style={[styles.versionText, { fontFamily: theme.typography.fontFamily }]}>
            HoaxBuster v1.0.0
          </Text>
        </FadeInView>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutPopupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutPopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadows.lg]}>
            <View style={[styles.modalIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Keluar Akun?
            </Text>
            <Text style={[styles.modalMessage, { fontFamily: theme.typography.fontFamily }]}>
              Apakah Anda yakin ingin keluar dari aplikasi HoaxBuster?
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setLogoutPopupVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: '#4B5563', fontFamily: theme.typography.fontFamilySemiBold }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: '#EF4444' }]}
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF', fontFamily: theme.typography.fontFamilySemiBold }]}>Keluar</Text>
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
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F5F7FA', // Match container background
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 26,
    color: '#111827',
    letterSpacing: -0.3,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 20,
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    color: '#111827',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  profileUsername: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
    marginHorizontal: 24,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 72,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 24,
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
    width: '100%',
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
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonConfirm: {
    backgroundColor: '#EF4444',
  },
  modalButtonText: {
    fontSize: 15,
  },
});
