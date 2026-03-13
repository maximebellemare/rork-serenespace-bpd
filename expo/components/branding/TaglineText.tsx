import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface TaglineTextProps {
  text?: string;
  variant?: 'default' | 'light' | 'muted';
  size?: 'small' | 'medium';
}

export default function TaglineText({
  text = 'Your calm space for emotional clarity',
  variant = 'default',
  size = 'medium',
}: TaglineTextProps) {
  return (
    <Text
      style={[
        styles.tagline,
        size === 'small' && styles.small,
        variant === 'light' && styles.light,
        variant === 'muted' && styles.muted,
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  tagline: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.brandTeal,
    letterSpacing: 0.3,
  },
  small: {
    fontSize: 12,
  },
  light: {
    color: 'rgba(74, 139, 141, 0.85)',
  },
  muted: {
    color: Colors.textMuted,
  },
});
