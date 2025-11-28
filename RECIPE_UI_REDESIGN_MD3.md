# Recipe UI Redesign - Material Design 3

## 📋 Prehľad

Komplexný redizajn generovania a zobrazenia receptov v aplikácii BrewMate podľa Material Design 3 (Material You) princípov. Redesign prináša 10-snímkový storytelling zážitok s modernými animáciami a mikrointerakciami.

## 🎨 Dizajn Princípy

### Material Design 3 (Material You)
- **Adaptívne farby**: Kávová paleta prispôsobená používateľovi
- **Elevation system**: Použitie tieňov a vrstiev pre hĺbku
- **Rounded corners**: Zaoblené tvary s radius 24-32px
- **Typography**: Čistá hierarchia s dôrazom na čitateľnosť
- **Motion**: Jemné, prirodzené animácie (250-400ms)

### Farebná Paleta

```typescript
materialYouCoffee = {
  primary: '#6F4E37',           // espresso
  primaryContainer: '#A67C52',  // cappuccino
  secondary: '#D4A574',         // latte
  secondaryContainer: '#E8D3B0', // foam
  tertiary: '#FFB085',          // warm accent
  surface: '#FFF8F0',           // light background

  gradients: {
    hero: ['#FFF8F0', '#E8D3B0', '#A67C52'],
    liquid: ['#6F4E37', '#A67C52', '#D4A574'],
    steam: ['rgba(255,255,255,0.4)', 'rgba(232,211,176,0.2)'],
  }
}
```

## 📱 10-Snímkový Zážitok

### **Snímok 1: Hero - Úvodný Príbeh**
**Účel**: Uvítať používateľa do kávového príbehu
**Layout**: Centrálna karta s veľkou ikonou, gradientovým pozadím
**Animácie**:
- Fade in + scale up (400ms ease-out)
- Para stúpajúca z ikony (loop animation)
- Pulse efekt na ikone

**Komponenty**:
- `SteamAnimation` - stúpajúca para
- Hero text s typografickou hierarchiou

---

### **Snímok 2: Ingrediencie**
**Účel**: Interaktívny zoznam ingrediencií
**Layout**: Vertikálny grid ingredient chips
**Animácie**:
- Stagger animation pri zobrazení (100ms delay medzi položkami)
- Tap → scale + rotation + tooltip reveal

**Komponenty**:
- `IngredientChip` - interaktívna ingrediencia
- `BaristaTooltip` - tip pri kliknutí

**Mikrointerakcie**:
- Kliknutie na ingredient → zobrazí tooltip s tipom
- Haptic feedback pri interakcii

---

### **Snímok 3: Príprava Náčinia**
**Účel**: Checklist náčinia potrebného na prípravu
**Layout**: Timeline checklist
**Animácie**:
- Check-mark bounce animation (300ms)
- Progress circle fill

**Komponenty**:
- `ChecklistItem` - interaktívna položka s checkboxom
- Timeline progress

---

### **Snímok 4: Zmletie Kávy**
**Účel**: Vizualizácia hrúbky mletia
**Layout**: Centrálna ilustrácia mlynčeka, slider/scale
**Animácie**:
- Rotácia mlynčeka (2s loop)
- Padajúce kávové častice (opacity fade)

**Vizuálne prvky**:
- Gradient od espresso do latte
- Animované častice

---

### **Snímok 5: Zahrievanie Vody**
**Účel**: Nastavenie správnej teploty
**Layout**: Termometer vizualizácia, circular timer
**Animácie**:
- Rising liquid level (gradient fill)
- Para stúpajúca (opacity + translateY loop)
- Timer countdown

**Komponenty**:
- `CircularTimer` - kruhový countdown
- Teplotný gradient indicator

---

### **Snímok 6: Blooming (Kvitnutie)**
**Účel**: Prvé zalievanie - vypúšťanie CO2
**Layout**: Liquid animation + timer
**Animácie**:
- Liquid pouring (gradient flow zhora dole, 2s ease-in-out)
- Expanding ripples
- Circular timer countdown (30s)

**Komponenty**:
- `LiquidAnimation` type="pour"
- `CircularTimer`
- `BaristaTooltip`

---

### **Snímok 7: Prvé Nalievanie**
**Účel**: Hlavné lievanie v špirále
**Layout**: Split view - ilustrácia + návod
**Animácie**:
- Spirálový pohyb vody (circular path, 3s loop)
- Level indicator stúpa (45s)
- Timer countdown

**Komponenty**:
- `LiquidAnimation` type="fill"
- Spiral path visualization

---

### **Snímok 8: Druhé Nalievanie**
**Účel**: Dorovnanie objemu
**Layout**: Progress circle, wave animation
**Animácie**:
- Circle progress fill (250ms ease-out)
- Wave motion (1.5s ease-in-out loop)

**Komponenty**:
- Donut chart progress
- Wave overlay

---

### **Snímok 9: Finálna Extrakcia**
**Účel**: Dokončenie procesu
**Layout**: Centrálny timer, dripping animation
**Animácie**:
- Dripping kvapky (každá 2s)
- Shimmer effect na tekutine (3s sweep)

**Komponenty**:
- `LiquidAnimation` type="drip"
- `CircularTimer`

---

### **Snímok 10: Zhrnutie & Experimentovanie**
**Účel**: Ochutnávka a zdieľanie
**Layout**: 3-column grid (Zhodnotenie | Zdieľaj | Experimentuj)
**Animácie**:
- Cards slide in from bottom (stagger 150ms)
- Tap → scale + shadow elevation

**Mikrointerakcie**:
- Star rating scale + color change (250ms)
- Share button bounce + social icons reveal
- Tips horizontal carousel

---

## 🧩 Nové Komponenty

### 1. `IngredientChip.tsx`
Interaktívny ingredient s tooltip-om
- **Props**: icon, name, amount, tip, index
- **Animácie**: Scale, rotation, tooltip fade-in
- **Použitie**: Ingredients slide

### 2. `LiquidAnimation.tsx`
Animácia prelievania tekutiny
- **Types**: 'pour', 'drip', 'fill'
- **Animácie**: Gradient flow, kvapky, level fill
- **Použitie**: Bloom, pour, finish slides

### 3. `BaristaTooltip.tsx`
Tooltip s tipom od baristu
- **Props**: tip, visible
- **Animácie**: Fade-in + slide up
- **Použitie**: Všetky slides s tipmi

### 4. `ProgressTimeline.tsx`
Timeline progress indicator
- **Props**: currentStep, totalSteps, steps
- **Animácie**: Spring animation, node highlight
- **Použitie**: Header progress tracking

### 5. `SteamAnimation.tsx`
Animácia stúpajúcej pary
- **Animácie**: 3 vrstvy pary s rôznymi rýchlosťami
- **Použitie**: Hero slide, heat slide

### 6. `CircularTimer.tsx`
Kruhový progress timer
- **Props**: seconds, autoStart
- **Animácie**: Circle progress, pulse when done
- **Použitie**: Všetky kroky s časovačom

---

## 🎬 Animačné Špecifikácie

### Prechody medzi snímkami
- **Duration**: 300ms
- **Easing**: ease-in-out
- **Transform**: scale (0.9 → 1 → 0.9)
- **Opacity**: 0.3 → 1 → 0.3

### Mikrointerakcie
- **Button press**: 100ms scale to 0.95, spring back
- **Check-mark**: 300ms bounce
- **Tooltip reveal**: 250ms fade + slide

### Liquid animations
- **Pour**: 2s ease-in-out, gradient flow
- **Drip**: 2s per drop, opacity fade
- **Fill**: Variable based on step time

### Steam animation
- **Duration**: 3-4s per layer
- **Transform**: translateY (-100px), scaleX (1.5)
- **Opacity**: 0 → 0.6 → 0.3 → 0

---

## 📁 Štruktúra Súborov

```
src/
├── theme/
│   └── materialYouColors.ts          # Material You farebná paleta
├── components/
│   └── recipes/
│       ├── IngredientChip.tsx        # Interaktívny ingredient
│       ├── LiquidAnimation.tsx       # Animácia tekutiny
│       ├── BaristaTooltip.tsx        # Tip od baristu
│       ├── ProgressTimeline.tsx      # Timeline progress
│       ├── SteamAnimation.tsx        # Animácia pary
│       └── CircularTimer.tsx         # Kruhový timer
├── screens/
│   └── RecipeStepsScreen/
│       ├── RecipeStepsScreen.tsx     # Pôvodný screen (zachovaný)
│       └── RecipeStepsScreenMD3.tsx  # Nový Material Design 3 screen
└── components/utils/
    └── AITextFormatter.ts            # Rozšírený o typy krokov a tipy
```

---

## 🔄 Integrácia

### Použitie nového screenu

```typescript
import RecipeStepsScreenMD3 from './screens/RecipeStepsScreen/RecipeStepsScreenMD3';

// V komponente
<RecipeStepsScreenMD3
  recipe={generatedRecipe}
  brewDevice="V60"
  onBack={() => navigation.goBack()}
/>
```

### Rozšírený RecipeStep interface

```typescript
export interface RecipeStep {
  number: number;
  text: string;
  time?: number;
  icon: string;
  type?: 'hero' | 'ingredients' | 'equipment' | 'grind' | 'heat' |
         'bloom' | 'pour1' | 'pour2' | 'finish' | 'summary';
  tip?: string; // Automaticky generovaný tip od baristu
}
```

---

## 🎯 Benefity Redesignu

### UX Zlepšenia
✅ **Storytelling prístup** - Používateľ sa cíti ako súčasť procesu
✅ **Interaktivita** - Mikrointerakcie zvyšujú engagement
✅ **Vizuálna hierarchia** - Jasná navigácia a progress tracking
✅ **Edukačné tipy** - Používateľ sa učí počas varenia

### Technické Zlepšenia
✅ **Modulárne komponenty** - Znovupoužiteľné building blocks
✅ **Typová bezpečnosť** - Rozšírené TypeScript interfaces
✅ **Animačný systém** - Konzistentné animácie naprieč UI
✅ **Material Design 3** - Moderný, prístupný dizajn systém

---

## 🚀 Ďalšie Kroky

### Fáza 1: Testovanie
- [ ] Manuálne testovanie na zariadeniach
- [ ] Testovanie animácií na výkone
- [ ] Accessibility audit

### Fáza 2: Rozšírenia
- [ ] Dark mode podpora
- [ ] Vlastné farebné schémy používateľa
- [ ] Hlasové ovládanie krokov
- [ ] Uložené obľúbené recepty s poznámkami

### Fáza 3: Optimalizácie
- [ ] Performance profiling
- [ ] Animácie optimalizácia
- [ ] Redukcia bundle size

---

## 📚 Referencie

- [Material Design 3 Guidelines](https://m3.material.io/)
- [Material You Color System](https://m3.material.io/styles/color/overview)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Linear Gradient Documentation](https://github.com/react-native-linear-gradient/react-native-linear-gradient)

---

**Vytvorené**: 2025-10-26
**Autor**: Claude Code
**Verzia**: 1.0.0
