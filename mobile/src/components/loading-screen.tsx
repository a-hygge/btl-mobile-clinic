import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

export function LoadingScreen() {
  const lottieOpacity = useRef(new Animated.Value(0)).current;
  const lottieScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(12)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Lottie fades in + scales up
    Animated.parallel([
      Animated.timing(lottieOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(lottieScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Title fades in after a short delay
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtitle fades in last
    Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 500,
      delay: 700,
      useNativeDriver: true,
    }).start();
  }, [lottieOpacity, lottieScale, titleOpacity, titleTranslateY, subtitleOpacity]);

  return (
    <LinearGradient
      colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Soft glow behind animation */}
      <View style={styles.glow} />

      {/* Lottie animation */}
      <Animated.View
        style={[
          styles.lottieWrapper,
          { opacity: lottieOpacity, transform: [{ scale: lottieScale }] },
        ]}
      >
        <LottieView
          source={require('../assets/animations/medical-hero.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </Animated.View>

      {/* App title */}
      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslateY }],
        }}
      >
        <Text variant="headlineMedium" style={styles.title}>
          BTL Healthcare
        </Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={{ opacity: subtitleOpacity }}>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Preparing your care dashboard
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#90CAF9',
    opacity: 0.35,
  },
  lottieWrapper: {
    width: 200,
    height: 200,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontWeight: '700',
    color: '#1565C0',
    marginTop: 4,
  },
  subtitle: {
    color: '#1976D2',
    fontWeight: '500',
  },
});
