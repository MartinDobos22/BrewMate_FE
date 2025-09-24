/*
 * Radarový graf so štyrmi osami a animovaným porovnaním priemeru.
 */
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {G, Line, Polygon, Text as SvgText} from 'react-native-svg';
import Animated, {useAnimatedProps, useSharedValue, withTiming} from 'react-native-reanimated';
import type {RadarStats} from '../../types/gamification';

interface Props {
  stats: RadarStats;
}

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const AXES = ['brewing', 'exploration', 'social', 'knowledge'] as const;

const StatsRadarChart: React.FC<Props> = ({stats}) => {
  const progress = useSharedValue(0);
  progress.value = withTiming(1, {duration: 600});

  const points = useMemo(() => calculatePoints(stats), [stats]);
  const averagePoints = useMemo(() => calculatePoints({
    brewing: stats.averageComparison ?? 0.5,
    exploration: stats.averageComparison ?? 0.5,
    social: stats.averageComparison ?? 0.5,
    knowledge: stats.averageComparison ?? 0.5,
  }), [stats.averageComparison]);

  const animatedProps = useAnimatedProps(() => ({
    points: points
      .map((point) => `${point.x * progress.value},${point.y * progress.value}`)
      .join(' '),
  }));

  const averageProps = useAnimatedProps(() => ({
    points: averagePoints
      .map((point) => `${point.x * progress.value},${point.y * progress.value}`)
      .join(' '),
  }));

  return (
    <View style={styles.container}>
      <Svg width={240} height={240} viewBox="-120 -120 240 240">
        <G>
          {Array.from({length: 4}, (_, index) => (
            <AnimatedLine
              key={index}
              x1={0}
              y1={0}
              x2={points[index].x}
              y2={points[index].y}
              stroke="#334155"
              strokeWidth={1}
            />
          ))}
          <AnimatedPolygon animatedProps={averageProps} fill="rgba(96,165,250,0.2)" stroke="#60a5fa" strokeWidth={1} />
          <AnimatedPolygon animatedProps={animatedProps} fill="rgba(248,113,113,0.25)" stroke="#f87171" strokeWidth={2} />
          {AXES.map((axis, index) => (
            <SvgText key={axis} x={points[index].x * 1.1} y={points[index].y * 1.1} fill="#e2e8f0" fontSize={10} textAnchor="middle">
              {axis.toUpperCase()}
            </SvgText>
          ))}
        </G>
      </Svg>
      <Text style={styles.caption}>Porovnanie s komunitným priemerom</Text>
    </View>
  );
};

function calculatePoints(stats: RadarStats) {
  const radius = 90;
  return AXES.map((axis, index) => {
    const value = Math.max(0, Math.min(1, stats[axis] ?? 0));
    const angle = (Math.PI / 2) + (index * (2 * Math.PI)) / AXES.length;
    return {
      x: Math.cos(angle) * radius * value,
      y: Math.sin(angle) * radius * value * -1,
    };
  });
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 24,
  },
  caption: {
    color: '#cbd5f5',
    marginTop: 8,
  },
});

export default StatsRadarChart;
