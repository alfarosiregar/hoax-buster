import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import * as WebBrowser from 'expo-web-browser';
import FadeInView from '@/components/FadeInView';
import { useAuth, HistoryItem } from '@/context/AuthContext';

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { history, isLoading, deleteHistory } = useAuth();
  const [item, setItem] = useState<HistoryItem | null>(null);

  const handleOpenLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: theme.colors.primary,
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch (err) {
      console.error('Gagal membuka browser in-app:', err);
      Linking.openURL(url).catch(console.error);
    }
  };

  const [deletePopupVisible, setDeletePopupVisible] = useState(false);

  const confirmDelete = async () => {
    if (id && typeof id === 'string') {
      await deleteHistory(id);
      router.back();
    }
  };

  const handleDelete = () => {
    setDeletePopupVisible(true);
  };

  useEffect(() => {
    if (!isLoading && id) {
      const found = history.find(h => h.id === id);
      setItem(found || null);
    }
  }, [id, history, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#F5F7FA' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#F5F7FA' }]}>
        <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
        <Text style={[styles.notFoundText, { fontFamily: theme.typography.fontFamily }]}>Data riwayat tidak ditemukan.</Text>
        <TouchableOpacity style={[styles.backButtonLarge, { backgroundColor: theme.colors.primary }]} onPress={() => router.back()}>
          <Text style={[styles.backButtonLargeText, { fontFamily: theme.typography.fontFamilySemiBold }]}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusConfig = (status: HistoryItem['status']) => {
    switch (status) {
      case 'hoax':
        return { label: 'Hoaks', color: theme.colors.danger, bgColor: theme.colors.dangerLight, icon: 'close-circle' as const };
      case 'fact':
        return { label: 'Fakta', color: theme.colors.success, bgColor: theme.colors.successLight, icon: 'checkmark-circle' as const };
      case 'partial':
        return { label: 'Keliru', color: theme.colors.warning, bgColor: theme.colors.warningLight, icon: 'alert-circle' as const };
      default:
        return { label: 'Tidak Diketahui', color: theme.colors.textMuted, bgColor: '#F3F4F6', icon: 'help-circle' as const };
    }
  };

  const statusConfig = getStatusConfig(item.status);

  const formattedDateTime = (() => {
    if (item.timestamp) {
      const d = new Date(item.timestamp);
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      
      const pad = (num: number) => num.toString().padStart(2, '0');
      const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      
      return `${dateStr} • ${timeStr}`;
    }
    return `${item.date} ${item.time ? `• ${item.time}` : ''}`;
  })();

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
          Detail Analisis
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { width: 40, alignItems: 'center' }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {item.source === 'komdigi' && (
          <FadeInView delay={50}>
            <View style={{ backgroundColor: '#DBEAFE', padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={24} color="#2563EB" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: theme.typography.fontFamilySemiBold, color: '#1E3A8A', fontSize: 14 }}>
                  Data Resmi Kementerian Komdigi RI
                </Text>
                <Text style={{ fontFamily: theme.typography.fontFamily, color: '#1E3A8A', fontSize: 12, marginTop: 2 }}>
                  Informasi ini ditarik langsung berdasarkan arsip hoaks yang dibantah oleh Kominfo/Komdigi.
                </Text>
              </View>
            </View>
          </FadeInView>
        )}

        {/* Status Badge */}
        <FadeInView delay={100}>
          <View style={[styles.statusContainer, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.icon} size={48} color={statusConfig.color} style={styles.statusIcon} />
            <Text style={[styles.statusText, { fontFamily: theme.typography.fontFamilyBold, color: statusConfig.color }]}>
              {statusConfig.label.toUpperCase()}
            </Text>
            <Text style={[styles.confidenceText, { fontFamily: theme.typography.fontFamily }]}>
              Tingkat Kepercayaan AI: <Text style={{ fontFamily: theme.typography.fontFamilyBold }}>{item.confidence}%</Text>
            </Text>
          </View>
        </FadeInView>

        {/* Klaim Asli */}
        <FadeInView delay={200}>
          <View style={[styles.card, theme.shadows.sm]}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
                {item.source === 'komdigi' ? 'Topik Hoaks Beredar' : 'Klaim Beredar'}
              </Text>
            </View>
            <Text style={[styles.claimText, { fontFamily: theme.typography.fontFamilyMedium }]}>
              "{item.originalText || item.title}"
            </Text>
          </View>
        </FadeInView>

        {/* Ringkasan Kesimpulan */}
        <FadeInView delay={300}>
          <View style={[styles.card, theme.shadows.sm]}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
                {item.source === 'komdigi' ? 'Klarifikasi & Fakta' : 'Kesimpulan Fakta'}
              </Text>
            </View>
            <Text style={[styles.summaryText, { fontFamily: theme.typography.fontFamily }]}>
              {item.summary || "Berdasarkan analisis silang dengan basis data tepercaya, informasi yang disampaikan dalam klaim tersebut mengandung unsur ketidaktepatan data dan telah dimanipulasi dari konteks aslinya."}
            </Text>
          </View>
        </FadeInView>

        {/* Referensi */}
        <FadeInView delay={400}>
          <View style={[styles.card, theme.shadows.sm]}>
            <View style={styles.cardHeader}>
              <Ionicons name="link-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { fontFamily: theme.typography.fontFamilyBold }]}>Sumber Referensi</Text>
            </View>
            {item.references && item.references.length > 0 ? (
              <>
                {item.references.slice(0, 3).map((ref, index) => {
                  const iconColor = item.status === 'hoax' ? theme.colors.danger 
                    : item.status === 'fact' ? theme.colors.success 
                    : theme.colors.warning;
                  const iconBg = item.status === 'hoax' ? '#FEE2E2' 
                    : item.status === 'fact' ? '#DCFCE7' 
                    : '#FEF3C7';

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.linkContainer,
                        index < item.references!.length - 1 && index < 2 ? { marginBottom: 10 } : {}
                      ]}
                      activeOpacity={0.7}
                      onPress={() => ref.url ? handleOpenLink(ref.url) : null}
                    >
                      <View style={[styles.linkIconBox, { backgroundColor: iconBg }]}>
                        <Ionicons
                          name="globe-outline"
                          size={22}
                          color={iconColor}
                        />
                      </View>
                      <View style={styles.linkInfo}>
                        <Text style={[styles.linkTitle, { fontFamily: theme.typography.fontFamilyMedium }]} numberOfLines={2}>
                          {ref.title || 'Baca artikel selengkapnya'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text style={[styles.linkUrl, { fontFamily: theme.typography.fontFamily, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                            {ref.url}
                          </Text>
                          {ref.source_api && (
                            <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, color: '#1D4ED8', fontFamily: theme.typography.fontFamilyBold, textTransform: 'uppercase' }}>
                                {ref.source_api.includes('Tavily') ? 'Travily' : ref.source_api.includes('Google') ? 'GFC' : 'WEB'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Ionicons name="open-outline" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : item.referenceUrl ? (
              <TouchableOpacity
                style={styles.linkContainer}
                activeOpacity={0.7}
                onPress={() => handleOpenLink(item.referenceUrl || '')}
              >
                <View style={[styles.linkIconBox, { 
                  backgroundColor: item.status === 'hoax' ? '#FEE2E2' : item.status === 'fact' ? '#DCFCE7' : '#FEF3C7' 
                }]}>
                  <Ionicons 
                    name="globe-outline" 
                    size={24} 
                    color={item.status === 'hoax' ? theme.colors.danger : item.status === 'fact' ? theme.colors.success : theme.colors.warning} 
                  />
                </View>
                <View style={styles.linkInfo}>
                  <Text style={[styles.linkTitle, { fontFamily: theme.typography.fontFamilyMedium }]} numberOfLines={2}>
                    {item.referenceTitle || 'Baca artikel selengkapnya'}
                  </Text>
                  <Text style={[styles.linkUrl, { fontFamily: theme.typography.fontFamily }]} numberOfLines={1}>
                    {item.referenceUrl}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.noReferenceContainer}>
                <Text style={[styles.noReferenceText, { fontFamily: theme.typography.fontFamily }]}>
                  Pengecekan ini didasarkan pada model AI umum dan belum ada referensi berita spesifik yang ditautkan untuk item riwayat ini.
                </Text>
              </View>
            )}
          </View>
        </FadeInView>

        {/* Waktu Pengecekan */}
        <FadeInView delay={500}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={16} color="#9CA3AF" />
            <Text style={[styles.timeText, { fontFamily: theme.typography.fontFamily }]}>
              Dianalisis pada {formattedDateTime}
            </Text>
          </View>
        </FadeInView>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deletePopupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeletePopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadows.lg]}>
            <View style={[styles.modalIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Hapus Riwayat?
            </Text>
            <Text style={[styles.modalMessage, { fontFamily: theme.typography.fontFamily }]}>
              Apakah Anda yakin ingin menghapus data analisis ini?
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setDeletePopupVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: '#4B5563', fontFamily: theme.typography.fontFamilySemiBold }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: '#EF4444' }]}
                onPress={confirmDelete}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF', fontFamily: theme.typography.fontFamilySemiBold }]}>Hapus</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 24,
  },
  backButtonLarge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    padding: 20,
    paddingBottom: 60,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusIcon: {
    marginBottom: 8,
  },
  statusText: {
    fontSize: 24,
    letterSpacing: 1,
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 14,
    color: '#4B5563',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    color: '#111827',
  },
  claimText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  linkIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkInfo: {
    flex: 1,
    marginRight: 8,
  },
  linkTitle: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 12,
    color: '#6B7280',
  },
  noReferenceContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  noReferenceText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  timeText: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Modal Styles
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
