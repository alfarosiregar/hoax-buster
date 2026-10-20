import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import * as WebBrowser from 'expo-web-browser';
import FadeInView from '@/components/FadeInView';
import NewsImage from '@/components/NewsImage';
import Constants from 'expo-constants';

// GNews API category mapping
const GNEWS_CATEGORY_MAP: Record<string, string> = {
  'Semua': 'general',
  'Sedang Hangat': 'general',
  'Politik': 'nation', // GNews doesn't have politics, nation is closest
  'Olahraga': 'sports',
  'Teknologi': 'technology',
  'Cuaca': 'science', // GNews doesn't have environment, science is closest
  'Kesehatan': 'health',
  'Ekonomi': 'business',
  'Edukasi': 'science',
};

// NewsData.io category mapping
const NEWSDATA_CATEGORY_MAP: Record<string, string> = {
  'Semua': 'top',
  'Sedang Hangat': 'top',
  'Politik': 'politics',
  'Olahraga': 'sports',
  'Teknologi': 'technology',
  'Cuaca': 'environment',
  'Kesehatan': 'health',
  'Ekonomi': 'business',
  'Edukasi': 'science',
};

// NewsAPI.org category mapping
const NEWSAPI_CATEGORY_MAP: Record<string, string> = {
  'Semua': 'general',
  'Sedang Hangat': 'general',
  'Politik': 'general', // NewsAPI doesn't have politics explicitly
  'Olahraga': 'sports',
  'Teknologi': 'technology',
  'Cuaca': 'science', 
  'Kesehatan': 'health',
  'Ekonomi': 'business',
  'Edukasi': 'science',
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

const CATEGORIES = ['Semua', 'Hoax', 'Sedang Hangat', 'Politik', 'Olahraga', 'Teknologi', 'Cuaca', 'Kesehatan', 'Ekonomi', 'Edukasi'];

export default function NewsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [activeCategory, setActiveCategory] = useState((params.category as string) || 'Semua');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.category) {
      setActiveCategory(params.category as string);
    }
  }, [params.category]);

  const fetchNews = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const newsDataKey = process.env.EXPO_PUBLIC_NEWSDATA_API_KEY;
    const gnewsKey = process.env.EXPO_PUBLIC_GNEWS_API_KEY;
    const newsApiKey = process.env.EXPO_PUBLIC_NEWSAPI_API_KEY;

    if (activeCategory !== 'Hoax' && !newsDataKey && !gnewsKey && !newsApiKey) {
      setError('API Key belum dikonfigurasi. Tambahkan EXPO_PUBLIC_NEWSDATA_API_KEY atau EXPO_PUBLIC_GNEWS_API_KEY di .env');
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // HOAX CATEGORY: Fetch from our AI Backend or direct Google Fact Check Tools API
      if (activeCategory === 'Hoax') {
        let hoaxList: NewsArticle[] = [];

        // 1. Coba dari server backend Python terlebih dahulu
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
              hoaxList = data.articles;
            }
          }
        } catch (backendErr) {
          // Lanjut ke fallback langsung
        }

        // 2. Fallback langsung ke Google Fact Check Tools API
        if (hoaxList.length === 0) {
          const factCheckKey = process.env.EXPO_PUBLIC_GOOGLE_FACT_CHECK_API_KEY;
          if (factCheckKey) {
            try {
              const fcUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=indonesia&languageCode=id&key=${factCheckKey}`;
              const fcRes = await fetch(fcUrl);
              if (fcRes.ok) {
                const fcData = await fcRes.json();
                const claims = fcData.claims || [];
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

                  hoaxList.push({
                    id: `hoax_fc_${i}`,
                    source: { name: publisher },
                    title,
                    description: `Klaim Beredar: ${claim.text} - Rating: ${rating}`,
                    urlToImage: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=600&auto=format&fit=crop',
                    url,
                    publishedAt: formattedDate,
                  });
                });
              }
            } catch (fcErr) {
              console.log('Direct Google Fact Check gagal:', fcErr);
            }
          }
        }

        if (hoaxList.length > 0) {
          setNews(hoaxList);
          setIsLoading(false);
          setRefreshing(false);
          return;
        }
        // Jika masih kosong, biarkan lanjut ke GNews/NewsData dengan pencarian kata kunci hoaks
      }

      // PRIMARY API: GNews
      if (!gnewsKey) throw new Error('GNEWS_LIMIT_REACHED');
      
      let endpoint = '';
      if (activeCategory === 'Sedang Hangat' || activeCategory === 'Hoax') {
        endpoint = `https://gnews.io/api/v4/search?q=hoaks&country=id&max=30&apikey=${gnewsKey}`;
      } else {
        const gnCategory = GNEWS_CATEGORY_MAP[activeCategory] || 'general';
        endpoint = `https://gnews.io/api/v4/top-headlines?category=${gnCategory}&country=id&max=30&apikey=${gnewsKey}`;
      }
      
      const response = await fetch(endpoint);
      if (!response.ok) {
         const errorData = await response.json();
         let errorMsg = errorData.errors ? errorData.errors[0] : 'Error';
         if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('limit')) {
           throw new Error('GNEWS_LIMIT_REACHED');
         }
         throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.articles) {
        const formattedArticles = data.articles.map((item: any, index: number) => ({
          id: `news_${index}_${new Date().getTime()}`,
          source: { name: item.source.name },
          title: item.title,
          description: item.description,
          urlToImage: item.image 
            ? item.image.replace(/^http:\/\//i, 'https://')
            : 'https://picsum.photos/400/200?blur=2',
          url: item.url,
          publishedAt: new Date(item.publishedAt).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
          }),
        }));
        setNews(formattedArticles);
        setIsLoading(false);
        setRefreshing(false);
        return;
      }
    } catch (err: any) {
      console.log('GNews failed or skipped, trying NewsData.io...');
      
      // FALLBACK API: NewsData.io
      try {
        if (!newsDataKey) throw new Error('NEWSDATA_LIMIT_REACHED');
        
        const ndCategory = NEWSDATA_CATEGORY_MAP[activeCategory] || 'top';
        const endpoint = `https://newsdata.io/api/1/news?apikey=${newsDataKey}&country=id&category=${ndCategory}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('NEWSDATA_LIMIT_REACHED');
        }
        const data = await response.json();
        if (data.status === 'error') {
          throw new Error('NEWSDATA_LIMIT_REACHED');
        }

        if (data.results) {
          const formattedArticles = data.results.map((item: any, index: number) => ({
            id: item.article_id || `news_${index}_${new Date().getTime()}`,
            source: { name: item.source_id || 'NewsData' },
            title: item.title,
            description: item.description || 'Klik untuk membaca berita selengkapnya.',
            urlToImage: item.image_url 
              ? item.image_url.replace(/^http:\/\//i, 'https://')
              : 'https://picsum.photos/400/200?blur=2',
            url: item.link,
            publishedAt: new Date(item.pubDate).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', year: 'numeric'
            }),
          }));
          setNews(formattedArticles);
        }
      } catch (ndErr: any) {
         console.log('NewsData fallback failed, trying NewsAPI.org...');
         
         // 3RD FALLBACK API: NewsAPI.org
         try {
           if (!newsApiKey) throw new Error('NEWSAPI_LIMIT_REACHED');
           
           const naCategory = NEWSAPI_CATEGORY_MAP[activeCategory] || 'general';
           let endpoint = `https://newsapi.org/v2/top-headlines?country=id&category=${naCategory}&apiKey=${newsApiKey}`;
           if (activeCategory === 'Sedang Hangat') {
             endpoint = `https://newsapi.org/v2/top-headlines?country=id&q=hoaks&apiKey=${newsApiKey}`;
           }
           
           const response = await fetch(endpoint);
           if (!response.ok) {
             throw new Error('NEWSAPI_LIMIT_REACHED');
           }
           const data = await response.json();
           
           if (data.articles) {
             const formattedArticles = data.articles.filter((item: any) => item.title !== '[Removed]').map((item: any, index: number) => ({
               id: `newsapi_${index}_${new Date().getTime()}`,
               source: { name: item.source.name || 'NewsAPI' },
               title: item.title,
               description: item.description || 'Klik untuk membaca berita selengkapnya.',
               urlToImage: item.urlToImage 
                 ? item.urlToImage.replace(/^http:\/\//i, 'https://')
                 : 'https://picsum.photos/400/200?blur=2',
               url: item.url,
               publishedAt: new Date(item.publishedAt).toLocaleDateString('id-ID', {
                 day: 'numeric', month: 'short', year: 'numeric'
               }),
             }));
             setNews(formattedArticles);
           }
         } catch (naErr: any) {
            console.error('NewsAPI fallback failed:', naErr);
            setError('Semua sumber berita (GNews, NewsData, NewsAPI) sedang gangguan atau mencapai limit.');
         }
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [activeCategory]);

  const handleOpenNews = async (newsItem: NewsArticle) => {
    try {
      await WebBrowser.openBrowserAsync(newsItem.url, {
        toolbarColor: theme.colors.primary,
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch (err) {
      console.error('Gagal membuka browser in-app:', err);
      // Fallback ke browser eksternal jika in-app gagal
      try {
        const supported = await Linking.canOpenURL(newsItem.url);
        if (supported) {
          await Linking.openURL(newsItem.url);
        }
      } catch (fallbackErr) {
        console.error('Fallback browser gagal:', fallbackErr);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <FadeInView delay={100}>
          <Text style={[styles.headerTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
            Berita Terkini 📰
          </Text>
          <Text style={[styles.headerSubtitle, { fontFamily: theme.typography.fontFamily }]}>
            Diperbarui langsung dari portal terpercaya
          </Text>
        </FadeInView>
      </View>

      {/* Category Horizontal Scroll */}
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat, index) => {
            const isActive = activeCategory === cat;
            return (
              <FadeInView key={cat} delay={150 + index * 50}>
                <TouchableOpacity
                  style={[
                    styles.categoryPill,
                    isActive ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { backgroundColor: '#FFFFFF' }
                  ]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text 
                    style={[
                      styles.categoryText, 
                      { fontFamily: isActive ? theme.typography.fontFamilyMedium : theme.typography.fontFamily },
                      isActive ? { color: '#FFFFFF' } : { color: theme.colors.textMuted }
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              </FadeInView>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNews(true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>
              Memuat berita terkini...
            </Text>
          </View>
        ) : error === 'LIMIT_REACHED' ? (
          <FadeInView delay={100}>
            <View style={styles.limitContainer}>
              <View style={styles.limitIconWrapper}>
                <Ionicons name="cafe-outline" size={42} color={theme.colors.textMuted} />
              </View>
              <Text style={[styles.limitTitle, { fontFamily: theme.typography.fontFamilyBold }]}>
                Waktunya Ngopi Dulu ☕
              </Text>
              <Text style={[styles.limitDesc, { fontFamily: theme.typography.fontFamily }]}>
                Kamu udah mencapai batas baca berita gratis hari ini. Santai sejenak ya, balik lagi besok untuk dapetin update terhangat!
              </Text>
              <TouchableOpacity 
                style={styles.ghostButton}
                onPress={() => fetchNews()}
                activeOpacity={0.6}
              >
                <Ionicons name="refresh-outline" size={16} color={theme.colors.textMuted} />
                <Text style={[styles.ghostButtonText, { fontFamily: theme.typography.fontFamilyMedium }]}>
                  Coba Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        ) : error ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={[styles.emptyText, { fontFamily: theme.typography.fontFamily, color: '#EF4444' }]}>
              {error}
            </Text>
          </View>
        ) : (
          <>
            {news.map((item, index) => (
              <FadeInView key={item.id} delay={200 + index * 100}>
                <TouchableOpacity 
                  style={[styles.newsCard, theme.shadows.sm]} 
                  activeOpacity={0.8}
                  onPress={() => handleOpenNews(item)}
                >
                  <NewsImage 
                    uri={item.urlToImage} 
                    style={styles.newsImage}
                  />
                  <View style={styles.newsContent}>
                    <View style={styles.newsMeta}>
                      <View style={styles.sourceBadge}>
                        <Text style={[styles.sourceText, { fontFamily: theme.typography.fontFamilySemiBold, color: theme.colors.primary }]}>
                          {item.source.name}
                        </Text>
                      </View>
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                        <Text style={[styles.timeText, { fontFamily: theme.typography.fontFamily }]}>
                          {item.publishedAt}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.newsTitle, { fontFamily: theme.typography.fontFamilyBold }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    
                    <Text style={[styles.newsDesc, { fontFamily: theme.typography.fontFamily }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              </FadeInView>
            ))}

            {news.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color="#D1D5DB" />
                <Text style={[styles.emptyText, { fontFamily: theme.typography.fontFamily }]}>
                  Belum ada berita untuk kategori ini.
                </Text>
              </View>
            )}
          </>
        )}
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
    paddingHorizontal: 24,
    backgroundColor: '#F5F7FA',
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
  categoryScroll: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  limitContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  limitIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  limitTitle: {
    fontSize: 20,
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  limitDesc: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  ghostButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
