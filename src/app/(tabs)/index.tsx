import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Linking, ActivityIndicator, RefreshControl, Animated, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/context/ThemeContext';
import FadeInView from '@/components/FadeInView';
import NewsImage from '@/components/NewsImage';
import { useAuth } from '@/context/AuthContext';
import Swipeable from 'react-native-gesture-handler/Swipeable';

const CATEGORIES = [
  { id: '1', name: 'Kesehatan', icon: 'medkit-outline', color: '#10B981' },
  { id: '2', name: 'Politik', icon: 'business-outline', color: '#3B82F6' },
  { id: '3', name: 'Penipuan', icon: 'warning-outline', color: '#F59E0B' },
  { id: '4', name: 'Bencana', icon: 'thunderstorm-outline', color: '#EF4444' },
];

const HoaxTicker = ({ data, theme }: { data: string[], theme: any }) => {
  const [index, setIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  useEffect(() => {
    if (data.length <= 1) return;
    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setIndex((prev) => (prev + 1) % data.length);
        translateY.setValue(20);
        
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [data.length]);

  if (!data || data.length === 0) return null;

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/(tabs)/info', params: { category: 'Hoax' } })}
    >
      <Animated.Text 
        numberOfLines={1}
        style={{ 
          fontFamily: theme.typography.fontFamily,
          color: '#4B5563',
          fontSize: 13,
          opacity, 
          transform: [{ translateY }] 
        }}
      >
        <Text style={{ fontFamily: theme.typography.fontFamilyBold, color: '#111827' }}>HoaxBuster: </Text>
        {data[index]}
      </Animated.Text>
    </TouchableOpacity>
  );
};

interface NewsArticle {
  id: string;
  source: { name: string };
  title: string;
  description: string;
  urlToImage: string;
  url: string;
  publishedAt: string;
}

const LITERACY_TIPS = [
  "Selalu waspada jika judul berita terlalu provokatif atau memancing emosi berlebih.",
  "Periksa sumber berita. Pastikan berasal dari media atau institusi resmi yang terpercaya.",
  "Cek keaslian foto atau video menggunakan fitur pencarian gambar terbalik (Reverse Image Search).",
  "Perhatikan alamat situs (URL). Situs hoaks seringkali meniru nama media besar dengan URL yang sedikit diubah.",
  "Cari perbandingan berita dari beberapa media arus utama. Jangan hanya percaya pada satu sumber.",
  "Saring sebelum sharing. Jika ragu dengan kebenaran suatu informasi, lebih baik jangan disebarkan."
];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { history, profile, deleteHistory } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const totalCount = history.length;
  const faktaCount = history.filter(item => item.status === 'fact').length;
  const hoaksCount = history.filter(item => item.status === 'hoax').length;

  const [deletePopupVisible, setDeletePopupVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (itemToDelete) {
      await deleteHistory(itemToDelete);
    }
    setDeletePopupVisible(false);
    setItemToDelete(null);
  };
  
  const handleOpenNews = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: theme.colors.primary,
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch (error) {
      console.error('Terjadi kesalahan saat membuka browser in-app:', error);
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        }
      } catch (fallbackErr) {
        console.error('Fallback browser gagal:', fallbackErr);
      }
    }
  };

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [trendingNews, setTrendingNews] = useState<NewsArticle[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchTrending = async (isRefreshing = false) => {
    if (!isRefreshing) setIsTrendingLoading(true);
    try {
      const newsDataKey = process.env.EXPO_PUBLIC_NEWSDATA_API_KEY;
      const gnewsKey = process.env.EXPO_PUBLIC_GNEWS_API_KEY;

      if (!newsDataKey && !gnewsKey) {
        setIsTrendingLoading(false);
        return;
      }

      // PRIMARY: GNews
      try {
        if (!gnewsKey) throw new Error('NO_GNEWS_KEY');
        const response = await fetch(`https://gnews.io/api/v4/search?q=hoaks&country=id&max=10&apikey=${gnewsKey}`);
        if (!response.ok) throw new Error('GNEWS_LIMIT');
        const data = await response.json();
        
        if (data.articles) {
          const formatted = data.articles.map((item: any, index: number) => ({
            id: `trend_${index}_${new Date().getTime()}`,
            source: { name: item.source.name },
            title: item.title,
            description: item.description,
            urlToImage: item.image 
              ? item.image.replace(/^http:\/\//i, 'https://')
              : 'https://picsum.photos/400/200?blur=2',
            url: item.url,
            publishedAt: new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          }));
          setTrendingNews(formatted);
          return; // Berhasil, langsung return
        }
      } catch (err) {
        console.log('GNews limit/error di Beranda, beralih ke NewsData...');
        
        // FALLBACK: NewsData.io
        if (!newsDataKey) throw new Error('NO_NEWSDATA_KEY');
        const ndResponse = await fetch(`https://newsdata.io/api/1/news?apikey=${newsDataKey}&country=id&category=top`);
        if (ndResponse.ok) {
          const ndData = await ndResponse.json();
          if (ndData.status !== 'error' && ndData.results) {
            const formatted = ndData.results.slice(0, 10).map((item: any, index: number) => ({
              id: item.article_id || `trend_${index}_${new Date().getTime()}`,
              source: { name: item.source_id || 'NewsData' },
              title: item.title,
              description: item.description,
              urlToImage: item.image_url 
                ? item.image_url.replace(/^http:\/\//i, 'https://')
                : 'https://picsum.photos/400/200?blur=2',
              url: item.link,
              publishedAt: new Date(item.pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            }));
            setTrendingNews(formatted);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching trending:', err);
    } finally {
      if (!isRefreshing) setIsTrendingLoading(false);
    }
  };

  const [latestHoaxes, setLatestHoaxes] = useState<string[]>(['Memuat data terbaru...']);
  const [hoaxArticles, setHoaxArticles] = useState<NewsArticle[]>([]);
  const [isHoaxLoading, setIsHoaxLoading] = useState(true);

  const fetchLatestHoax = async (isRefreshing = false) => {
    if (!isRefreshing) setIsHoaxLoading(true);
    try {
      let articles: NewsArticle[] = [];

      // 1. Coba ambil melalui server Backend Python jika sedang berjalan
      try {
        const debuggerHost = Constants.expoConfig?.hostUri;
        const localIp = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
        const API_URL = `http://${localIp}:8080`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const response = await fetch(`${API_URL}/trending-hoaxes?query=indonesia`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.articles && data.articles.length > 0) {
            articles = data.articles;
          }
        }
      } catch (backendErr) {
        // Lanjut ke fallback langsung jika server backend lokal tidak aktif / APK standalone
      }

      // 2. Fallback Langsung ke Google Fact Check Tools API
      if (articles.length === 0) {
        const factCheckKey = process.env.EXPO_PUBLIC_GOOGLE_FACT_CHECK_API_KEY;
        if (factCheckKey) {
          try {
            const fcUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=indonesia&languageCode=id&key=${factCheckKey}`;
            const fcRes = await fetch(fcUrl);
            if (fcRes.ok) {
              const fcData = await fcRes.json();
              const claims = fcData.claims || [];
              const formatted: NewsArticle[] = [];
              claims.slice(0, 20).forEach((claim: any, i: number) => {
                const reviews = claim.claimReview || [];
                if (reviews.length === 0) return;
                const review = reviews[0];
                const title = review.title || claim.text;
                const publisher = review.publisher?.name || 'CekFakta';
                const url = review.url || '';
                const rating = review.textualRating || 'Salah';
                const rawDate = claim.claimDate || review.reviewDate || '';
                const formattedDate = rawDate
                  ? new Date(rawDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Terbaru';

                formatted.push({
                  id: `hoax_fc_${i}`,
                  source: { name: publisher },
                  title,
                  description: `Klaim Beredar: ${claim.text} - Rating: ${rating}`,
                  urlToImage: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=600&auto=format&fit=crop',
                  url,
                  publishedAt: formattedDate,
                });
              });
              articles = formatted;
            }
          } catch (fcErr) {
            console.log('Fallback Google Fact Check gagal:', fcErr);
          }
        }
      }

      // 3. Fallback ke GNews / NewsData dengan kata kunci "hoaks" atau "cek fakta"
      if (articles.length === 0) {
        const gnewsKey = process.env.EXPO_PUBLIC_GNEWS_API_KEY;
        const newsDataKey = process.env.EXPO_PUBLIC_NEWSDATA_API_KEY;
        if (gnewsKey) {
          try {
            const gnRes = await fetch(`https://gnews.io/api/v4/search?q=cek+fakta+hoaks&country=id&max=10&apikey=${gnewsKey}`);
            if (gnRes.ok) {
              const gnData = await gnRes.json();
              if (gnData.articles && gnData.articles.length > 0) {
                articles = gnData.articles.map((item: any, idx: number) => ({
                  id: `hoax_gn_${idx}`,
                  source: { name: item.source?.name || 'CekFakta' },
                  title: item.title,
                  description: item.description || item.title,
                  urlToImage: item.image
                    ? item.image.replace(/^http:\/\//i, 'https://')
                    : 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=600&auto=format&fit=crop',
                  url: item.url,
                  publishedAt: new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                }));
              }
            }
          } catch (gnErr) {
            console.log('Fallback GNews Hoax gagal:', gnErr);
          }
        }

        if (articles.length === 0 && newsDataKey) {
          try {
            const ndRes = await fetch(`https://newsdata.io/api/1/news?apikey=${newsDataKey}&country=id&q=hoaks`);
            if (ndRes.ok) {
              const ndData = await ndRes.json();
              if (ndData.results && ndData.results.length > 0) {
                articles = ndData.results.slice(0, 10).map((item: any, idx: number) => ({
                  id: item.article_id || `hoax_nd_${idx}`,
                  source: { name: item.source_id || 'CekFakta' },
                  title: item.title,
                  description: item.description || item.title,
                  urlToImage: item.image_url
                    ? item.image_url.replace(/^http:\/\//i, 'https://')
                    : 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=600&auto=format&fit=crop',
                  url: item.link,
                  publishedAt: new Date(item.pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                }));
              }
            }
          } catch (ndErr) {
            console.log('Fallback NewsData Hoax gagal:', ndErr);
          }
        }
      }

      // 4. Fallback Kurasi Komdigi / MAFINDO jika semua kuota API habis atau offline
      if (articles.length === 0) {
        articles = [
          {
            id: 'hoax_curated_1',
            source: { name: 'TurnBackHoax MAFINDO' },
            title: '[SALAH] Tautan Pendaftaran Bantuan Sosial Tunai Mengatasnamakan Kementerian Sosial',
            description: 'Klaim Beredar: Beredar tautan di WhatsApp yang menjanjikan pencairan bansos instan dengan mengisi data pribadi - Rating: Salah / Phishing',
            urlToImage: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=600&auto=format&fit=crop',
            url: 'https://turnbackhoax.id/',
            publishedAt: 'Terbaru',
          },
          {
            id: 'hoax_curated_2',
            source: { name: 'Komdigi RI' },
            title: '[HOAKS] Undangan File APK Berkedok Surat Tilang Elektronik (ETLE) & Kurir Paket',
            description: 'Klaim Beredar: Pesan WhatsApp berisi file berformat .APK dengan dalih resi pengiriman atau surat tilang kepolisian - Rating: Hoaks / Malware',
            urlToImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=600&auto=format&fit=crop',
            url: 'https://www.komdigi.go.id/',
            publishedAt: 'Terbaru',
          },
          {
            id: 'hoax_curated_3',
            source: { name: 'CekFakta' },
            title: '[SALAH] Video Deepfake Tokoh Publik Mempromosikan Situs Investasi & Undian Berhadiah',
            description: 'Klaim Beredar: Video hasil manipulasi AI (Deepfake) yang menampilkan pejabat atau figur publik menjanjikan bagi-bagi uang - Rating: Manipulasi AI',
            urlToImage: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=600&auto=format&fit=crop',
            url: 'https://cekfakta.com/',
            publishedAt: 'Terbaru',
          },
        ];
      }

      setLatestHoaxes(articles.map((item) => item.title));
      setHoaxArticles(articles);
    } catch (error) {
      console.log('Gagal mengambil data berita hoaks:', error);
    } finally {
      if (!isRefreshing) setIsHoaxLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTrending(true),
      fetchLatestHoax(true)
    ]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % LITERACY_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTrending();
    fetchLatestHoax();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FadeInView delay={50}>
          <Text style={[styles.greeting, { fontFamily: theme.typography.fontFamilyBold }]}>
            Halo, {profile ? profile.name : 'Pengguna'}! 👋
          </Text>
          <Text style={[styles.subGreeting, { fontFamily: theme.typography.fontFamily }]}>
            Mari bersihkan internet dari hoaks
          </Text>
        </FadeInView>
      </View>

      <View style={styles.scrollWrapper}>
        <ScrollView
          style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* SECTION 1: QUICK SEARCH */}
        <FadeInView delay={100}>
          <View style={[styles.searchCard, theme.shadows.md]}>
            <Text style={[styles.searchTitle, { fontFamily: theme.typography.fontFamilySemiBold }]}>
              Cek Kebenaran Berita
            </Text>
            <View style={styles.searchInputContainer}>
              <Ionicons name="link-outline" size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { fontFamily: theme.typography.fontFamily }]}
                placeholder="Tempel link atau ketik judul..."
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="search"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => {
                  if (!searchQuery.trim()) {
                    router.push('/(tabs)/detect');
                    return;
                  }
                  const isUrl = /^(http|https):\/\//i.test(searchQuery.trim());
                  if (isUrl) {
                    router.push(`/(tabs)/detect?url=${encodeURIComponent(searchQuery.trim())}`);
                  } else {
                    router.push(`/(tabs)/detect?text=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
              />
            </View>
            <TouchableOpacity 
              activeOpacity={0.85} 
              onPress={() => {
                if (!searchQuery.trim()) {
                  router.push('/(tabs)/detect');
                  return;
                }
                const isUrl = /^(http|https):\/\//i.test(searchQuery.trim());
                if (isUrl) {
                  router.push(`/(tabs)/detect?url=${encodeURIComponent(searchQuery.trim())}`);
                } else {
                  router.push(`/(tabs)/detect?text=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
            >
              <LinearGradient
                colors={['#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.searchButton}
              >
                <Ionicons name="scan-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={[styles.searchButtonText, { fontFamily: theme.typography.fontFamilySemiBold }]}>
                  Analisis dengan AI
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* SECTION 5: COMMUNITY IMPACT */}
        <FadeInView delay={150}>
          <TouchableOpacity 
            style={styles.communityBanner} 
            activeOpacity={0.7} 
            onPress={() => router.push('/(tabs)/info')}
          >
            <View style={[styles.communityIconWrap, { backgroundColor: theme.colors.successLight }]}>
              <Ionicons name="shield-checkmark" size={16} color={theme.colors.success} />
            </View>
            <View style={{ flex: 1, height: 20, overflow: 'hidden' }}>
              <HoaxTicker data={latestHoaxes} theme={theme} />
            </View>
          </TouchableOpacity>
        </FadeInView>

        {/* SECTION 4: CATEGORIES */}
        <FadeInView delay={200}>
          <Text style={[styles.sectionTitle, styles.paddingHorizontal, { fontFamily: theme.typography.fontFamilySemiBold }]}>
            Topik Rawan
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat, idx) => (
              <TouchableOpacity 
                key={cat.id} 
                style={styles.categoryPill} 
                activeOpacity={0.7}
                onPress={() => router.push(`/(tabs)/detect?autoPrompt=${cat.name}`)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '15' }]}>
                  <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                </View>
                <Text style={[styles.categoryName, { fontFamily: theme.typography.fontFamilyMedium }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </FadeInView>

        {/* NEW SECTION: BERITA HOAX */}
        <FadeInView delay={225}>
          <View style={[styles.sectionHeader, styles.paddingHorizontal, { marginTop: 8, marginBottom: 12 }]}>
            <Text style={[styles.sectionTitle, { fontFamily: theme.typography.fontFamilySemiBold, marginTop: 0 }]}>
              Berita Hoax
            </Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/info', params: { category: 'Hoax' } })}>
              <Text style={[styles.seeAllText, { fontFamily: theme.typography.fontFamilyMedium, color: theme.colors.primary }]}>
                Lihat Semua
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScroll}>
            {isHoaxLoading ? (
              <View style={{ width: 280, height: 160, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.danger} />
              </View>
            ) : hoaxArticles.map((news) => (
              <TouchableOpacity 
                key={`hoax_${news.id}`} 
                style={[styles.newsCard, theme.shadows.sm]} 
                activeOpacity={0.8}
                onPress={() => handleOpenNews(news.url)}
              >
                <NewsImage 
                  uri={news.urlToImage} 
                  style={styles.newsImage}
                />
                <View style={styles.newsContent}>
                  <View style={styles.newsMeta}>
                    <View style={styles.sourceBadge}>
                      <Text style={[styles.sourceText, { fontFamily: theme.typography.fontFamilySemiBold, color: theme.colors.danger }]}>
                        {news.source.name}
                      </Text>
                    </View>
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                      <Text style={[styles.timeText, { fontFamily: theme.typography.fontFamily }]}>
                        {news.publishedAt}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.newsTitle, { fontFamily: theme.typography.fontFamilyBold }]} numberOfLines={2}>
                    {news.title}
                  </Text>
                  <Text style={[styles.newsDesc, { fontFamily: theme.typography.fontFamily }]} numberOfLines={2}>
                    {news.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {!isHoaxLoading && hoaxArticles.length === 0 && (
              <View style={{ width: 280, padding: 20 }}>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>Belum ada berita hoax saat ini.</Text>
              </View>
            )}
          </ScrollView>
        </FadeInView>

        {/* SECTION 2: TRENDING */}
        <FadeInView delay={250}>
          <View style={[styles.sectionHeader, styles.paddingHorizontal, { marginTop: 8, marginBottom: 12 }]}>
            <Text style={[styles.sectionTitle, { fontFamily: theme.typography.fontFamilySemiBold, marginTop: 0 }]}>
              Sedang Hangat
            </Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/info', params: { category: 'Sedang Hangat' } })}>
              <Text style={[styles.seeAllText, { fontFamily: theme.typography.fontFamilyMedium, color: theme.colors.primary }]}>
                Lihat Semua
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScroll}>
            {isTrendingLoading ? (
              <View style={{ width: 280, height: 160, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : trendingNews.map((news) => (
              <TouchableOpacity 
                key={news.id} 
                style={[styles.newsCard, theme.shadows.sm]} 
                activeOpacity={0.8}
                onPress={() => handleOpenNews(news.url)}
              >
                <NewsImage 
                  uri={news.urlToImage} 
                  style={styles.newsImage}
                />
                <View style={styles.newsContent}>
                  <View style={styles.newsMeta}>
                    <View style={styles.sourceBadge}>
                      <Text style={[styles.sourceText, { fontFamily: theme.typography.fontFamilySemiBold, color: theme.colors.primary }]}>
                        {news.source.name}
                      </Text>
                    </View>
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                      <Text style={[styles.timeText, { fontFamily: theme.typography.fontFamily }]}>
                        {news.publishedAt}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.newsTitle, { fontFamily: theme.typography.fontFamilyBold }]} numberOfLines={2}>
                    {news.title}
                  </Text>
                  <Text style={[styles.newsDesc, { fontFamily: theme.typography.fontFamily }]} numberOfLines={2}>
                    {news.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {!isTrendingLoading && trendingNews.length === 0 && (
              <View style={{ width: 280, padding: 20 }}>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>Belum ada berita hangat saat ini.</Text>
              </View>
            )}
          </ScrollView>
        </FadeInView>

        {/* SECTION 3: DAILY TIPS */}
        <FadeInView delay={300}>
          <View style={styles.paddingHorizontal}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tipsCard, theme.shadows.md]}>
              <View style={styles.tipsIconContainer}>
                <Ionicons name="bulb" size={24} color="#FFF" />
              </View>
              <View style={styles.tipsContent}>
                <Text style={[styles.tipsTitle, { fontFamily: theme.typography.fontFamilyBold }]}>Tips Literasi Hari Ini</Text>
                <Text style={[styles.tipsDesc, { fontFamily: theme.typography.fontFamily }]}>
                  {LITERACY_TIPS[currentTipIndex]}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </FadeInView>

        {/* ORIGINAL SECTION: SUMMARY CARDS */}
        <FadeInView delay={350}>
          <View style={styles.paddingHorizontal}>
            <Text style={[styles.sectionTitle, { fontFamily: theme.typography.fontFamilySemiBold, marginTop: 24 }]}>
              Aktivitas Anda
            </Text>
            <View style={[styles.summaryCard, theme.shadows.sm]}>
              <View style={styles.summaryRow}>
                <TouchableOpacity
                  style={styles.summaryItem}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/(tabs)/history', params: { filter: 'all' } })}
                >
                  <Text style={[styles.summaryNumber, { fontFamily: theme.typography.fontFamilyBold, color: theme.colors.primary }]}>{totalCount}</Text>
                  <Text style={[styles.summaryLabel, { fontFamily: theme.typography.fontFamily }]}>Total Dicek</Text>
                </TouchableOpacity>
                <View style={styles.summaryDivider} />
                <TouchableOpacity
                  style={styles.summaryItem}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/(tabs)/history', params: { filter: 'fact' } })}
                >
                  <Text style={[styles.summaryNumber, { fontFamily: theme.typography.fontFamilyBold, color: theme.colors.success }]}>{faktaCount}</Text>
                  <Text style={[styles.summaryLabel, { fontFamily: theme.typography.fontFamily }]}>Fakta</Text>
                </TouchableOpacity>
                <View style={styles.summaryDivider} />
                <TouchableOpacity
                  style={styles.summaryItem}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/(tabs)/history', params: { filter: 'hoax' } })}
                >
                  <Text style={[styles.summaryNumber, { fontFamily: theme.typography.fontFamilyBold, color: theme.colors.danger }]}>{hoaksCount}</Text>
                  <Text style={[styles.summaryLabel, { fontFamily: theme.typography.fontFamily }]}>Hoaks</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* ORIGINAL SECTION: RECENT ACTIVITY */}
        <FadeInView delay={400}>
          <View style={styles.paddingHorizontal}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { fontFamily: theme.typography.fontFamilySemiBold, marginTop: 0 }]}>
                Riwayat Terakhir
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push({ pathname: '/(tabs)/history', params: { filter: 'all' } })}>
                <Text style={[styles.seeAllText, { fontFamily: theme.typography.fontFamilyMedium, color: theme.colors.primary }]}>
                  Lihat Semua
                </Text>
              </TouchableOpacity>
            </View>

            {history.slice(0, 5).map((item, index) => (
              <Swipeable
                key={item.id}
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
                  style={[styles.historyCard, theme.shadows.sm]}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/history/${item.id}`)}
                >
                <View style={[
                  styles.historyIconContainer,
                  { backgroundColor: item.status === 'hoax' ? theme.colors.dangerLight : item.status === 'fact' ? theme.colors.successLight : theme.colors.warningLight },
                ]}>
                  <Ionicons 
                    name={item.status === 'hoax' ? 'close-circle' : item.status === 'fact' ? 'checkmark-circle' : 'alert-circle'} 
                    size={24} 
                    color={item.status === 'hoax' ? theme.colors.danger : item.status === 'fact' ? theme.colors.success : theme.colors.warning} 
                  />
                </View>
                <View style={styles.historyContent}>
                  <Text style={[styles.historyTitle, { fontFamily: theme.typography.fontFamilyMedium }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.historyTime, { fontFamily: theme.typography.fontFamily }]}>{item.time || item.date}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === 'hoax' ? theme.colors.dangerLight : item.status === 'fact' ? theme.colors.successLight : theme.colors.warningLight },
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { fontFamily: theme.typography.fontFamilySemiBold, color: item.status === 'hoax' ? theme.colors.danger : item.status === 'fact' ? theme.colors.success : theme.colors.warning },
                  ]}>
                    {item.status === 'hoax' ? 'Hoaks' : item.status === 'fact' ? 'Fakta' : 'Keliru'}
                  </Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
            ))}
            
            {history.length === 0 && (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>Belum ada riwayat deteksi.</Text>
              </View>
            )}
          </View>
        </FadeInView>
        </ScrollView>
      </View>

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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#3B82F6',
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 24,
    position: 'relative',
  },
  scrollWrapper: {
    flex: 1,
    marginTop: -30,
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },

  greeting: { fontSize: 26, color: '#FFFFFF', letterSpacing: -0.3, marginBottom: 4 },
  subGreeting: { fontSize: 15, color: 'rgba(255, 255, 255, 0.85)' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 24, paddingBottom: 30 },
  paddingHorizontal: { paddingHorizontal: 20 },
  
  // Section 1: Search
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 16,
    zIndex: 10,
    elevation: 5,
  },
  searchTitle: { fontSize: 16, color: '#111827', marginBottom: 12 },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', height: '100%' },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
  },
  searchButtonText: { color: '#FFF', fontSize: 15 },

  // Section 5: Community Banner
  communityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  communityIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  communityText: { fontSize: 13, color: '#4B5563', flex: 1 },

  // Section 4: Categories
  sectionTitle: { fontSize: 18, color: '#111827', marginBottom: 12, letterSpacing: -0.2 },
  categoryScroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingRight: 16,
    paddingLeft: 6,
    paddingVertical: 6,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  categoryName: { fontSize: 14, color: '#374151' },

  // Section 2: Trending (News Style)
  trendingScroll: { paddingHorizontal: 20, paddingBottom: 36, gap: 16 },
  newsCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  newsImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
  },
  newsContent: {
    padding: 16,
  },
  newsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 11,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
  newsTitle: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  newsDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Section 3: Daily Tips
  tipsCard: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  tipsIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  tipsContent: { flex: 1 },
  tipsTitle: { fontSize: 16, color: '#FFF', marginBottom: 4 },
  tipsDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },

  // Old Summary & History
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryNumber: { fontSize: 24, letterSpacing: -0.5, marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: '#6B7280' },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAllText: { fontSize: 14 },

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

  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  historyIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  historyIcon: { fontSize: 18 },
  historyContent: { flex: 1, marginRight: 10 },
  historyTitle: { fontSize: 14, color: '#111827', lineHeight: 20, marginBottom: 2 },
  historyTime: { fontSize: 12, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  statusBadgeText: { fontSize: 11 },
});
