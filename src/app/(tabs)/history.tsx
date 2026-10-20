import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import FadeInView from '@/components/FadeInView';
import { useAuth, HistoryItem } from '@/context/AuthContext';
import Swipeable from 'react-native-gesture-handler/Swipeable';

type FilterType = 'all' | 'fact' | 'hoax' | 'partial';

export default function HistoryScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { history, deleteHistory } = useAuth();
  const router = useRouter();

  const [deletePopupVisible, setDeletePopupVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (itemToDelete) {
      await deleteHistory(itemToDelete);
    }
    setDeletePopupVisible(false);
    setItemToDelete(null);
  };

  // Sync activeFilter with URL parameter when it changes
  useEffect(() => {
    if (params.filter && typeof params.filter === 'string') {
      setActiveFilter(params.filter as FilterType);
    }
  }, [params.filter]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate network delay for UX since AuthContext is realtime
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const filteredData = useMemo(() => {
    if (activeFilter === 'all') return history;
    return history.filter(item => item.status === activeFilter);
  }, [activeFilter, history]);

  const getStatusConfig = (status: HistoryItem['status']) => {
    switch (status) {
      case 'hoax':
        return { label: 'Hoaks', color: theme.colors.danger, bgColor: theme.colors.dangerLight, icon: 'close-circle' as const };
      case 'fact':
        return { label: 'Fakta', color: theme.colors.success, bgColor: theme.colors.successLight, icon: 'checkmark-circle' as const };
      case 'partial':
        return { label: 'Keliru', color: theme.colors.warning, bgColor: theme.colors.warningLight, icon: 'alert-circle' as const };
      default:
        return { label: 'Unknown', color: theme.colors.textMuted, bgColor: '#F3F4F6', icon: 'help-circle' as const };
    }
  };

  const renderFilterButton = (label: string, filterValue: FilterType) => {
    const isActive = activeFilter === filterValue;
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          isActive ? [styles.filterButtonActive, { backgroundColor: theme.colors.primary }] : null,
        ]}
        activeOpacity={0.7}
        onPress={() => setActiveFilter(filterValue)}
      >
        <Text
          style={[
            styles.filterText,
            { fontFamily: isActive ? theme.typography.fontFamilySemiBold : theme.typography.fontFamily },
            isActive ? styles.filterTextActive : null,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, index }: { item: HistoryItem; index: number }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <FadeInView delay={index * 80}>
        <Swipeable
          renderRightActions={() => (
            <TouchableOpacity 
              style={{
                backgroundColor: '#EF4444',
                justifyContent: 'center',
                alignItems: 'center',
                width: 70,
                marginBottom: 12,
                borderRadius: 16,
                marginLeft: 8,
              }}
              onPress={() => {
                setItemToDelete(item.id);
                setDeletePopupVisible(true);
              }}
            >
              <Ionicons name="trash" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        >
          <TouchableOpacity 
            style={[styles.historyItem, theme.shadows.sm]} 
            activeOpacity={0.7}
            onPress={() => router.push(`/history/${item.id}`)}
          >
          <View style={[styles.statusIndicator, { backgroundColor: statusConfig.color }]} />
          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <Text
                style={[styles.itemTitle, { fontFamily: theme.typography.fontFamilyMedium }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                <Text
                  style={[
                    styles.statusText,
                    { fontFamily: theme.typography.fontFamilySemiBold, color: statusConfig.color },
                  ]}
                >
                  {statusConfig.label}
                </Text>
              </View>
            </View>
            <View style={styles.itemFooter}>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
                <Text style={[styles.dateText, { fontFamily: theme.typography.fontFamily }]}>
                  {item.date}
                </Text>
              </View>
              <View style={styles.confidenceRow}>
                <Text style={[styles.confidenceLabel, { fontFamily: theme.typography.fontFamily }]}>
                  Confidence:
                </Text>
                <Text
                  style={[
                    styles.confidenceValue,
                    {
                      fontFamily: theme.typography.fontFamilySemiBold,
                      color: item.confidence >= 80 ? theme.colors.success : item.confidence >= 60 ? theme.colors.warning : theme.colors.danger,
                    },
                  ]}
                >
                  {item.confidence}%
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        </Swipeable>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <FadeInView delay={100}>
          <Text style={[styles.headerTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
            Riwayat Deteksi 📋
          </Text>
        </FadeInView>

        {/* Filter Tabs */}
        <FadeInView delay={200}>
          <View style={styles.filterContainer}>
            {renderFilterButton('Semua', 'all')}
            {renderFilterButton('Fakta', 'fact')}
            {renderFilterButton('Hoaks', 'hoax')}
            {renderFilterButton('Keliru', 'partial')}
          </View>
        </FadeInView>
      </View>

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            <Text style={[styles.emptyText, { fontFamily: theme.typography.fontFamily }]}>
              Tidak ada data yang cocok.
            </Text>
          </View>
        )}
      />

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
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 26,
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
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
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    borderColor: 'transparent',
  },
  filterText: {
    fontSize: 14,
    color: '#4B5563',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#9CA3AF',
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statusIndicator: {
    width: 4,
  },
  itemContent: {
    flex: 1,
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  confidenceValue: {
    fontSize: 13,
  },
});
