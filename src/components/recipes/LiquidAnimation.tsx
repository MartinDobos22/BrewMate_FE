import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { materialYouCoffee } from '../../theme/materialYouColors';

interface LiquidAnimationProps {
  duration?: number; // duration in seconds
  type: 'pour' | 'drip' | 'fill';
}

/**
 * Animácia prelievania tekutiny
 * - 'pour': Gradient flow zhora dole
 * - 'drip': Kvapky padajúce
 * - 'fill': Postupné vypĺňanie
 */
const LiquidAnimation: React.FC<LiquidAnimationProps> = ({ duration = 3, type }) => {
  const flowAnim = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const dropAnim1 = useRef(new Animated.Value(0)).current;
  const dropAnim2 = useRef(new Animated.Value(0)).current;
  const dropAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (type === 'pour') {
      // Flow animation - gradient sa pohybuje zhora dole
      Animated.loop(
        Animated.timing(flowAnim, {
          toValue: 1,
          duration: duration * 1000,
          useNativeDriver: true,
        })
      ).start();
    } else if (type === 'fill') {
      // Fill animation - postupné vypĺňanie
      Animated.timing(fillAnim, {
        toValue: 1,
        duration: duration * 1000,
        useNativeDriver: false,
      }).start();
    } else if (type === 'drip') {
      // Drip animation - kvapky padajúce s delay
      const createDripAnimation = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      Animated.parallel([
        createDripAnimation(dropAnim1, 0),
        createDripAnimation(dropAnim2, 600),
        createDripAnimation(dropAnim3, 1200),
      ]).start();
    }
  }, [type, duration]);

  const renderPour = () => {
    const translateY = flowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-200, 200],
    });

    return (
      <Animated.View
        style={[
          styles.pourContainer,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <LinearGradient
          colors={materialYouCoffee.gradients.liquid}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.pourGradient}
        />
      </Animated.View>
    );
  };

  const renderFill = () => {
    const height = fillAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.fillContainer}>
        <Animated.View style={[styles.fillLevel, { height }]}>
          <LinearGradient
            colors={[...materialYouCoffee.gradients.liquid].reverse()}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    );
  };

  const renderDrip = () => {
    const drops = [
      { anim: dropAnim1, left: '30%' },
      { anim: dropAnim2, left: '50%' },
      { anim: dropAnim3, left: '70%' },
    ];

    return (
      <View style={styles.dripContainer}>
        {drops.map((drop, index) => {
          const translateY = drop.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 150],
          });
          const opacity = drop.anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 1, 0],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.drop,
                {
                  left: drop.left,
                  opacity,
                  transform: [{ translateY }],
                },
              ]}
            >
              <LinearGradient
                colors={materialYouCoffee.gradients.liquid}
                style={styles.dropGradient}
              />
            </Animated.View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {type === 'pour' && renderPour()}
      {type === 'fill' && renderFill()}
      {type === 'drip' && renderDrip()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
    borderRadius: 24,
  },
  pourContainer: {
    width: '100%',
    height: 400,
  },
  pourGradient: {
    flex: 1,
    opacity: 0.6,
  },
  fillContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fillLevel: {
    width: '100%',
  },
  dripContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  drop: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 12,
    marginLeft: -4,
  },
  dropGradient: {
    flex: 1,
    borderRadius: 8,
  },
});

export default LiquidAnimation;
