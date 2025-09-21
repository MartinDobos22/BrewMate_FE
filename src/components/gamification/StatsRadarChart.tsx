import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import type { RadarStat } from '../../types/gamification';

interface Props {
  stats: RadarStat[];
}

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

/**
 * Radarový graf so štatistikami hráča.
 */
export const StatsRadarChart: React.FC<Props> = ({ stats }) => {
  const animated = useSharedValue(0);
  const animatedPlayerProps = useAnimatedProps(() => ({ opacity: animated.value }));
  const animatedAverageProps = useAnimatedProps(() => ({ opacity: animated.value }));

  useEffect(() => {
    animated.value = withTiming(1, { duration: 600 });
  }, [animated, stats]);

  const points = useMemo(() => buildPoints(stats, (value) => value), [stats]);
  const averagePoints = useMemo(() => buildPoints(stats, (value, stat) => stat.average), [stats]);

  return (
    <View style={styles.container}>
      <Svg width={220} height={220} viewBox="-110 -110 220 220">
        {Array.from({ length: 4 }).map((_, index) => (
          <Polygon
            key={index}
            points={buildGrid(stats.length, (index + 1) / 4)}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
            fill="none"
          />
        ))}
        {stats.map((stat, index) => {
          const angle = (index / stats.length) * Math.PI * 2;
          return (
            <Line
              key={stat.key}
              x1={0}
              y1={0}
              x2={Math.cos(angle) * 100}
              y2={Math.sin(angle) * 100}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
            />
          );
        })}
        <AnimatedPolygon
          points={points}
          fill="rgba(99, 179, 237, 0.35)"
          stroke="#63b3ed"
          strokeWidth={2}
          animatedProps={animatedPlayerProps}
        />
        <AnimatedPolygon
          points={averagePoints}
          fill="rgba(251, 211, 141, 0.25)"
          stroke="#fbd38d"
          strokeWidth={2}
          animatedProps={animatedAverageProps}
        />
        {stats.map((stat, index) => {
          const angle = (index / stats.length) * Math.PI * 2;
          const x = Math.cos(angle) * 110;
          const y = Math.sin(angle) * 110;
          return (
            <SvgText key={stat.key} x={x} y={y} fill="#fff" fontSize={12} textAnchor={x > 0 ? 'start' : 'end'}>
              {labelMap[stat.key] ?? stat.key}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#63b3ed' }]} />
          <Text style={styles.legendText}>Tvoje skóre</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#fbd38d' }]} />
          <Text style={styles.legendText}>Komunita</Text>
        </View>
      </View>
    </View>
  );
};

const labelMap: Record<RadarStat['key'], string> = {
  brewing: 'Brew',
  exploration: 'Objavy',
  social: 'Komunita',
  knowledge: 'Znalosti',
};

const buildGrid = (count: number, factor: number) => {
  const angleStep = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, index) => {
    const angle = angleStep * index;
    const radius = 100 * factor;
    return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
  }).join(' ');
};

const buildPoints = (stats: RadarStat[], selector: (value: number, stat: RadarStat) => number) => {
  const angleStep = (Math.PI * 2) / stats.length;
  return stats
    .map((stat, index) => {
      const value = selector(stat.value, stat);
      const radius = (value / 100) * 100;
      const angle = angleStep * index;
      return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
    })
    .join(' ');
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    color: '#a0aec0',
  },
});
