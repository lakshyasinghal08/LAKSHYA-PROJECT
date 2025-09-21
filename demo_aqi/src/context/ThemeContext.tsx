import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    accentLight: string;
    accentDark: string;
    accentGradient: string;
    background: string;
    cardBg: string;
    text: string;
    textSecondary: string;
    border: string;
    inputBg: string;
    cardShadow: string;
    headerBg: string;
    error: string;
    success: string;
  };
}

const lightTheme = {
  primary: '#ff69b4', // Hot Pink
  secondary: '#ff9ff3', // Light Pink
  accent: '#fd79a8', // Pinkish
  accentLight: '#ffeef8', // Very Light Pink
  accentDark: '#e84393', // Darker Pink
  accentGradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
  background: '#fff5f9', // Very light pink background
  cardBg: '#ffffff',
  text: '#343a40',
  textSecondary: '#6c757d',
  border: '#ffcce0', // Light pink border
  inputBg: '#fff0f7', // Very light pink input
  cardShadow: '0 8px 20px rgba(253, 121, 168, 0.15)', // Pink-tinted shadow
  headerBg: 'linear-gradient(135deg, #ff9ff3 0%, #ff69b4 100%)',
  error: '#ff6b6b',
  success: '#51cf66',
};

const darkTheme = {
  primary: '#ff69b4', // Hot Pink
  secondary: '#ff9ff3', // Light Pink
  accent: '#fd79a8', // Pinkish
  accentLight: '#4a3b44', // Dark Pink Shade
  accentDark: '#e84393', // Darker Pink
  accentGradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
  background: '#1a1a2e', // Dark blue-purple background
  cardBg: '#252541', // Dark purple card
  text: '#f8f9fa',
  textSecondary: '#adb5bd',
  border: '#4a3b44', // Dark pink border
  inputBg: '#2b2b40', // Dark input
  cardShadow: '0 8px 20px rgba(253, 121, 168, 0.2)', // Pink-tinted shadow
  headerBg: 'linear-gradient(135deg, #4a3b44 0%, #ff69b4 100%)',
  error: '#ff6b6b',
  success: '#51cf66',
};

type ThemeContextType = {
  theme: string;
  colors: typeof themes.light;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'light' ? themes.light : themes.dark;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};