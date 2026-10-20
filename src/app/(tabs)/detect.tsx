import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import FadeInView from '@/components/FadeInView';
import Constants from 'expo-constants';

type InputMode = 'text' | 'url';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

export default function DetectScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const autoPrompt = params.autoPrompt as string;
  const { addHistory } = useAuth();
  const router = useRouter();

  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');

  const urlParam = params.url as string;
  const textParam = params.text as string;

  useEffect(() => {
    if (autoPrompt) {
      const promptText = `Tolong verifikasi dan carikan hoaks terbaru seputar topik ${autoPrompt}.`;
      setInputValue(promptText);
      setInputMode('text');
      
      const timer = setTimeout(() => {
        handleAnalyze(autoPrompt);
      }, 800);
      return () => clearTimeout(timer);
    } else if (urlParam) {
      setInputValue(urlParam);
      setInputMode('url');
    } else if (textParam) {
      setInputValue(textParam);
      setInputMode('text');
    }
  }, [autoPrompt, urlParam, textParam]);

  const handleAnalyze = async (overrideText?: string) => {
    const textToAnalyze = typeof overrideText === 'string' ? overrideText : inputValue;
    if (!textToAnalyze.trim()) return;
    
    setIsAnalyzing(true);

    const steps = [
      'Memproses input...',
      'Mencari dokumen relevan...',
      'Menganalisis konteks...',
      'Menyusun kesimpulan AI...',
    ];

    for (let i = 0; i < steps.length; i++) {
      setAnalysisStep(steps[i]);
      // Small artificial delay for UI transition if the API is too fast
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    try {
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
      const API_URL = `http://${localIp}:8080`;
      
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToAnalyze, is_category: !!autoPrompt }),
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi server AI');
      }

      const result = await response.json();
      
      await addHistory({
        title: !!autoPrompt && result.title ? result.title : (textToAnalyze.substring(0, 60) + (textToAnalyze.length > 60 ? '...' : '')),
        originalText: !!autoPrompt && result.title ? result.title : textToAnalyze,
        status: result.status,
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: 'Baru saja',
        confidence: result.confidence,
        summary: result.reasoning,
        references: Array.isArray(result.references) ? result.references.slice(0, 3) : [],
        referenceUrl: result.referenceUrl || '',
        referenceTitle: result.referenceTitle || '',
        source: 'ai',
      });

      setIsAnalyzing(false);
      setAnalysisStep('');
      setInputValue('');
      router.push({ pathname: '/(tabs)/history', params: { filter: 'all' } });
      
    } catch (error) {
      console.error(error);
      setIsAnalyzing(false);
      setAnalysisStep('');
      Alert.alert(
        'Gagal Menganalisis',
        'Pastikan server backend Python (FastAPI) Anda sudah menyala di port 8080.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <FadeInView delay={100}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
              Deteksi Berita 🔍
            </Text>
            <Text style={[styles.headerSubtitle, { fontFamily: theme.typography.fontFamily }]}>
              Verifikasi kebenaran berita menggunakan AI
            </Text>
          </View>
        </FadeInView>

        {/* Segmented Control */}
        <FadeInView delay={200}>
          <View style={[styles.segmentedControl, theme.shadows.sm]}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                inputMode === 'text' && styles.segmentButtonActive,
              ]}
              activeOpacity={0.7}
              onPress={() => setInputMode('text')}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={inputMode === 'text' ? '#FFFFFF' : theme.colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    fontFamily: theme.typography.fontFamilySemiBold,
                    color: inputMode === 'text' ? '#FFFFFF' : theme.colors.textSecondary,
                  },
                ]}
              >
                Teks Berita
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                inputMode === 'url' && styles.segmentButtonActive,
              ]}
              activeOpacity={0.7}
              onPress={() => setInputMode('url')}
            >
              <Ionicons
                name="link-outline"
                size={18}
                color={inputMode === 'url' ? '#FFFFFF' : theme.colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    fontFamily: theme.typography.fontFamilySemiBold,
                    color: inputMode === 'url' ? '#FFFFFF' : theme.colors.textSecondary,
                  },
                ]}
              >
                Tautan URL
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* Input Area */}
        <FadeInView delay={300}>
          <View style={[styles.inputCard, theme.shadows.md]}>
            <Text style={[styles.inputLabel, { fontFamily: theme.typography.fontFamilyMedium }]}>
              {inputMode === 'text' ? 'Masukkan Teks Berita' : 'Masukkan URL Berita'}
            </Text>
            <View
              style={[
                styles.textInputContainer,
                isFocused && styles.textInputContainerFocused,
              ]}
            >
              <TextInput
                style={[
                  styles.textInput,
                  {
                    fontFamily: theme.typography.fontFamily,
                    height: inputMode === 'text' ? 160 : 52,
                    textAlignVertical: inputMode === 'text' ? 'top' : 'center',
                  },
                ]}
                placeholder={
                  inputMode === 'text'
                    ? 'Tempelkan atau ketik teks berita yang ingin diverifikasi...'
                    : 'https://contoh.com/artikel-berita'
                }
                placeholderTextColor={theme.colors.textMuted}
                value={inputValue}
                onChangeText={setInputValue}
                multiline={inputMode === 'text'}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCapitalize="none"
              />
            </View>

            {inputValue.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setInputValue('')}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                <Text style={[styles.clearText, { fontFamily: theme.typography.fontFamily }]}>
                  Hapus
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </FadeInView>

        {/* Analyze Button */}
        <FadeInView delay={400}>
          <TouchableOpacity
            style={[styles.analyzeButton, !inputValue.trim() && styles.analyzeButtonDisabled]}
            activeOpacity={0.85}
            onPress={() => handleAnalyze()}
            disabled={isAnalyzing || !inputValue.trim()}
          >
            <LinearGradient
              colors={!inputValue.trim() ? ['#93C5FD', '#93C5FD'] : ['#1D4ED8', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.analyzeButtonGradient}
            >
              {isAnalyzing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={[styles.loadingText, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                    {analysisStep}
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name="sparkles" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
                  <Text style={[styles.analyzeButtonText, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                    Analisis Berita
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </FadeInView>

        {/* RAG Info */}
        <FadeInView delay={500}>
          <View style={[styles.ragInfo, theme.shadows.sm]}>
            <View style={styles.ragInfoHeader}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.ragInfoTitle, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                Cara Kerja Analisis
              </Text>
            </View>
            <View style={styles.ragSteps}>
              {[
                { step: '1', label: 'Retrieval', desc: 'Mencari dokumen fakta yang relevan' },
                { step: '2', label: 'Augmented', desc: 'Menambahkan konteks dari database' },
                { step: '3', label: 'Generation', desc: 'AI menganalisis dan menyimpulkan' },
              ].map((item, index) => (
                <View key={index} style={styles.ragStep}>
                  <View style={styles.ragStepNumber}>
                    <Text style={[styles.ragStepNumberText, { fontFamily: theme.typography.fontFamilyBold }]}>
                      {item.step}
                    </Text>
                  </View>
                  <View style={styles.ragStepContent}>
                    <Text style={[styles.ragStepLabel, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.ragStepDesc, { fontFamily: theme.typography.fontFamily }]}>
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
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
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 26,
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 11,
  },
  segmentButtonActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 12,
  },
  textInputContainer: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  textInputContainerFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  textInput: {
    fontSize: 15,
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  clearText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  analyzeButton: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  analyzeButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  ragInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
  },
  ragInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ragInfoTitle: {
    fontSize: 15,
    color: '#111827',
    marginLeft: 8,
  },
  ragSteps: {
    gap: 14,
  },
  ragStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ragStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ragStepNumberText: {
    fontSize: 13,
    color: '#3B82F6',
  },
  ragStepContent: {
    flex: 1,
  },
  ragStepLabel: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 2,
  },
  ragStepDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
});
