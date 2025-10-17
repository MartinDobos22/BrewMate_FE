import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { TasteProfileVector, TasteDimension } from '../../types/Personalization';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

export interface TasteProfileVisualizationProps {
  profile: TasteProfileVector;
  communityAverage?: TasteProfileVector;
  onValueChange?: (dimension: TasteDimension, value: number) => void;
}

const dimensions: TasteDimension[] = ['sweetness', 'acidity', 'bitterness', 'body'];
const size = 260;
const center = size / 2;
const radius = size / 2 - 24;
const labels: Record<TasteDimension, string> = {
  sweetness: 'Sladkosť',
  acidity: 'Kyslosť',
  bitterness: 'Horkosť',
  body: 'Telo',
};

/**
 * Zobrazenie chuťového profilu cez radar graf s animovanými prechodmi.
 */
const TasteProfileVisualization: React.FC<TasteProfileVisualizationProps> = ({
  profile,
  communityAverage,
  onValueChange,
}) => {
  const sweetness = useSharedValue(profile.sweetness);
  const acidity = useSharedValue(profile.acidity);
  const bitterness = useSharedValue(profile.bitterness);
  const body = useSharedValue(profile.body);

  useEffect(() => {
    sweetness.value = withTiming(profile.sweetness, { duration: 650 });
    acidity.value = withTiming(profile.acidity, { duration: 650 });
    bitterness.value = withTiming(profile.bitterness, { duration: 650 });
    body.value = withTiming(profile.body, { duration: 650 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const animatedProps = useAnimatedProps(() => {
    const vector: TasteProfileVector = {
      sweetness: sweetness.value,
      acidity: acidity.value,
      bitterness: bitterness.value,
      body: body.value,
    };
    return {
      points: buildPointString(vector),
    };
  });

  const communityPoints = useMemo(() => {
    if (!communityAverage) {
      return undefined;
    }
    return buildPointString(communityAverage);
  }, [communityAverage]);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {[1, 2, 3, 4, 5].map((step) => (
          <Circle
            key={`grid-${step}`}
            cx={center}
            cy={center}
            r={(radius * step) / 5}
            stroke="#e0e0e0"
            strokeWidth={1}
            fill="none"
          />
        ))}

        {dimensions.map((dimension, index) => {
          const { x, y } = polarToCartesian(index, dimensions.length, radius + 12);
          const axisEnd = polarToCartesian(index, dimensions.length, radius);
          return (
            <React.Fragment key={dimension}>
              <Line
                x1={center}
                y1={center}
                x2={axisEnd.x}
                y2={axisEnd.y}
                stroke="#c4c4c4"
                strokeWidth={1}
              />
              <SvgText x={x} y={y} fill="#333" fontSize={12} textAnchor="middle">
                {labels[dimension]}
              </SvgText>
            </React.Fragment>
          );
        })}

        {communityPoints && (
          <Polygon points={communityPoints} fill="rgba(53, 88, 205, 0.15)" stroke="#3558cd" strokeWidth={2} />
        )}

        <AnimatedPolygon
          animatedProps={animatedProps}
          fill="rgba(255, 128, 0, 0.2)"
          stroke="#ff8000"
          strokeWidth={3}
        />
      </Svg>

      <View style={styles.controls}>
        {dimensions.map((dimension) => (
          <View key={`control-${dimension}`} style={styles.controlRow}>
            <Text style={styles.controlLabel}>{labels[dimension]}</Text>
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => handleAdjustment(dimension, -0.5, profile, onValueChange)}
              >
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.valueText}>{profile[dimension].toFixed(1)}</Text>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => handleAdjustment(dimension, 0.5, profile, onValueChange)}
              >
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {communityAverage && (
        <Text style={styles.legend}>
          Komunitný priemer: {communityAverage.sweetness.toFixed(1)} sladkosť /{' '}
          {communityAverage.body.toFixed(1)} telo
        </Text>
      )}
    </View>
  );
};

function handleAdjustment(
  dimension: TasteDimension,
  delta: number,
  profile: TasteProfileVector,
  onValueChange?: (dimension: TasteDimension, value: number) => void,
) {
  if (!onValueChange) {
    return;
  }
  const nextValue = Math.min(10, Math.max(0, Number((profile[dimension] + delta).toFixed(1))));
  onValueChange(dimension, nextValue);
}

function buildPointString(vector: TasteProfileVector): string {
  return dimensions
    .map((dimension, index) => {
      const value = vector[dimension];
      const scaledRadius = (value / 10) * radius;
      const { x, y } = polarToCartesian(index, dimensions.length, scaledRadius);
      return `${x},${y}`;
    })
    .join(' ');
}

function polarToCartesian(index: number, total: number, r: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const x = center + r * Math.cos(angle);
  const y = center + r * Math.sin(angle);
  return { x, y };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  controls: {
    marginTop: 16,
    width: '100%',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  controlLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff8000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  valueText: {
    width: 48,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  legend: {
    marginTop: 12,
    color: '#666',
    fontSize: 12,
  },
});

export default TasteProfileVisualization;
