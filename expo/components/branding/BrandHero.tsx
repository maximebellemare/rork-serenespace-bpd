import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '@/constants/colors';
import { BRAND, BrandTypography } from '@/constants/branding';
import BrandLogo from './BrandLogo';

interface BrandHeroProps {
  contextMessage?: string;
  showFullBrand?: boolean;
}

export default function BrandHero({ contextMessage, showFullBrand = true }: BrandHeroProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.heroBackground}>
        <View style={styles.orbitRingOuter} />
        <View style={styles.orbitRingInner} />
        <View style={styles.heroContent}>
          <View style={styles.logoRow}>
            <BrandLogo size={50} variant="light" animated />
          </View>
          <Text style={styles.brandName}>{BRAND.name}</Text>
          {showFullBrand && (
            <Text style={styles.tagline}>{BRAND.tagline}</Text>
          )}
          {contextMessage && (
            <Text style={styles.contextMessage}>{contextMessage}</Text>
          )}
        </View>
        <View style={styles.glowAccent} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  heroBackground: {
    backgroundColor: Colors.brandNavy,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  heroContent: {
    alignItems: 'center' as const,
    zIndex: 2,
  },
  logoRow: {
    marginBottom: 16,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#F0EDE9',
    letterSpacing: -0.8,
    textAlign: 'center' as const,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(74, 139, 141, 0.9)',
    marginTop: 6,
    textAlign: 'center' as const,
    letterSpacing: 0.3,
  },
  contextMessage: {
    ...BrandTypography.body,
    color: 'rgba(240, 237, 233, 0.7)',
    marginTop: 12,
    textAlign: 'center' as const,
    paddingHorizontal: 16,
  },
  orbitRingOuter: {
    position: 'absolute' as const,
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(74, 139, 141, 0.12)',
  },
  orbitRingInner: {
    position: 'absolute' as const,
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(155, 142, 196, 0.1)',
  },
  glowAccent: {
    position: 'absolute' as const,
    top: 20,
    left: '40%' as unknown as number,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(74, 139, 141, 0.08)',
  },
});
