import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { OFFLINE_QA } from '../data/offlineAiResponses';
import { showToast } from '../utils/toast';

/**
 * Centrálna trieda pre správu offline dát v aplikácii.
 * Využíva AsyncStorage a inteligentné stratégie cachovania.
 */
export class CoffeeOfflineManager {
  private static instance: CoffeeOfflineManager;
  private constructor() {}

  /**
   * Poskytuje singleton inštanciu manažéra cache, aby sa zabránilo duplicitným prístupom k úložisku.
   *
   * @returns {CoffeeOfflineManager} Jediná zdieľaná inštancia triedy pre správu offline dát.
   */
  public static getInstance() {
    if (!this.instance) {
      this.instance = new CoffeeOfflineManager();
    }
    return this.instance;
  }

  /**
   * Uloženie dát do cache s metadátami o expirácii a prioritou.
   *
   * @param {string} key - Jedinečný kľúč položky v AsyncStorage.
   * @param {unknown} value - Hodnota, ktorá sa má uložiť; serializuje sa do JSON.
   * @param {number} expiresInHours - Počet hodín, po ktorých sa má položka považovať za expirovanú.
   * @param {number} [priority=0] - Priorita pre vymazávanie; vyššia hodnota znamená dôležitejšiu položku.
   * @returns {Promise<void>} Promise indikujúci dokončenie zápisu.
   * @throws {Error} Pri zlyhaní zápisu do AsyncStorage sa vyhodí chyba a zapíše sa warning do logu.
   */
  public async setItem(
    key: string,
    value: any,
    expiresInHours: number,
    priority = 0,
  ): Promise<void> {
    try {
      const payload = {
        value,
        expires: Date.now() + expiresInHours * 3600 * 1000,
        priority,
      };
      await AsyncStorage.setItem(key, JSON.stringify(payload));
      await this.ensureSpace();
    } catch (err) {
      console.warn('Chyba pri ukladaní cache', err);
    }
  }

  /**
   * Načítanie dát z cache s kontrolou expirácie.
   *
   * @template T
   * @param {string} key - Kľúč uložený v AsyncStorage.
   * @returns {Promise<T | null>} Uložená hodnota, alebo null ak neexistuje alebo expirovala.
   * @throws {Error} Pri chybe čítania z AsyncStorage sa vyhodí chyba a metóda vráti null.
   */
  public async getItem<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (payload.expires < Date.now()) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      return payload.value as T;
    } catch (err) {
      console.warn('Chyba pri čítaní cache', err);
      return null;
    }
  }

  /**
   * Vymazanie expirovaných položiek na základe uloženého metadátového timestampu.
   *
   * @returns {Promise<void>} Promise indikujúci ukončenie čistenia expirovaných položiek.
   * @throws {Error} Pri chybe čítania alebo mazania dát sa vyhodí chyba a proces pokračuje s ďalšími položkami.
   */
  public async purgeExpired() {
    const keys = await AsyncStorage.getAllKeys();
    const entries = await AsyncStorage.multiGet(keys);
    const toDelete: string[] = [];
    for (const [k, v] of entries) {
      if (!v) continue;
      try {
        const data = JSON.parse(v);
        if (data.expires && data.expires < Date.now()) {
          toDelete.push(k);
        }
      } catch {
        continue;
      }
    }
    if (toDelete.length) {
      await AsyncStorage.multiRemove(toDelete);
    }
  }

  /**
   * Prefetch prioritného obsahu pri pripojení na WiFi a uloženie s vyššou prioritou.
   *
   * @param {() => Promise<any[]>} fetchTopRecipes - Funkcia zabezpečujúca stiahnutie top receptov pri dostupnom pripojení.
   * @returns {void} Nevracia hodnotu; registruje listener na NetInfo.
   */
  public startWifiPrefetch(fetchTopRecipes: () => Promise<any[]>) {
    NetInfo.addEventListener(async state => {
      if (state.type === NetInfoStateType.wifi && state.isConnected) {
        try {
          const recipes = await fetchTopRecipes();
          // uložíme TOP recepty s vyššou prioritou
          await this.setItem('recipes:top', recipes, 24 * 7, 10);
        } catch (err) {
          console.warn('Prefetch zlyhal', err);
        }
      }
    });
  }

  /**
   * Jednoduchá stratégia pre uvoľnenie miesta –
   * odstráni položky s najnižšou prioritou.
   *
   * @returns {Promise<void>} Promise indikujúci dokončenie prípadného mazania.
   */
  private async ensureSpace() {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length < 100) return; // jednoduchý limit
    const entries = await AsyncStorage.multiGet(keys);
    const sorted = entries
      .map(([k, v]) => {
        try {
          const data = JSON.parse(v || '{}');
          return { k, priority: data.priority || 0, expires: data.expires || 0 };
        } catch {
          return { k, priority: 0, expires: 0 };
        }
      })
      .sort((a, b) => a.priority - b.priority || a.expires - b.expires);
    const remove = sorted.slice(0, 10).map(e => e.k);
    if (remove.length) await AsyncStorage.multiRemove(remove);
  }

  /**
   * Pomocná metóda pre offline odpovede z AI pomocou predpripravených dát.
   *
   * @param {string} question - Otázka používateľa, ktorá sa porovnáva s offline databázou otázok.
   * @returns {Promise<string | null>} Nájdená odpoveď alebo null, ak pre otázku neexistuje offline match.
   * @throws {Error} Pri zlyhaní vyhľadávania či zobrazovania toastu sa chyba zaloguje a vráti sa null.
   */
  public async getOfflineAIAnswer(question: string): Promise<string | null> {
    // jednoduché vyhľadanie v predpripravenom zozname
    const found = OFFLINE_QA.find(q => q.question.toLowerCase() === question.toLowerCase());
    if (found) {
      showToast('Používa sa offline odpoveď');
      return found.answer;
    }
    return null;
  }
}

export const coffeeOfflineManager = CoffeeOfflineManager.getInstance();
