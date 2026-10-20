import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import FadeInView from '@/components/FadeInView';
import { LinearGradient } from 'expo-linear-gradient';

export default function AboutScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
          Tentang Aplikasi
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={100}>
          <View style={styles.logoSection}>
            <View style={[styles.logoContainer, theme.shadows.md, { backgroundColor: '#FEF3C7', borderColor: '#FEF3C7' }]}>
              <Ionicons name="information-circle-outline" size={48} color="#F59E0B" />
            </View>
            <Text style={[styles.appName, { fontFamily: theme.typography.fontFamilyBold }]}>
              HoaxBuster
            </Text>
            <Text style={[styles.appVersion, { fontFamily: theme.typography.fontFamily }]}>
              Versi 1.0.0
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={200}>
          <View style={[styles.card, theme.shadows.sm]}>
            <Text style={[styles.cardTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Visi Kami
            </Text>
            <Text style={[styles.cardText, { fontFamily: theme.typography.fontFamily }]}>
              Di era digital saat ini, informasi menyebar dengan sangat cepat. HoaxBuster hadir dengan visi untuk menciptakan ekosistem internet yang lebih sehat, akurat, dan bebas dari informasi palsu (hoaks). Kami percaya bahwa akses terhadap kebenaran adalah hak setiap pengguna internet.
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={300}>
          <View style={[styles.card, theme.shadows.sm]}>
            <Text style={[styles.cardTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Teknologi AI & RAG
            </Text>
            <Text style={[styles.cardText, { fontFamily: theme.typography.fontFamily }]}>
              HoaxBuster menggunakan teknologi mutakhir Retrieval-Augmented Generation (RAG) yang menggabungkan kemampuan kecerdasan buatan (AI) dengan basis data fakta terkini. Sistem ini tidak hanya menebak informasi, melainkan mencari referensi tepercaya sebelum memberikan kesimpulan analisis.
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={500}>
          <Text style={[styles.footerText, { fontFamily: theme.typography.fontFamily }]}>
            © 2026 KawanDigital.id. Semua hak dilindungi undang-undang.
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    color: '#111827',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  appName: {
    fontSize: 24,
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  appVersion: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 20,
  },
});
