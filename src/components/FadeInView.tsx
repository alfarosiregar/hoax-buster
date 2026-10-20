import React, { ReactNode, useEffect, useRef } from 'react';
import { ViewStyle, Animated, Easing } from 'react-native';

/**
 * FadeInView — Komponen wrapper untuk efek transisi masuk
 * 
 * Memberikan efek fade-in + slide-up yang halus
 * dengan dukungan staggered animation (delay bertingkat).
 */

interface FadeInViewProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: ViewStyle | ViewStyle[];
}

const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  delay = 0,
  duration = 500,
  translateY = 20,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration,
        delay: delay,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smoother custom easing
        useNativeDriver: true,
      }),
      Animated.spring(translate, {
        toValue: 0,
        delay: delay,
        friction: 9,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, opacity, translate]);

  return (
    <Animated.View
      style={[
        {
          opacity: opacity,
          transform: [{ translateY: translate }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default FadeInView;
