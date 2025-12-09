# Referenčný sprievodca personalizačnými a offline triedami BrewMate

Tento dokument sumarizuje TypeScript a JavaScript triedy, ktoré v aplikácii BrewMate zabezpečujú personalizáciu, denník, odporúčania a offline správanie. Každá sekcia opisuje zodpovednosti, kľúčové metódy, závislosti a väzby na ostatné moduly, aby sa nový vývojár rýchlo zorientoval.

## Obsah
1. [Úložiská a fasády](#uloziska-a-fasady)
2. [Jadro učenia](#jadro-ucenia)
3. [Odporúčací stack](#odporucaci-stack)
4. [Kvíz](#kviz)
5. [Denník a insight služby](#dennik-a-insight-sluzby)
6. [Súkromie](#sukromie)
7. [Počasie a kontext](#pocasie-a-kontext)
8. [Offline vrstva](#offline-vrstva)
9. [Podporné služby](#podporne-sluzby)
10. [Zdieľané singletons a prepojenia](#zdielane-singletons-a-prepojenia)

---

## Úložiská a fasády

### SupabaseLearningStorageAdapter (`App.tsx`)
- **Úloha:** Implementuje rozhranie `LearningStorageAdapter` nad tabuľkami Supabase `user_taste_profile` a `brew_history`. Normalizuje voliteľné stĺpce (napr. `milk_preferences`, `seasonal_adjustments`), aby `PreferenceLearningEngine` vždy dostal kompletný profil.【F:App.tsx†L175-L258】
- **Kľúčové procesy:**
  - `loadProfile` vracia štandardizovaný `UserTasteProfile` a loguje zlyhania do konzoly, namiesto hard crashu aplikácie.【F:App.tsx†L178-L219】
  - `persistProfile` upsertuje vektory chutí, meta údaje a čas prepočtu späť do Supabase.【F:App.tsx†L222-L243】
  - `fetchRecentHistory` načíta posledných 200 varení, mapuje voliteľné polia (`flavor_notes`, `mood`, `water_temp`) a pripraví dáta pre učenie či export.【F:App.tsx†L245-L258】
  - Stubované `fetchSimilarRecipes` a `fetchCommunityFlavorStats` naznačujú budúce rozšírenia o kolaboratívne filtrovanie.【F:App.tsx†L245-L258】

### SupabaseDiaryStorageAdapter (`App.tsx`)
- **Úloha:** `DiaryStorageAdapter` implementácia pre Supabase, ktorá manipuluje s tabuľkou `brew_history` pri práci s denníkom.【F:App.tsx†L260-L329】
- **Kľúčové procesy:**
  - `saveEntry` ukladať hodnotenia, kontext, nálady aj prípadné OCR metadáta.【F:App.tsx†L274-L296】
  - `getEntries` vracia normalizovanú kolekciu denníkových záznamov so zoraďením podľa `created_at`.【F:App.tsx†L298-L322】
  - `deleteEntries` slúži pre úplné vymazanie denníka pri GDPR požiadavkách.【F:App.tsx†L324-L329】

### SupabaseLearningEventAdapter (`App.tsx`)
- **Úloha:** Bridge medzi tabuľkou `learning_events` a modulmi pre súkromie či synchronizáciu. Transformuje Supabase riadky do interného tvaru `LearningEvent` a podporuje hromadné mazanie.【F:App.tsx†L331-L382】

### AsyncDiaryStorageAdapter (`personalizationGateway.ts`)
- **Úloha:** AsyncStorage implementácia `DiaryStorageAdapter` pre offline-first režim a súkromné operácie.【F:src/services/personalizationGateway.ts†L31-L85】
- **Detaily:** Obmedzuje sa na 200 záznamov, deduplikuje podľa `id` a poskytuje `clearAll`, ktorý využíva `PrivacyManager` aj `OfflineSync`.

### AsyncLearningStorageAdapter (`personalizationGateway.ts`)
- **Úloha:** Lokálna implementácia `LearningStorageAdapter`, ktorá udržiava profil, históriu aj cache receptov pri absencii pripojenia.【F:src/services/personalizationGateway.ts†L87-L155】
- **Detaily:** Zahŕňa pomocníkov `appendHistory` a `saveRecipeProfile` používaných fasádou na rýchle aktualizácie bez čakania na server.

### PreferenceEngineFacade (`personalizationGateway.ts`)
- **Úloha:** Fasáda obsluhujúca `PreferenceLearningEngine`, orchestruje zapisovanie varení, queue-uje `LearningEvent` a synchronizuje lokálne/remote úložiská.【F:src/services/personalizationGateway.ts†L157-L352】
- **Kľúčové procesy:**
  - Lazy inicializácia engine a sprístupnenie `getProfile`, `getCommunityAverage` pre UI komponenty.【F:src/services/personalizationGateway.ts†L177-L217】
  - `recordBrew` pripraví `BrewHistoryEntry`, vytvorí zodpovedajúce `LearningEvent`, uloží históriu a okamžite nakŕmi engine pre spätnú väzbu v UI.【F:src/services/personalizationGateway.ts†L219-L273】
  - `saveEvents` ukladá čakajúce udalosti do AsyncStorage a deduplikuje podľa `id`, aby sa zamedzilo duplicitnému uploadu po opätovnom pripojení.【F:src/services/personalizationGateway.ts†L275-L316】

---

## Jadro učenia

### PreferenceLearningEngine (`PreferenceLearningEngine.ts`)
- **Úloha:** Centrálny model personalizácie – spravuje profil, históriu, predpovedá hodnotenia a priebežne upravuje chuťové preferencie.【F:src/services/PreferenceLearningEngine.ts†L20-L200】【F:src/services/PreferenceLearningEngine.ts†L148-L199】
- **Inicializácia:** `initialize` načíta alebo vytvorí default profil, natiahne posledných 200 záznamov a označí engine za pripravený; zlyhania loguje s detailným kontextom.【F:src/services/PreferenceLearningEngine.ts†L47-L83】
- **Predikcie:** `predictRating` kombinuje kosínusovú podobnosť receptu s kontextovými bonusmi (čas dňa, počasie, nálada, podobné recepty) a generuje vysvetlenie pre UI.【F:src/services/PreferenceLearningEngine.ts†L71-L146】
- **Učenie:** `ingestBrew` aplikuje časový úpadok, upravuje preferencie, chuťové poznámky, sezónne korekcie, deteguje zmenu chuti a aktualizuje dôveru pred uložením profilu.【F:src/services/PreferenceLearningEngine.ts†L151-L200】
- **Analytika:** Pomocné metódy vracajú trendy nálad, podobnosť receptov či priemery komunity, ktoré využíva denník aj odporúčania.【F:src/services/PreferenceLearningEngine.ts†L200-L353】

---

## Odporúčací stack

### RecommendationEngine (`recommendation/RecommendationEngine.ts`)
- **Úloha:** Generuje odporúčania receptov podľa profilu, kontextu, počasia a režimu cestovania. Spravuje cache v šifrovanom úložisku pre rýchle odpovede.【F:src/services/recommendation/RecommendationEngine.ts†L13-L209】
- **Workflow:**
  - `getTopPredictions` obohacuje vstup o inferred čas, počasie a náladu, vracia cache pri platnosti alebo požaduje nové recepty zo Supabase.【F:src/services/recommendation/RecommendationEngine.ts†L35-L109】
  - Skórovanie kombinuje preferencie, bonusy/penalty za počasie, dennú dobu a travel mód, následne ukladá výsledok aj vysvetlenie pre UI.【F:src/services/recommendation/RecommendationEngine.ts†L111-L209】
  - `warmCache` (ak je prítomný) umožňuje prefetch odporúčaní pre offline použitie.

### DefaultRecommendationTelemetry (`recommendation/RecommendationTelemetry.ts`)
- **Úloha:** Ľahký event bus informujúci poslucháčov o generovaní odporúčaní, cache hitoch a aktivácii travel módu.【F:src/services/recommendation/RecommendationTelemetry.ts†L5-L40】
- **Použitie:** UI alebo analytics moduly sa môžu prihlásiť cez `addListener` a posielať dáta do logov, segmentov či experimentov.

### TravelModeManager (`recommendation/TravelModeManager.ts`)
- **Úloha:** Sleduje travel mód (zjednodušené odporúčania na cestách), ukladá ho do šifrovaného úložiska s expiráciou a poskytuje `shouldSimplify` pre RecommendationEngine.【F:src/services/recommendation/TravelModeManager.ts†L5-L44】
- **Detaily:** Automaticky expirované stavy zabraňujú dlhodobému “uvoľnenému” režimu, ak používateľ zabudne travel mód vypnúť.

---

## Kvíz

### TasteProfileQuizEngine (`TasteProfileQuizEngine.ts`)
- **Úloha:** Riadi adaptívny chuťový kvíz, persistuje odpovede v šifrovanom úložisku, aktualizuje profil v engine a vracia personalizované odporúčania na záver.【F:src/services/TasteProfileQuizEngine.ts†L1-L316】
- **Mechanizmy:**
  - Ukladá priebežné odpovede s 24-hodinovou expiráciou a vie pokračovať v rozpracovanom kvíze.【F:src/services/TasteProfileQuizEngine.ts†L60-L146】
  - `completeQuiz` prepojí výsledky s profilom, spustí generovanie odporúčaní a resetuje dočasné dáta.【F:src/services/TasteProfileQuizEngine.ts†L134-L222】
  - Poskytuje vysvetlenia odporúčaní (`buildSuggestionPayload`, `explainPrediction`) a tvorí “learning path” pre UI komponenty.【F:src/services/TasteProfileQuizEngine.ts†L192-L316】

---

## Denník a insight služby

### CoffeeDiary (`CoffeeDiary.ts`)
- **Úloha:** High-level služba spracúvajúca manuálne aj automatické záznamy, synchronizujúca sa s úložiskami a spúšťajúca generovanie insightov.【F:src/services/CoffeeDiary.ts†L1-L381】
- **Zodpovednosti:**
  - Auto-tracking zachytáva udalosti zo smart zariadení, generuje záznamy a okamžite vytvára zodpovedajúce `LearningEvent`.【F:src/services/CoffeeDiary.ts†L52-L178】
  - Manuálne zadávanie buduje bohatý kontext vrátane nálady, miesta, nastavení extrakcie a voliteľného OCR vstupu.【F:src/services/CoffeeDiary.ts†L105-L238】
  - Analytika ráta najlepšie kávy, týždenné/mesačné štatistiky, trend zručností a pripravuje dáta pre `SmartDiaryService`.【F:src/services/CoffeeDiary.ts†L240-L381】

### SmartDiaryService (`SmartDiaryService.ts`)
- **Úloha:** Spája dáta z denníka a engine do zoznamu insightov pre dashboard (trendy chutí, pripomienky zásob).【F:src/services/SmartDiaryService.ts†L1-L116】
- **Detaily:**
  - `refresh` produkuje insighty na základe trendov preferencií, upozornení na fazuľky či návrhov na studenú kávu podľa dňa.【F:src/services/SmartDiaryService.ts†L25-L107】

---

## Súkromie

### PrivacyManager (`PrivacyManager.ts`)
- **Úloha:** Správa súhlasov, exportu a mazania dát, vrátane generovania anonymizovaných štatistík komunity.【F:src/services/PrivacyManager.ts†L1-L161】
- **Funkcie:**
  - `setConsent`/`getConsent` udržiavajú súhlasy v AsyncStorage s default hodnotou `false`.【F:src/services/PrivacyManager.ts†L24-L61】
  - `exportUserData` spája profil, históriu, denník a learning events do jedného JSON payloadu pre GDPR download.【F:src/services/PrivacyManager.ts†L75-L112】
  - `deleteUserData` čistí profil, denník, históriu aj udalosti a resetuje lokálne cache, pričom informuje `LearningEventProvider` o mazaniach.【F:src/services/PrivacyManager.ts†L114-L139】
  - `buildCommunityStats` agreguje chuťové trendy, ak to súhlasy dovolia.【F:src/services/PrivacyManager.ts†L141-L161】

## Počasie a kontext

### WeatherAwareProvider (`weather/WeatherAwareProvider.ts`)
- **Úloha:** Implementuje `WeatherProvider`, volá Open-Meteo API, cache-uje odpoveď na 10 minút a vracia normalizovaný `WeatherContext` pre odporúčania.【F:src/services/weather/WeatherAwareProvider.ts†L1-L36】
- **Detaily:** Rešpektuje absenciu lokácie (vracia `null`), loguje varovania namiesto pádu a ukladá raw odpoveď pre debug.

---

## Offline vrstva

### CoffeeOfflineManager (`offline/CoffeeOfflineManager.ts`)
- **Úloha:** Centrálna trieda pre cache – TTL úložisko, priority, Wi-Fi prefetch a offline odpovede AI. Sprístupnená ako singleton `coffeeOfflineManager`.【F:src/offline/CoffeeOfflineManager.ts†L7-L139】【F:src/offline/CoffeeOfflineManager.ts†L141-L141】
- **Funkcie:**
  - `setItem`/`getItem` pracujú s expiráciou, vyvolajú `ensureSpace` pri ukladaní a logujú chyby namiesto pádu.【F:src/offline/CoffeeOfflineManager.ts†L24-L125】
  - `startWifiPrefetch` sleduje pripojenie cez NetInfo, pri Wi-Fi fetchne top recepty a uloží ich s vyššou prioritou.【F:src/offline/CoffeeOfflineManager.ts†L91-L103】
  - `getOfflineAIAnswer` vracia odpovede z predpripraveného datasetu a upozorní používateľa toastom.【F:src/offline/CoffeeOfflineManager.ts†L127-L139】

### OfflineSync (`offline/OfflineSync.ts`)
- **Úloha:** Spravuje frontu offline operácií (insert/update/delete), sleduje pripojenie a synchronizuje zmeny na Supabase REST endpoint. Singleton `offlineSync` je dostupný pre UI aj služby.【F:src/offline/OfflineSync.ts†L26-L200】【F:src/offline/OfflineSync.ts†L474-L474】
- **Funkcie:**
  - `enqueue` pridáva operácie s optimistickou aktualizáciou UI a automaticky doplní `userId` z payloadu.【F:src/offline/OfflineSync.ts†L50-L63】
  - `start` registruje NetInfo listener a spúšťa spracovanie po obnovení pripojenia.【F:src/offline/OfflineSync.ts†L68-L74】
  - `processQueue` iteruje frontu, rešpektuje `MAX_RETRIES`, rieši konflikty (vrátane merge podľa timestampu) a notifikáciami informuje používateľa.【F:src/offline/OfflineSync.ts†L145-L335】
  - `addListener` a `addProgressListener` poskytujú UI komponentom živé metriky o fronte.【F:src/offline/OfflineSync.ts†L77-L118】

### AIFallback (`offline/AIFallback.ts`)
- **Úloha:** Offline odpovede asistenta – kombinuje cache, online fetcher, fuzzy matching a kľúčové slová. Informuje používateľa toastami pri použití offline režimu.【F:src/offline/AIFallback.ts†L6-L96】
- **Detaily:** Používa Levenshteinovu vzdialenosť na približné zladenie otázok, ukladá online odpovede na 24 hodín a poskytuje bezpečnú default odpoveď, ak nič nenájde.【F:src/offline/AIFallback.ts†L10-L95】

### VisionService (`offline/VisionService.ts`)
- **Úloha:** Hybridný servis na rozpoznávanie kávy zo snímky. Najskôr skúsi online Google Vision API, následne padá na lokálny TensorFlow Lite model a výsledok cache-uje cez `CoffeeOfflineManager`.【F:src/offline/VisionService.ts†L1-L36】
- **Detaily:** Pri lokálnom modeli informuje používateľa toastom, chyby loguje do konzoly a vždy sa snaží vrátiť posledný úspešný výsledok z cache.【F:src/offline/VisionService.ts†L9-L35】

---

## Podporné služby

### NotificationService (`NotificationService.ts`)
- **Úloha:** Jednotné miesto pre konfiguráciu push notifikácií (Android aj iOS), žiada oprávnenia a umožňuje plánovanie alebo rušenie lokálnych notifikácií.【F:src/services/NotificationService.ts†L1-L66】【F:src/services/NotificationService.ts†L70-L83】
- **Detaily:**
  - `configure` sa spúšťa len raz, vytvára kanál s vysokou prioritou a zabezpečí korektné ukončenie notifikácie na iOS.【F:src/services/NotificationService.ts†L9-L57】
  - `scheduleLocalNotification` nastaví implicitný čas (aktuálny +1 sekunda), podporuje `allowWhileIdle` pre Android a recykluje predkonfigurovaný kanál.【F:src/services/NotificationService.ts†L70-L83】
  - `cancelLocalNotification` odstráni naplánované upozornenie a na iOS explitne čistí pending requesty.【F:src/services/NotificationService.ts†L85-L96】

### offlineCache utilita (`services/offlineCache.ts`)
- **Úloha:** Jednoduchá AsyncStorage vrstva na persistenciu OCR výsledkov (ID → JSON payload) s referenciou na poslednú operáciu, aby bolo možné obnoviť posledné skenovanie bez siete.【F:src/services/offlineCache.ts†L1-L25】
- **Detaily:** Pri uloženom chybe loguje do konzoly a vracia `null`, čím zabraňuje pádom UI.【F:src/services/offlineCache.ts†L5-L23】

---

## Zdieľané singletons a prepojenia

- `preferenceEngine`, `coffeeDiary`, `smartDiary`, `privacyManager` a ďalšie služby sa vytvárajú v `personalizationGateway` a exportujú sa cez React Context, aby ich UI vrstvy nepotrebovali konštruovať ručne.【F:src/services/personalizationGateway.ts†L318-L352】
- `coffeeOfflineManager` a `offlineSync` sú dostupné z `src/offline/index.ts`, čím zabezpečujú jednotnú inštanciu v celej aplikácii.【F:src/offline/index.ts†L1-L2】【F:src/offline/CoffeeOfflineManager.ts†L10-L141】【F:src/offline/OfflineSync.ts†L34-L474】
- Supabase adaptéry v `App.tsx` sú inicializované s globálnym `supabaseClient` a vložené do `PersonalizationContext`, ktorý napája obrazovky a služby personalizácie.【F:App.tsx†L42-L219】【F:App.tsx†L260-L382】

### Textová schéma tokov dát
```
[TasteProfileQuizEngine]
      │ odpovede
      ▼
[PreferenceLearningEngine] ⇄ [PreferenceEngineFacade] ⇄ [Async/Supabase Storage]
      │ predikcie / aktualizácie
      ▼
[RecommendationEngine] ⇄ [TravelModeManager] ⇄ [WeatherAwareProvider]
      │                   │
      ▼                   └─ informuje rozhodovanie v travel režime
[CoffeeDiary] ⇄ [SmartDiaryService]
      │
[OfflineSync] & [CoffeeOfflineManager] ⇄ [AIFallback/VisionService]
```


