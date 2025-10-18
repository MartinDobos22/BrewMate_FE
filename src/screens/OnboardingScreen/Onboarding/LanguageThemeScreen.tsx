import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import { useWindowDimensions } from 'react-native';
import { useTheme } from 'theme/ThemeProvider.tsx';
import OnboardingButton from './components/OnboardingButton';
import {
  getElevationStyle,
  getOnboardingPalette,
  radius,
  spacing,
} from './onboardingPalette';

interface Props {
  navigation: any;
}

const LanguageThemeScreen: React.FC<Props> = ({ navigation }) => {
  const { isDark, setScheme } = useTheme();
  const [language, setLanguage] = useState('sk');
  const [darkMode, setDarkMode] = useState(isDark);
  const palette = useMemo(() => getOnboardingPalette(darkMode), [darkMode]);
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;

  const handleContinue = async () => {
    await AsyncStorage.setItem('@AppLang', language);
    setScheme(darkMode ? 'dark' : 'light');
    navigation.navigate('Permissions');
  };

  return (
    <LinearGradient colors={palette.backgroundGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.decorLayerContainer}>
          <LinearGradient
            colors={[palette.primaryAccent, 'transparent']}
            style={[styles.decorCircle, styles.decorCircleRight]}
          />
          <LinearGradient
            colors={[palette.secondaryAccent, 'transparent']}
            style={[styles.decorCircle, styles.decorCircleLeft]}
          />
        </View>
        <ScrollView
          contentContainerStyle={[styles.content, isLarge && styles.contentLarge]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.heroSurface,
              {
                backgroundColor: palette.primarySurface,
                borderColor: palette.surfaceBorder,
              },
              getElevationStyle(palette, 'high'),
              isLarge && styles.heroSurfaceLarge,
            ]}
          >
            <Text
              style={[styles.eyebrow, { color: palette.secondaryAccent }]}
            >
              Vitaj v BrewMate
            </Text>
            <Text
              style={[styles.title, { color: palette.primaryText, maxWidth: isLarge ? '80%' : '100%' }]}
            >
              Nastav si jazyk a náladu aplikácie v duchu Material You
            </Text>
            <Text style={[styles.subtitle, { color: palette.secondaryText }]}> 
              Prispôsob si prvé dojmy jemnými kávovými tónmi alebo tmavým espresso
              režimom. Všetko je pripravené tak, aby onboarding pôsobil ako pohodlná
              degustácia.
            </Text>
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: palette.secondarySurface,
                    borderColor: palette.surfaceBorder,
                  },
                ]}
              >
                <Text style={[styles.metaLabel, { color: palette.mutedText }]}>Adaptívne UI</Text>
              </View>
              <View
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: palette.secondarySurface,
                    borderColor: palette.surfaceBorder,
                  },
                ]}
              >
                <Text style={[styles.metaLabel, { color: palette.mutedText }]}>Breakpoints {isLarge ? 'tablet' : 'mobil'}</Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.primarySurface,
                borderColor: palette.surfaceBorder,
              },
              getElevationStyle(palette, 'medium'),
            ]}
          >
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: palette.secondaryText }]}>Jazyk rozhrania</Text>
              <View
                style={[
                  styles.pickerWrapper,
                  {
                    backgroundColor: palette.secondarySurface,
                    borderColor: palette.surfaceBorder,
                  },
                ]}
              >
                <Picker
                  selectedValue={language}
                  dropdownIconColor={palette.primaryText}
                  onValueChange={(value) => setLanguage(value)}
                  style={[styles.picker, { color: palette.primaryText }]}
                  itemStyle={{ color: palette.primaryText }}
                >
                  <Picker.Item label="Slovenčina" value="sk" />
                  <Picker.Item label="English" value="en" />
                </Picker>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[styles.fieldLabel, { color: palette.secondaryText }]}>Tmavý režim</Text>
                  <Text style={[styles.helperText, { color: palette.mutedText }]}>Pre espresso atmosféru a večerné prehliadanie.</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{
                    false: `${palette.primaryAccent}55`,
                    true: `${palette.primaryAccent}AA`,
                  }}
                  thumbColor={darkMode ? palette.primaryAccent : palette.secondaryAccent}
                />
              </View>
            </View>

            <View
              style={[
                styles.helperCard,
                {
                  backgroundColor: palette.secondarySurface,
                  borderColor: palette.surfaceBorder,
                },
                getElevationStyle(palette, 'low'),
              ]}
            >
              <Text style={[styles.helperTitle, { color: palette.primaryText }]}>Tip na micro-interakciu</Text>
              <Text style={[styles.helperText, { color: palette.mutedText }]}>
                Pri prepnutí témy jemne animuj gradient pozadia a vytvor parallax posun
                kávových vrstiev pre väčšiu hĺbku.
              </Text>
            </View>

            <OnboardingButton
              label="Pokračovať"
              onPress={handleContinue}
              palette={palette}
              style={styles.cta}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  decorLayerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  decorCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.35,
    transform: [{ rotate: '12deg' }],
  },
  decorCircleRight: {
    top: -60,
    right: -40,
  },
  decorCircleLeft: {
    bottom: -80,
    left: -30,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    zIndex: 1,
  },
  contentLarge: {
    maxWidth: 760,
    alignSelf: 'center',
  },
  heroSurface: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroSurfaceLarge: {
    padding: spacing.xl,
  },
  eyebrow: {
    fontSize: 15,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  metaLabel: {
    fontSize: 13,
    letterSpacing: 0.6,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerWrapper: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchCopy: {
    flex: 1,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  helperCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  helperTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cta: {
    marginTop: spacing.sm,
  },
});

export default LanguageThemeScreen;
