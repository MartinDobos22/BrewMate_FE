import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchCoffeeById } from '../../services/homePagesService';
import type { Coffee } from '../../types/Coffee';

/**
 * Screen displaying detailed information about a single scanned coffee.
 * It loads coffee data from the backend using the ID passed via props and shows
 * a structured breakdown of origin, processing, notes, and scoring fields.
 *
 * @param {object} props - Component props.
 * @param {string} props.coffeeId - Identifier of the coffee to fetch and display.
 * @param {() => void} props.onBack - Handler used to close the detail view and return to the list.
 * @returns {JSX.Element} The rendered coffee detail screen.
 */
const ScannedCoffeeDetailScreen: React.FC<{ coffeeId: string; onBack: () => void }> = ({
  coffeeId,
  onBack,
}) => {
  const [coffee, setCoffee] = useState<Coffee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads coffee detail from the API (or offline cache) using the provided ID.
   * The payload is normalized by the service so the UI can render consistent fields.
   */
  const loadCoffee = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchCoffeeById(coffeeId);
      setCoffee(detail);
      if (!detail) {
        setError('Nepodarilo sa načítať detaily kávy.');
      }
    } catch (err) {
      console.error('ScannedCoffeeDetailScreen: failed to load coffee', err);
      setError('Nepodarilo sa načítať detaily kávy.');
      setCoffee(null);
    } finally {
      setLoading(false);
    }
  }, [coffeeId]);

  useEffect(() => {
    void loadCoffee();
  }, [loadCoffee]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6B4423" />
        <Text style={styles.stateText}>Načítavam detaily kávy...</Text>
      </View>
    );
  }

  if (error || !coffee) {
    return (
      <View style={styles.centered}>
        <Text style={styles.stateText}>{error ?? 'Káva sa nenašla.'}</Text>
        <Text style={[styles.stateText, styles.backLink]} onPress={onBack}>
          ← Späť
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.backLink} onPress={onBack}>
        ← Späť
      </Text>
      <Text style={styles.title}>{coffee.name}</Text>
      {coffee.brand ? <Text style={styles.subtitle}>{coffee.brand}</Text> : null}

      <View style={styles.card}>
        <DetailRow label="Pôvod" value={coffee.origin} />
        <DetailRow label="Proces" value={coffee.process} />
        <DetailRow label="Odroda" value={coffee.variety} />
        <DetailRow
          label="Praženie"
          value={typeof coffee.roastLevel === 'number' ? coffee.roastLevel.toString() : undefined}
        />
        <DetailRow
          label="Intenzita"
          value={typeof coffee.intensity === 'number' ? coffee.intensity.toString() : undefined}
        />
        <DetailRow
          label="Hodnotenie"
          value={typeof coffee.rating === 'number' ? `${coffee.rating.toFixed(1)} / 5` : undefined}
        />
        <DetailRow
          label="Zhoda s profilom"
          value={typeof coffee.match === 'number' ? `${coffee.match}%` : undefined}
        />
        {coffee.flavorNotes && coffee.flavorNotes.length > 0 ? (
          <DetailRow label="Chuťové tóny" value={coffee.flavorNotes.join(', ')} />
        ) : null}
      </View>
    </ScrollView>
  );
};

interface DetailRowProps {
  label: string;
  value?: string;
}

/**
 * Simple row component for presenting label/value pairs inside the coffee detail card.
 */
const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C1810',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#5D4E37',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 111, 71, 0.12)',
  },
  row: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    color: '#6B4423',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: '#2C1810',
    fontWeight: '600',
  },
  stateText: {
    marginTop: 8,
    color: '#2C1810',
    textAlign: 'center',
  },
  backLink: {
    color: '#6B4423',
    marginBottom: 12,
  },
});

export default ScannedCoffeeDetailScreen;
