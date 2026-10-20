import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import FadeInView from '@/components/FadeInView';

export default function PrivacyScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
          Privasi & Keamanan
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView delay={100}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={[{ width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, backgroundColor: '#D1FAE5', borderColor: '#D1FAE5' }, theme.shadows.md]}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#10B981" />
            </View>
          </View>
          <Text style={[styles.title, { fontFamily: theme.typography.fontFamilyBold }]}>
            Komitmen Kami
          </Text>
          <Text style={[styles.description, { fontFamily: theme.typography.fontFamily }]}>
            Kami percaya bahwa privasi adalah hak Anda. HoaxBuster mengedepankan keamanan data dan transparansi penuh kepada penggunanya.
          </Text>
        </FadeInView>

        <FadeInView delay={200}>
          <View style={styles.policyCard}>
            <Ionicons name="lock-closed" size={24} color="#3B82F6" style={styles.policyIcon} />
            <Text style={[styles.policyTitle, { fontFamily: theme.typography.fontFamilyBold }]}>Enkripsi Data</Text>
            <Text style={[styles.policyDesc, { fontFamily: theme.typography.fontFamily }]}>
              Seluruh data riwayat pencarian dan teks yang Anda input dilindungi dengan enkripsi tingkat lanjut (*end-to-end*) selama transmisi jaringan.
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={300}>
          <View style={styles.policyCard}>
            <Ionicons name="eye-off" size={24} color="#F59E0B" style={styles.policyIcon} />
            <Text style={[styles.policyTitle, { fontFamily: theme.typography.fontFamilyBold }]}>Tanpa Pelacakan Iklan</Text>
            <Text style={[styles.policyDesc, { fontFamily: theme.typography.fontFamily }]}>
              Aplikasi ini tidak membagikan, menjual, atau menyewakan informasi pribadi maupun riwayat pengecekan Anda kepada pihak ketiga atau pengiklan.
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={400}>
          <View style={styles.policyCard}>
            <Ionicons name="server" size={24} color="#8B5CF6" style={styles.policyIcon} />
            <Text style={[styles.policyTitle, { fontFamily: theme.typography.fontFamilyBold }]}>Penyimpanan Terbatas</Text>
            <Text style={[styles.policyDesc, { fontFamily: theme.typography.fontFamily }]}>
              Kami hanya menyimpan data yang mutlak diperlukan untuk memastikan fitur riwayat berjalan dengan baik. Anda berhak menghapus akun beserta datanya kapan saja.
            </Text>
          </View>
        </FadeInView>
      </ScrollView>
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
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  policyCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  policyIcon: {
    marginBottom: 12,
  },
  policyTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  policyDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
});
