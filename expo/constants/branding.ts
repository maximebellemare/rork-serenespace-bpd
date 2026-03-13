export const BRAND = {
  name: 'BPD Companion',
  tagline: 'Your calm space for emotional clarity',
  shortTagline: 'Pause. Understand. Respond better.',
  supportLine: 'Support for emotional storms and relationship triggers',
} as const;

export const BrandColors = {
  navy: '#1B2838',
  navyLight: '#243447',
  navyMuted: '#2E4156',

  teal: '#4A8B8D',
  tealLight: '#6BAAAB',
  tealMuted: '#3D7577',
  tealSoft: '#E8F4F4',

  lilac: '#9B8EC4',
  lilacLight: '#C4BBE0',
  lilacSoft: '#F0ECF7',

  sage: '#7FA68E',
  sageSoft: '#E8F0EB',

  mist: '#8EAEC4',
  mistSoft: '#E8F0F7',

  cream: '#FAF8F5',
  warmWhite: '#F5F2EE',
  parchment: '#EFECE7',

  charcoal: '#1E2A36',
  charcoalLight: '#2A3A48',

  calm: '#6BA38E',
  calmSoft: '#E3F0EA',

  amber: '#C4956A',
  amberSoft: '#F5E8DA',

  rose: '#C47878',
  roseSoft: '#F5E0E0',

  textPrimary: '#1B2838',
  textSecondary: '#5A6B7A',
  textMuted: '#8E9BAA',
  textOnDark: '#F0EDE9',
  textOnDarkMuted: 'rgba(240, 237, 233, 0.65)',
} as const;

export const BrandTypography = {
  display: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -1,
    lineHeight: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  overline: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
} as const;

export const BrandSpacing = {
  screenPadding: 22,
  cardRadius: 18,
  cardRadiusSmall: 14,
  buttonRadius: 14,
  chipRadius: 24,
  iconRadius: 14,
  sectionGap: 24,
  cardPadding: 18,
  cardShadow: {
    shadowColor: 'rgba(27, 40, 56, 0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardShadowLight: {
    shadowColor: 'rgba(27, 40, 56, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
