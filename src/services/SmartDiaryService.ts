import { differenceInDays } from 'date-fns';
import { BrewHistoryEntry } from '../types/Personalization';
import { PreferenceLearningEngine } from './PreferenceLearningEngine';

export interface SmartDiaryInsight {
  id: string;
  title: string;
  body: string;
  type: 'pattern' | 'prediction' | 'reminder';
  createdAt: string;
}

/**
 * Generuje personalizované denníkové insighty na základe histórie príprav a chuťových preferencií.
 * Využíva učenie preferencií na navrhovanie trendov a pripomienok zásob.
 */
export class SmartDiaryService {
  private latestInsights: SmartDiaryInsight[] = [];

  /**
   * @param {PreferenceLearningEngine} learningEngine - Engine na učenie trendov preferencií podľa histórie.
   */
  constructor(private readonly learningEngine: PreferenceLearningEngine) {}

  /**
   * Vypočíta nový zoznam insightov na základe histórie príprav a správania používateľa.
   *
   * @param {string} userId - Identifikátor používateľa, pre ktorého sa generujú insighty.
   * @param {BrewHistoryEntry[]} entries - História príprav káv zoradená od najnovšej.
   * @returns {Promise<SmartDiaryInsight[]>} Zoznam nových insightov pripravených na zobrazenie.
   */
  public async generateInsights(userId: string, entries: BrewHistoryEntry[]): Promise<SmartDiaryInsight[]> {
    const insights: SmartDiaryInsight[] = [];
    if (!entries.length) {
      this.latestInsights = insights;
      return insights;
    }

    const tasteTrend = await this.learningEngine.calculateTasteTrend(userId, entries);
    if (tasteTrend) {
      insights.push({
        id: 'trend',
        title: 'Chuť sa posúva k vyváženosti',
        body: `Za posledné ${tasteTrend.periodDays} dni sa tvoje preferencie posunuli smerom k ${tasteTrend.direction}.`,
        type: 'pattern',
        createdAt: new Date().toISOString(),
      });
    }

    const depletion = this.predictBeanDepletion(entries);
    if (depletion) {
      insights.push({
        id: 'beans',
        title: 'Zásoba zŕn sa míňa',
        body: `Odporúčame objednať nové zrná – vystačia približne na ${depletion.daysLeft} dni.`,
        type: 'reminder',
        createdAt: new Date().toISOString(),
      });
    }

    const mondayReminder = this.buildColdBrewReminder(entries);
    if (mondayReminder) {
      insights.push(mondayReminder);
    }

    this.latestInsights = insights;
    return insights;
  }

  /**
   * Vracia posledne vypočítané insighty bez mutovania pôvodného poľa.
   *
   * @returns {SmartDiaryInsight[]} Kópia posledných insightov pre opätovné využitie v UI.
   */
  public getLatestInsights(): SmartDiaryInsight[] {
    return [...this.latestInsights];
  }

  /**
   * Odhadne, koľko dní vydržia aktuálne zásoby kávových zŕn.
   *
   * @param {BrewHistoryEntry[]} entries - História príprav používaná na výpočet spotreby.
   * @returns {{ daysLeft: number } | undefined} Počet dní do minutia zásob alebo undefined, ak chýbajú dáta.
   */
  private predictBeanDepletion(entries: BrewHistoryEntry[]): { daysLeft: number } | undefined {
    const consumptionPerDay = this.calculateDailyConsumption(entries);
    if (!consumptionPerDay) {
      return undefined;
    }
    const stockEntry = entries.find((entry) => entry.modifications?.includes('inventory-update'));
    if (!stockEntry) {
      return undefined;
    }
    const stockMetadata = (stockEntry.metadata ?? {}) as Record<string, unknown>;
    const stockGrams = Number(stockMetadata.remainingBeansGrams ?? 0);
    if (!stockGrams) {
      return undefined;
    }
    return { daysLeft: Math.max(1, Math.round(stockGrams / consumptionPerDay)) };
  }

  /**
   * Vypočíta priemernú dennú spotrebu zŕn podľa histórie príprav.
   *
   * @param {BrewHistoryEntry[]} entries - Záznamy príprav zoradené od najnovšej.
   * @returns {number | undefined} Priemerná gramáž na deň alebo undefined pri nedostatku dát.
   */
  private calculateDailyConsumption(entries: BrewHistoryEntry[]): number | undefined {
    if (entries.length < 3) {
      return undefined;
    }
    const first = entries[entries.length - 1];
    const last = entries[0];
    const days = Math.max(1, differenceInDays(new Date(last.createdAt), new Date(first.createdAt)));
    const gramsUsed = entries.reduce((sum, entry) => {
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      return sum + Number(metadata.doseGrams ?? 0);
    }, 0);
    if (!gramsUsed) {
      return undefined;
    }
    return gramsUsed / days;
  }

  /**
   * Pripraví pripomienku cold brew prípravy pred pondelkom, ak používateľ nemá relevantné záznamy.
   *
   * @param {BrewHistoryEntry[]} entries - História príprav na zistenie, či používateľ pripravoval cold brew.
   * @returns {SmartDiaryInsight | undefined} Pripomienka alebo undefined, ak nie je potrebná.
   */
  private buildColdBrewReminder(entries: BrewHistoryEntry[]): SmartDiaryInsight | undefined {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() !== 1) {
      return undefined;
    }
    const hasColdBrew = entries.some((entry) => entry.tags?.includes('cold_brew'));
    if (hasColdBrew) {
      return undefined;
    }
    return {
      id: 'cold-brew-reminder',
      title: 'Zajtra je pondelok',
      body: 'Priprav si cold brew večer, aby ťa ráno privítala osviežujúca káva.',
      type: 'prediction',
      createdAt: new Date().toISOString(),
    };
  }
}
