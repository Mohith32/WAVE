// Luminous Fluidity - Design System "The Architectural Void"
export const theme = {
  colors: {
    // Primary palette
    background: '#000000', // True Black (Infinite Depth)
    primary: '#FFFFFF', // Pure White (High-priority text/active icons)
    secondary: '#B9C8DE', // Pearl Blue Accent

    // Surface Logic (Frosted Obsidian)
    surfaceBase: 'rgba(255, 255, 255, 0.05)',
    surfaceLow: 'rgba(255, 255, 255, 0.08)',
    surfaceHigh: 'rgba(255, 255, 255, 0.12)',
    surfaceHighest: 'rgba(255, 255, 255, 0.16)',
    surfaceBright: 'rgba(255, 255, 255, 0.20)',

    // Outline / Ghost borders
    outlineVariant: 'rgba(255, 255, 255, 0.15)',
    outlineSpecularHigh: 'rgba(255, 255, 255, 0.20)',
    outlineSpecularLow: 'rgba(255, 255, 255, 0.10)',

    // Text hierarchy
    text: '#FFFFFF',
    textVariant: 'rgba(255, 255, 255, 0.60)', // Matches body-md Light/Regular
    textDisabled: 'rgba(255, 255, 255, 0.30)',
    placeholder: 'rgba(255, 255, 255, 0.40)', // on-surface-variant at 40%

    // Legacy status mappings adapted
    online: '#00E676', // Keep bright for pure contrast or tint it? Keeping as requested
    error: '#FF5252',
    
    // Gradients (Polished Metal)
    primaryGradientStart: '#FFFFFF',
    primaryGradientEnd: '#E6E6E6', // Simulate light drop-off
  },

  typography: {
    // Inter Font mapping requirement
    fontFamily: 'Inter_400Regular',
    fontSemiBold: 'Inter_600SemiBold',
    fontLight: 'Inter_300Light',
    trackingTitle: 0.8, // Approx 0.04em
    trackingLabel: 1.2, // Approx 0.1em
  },

  fontSize: {
    xs: 11,
    sm: 13,   // Label-sm
    md: 15,   // Body-md
    lg: 18,   // Headline-sm
    xl: 22,   // Headline-md
    xxl: 28,  // Headline-lg
    hero: 36,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 10,
    lg: 16,
    xl: 24,
    xxl: 32,
    galleryTop: 48, // Layer Spacing token 16/20
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 24,
    xl: 32, // Super-ellipse
    full: 9999,
  },

  // Elevation defined via Ambient Glow Luminance, not drop shadow
  elevation: {
    floating: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08, // 8% white underglow
      shadowRadius: 16,
      elevation: 5,
    },
    hover: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};

// Ghost Border Mixin: "specular highlight" effect to make glass 3D
export const ghostBorder = {
  borderTopWidth: 0.5,
  borderLeftWidth: 0.5,
  borderRightWidth: 0.5,
  borderBottomWidth: 0.5,
  borderTopColor: theme.colors.outlineSpecularHigh, // Top catching light
  borderLeftColor: theme.colors.outlineSpecularHigh, // Left catching light
  borderBottomColor: theme.colors.outlineSpecularLow, // Shadowed edge
  borderRightColor: theme.colors.outlineSpecularLow, // Shadowed edge
};
