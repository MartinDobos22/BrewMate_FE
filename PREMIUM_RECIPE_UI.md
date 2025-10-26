# Premium Recipe UI - Luxusný Dizajn

## 🌟 Prehľad

Kompletne prepracovaný UI s **luxusným, minimalistickým dizajnom** využívajúcim **glassmorphism**, jemné gradienty a premium animácie. Inšpirovaný high-end coffee shops a moderným app dizajnom.

## 🎨 Dizajn Filozofia

### Premium Feel
- **Glassmorphism**: Priehľadné blur efekty pre moderný vzhľad
- **Soft Shadows**: Jemné, realistické tiene (opacity 0.08-0.16)
- **Subtle Gradients**: Prirodzené kávové tóny bez ostrých prechodov
- **White Space**: Dostatočný priestor pre luxusný pocit
- **Minimal Icons**: Čisté ikony s gradientovými pozadiami

---

## 🎨 Farebná Paleta

```typescript
premiumCoffeeTheme = {
  // Background - jemné krémové tóny
  background: {
    primary: '#FFFBF5',    // Soft cream
    secondary: '#F8F4EE',  // Warm white
    tertiary: '#FFF8EF',   // Lightest cream
  },

  // Coffee tóny - luxusné, nie tmavé
  coffee: {
    darkest: '#4A2C2A',    // Rich espresso
    dark: '#6B4423',       // Dark roast
    medium: '#8B6F47',     // Medium roast
    light: '#B8956A',      // Light roast
    cream: '#D4C4B0',      // Coffee cream
    milk: '#E8DED2',       // Milk foam
  },

  // Accent - soft peachy/coral
  accent: {
    primary: '#E8C4A5',    // Soft peach
    secondary: '#F4D9C6',  // Light peach
    tertiary: '#FFE8D6',   // Peachy cream
    warm: '#FFD7BA',       // Warm apricot
  },

  // Glassmorphism
  glass: {
    white: 'rgba(255, 255, 255, 0.7)',
    whiteLight: 'rgba(255, 255, 255, 0.5)',
    whiteUltraLight: 'rgba(255, 255, 255, 0.3)',
  },

  // Gradienty
  gradients: {
    background: ['#FFFBF5', '#F8F4EE', '#FFE8D6'],
    hero: ['#8B6F47', '#B8956A'],
    liquid: ['#8B6F47', '#B8956A', '#D4C4B0'],
    shine: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0)'],
  },
}
```

---

## 🧩 Premium Komponenty

### 1. **GlassCard**
Glassmorphism karta s blur efektom

**Vlastnosti:**
- Blur effect (iOS BlurView)
- Gradient overlay
- Border highlight (rgba border)
- Soft shadows
- Zaoblené rohy (32px)

**Použitie:**
```typescript
<GlassCard intensity="medium">
  <Text>Your content</Text>
</GlassCard>
```

**Intensity levels:**
- `light`: blur 10
- `medium`: blur 20
- `strong`: blur 30

---

### 2. **PremiumButton**
Luxusný button s gradient a shine efektom

**Vlastnosti:**
- Gradient background
- Shine animation pri tap-e (600ms)
- Scale animation (press: 0.96, release: spring back)
- 3 varianty: primary, secondary, ghost

**Animácie:**
- **PressIn**: Scale to 0.96
- **PressOut**: Spring back + shine sweep
- **Shine**: Translatex -200 → 200 (600ms)

**Použitie:**
```typescript
<PremiumButton
  onPress={handlePress}
  variant="primary"
>
  Ďalší →
</PremiumButton>
```

---

### 3. **PremiumCircularTimer**
Luxusný circular timer s SVG progress a glow efektom

**Vlastnosti:**
- SVG circular progress (gradient stroke)
- Glow animation pri bežaní
- Pulse animation pri dokončení
- Glassmorphism background
- Status indicator (dot + text)

**Animácie:**
- **Progress**: SVG strokeDashoffset (1000ms)
- **Glow**: Opacity 0.3 → 0.8 (1500ms loop)
- **Pulse**: Scale 1 → 1.15 → 1 (spring)

**Použitie:**
```typescript
<PremiumCircularTimer
  seconds={30}
  autoStart={false}
/>
```

---

### 4. **PremiumIngredientChip**
Interaktívny ingredient chip s tooltip-om

**Vlastnosti:**
- Glassmorphism background
- Icon container s gradient
- Tooltip s blur background
- Shine effect pri kliknutí
- Scale + rotation animation

**Animácie:**
- **Press**: Scale 1 → 0.95 → 1 (spring)
- **Tooltip**: Fade + translateY (300ms)
- **Shine**: Sweep effect (600ms)

---

### 5. **PremiumProgressBar**
Luxusný progress bar s gradient a shimmer

**Vlastnosti:**
- Gradient progress fill
- Shimmer animation (loop)
- Progress nodes s shadow
- Step label display

**Animácie:**
- **Progress**: Width 0% → 100% (spring)
- **Shimmer**: TranslateX -100 → 300 (2000ms loop)
- **Nodes**: Border width change

---

## 📱 PremiumRecipeStepsScreen

### Layout Štruktúra

```
┌─────────────────────────────┐
│  Header (BlurView)          │
│  [← Back] BrewMate • V60    │
├─────────────────────────────┤
│  PremiumProgressBar         │
│  ━━━━━━━━━━━━━━━━━━━━━━━   │
├─────────────────────────────┤
│                             │
│   ╔═══════════════════╗     │
│   ║   GlassCard       ║     │
│   ║                   ║     │
│   ║   [Content]       ║     │
│   ║                   ║     │
│   ╚═══════════════════╝     │
│                             │
├─────────────────────────────┤
│  Navigation (BlurView)      │
│  [← Predošlý]  [Ďalší →]    │
└─────────────────────────────┘
```

---

### Slide Typy

#### **1. Hero Slide**
**Layout:**
- Centrálna ikona s gradientom (120x120)
- Veľký nadpis (32px, -1 letter-spacing)
- Popis (16px)
- Dekoratívne body (3 dots)

**Farby:**
- Ikona gradient: 8B6F47 → B8956A
- Background: GlassCard medium

---

#### **2. Ingredients Slide**
**Layout:**
- Title + subtitle
- 3x PremiumIngredientChip
- Tip card na konci

**Komponenty:**
- PremiumIngredientChip pre každú ingredienciu
- ScrollView pre obsah

---

#### **3. Step Slide**
**Layout:**
- Step header (ikona + číslo + time tag)
- Step text (18px, 28 line-height)
- PremiumCircularTimer (ak je time)
- Barista tip card

**Farby:**
- Step icon gradient: 8B6F47 → B8956A
- Time tag: #F4D9C6
- Tip card: #FFE8D6

---

#### **4. Summary Slide**
**Layout:**
- Centrálna ikona (100x100)
- Title + description
- 2 summary cards (Zhodnotenie, Experimentuj)
- Share button

---

## 🎬 Animačné Špecifikácie

### Global Animations

**Background Shimmer:**
- Opacity: 0.3 → 0.7
- Duration: 3000ms
- Loop: infinite
- Layer: Behind all content

**Card Scale (Carousel):**
- Scale: 0.92 → 1 → 0.92
- Opacity: 0.4 → 1 → 0.4
- Based on scroll position

---

### Component Animations

**PremiumButton:**
```typescript
PressIn:  scale to 0.96 (spring)
PressOut: scale to 1 (spring) + shine sweep
Shine:    translateX -200 → 200 (600ms)
```

**PremiumCircularTimer:**
```typescript
Progress: strokeDashoffset (1000ms linear)
Glow:     opacity 0.3 → 0.8 → 0.3 (1500ms loop)
Pulse:    scale 1 → 1.15 → 1 (spring, on done)
```

**PremiumIngredientChip:**
```typescript
Press:    scale 1 → 0.95 → 1 (spring)
Tooltip:  opacity 0 → 1, translateY 10 → 0 (300ms)
Shine:    translateX -200 → 200 (600ms)
```

**PremiumProgressBar:**
```typescript
Progress: width 0% → 100% (spring)
Shimmer:  translateX -100 → 300 (2000ms loop)
```

---

## 🎯 Vizuálne Detaily

### Shadows
```typescript
small:  shadowOpacity: 0.08, shadowRadius: 8
medium: shadowOpacity: 0.12, shadowRadius: 16
large:  shadowOpacity: 0.16, shadowRadius: 24
```

### Border Highlights
- Color: `rgba(255, 255, 255, 0.8)`
- Width: 1px
- Creates subtle 3D effect

### Typography
- **Hero title**: 32px, -1 letter-spacing
- **Section title**: 28px, -0.5 letter-spacing
- **Body**: 16-18px, 24-28 line-height
- **Labels**: 11-14px, uppercase, +1 letter-spacing

### Border Radius
- Cards: 32px
- Buttons: 28px
- Small elements: 20-24px
- Icons: 50% (circular)

---

## 📁 Štruktúra Súborov

```
src/
├── theme/
│   └── premiumCoffeeTheme.ts         # Premium farebná paleta
├── components/
│   └── recipes/
│       ├── GlassCard.tsx             # Glassmorphism karta
│       ├── PremiumButton.tsx         # Luxusný button
│       ├── PremiumCircularTimer.tsx  # Circular timer
│       ├── PremiumIngredientChip.tsx # Ingredient chip
│       └── PremiumProgressBar.tsx    # Progress bar
└── screens/
    └── RecipeStepsScreen/
        ├── RecipeStepsScreen.tsx           # Pôvodný
        ├── RecipeStepsScreenMD3.tsx        # Material Design 3
        └── PremiumRecipeStepsScreen.tsx    # NOVÝ PREMIUM
```

---

## 🚀 Integrácia

### Použitie Premium Screenu

```typescript
import { PremiumRecipeStepsScreen } from './screens/RecipeStepsScreen';

<PremiumRecipeStepsScreen
  recipe={generatedRecipe}
  brewDevice="V60"
  onBack={() => navigation.goBack()}
/>
```

### Požiadavky

**Dependencie:**
```json
{
  "@react-native-community/blur": "^4.x",
  "react-native-linear-gradient": "^2.x",
  "react-native-svg": "^13.x"
}
```

**iOS:**
- BlurView vyžaduje iOS 10+

**Android:**
- BlurView fallback na backgroundColor
- Všetky animácie fungujú natívne

---

## ✨ Benefity Premium Dizajnu

### UX
✅ **Luxusný feel** - High-end vzhľad
✅ **Jemné animácie** - Prirodzené, príjemné
✅ **Glassmorphism** - Moderný trend
✅ **Čitateľnosť** - Dostatočný kontrast
✅ **Interaktivita** - Každá akcia má feedback

### Technické
✅ **Modulárne** - Znovupoužiteľné komponenty
✅ **Performant** - Natívne animácie
✅ **Responsive** - Prispôsobivé layouty
✅ **Type-safe** - TypeScript support
✅ **iOS & Android** - Plná podpora

---

## 🎨 Porovnanie Verzií

| Feature | Original | Material Design 3 | Premium |
|---------|----------|-------------------|---------|
| Glassmorphism | ❌ | ❌ | ✅ |
| Blur Effects | ❌ | ❌ | ✅ |
| Gradient Buttons | ⚠️ | ⚠️ | ✅ |
| Shine Animations | ❌ | ❌ | ✅ |
| Soft Shadows | ⚠️ | ⚠️ | ✅ |
| SVG Progress | ❌ | ❌ | ✅ |
| Premium Feel | ⚠️ | ⚠️ | ✅✅✅ |

---

## 📈 Performance

- **Animácie**: Native driver (60 FPS)
- **Blur**: Hardware accelerated (iOS)
- **Gradients**: Optimalizované
- **Bundle size**: +~50KB (komponenty + SVG)

---

## 🔮 Ďalšie Možnosti

### Rozšírenia
- [ ] Dark mode variant
- [ ] Custom color schemes
- [ ] Haptic feedback
- [ ] Sound effects
- [ ] 3D parallax effects
- [ ] Lottie animations

### Optimalizácie
- [ ] Memoization pre heavy komponenty
- [ ] Lazy loading pre slides
- [ ] Image preloading
- [ ] Animation recycling

---

**Vytvorené**: 2025-10-26
**Verzia**: 2.0.0 Premium
**Autor**: Claude Code

---

## 💎 Záver

Premium Recipe UI prináša **luxusný, moderný dizajn** s **glassmorphism efektmi** a **jemnými animáciami**. Perfektný pre high-end coffee apps a prémiové UX.

Každý detail je starostlivo navrhnutý pre **najlepší vizuálny zážitok** a **plynulú interakciu**.
