import React, { createContext, useContext, ReactNode } from 'react';

/**
 * HoaxBuster Design System — ThemeContext
 * 
 * Palet warna, tipografi, spacing, dan shadow presets
 * untuk memastikan konsistensi desain premium di seluruh aplikasi.
 */

export interface Theme {
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    success: string;
    successLight: string;
    danger: string;
    dangerLight: string;
    warning: string;
    warningLight: string;
    background: string;
    surface: string;
    card: string;
    border: string;
    borderLight: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    overlay: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  typography: {
    fontFamily: string;
    fontFamilyBold: string;
    fontFamilySemiBold: string;
    fontFamilyMedium: string;
  };
  shadows: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

const theme: Theme = {
  colors: {
    primary: '#3B82F6',
    primaryLight: '#DBEAFE',
    primaryDark: '#1D4ED8',
    secondary: '#6366F1',
    success: '#10B981',
    successLight: '#D1FAE5',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    text: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    fontFamily: 'Inter_400Regular',
    fontFamilyBold: 'Inter_700Bold',
    fontFamilySemiBold: 'Inter_600SemiBold',
    fontFamilyMedium: 'Inter_500Medium',
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};

const ThemeContext = createContext<Theme>(theme);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): Theme => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
