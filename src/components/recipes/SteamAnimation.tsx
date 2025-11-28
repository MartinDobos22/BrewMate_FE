import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { materialYouCoffee } from '../../theme/materialYouColors';

/**
 * Animácia stúpajúcej pary z hrnčeka
 * Vytvorí 3 vrstvy pary s rôznymi rýchlosťami
 */
const SteamAnimation: React.FC = () => {
  const steam1 = useRef(new Animated.Value(0)).current;
  const steam2 = useRef(new Animated.Value(0)).current;
  const steam3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createSteamAnimation = (anim: Animated.Value, duration: number, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createSteamAnimation(steam1, 3000, 0),
      createSteamAnimation(steam2, 3500, 500),
      createSteamAnimation(steam3, 4000, 1000),
    ]).start();
  }, []);

  const renderSteamLayer = (anim: Animated.Value, scale: number) => {
    const translateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -100],
    });

    const opacity = anim.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0, 0.6, 0.3, 0],
    });

    const scaleX = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.5],
    });

    return (
      <Animated.View
        style={[
          styles.steamLayer,
          {
            opacity,
            transform: [{ translateY }, { scaleX }, { scale }],
          },
        ]}
      >
        <LinearGradient
          colors={materialYouCoffee.gradients.steam}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.steamGradient}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {renderSteamLayer(steam1, 0.8)}
      {renderSteamLayer(steam2, 1)}
      {renderSteamLayer(steam3, 1.2)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 80,
    height: 120,
    marginLeft: -40,
    overflow: 'visible',
  },
  steamLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  steamGradient: {
    flex: 1,
    borderRadius: 40,
  },
});

export default SteamAnimation;
