import React, { useMemo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { homeStyles } from './styles/HomeScreen.styles';
import { TasteRadarScores } from '../utils/tasteProfile';

interface TasteProfileRadarCardProps {
  scores: TasteRadarScores | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onEdit: () => void;
}

type AxisKey = keyof TasteRadarScores;

const axes: { key: AxisKey; label: string }[] = [
  { key: 'acidity', label: 'Acidity' },
  { key: 'sweetness', label: 'Sweet' },
  { key: 'body', label: 'Body' },
  { key: 'bitterness', label: 'Bitter' },
  { key: 'aroma', label: 'Aroma' },
  { key: 'fruitiness', label: 'Fruity' },
];

const size = 220;
const center = size / 2;
const radius = size / 2 - 18;

const TasteProfileRadarCard: React.FC<TasteProfileRadarCardProps> = ({
  scores,
  loading = false,
  error,
  onRetry,
  onEdit,
}) => {
  const styles = homeStyles();

  const gridPolygons = useMemo(() => {
    return [2, 4, 6, 8, 10].map((level) => buildPolygonPoints(level / 10));
  }, []);

  const dataPolygon = useMemo(() => {
    if (!scores) {
      return '';
    }
    return buildPolygonPointsFromScores(scores);
  }, [scores]);

  const dataDots = useMemo(() => {
    if (!scores) {
      return [];
    }
    return axes.map((axis, index) => ({
      key: axis.key,
      position: pointForValue(scores[axis.key], index, axes.length),
      value: scores[axis.key],
    }));
  }, [scores]);

  return (
    <View style={styles.tasteProfileCard}>
      <View style={styles.tasteProfileHeader}>
        <View>
          <Text style={styles.tasteProfileTitle}>Tvoj chuťový profil</Text>
          <Text style={styles.tasteProfileSubtitle}>AI vyhodnotenie na základe tvojich preferencií</Text>
        </View>
        <TouchableOpacity style={styles.tasteProfileEditButton} onPress={onEdit} activeOpacity={0.85}>
          <Text style={styles.tasteProfileEditButtonText}>Upraviť</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.tasteProfileLoading}>
          <ActivityIndicator color="#D97706" />
          <Text style={styles.tasteProfileLoadingText}>Načítavam chuťový profil...</Text>
        </View>
      ) : error && !scores ? (
        <View style={styles.tasteProfileError}>
          <Text style={styles.tasteProfileErrorText}>{error}</Text>
          {onRetry && (
            <TouchableOpacity style={styles.tasteProfileRetryButton} onPress={onRetry} activeOpacity={0.85}>
              <Text style={styles.tasteProfileRetryText}>Skúsiť znova</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : !scores ? (
        <View style={styles.tasteProfileEmpty}>
          <Text style={styles.tasteProfileEmptyTitle}>Zatiaľ nemáme dáta</Text>
          <Text style={styles.tasteProfileEmptyText}>
            Vyplň dotazník preferencií a získaj personalizovaný chuťový profil.
          </Text>
          <TouchableOpacity style={styles.tasteProfileRetryButton} onPress={onEdit} activeOpacity={0.85}>
            <Text style={styles.tasteProfileRetryText}>Vyplniť dotazník</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tasteProfileChartContainer}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="radar-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="rgba(255, 215, 170, 0.35)" />
                <Stop offset="100%" stopColor="rgba(255, 175, 110, 0.1)" />
              </LinearGradient>
              <LinearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="rgba(234, 88, 12, 0.7)" />
                <Stop offset="100%" stopColor="rgba(249, 115, 22, 0.45)" />
              </LinearGradient>
            </Defs>

            <Polygon points={buildPolygonPoints(1)} fill="url(#radar-bg)" />

            {gridPolygons.map((points, index) => (
              <Polygon key={`grid-${index}`} points={points} fill="none" stroke="rgba(217, 119, 6, 0.18)" strokeWidth={1} />
            ))}

            {axes.map((axis, index) => {
              const { x, y } = pointForValue(10, index, axes.length, radius);
              const labelPosition = pointForValue(10.8, index, axes.length, radius);
              return (
                <React.Fragment key={axis.key}>
                  <Line x1={center} y1={center} x2={x} y2={y} stroke="rgba(217, 119, 6, 0.25)" strokeWidth={1} />
                  <SvgText
                    x={labelPosition.x}
                    y={labelPosition.y}
                    fill="#8B5E34"
                    fontSize={12}
                    textAnchor="middle"
                  >
                    {axis.label}
                  </SvgText>
                </React.Fragment>
              );
            })}

            <Polygon points={dataPolygon} fill="url(#radar-fill)" stroke="rgba(234, 88, 12, 0.85)" strokeWidth={2.5} />

            {dataDots.map((dot) => (
              <Circle key={dot.key} cx={dot.position.x} cy={dot.position.y} r={4.5} fill="#EA580C" stroke="#fff7ed" strokeWidth={2} />
            ))}
          </Svg>
        </View>
      )}
    </View>
  );
};

function buildPolygonPoints(scaleFactor: number): string {
  return axes
    .map((axis, index) => {
      const { x, y } = pointForValue(10 * scaleFactor, index, axes.length);
      return `${x},${y}`;
    })
    .join(' ');
}

function buildPolygonPointsFromScores(scores: TasteRadarScores): string {
  return axes
    .map((axis, index) => {
      const value = scores[axis.key];
      const { x, y } = pointForValue(value, index, axes.length);
      return `${x},${y}`;
    })
    .join(' ');
}

function pointForValue(value: number, index: number, total: number, customRadius?: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const r = (typeof customRadius === 'number' ? customRadius : radius) * (value / 10);
  return {
    x: center + r * Math.cos(angle),
    y: center + r * Math.sin(angle),
  };
}

export default TasteProfileRadarCard;
