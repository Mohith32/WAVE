import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from './storage';

// ============================================================
// Wave — iOS-native aesthetic
// Clean, minimal, system-like. No gradients, no blur tricks,
// no glow shadows. Single blue accent, proper spacing, SF-style.
// Reference: iOS Settings app / iMessage.
// ============================================================

const typography = {
  fontLight:    'Inter_300Light',
  fontRegular:  'Inter_400Regular',
  fontMedium:   'Inter_400Regular',
  fontSemiBold: 'Inter_600SemiBold',
  fontBold:     'Inter_600SemiBold',
  fontHero:     'Inter_600SemiBold',
};

// iOS text sizes: body 17, footnote 13, caption 11, title 22, large title 34
const fontSize = {
  xs: 12, sm: 13, md: 15, base: 17,
  lg: 17, xl: 22, xxl: 28, xxxl: 34, hero: 34,
};

const borderRadius = {
  sm: 8, md: 10, lg: 12, xl: 16, xxl: 20, full: 9999,
};

// Light (default) — clean iOS Settings / iMessage aesthetic
const light = {
  scheme: 'light',

  // Canvas — iOS grouped list uses "systemGroupedBackground"
  background:      '#F2F2F7',  // grouped list bg
  backgroundDeep:  '#F2F2F7',
  backgroundTop:   '#FFFFFF',
  surface:         '#FFFFFF',  // card inside grouped list
  surfaceSolid:    '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted:    '#E5E5EA',

  chatBg:    '#FFFFFF',
  headerBg:  '#FFFFFF',
  headerBorder: '#E5E5EA',
  tabBarBg:  '#FFFFFF',
  tabBarBorder: '#C6C6C8',

  // Single blue accent — iOS system blue
  primary:     '#007AFF',
  primaryLight:'#E5F1FF',
  primaryGlow: '#007AFF',
  primaryDark: '#0062CC',

  // No gradients — keep tokens for compat but make them flat
  gradientPrimary:  ['#007AFF', '#007AFF', '#007AFF'],
  gradientSubtle:   ['#E5F1FF', '#E5F1FF'],
  gradientBackdrop: ['#F2F2F7', '#F2F2F7', '#F2F2F7'],
  gradientBubbleSent: ['#007AFF', '#007AFF'],

  // Typography — iOS label colors
  text:          '#000000',        // primary label
  textSecondary: '#3C3C43',        // secondary label (60% black)
  textMuted:     '#8E8E93',        // tertiary label
  textGhost:     '#C7C7CC',        // quaternary label
  placeholder:   '#C7C7CC',

  border:        '#E5E5EA',
  borderLight:   '#F2F2F7',
  hairline:      '#D1D1D6',

  success:       '#34C759',
  successLight:  '#E8F8EC',
  error:         '#FF3B30',
  errorLight:    '#FFEBEA',
  warning:       '#FF9500',

  online:        '#34C759',

  // iMessage bubbles
  bubbleSent:         '#007AFF',
  bubbleSentText:     '#FFFFFF',
  bubbleSentTime:     'rgba(255, 255, 255, 0.75)',
  bubbleReceived:     '#E9E9EB',
  bubbleReceivedText: '#000000',
  bubbleReceivedTime: '#8E8E93',
  bubbleBorder:       'transparent',

  inputBg: '#F2F2F7',
  overlay: 'rgba(0, 0, 0, 0.4)',

  // Legacy tokens (unused but kept for compat)
  blurTint: 'light',
  blurIntensity: 0,
  statusBar: 'dark',
};

// Dark — iOS dark mode grouped list
const dark = {
  scheme: 'dark',

  background:      '#000000',        // Keep true black for OLED like iOS
  backgroundDeep:  '#000000',
  backgroundTop:   '#1C1C1E',
  surface:         '#1C1C1E',        // grouped list card dark
  surfaceSolid:    '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceMuted:    '#2C2C2E',

  chatBg:    '#000000',
  headerBg:  '#1C1C1E',
  headerBorder: '#38383A',
  tabBarBg:  '#1C1C1E',
  tabBarBorder: '#38383A',

  primary:     '#0A84FF',
  primaryLight:'#0A84FF33',
  primaryGlow: '#0A84FF',
  primaryDark: '#0062CC',

  gradientPrimary:  ['#0A84FF', '#0A84FF', '#0A84FF'],
  gradientSubtle:   ['#0A84FF22', '#0A84FF22'],
  gradientBackdrop: ['#000000', '#000000', '#000000'],
  gradientBubbleSent: ['#0A84FF', '#0A84FF'],

  text:          '#FFFFFF',
  textSecondary: '#EBEBF5',
  textMuted:     '#8E8E93',
  textGhost:     '#48484A',
  placeholder:   '#48484A',

  border:        '#38383A',
  borderLight:   '#2C2C2E',
  hairline:      '#38383A',

  success:       '#30D158',
  successLight:  'rgba(48, 209, 88, 0.15)',
  error:         '#FF453A',
  errorLight:    'rgba(255, 69, 58, 0.15)',
  warning:       '#FF9F0A',

  online:        '#30D158',

  bubbleSent:         '#0A84FF',
  bubbleSentText:     '#FFFFFF',
  bubbleSentTime:     'rgba(255, 255, 255, 0.7)',
  bubbleReceived:     '#2C2C2E',
  bubbleReceivedText: '#FFFFFF',
  bubbleReceivedTime: '#8E8E93',
  bubbleBorder:       'transparent',

  inputBg: '#1C1C1E',
  overlay: 'rgba(0, 0, 0, 0.6)',

  blurTint: 'dark',
  blurIntensity: 0,
  statusBar: 'light',
};

// iOS-style subtle shadows — NO glows, NO colored shadows
const buildShadow = (isDark) => ({
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.04,
    shadowRadius: 2,
    elevation: isDark ? 0 : 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.08,
    shadowRadius: 6,
    elevation: isDark ? 0 : 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0 : 0.1,
    shadowRadius: 12,
    elevation: isDark ? 0 : 5,
  },
  glow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.08,
    shadowRadius: 6,
    elevation: isDark ? 0 : 3,
  },
});

const motion = {
  easing: [0.16, 1, 0.3, 1],
  spring: { mass: 1, damping: 18, stiffness: 140 },
  pressScale: 0.97,
};

const build = (colors) => ({
  typography, fontSize, borderRadius, motion, colors,
  shadow: buildShadow(colors.scheme === 'dark'),
  isDark: colors.scheme === 'dark',
});

export const lightTheme = build(light);
export const darkTheme = build(dark);
export const getTheme = (scheme) => (scheme === 'dark' ? darkTheme : lightTheme);

const ThemeContext = createContext({ ...lightTheme, preference: 'system', setPreference: () => {} });

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState('system');

  useEffect(() => {
    storage.getThemePreference()
      .then((p) => setPreferenceState(p || 'system'))
      .catch(() => {});
  }, []);

  const effective = preference === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : preference;

  const setPreference = useCallback(async (pref) => {
    setPreferenceState(pref);
    try { await storage.setThemePreference(pref); } catch {}
  }, []);

  const value = useMemo(() => ({
    ...getTheme(effective),
    preference,
    setPreference,
  }), [effective, preference, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

export const theme = lightTheme;
