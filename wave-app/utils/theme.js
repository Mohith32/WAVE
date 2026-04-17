import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

const baseTypography = {
  fontLight: 'Inter_300Light',
  fontRegular: 'Inter_400Regular',
  fontMedium: 'Inter_400Regular',
  fontSemiBold: 'Inter_600SemiBold',
  fontBold: 'Inter_600SemiBold',
};

const base = {
  typography: baseTypography,
  fontSize: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 34 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 9999 },
};

const lightColors = {
  scheme: 'light',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F4F5',
  surfaceElevated: '#FFFFFF',
  chatBg: '#FFFFFF',

  headerBg: '#FFFFFF',
  headerBorder: '#E7E8EC',

  primary: '#3390EC',
  primaryLight: '#E7F3FB',
  primaryDark: '#1E6FB8',

  text: '#0F1419',
  textSecondary: '#707579',
  textMuted: '#A2ACB4',
  textGhost: '#C4C9CC',
  placeholder: '#A2ACB4',

  border: '#E7E8EC',
  borderLight: '#F4F4F5',

  success: '#4FAE4E',
  successLight: '#E8F5E9',
  error: '#E53935',
  errorLight: '#FFEBEE',
  warning: '#F59E0B',

  online: '#4FAE4E',

  bubbleSent: '#EEFFDE',
  bubbleSentText: '#0F1419',
  bubbleSentTime: '#4FAE4E',
  bubbleReceived: '#FFFFFF',
  bubbleReceivedText: '#0F1419',
  bubbleReceivedTime: '#A2ACB4',
  bubbleBorder: '#E7E8EC',

  inputBg: '#F4F4F5',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E7E8EC',
  overlay: 'rgba(0,0,0,0.35)',
  statusBar: 'dark',
};

const darkColors = {
  scheme: 'dark',
  background: '#17212B',
  surface: '#17212B',
  surfaceMuted: '#242F3D',
  surfaceElevated: '#1D2733',
  chatBg: '#0E1621',

  headerBg: '#17212B',
  headerBorder: '#0E1621',

  primary: '#5AABF5',
  primaryLight: '#2B3B4E',
  primaryDark: '#3E8DD9',

  text: '#FFFFFF',
  textSecondary: '#8B9398',
  textMuted: '#6D7881',
  textGhost: '#5D6672',
  placeholder: '#6D7881',

  border: '#101921',
  borderLight: '#1D2733',

  success: '#4FAE4E',
  successLight: '#1F3325',
  error: '#FF5252',
  errorLight: '#3D1F1F',
  warning: '#F59E0B',

  online: '#4FAE4E',

  bubbleSent: '#2B5278',
  bubbleSentText: '#FFFFFF',
  bubbleSentTime: '#7DAAD3',
  bubbleReceived: '#182533',
  bubbleReceivedText: '#FFFFFF',
  bubbleReceivedTime: '#6D7881',
  bubbleBorder: '#182533',

  inputBg: '#242F3D',
  tabBarBg: '#17212B',
  tabBarBorder: '#101921',
  overlay: 'rgba(0,0,0,0.55)',
  statusBar: 'light',
};

const buildShadow = (isDark) => ({
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.5 : 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  hover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.5 : 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
});

export const lightTheme = {
  ...base,
  colors: lightColors,
  shadow: buildShadow(false),
  isDark: false,
};

export const darkTheme = {
  ...base,
  colors: darkColors,
  shadow: buildShadow(true),
  isDark: true,
};

export const getTheme = (scheme) => (scheme === 'dark' ? darkTheme : lightTheme);

const ThemeContext = createContext(lightTheme);

export function ThemeProvider({ children }) {
  const scheme = useColorScheme();
  const value = useMemo(() => getTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export const theme = lightTheme;
