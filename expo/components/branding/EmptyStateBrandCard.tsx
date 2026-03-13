import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { BrandTypography } from '@/constants/branding';
import BrandLogo from './BrandLogo';

interface EmptyStateBrandCardProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
}

export default function EmptyStateBrandCard({ title, message, icon }: EmptyStateBrandCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        {icon ?? <BrandLogo size={56} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconWrap: {
    marginBottom: 18,
  },
  title: {
    ...BrandTypography.subtitle,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  message: {
    ...BrandTypography.body,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
});
