import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { OFFLINE_QA } from '../data/offlineAiResponses';
import { showToast } from '../utils/toast';

const CACHE_PREFIX = 'ai:';
const CACHE_TTL_HOURS = 24; // expirácia 24h

/**
 * Vypočíta podobnosť dvoch reťazcov pomocou Levenshtein distance.
 *
 * @param {string} a - Prvý reťazec na porovnanie.
 * @param {string} b - Druhý reťazec na porovnanie.
 * @returns {number} Hodnota v rozsahu 0-1, kde 1 znamená identické reťazce.
 */
function similarity(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;
  for (let i = 0; i <= bLen; i++) matrix[i] = [i];
  for (let j = 0; j <= aLen; j++) matrix[0][j] = j;
  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  const distance = matrix[bLen][aLen];
  return 1 - distance / Math.max(aLen, bLen);
}

/**
 * Offline AI fallback systém.
 * Poskytuje odpoveď z cache alebo z predpripravených otázok, keď online dotaz zlyhá alebo chýba pripojenie.
 */
export class AIFallback {
  /**
   * Získa odpoveď na otázku s využitím cache a offline fallbacku.
   *
   * @param {string} question - Pôvodná otázka používateľa.
   * @param {(q: string) => Promise<string>} [onlineFetcher] - Voliteľný online fetcher; ak zlyhá, použije sa offline režim.
   * @returns {Promise<{ answer: string; offline: boolean }>} Objekt s textom odpovede a informáciou, či pochádza z offline zdroja.
   * @throws {Error} Pri zlyhaní čítania alebo zápisu do AsyncStorage sa chyba zaloguje a odpoveď sa fallbackne na offline dáta.
   */
  static async getAnswer(
    question: string,
    onlineFetcher?: (q: string) => Promise<string>,
  ): Promise<{ answer: string; offline: boolean }> {
    const cacheKey = `${CACHE_PREFIX}${question}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.expires > Date.now()) {
        return { answer: data.value, offline: false };
      }
    }

    const net = await NetInfo.fetch();
    if (net.isConnected && onlineFetcher) {
      try {
        const answer = await onlineFetcher(question);
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ value: answer, expires: Date.now() + CACHE_TTL_HOURS * 3600 * 1000 }),
        );
        return { answer, offline: false };
      } catch (err) {
        // pokračujeme offline
      }
    }

    // fuzzy matching
    let best = { score: 0, answer: '' };
    for (const qa of OFFLINE_QA) {
      const score = similarity(question.toLowerCase(), qa.question.toLowerCase());
      if (score > best.score) {
        best = { score, answer: qa.answer };
      }
    }
    if (best.score >= 0.7) {
      showToast('Používa sa offline odpoveď');
      return { answer: best.answer, offline: true };
    }

    // keyword fallback
    const keywords: Record<string, string> = {
      espresso: 'Základné espresso sa pripravuje z 18g kávy na 36g nápoja.',
      latte: 'Latte je espresso s väčším množstvom mlieka a jemnou penou.',
      filter: 'Filtrovaná káva potrebuje hrubšie mletie a dlhší čas extrakcie.',
    };
    for (const [k, v] of Object.entries(keywords)) {
      if (question.toLowerCase().includes(k)) {
        showToast('Používa sa offline odpoveď');
        return { answer: v, offline: true };
      }
    }
    showToast('Offline odpoveď sa nenašla');
    return { answer: 'Momentálne nemám odpoveď, skúste neskôr online.', offline: true };
  }
}
