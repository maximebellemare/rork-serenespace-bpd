import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Colors from '@/constants/colors';

interface BrandLogoProps {
  size?: number;
  variant?: 'default' | 'light' | 'dark';
  animated?: boolean;
}

export default function BrandLogo({ size = 48, variant = 'default', animated = false }: BrandLogoProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [animated, pulseAnim, fadeAnim]);

  const primaryColor = variant === 'light' ? '#FFFFFF' : Colors.brandTeal;
  const secondaryColor = variant === 'light' ? 'rgba(255,255,255,0.5)' : Colors.brandLilac;
  const bgColor = variant === 'dark' ? Colors.brandNavy : variant === 'light' ? 'rgba(255,255,255,0.15)' : Colors.brandTealSoft;

  const svgSize = size * 0.6;
  const center = svgSize / 2;
  const outerR = center * 0.85;
  const innerR = center * 0.4;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: bgColor,
        },
        animated && {
          transform: [{ scale: pulseAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <Circle
          cx={center}
          cy={center}
          r={outerR}
          stroke={primaryColor}
          strokeWidth={1.5}
          fill="none"
          opacity={0.35}
        />
        <Circle
          cx={center}
          cy={center}
          r={outerR * 0.7}
          stroke={secondaryColor}
          strokeWidth={1}
          fill="none"
          opacity={0.25}
        />
        <Circle
          cx={center}
          cy={center}
          r={innerR}
          fill={primaryColor}
          opacity={0.9}
        />
        <Path
          d={`M ${center} ${center - outerR * 0.15} 
              Q ${center + outerR * 0.35} ${center - outerR * 0.05} ${center + outerR * 0.5} ${center + outerR * 0.15}
              Q ${center + outerR * 0.35} ${center + outerR * 0.35} ${center} ${center + outerR * 0.5}
              Q ${center - outerR * 0.35} ${center + outerR * 0.35} ${center - outerR * 0.5} ${center + outerR * 0.15}
              Q ${center - outerR * 0.35} ${center - outerR * 0.05} ${center} ${center - outerR * 0.15} Z`}
          fill={primaryColor}
          opacity={0.15}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
