import { differenceInDays } from 'date-fns';
import { BrewHistoryEntry } from '../types/Personalization';
import { FlavorEmbeddingService } from './flavor/FlavorEmbeddingService';
import { PreferenceLearningEngine } from './PreferenceLearningEngine';

interface Insight {
  id: string;
  title: string;
  body: string;
  type: 'pattern' | 'prediction' | 'reminder';
  createdAt: string;
}

export class SmartDiaryService {
  constructor(
    private readonly learningEngine: PreferenceLearningEngine,
    private readonly flavorEmbeddingService: FlavorEmbeddingService,
  ) {}

  public async generateInsights(userId: string, entries: BrewHistoryEntry[]): Promise<Insight[]> {
    const insights: Insight[] = [];
    if (!entries.length) {
      return insights;
    }

    const latest = entries[0];
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

    const journey = await this.flavorEmbeddingService.getJourney(userId);
    if (journey.length > 3) {
      insights.push({
        id: 'journey-milestone',
        title: 'Dosiahol si chuťový míľnik',
        body: `Na základe flavor journey mapy si objavil ${journey[journey.length - 1].description}.`,
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

    return insights;
  }

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

  private buildColdBrewReminder(entries: BrewHistoryEntry[]): Insight | undefined {
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
