import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { BRAND, BrandTypography } from '@/constants/branding';
import BrandLogo from './BrandLogo';

interface BrandHeaderProps {
  showTagline?: boolean;
  showLogo?: boolean;
  variant?: 'default' | 'compact';
  subtitle?: string;
}

export default function BrandHeader({
  showTagline = true,
  showLogo = true,
  variant = 'default',
  subtitle,
}: BrandHeaderProps) {
  const isCompact = variant === 'compact';

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View style={styles.lockupRow}>
        {showLogo && (
          <BrandLogo size={isCompact ? 36 : 44} animated={false} />
        )}
        <View style={styles.textWrap}>
          <Text style={[styles.brandName, isCompact && styles.brandNameCompact]}>
            {BRAND.name}
          </Text>
          {showTagline && !isCompact && (
            <Text style={styles.tagline}>{BRAND.tagline}</Text>
          )}
        </View>
      </View>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  containerCompact: {
    paddingBottom: 4,
  },
  lockupRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  textWrap: {
    flex: 1,
  },
  brandName: {
    ...BrandTypography.title,
    color: Colors.brandNavy,
  },
  brandNameCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.brandTeal,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  subtitle: {
    ...BrandTypography.body,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
