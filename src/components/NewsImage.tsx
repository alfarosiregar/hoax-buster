import React, { useState } from 'react';
import { View, Image, StyleSheet, StyleProp, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NewsImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
}

export default function NewsImage({ uri, style }: NewsImageProps) {
  const [hasError, setHasError] = useState(false);

  // Jika URL tidak valid, kosong, atau error saat dimuat
  if (!uri || hasError || uri.includes('picsum.photos')) {
    // Array gambar berita generik dari Unsplash yang bebas royalti
    const fallbacks = [
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=400&auto=format&fit=crop',
    ];
    // Pilih gambar secara deterministik (pseudo-random) berdasarkan panjang string URL atau default index
    const index = uri ? uri.length % fallbacks.length : 0;
    
    return (
      <Image
        source={{ uri: fallbacks[index] }}
        style={style}
        resizeMode="cover"
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
