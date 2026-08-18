/**
 * Figma design tokens for Movement app.
 * Extracted directly from Figma file YpyGPdnTZHGcNuX4ohcU2Y.
 */

export const M = {
  // Backgrounds
  bg: '#07060F',
  bgAlt: '#14121C',

  // Surfaces
  surface: '#0F0E1C',
  card: '#151424',
  cardMid: '#201E29',
  surfaceBright: '#35333F',

  // Borders
  border: 'rgba(255,255,255,0.10)',
  borderFaint: 'rgba(255,255,255,0.07)',
  borderSubtle: 'rgba(255,255,255,0.05)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8DA0',
  textOnSurface: '#B9CAC2',
  textMuted: '#35333F',

  // Accent — Teal
  teal: '#0AF0C0',
  tealDim: '#00E0B3',
  tealGlow: 'rgba(10,240,192,0.25)',
  tealFaint: 'rgba(10,240,192,0.10)',
  tealBorder: 'rgba(0,224,179,0.20)',

  // Accent — Blue
  blue: '#3B82F6',
  blueDim: '#0566D9',

  // Gradient (teal → blue)
  gradientStart: '#0AF0C0',
  gradientEnd: '#3B82F6',

  // Amber / achievements
  amber: '#F59E0B',
  amberFaint: 'rgba(245,158,11,0.20)',
  amberBorder: 'rgba(245,158,11,0.40)',

  // Danger
  danger: '#FFB4AB',
  dangerBorder: 'rgba(147,0,10,0.30)',
  dangerDark: '#690005',

  // Misc
  primary: '#BBFFE6',
  white: '#FFFFFF',
} as const;

export const FONT = {
  playfair: 'PlayfairDisplay_700Bold',
  playfairRegular: 'PlayfairDisplay_400Regular',
  inter: undefined as string | undefined, // system font
} as const;

export const RADIUS = {
  sm: 6,
  md: 8,
  card: 12,
  cardLg: 14,
  xl: 16,
  pill: 9999,
} as const;

export const SPACE = {
  screenH: 20, // horizontal screen margin
  cardPad: 24,
  sectionGap: 48,
} as const;
