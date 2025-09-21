import { addHours, differenceInMinutes, isAfter, isBefore, parseISO } from 'date-fns';
import type { StoreApi } from 'zustand';
import type {
  DailyQuestInstance,
  DailyQuestTemplate,
  GamificationAnalyticsAdapter,
  GamificationNotificationChannel,
} from '../../types/gamification';
import type { GamificationStoreState } from '../../hooks/useGamificationStore';
import { randomId } from '../../utils/randomId';
import { SupabaseGamificationAdapter } from './SupabaseGamificationAdapter';
import { XpEngine } from './XpEngine';

interface QuestPreferences {
  preferredMethods?: string[];
  activeSeasonalTheme?: string;
}

interface DailyQuestServiceDeps {
  store: StoreApi<GamificationStoreState>;
  supabase: SupabaseGamificationAdapter;
  xpEngine: XpEngine;
  analytics: GamificationAnalyticsAdapter;
  notifications: GamificationNotificationChannel;
}

const QUEST_TEMPLATES: DailyQuestTemplate[] = [
  {
    id: 'morning-brew',
    title: 'Ranná káva',
    description: 'Uvar kávu medzi 5:00 a 11:00',
    difficulty: 'easy',
    xpReward: 25,
    requirements: { timeWindow: ['05:00', '11:00'], brews: 1 },
    category: 'ritual',
  },
  {
    id: 'ai-trust',
    title: 'Dôveruj AI',
    description: 'Použi BrewMate odporúčanie',
    difficulty: 'easy',
    xpReward: 20,
    requirements: { action: 'use_ai_suggestion' },
    category: 'knowledge',
  },
  {
    id: 'photo-note',
    title: 'Fotograf',
    description: 'Pridaj fotku a poznámku k brew',
    difficulty: 'easy',
    xpReward: 25,
    requirements: { photo: true, note: true },
    category: 'social',
  },
  {
    id: 'perfect-extraction',
    title: 'Perfektná extrakcia',
    description: 'Dosiahni hodnotenie 4+ hviezdičky',
    difficulty: 'medium',
    xpReward: 40,
    requirements: { rating: 4 },
    category: 'skills',
  },
  {
    id: 'experimenter',
    title: 'Experimentátor',
    description: 'Vyskúšaj nový recept alebo metódu',
    difficulty: 'medium',
    xpReward: 35,
    requirements: { newRecipe: true },
    category: 'exploration',
  },
  {
    id: 'consistency',
    title: 'Konzistencia',
    description: 'Uvar dvakrát tú istú kávu',
    difficulty: 'medium',
    xpReward: 45,
    requirements: { repeatBrew: 2 },
    category: 'ritual',
  },
  {
    id: 'master-challenge',
    title: 'Majstrovská výzva',
    description: 'Použi 3 metódy s hodnotením 4+',
    difficulty: 'hard',
    xpReward: 90,
    requirements: { methods: 3, rating: 4 },
    category: 'skills',
  },
  {
    id: 'mentor',
    title: 'Mentor',
    description: 'Pomôž dvom používateľom',
    difficulty: 'hard',
    xpReward: 80,
    requirements: { communityHelp: 2 },
    category: 'social',
  },
  {
    id: 'weekend-warrior',
    title: 'Weekend Warrior',
    description: 'Priprav Chemex/V60/Syphon cez víkend',
    difficulty: 'special',
    xpReward: 180,
    requirements: { methods: ['Chemex', 'V60', 'Syphon'], weekendOnly: true },
    category: 'event',
  },
  {
    id: 'monthly-marathon',
    title: 'Mesačná výzva',
    description: 'Dokonči 20 brew počas mesiaca',
    difficulty: 'special',
    xpReward: 220,
    requirements: { monthlyBrews: 20 },
    category: 'event',
  },
];

/**
 * Služba pre generovanie a správu denných questov.
 */
export class DailyQuestService {
  private templates: DailyQuestTemplate[] = QUEST_TEMPLATES;

  constructor(private readonly deps: DailyQuestServiceDeps) {}

  async initialize(): Promise<void> {
    const templates = await this.deps.supabase.fetchDailyQuestTemplates();
    if (templates.length > 0) {
      this.templates = templates;
    }
  }

  /**
   * Inteligentne vyberie úlohy podľa levelu a preferencií.
   */
  async assignDailyQuests(preferences: QuestPreferences = {}): Promise<void> {
    const state = this.deps.store.getState();
    const now = new Date();
    const existing = state.dailyQuests.filter((quest) => isAfter(parseISO(quest.expiresAt), now));

    if (existing.length >= 3) {
      return;
    }

    const easyPool = this.filterTemplates('easy', state.level, preferences);
    const mediumPool = this.filterTemplates('medium', state.level, preferences);
    const hardPool = this.filterTemplates('hard', state.level, preferences);
    const specialPool = this.filterTemplates('special', state.level, preferences);

    const toAssign: DailyQuestTemplate[] = [];
    if (easyPool.length > 0) {
      toAssign.push(this.pickRandom(easyPool, existing));
    }
    if (mediumPool.length > 0) {
      toAssign.push(this.pickRandom(mediumPool, existing));
    }
    if (state.level > 10 && hardPool.length > 0) {
      toAssign.push(this.pickRandom(hardPool, existing));
    }
    if (specialPool.length > 0 && now.getDay() === 6) {
      toAssign.push(this.pickRandom(specialPool, existing));
    }

    const newQuests = await Promise.all(
      toAssign.map(async (template) => {
        const assignedAt = new Date();
        const expiresAt = template.difficulty === 'special' ? addHours(assignedAt, 72) : addHours(assignedAt, 24);
        const quest: DailyQuestInstance = {
          id: randomId({ prefix: 'quest', length: 10 }),
          templateId: template.id,
          assignedAt: assignedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          progress: 0,
          goal: this.deriveGoal(template),
          completed: false,
          xpReward: template.xpReward,
          metadata: { title: template.title, description: template.description },
        };
        await this.deps.supabase.upsertDailyQuest(quest);
        await this.deps.notifications.scheduleQuestReminder(quest);
        return quest;
      }),
    );

    const updated = [...existing, ...newQuests];
    this.deps.store.getState().setDailyQuests(updated);
  }

  private filterTemplates(difficulty: DailyQuestTemplate['difficulty'], level: number, preferences: QuestPreferences) {
    return this.templates.filter((template) => {
      if (template.difficulty !== difficulty) {
        return false;
      }
      if (preferences.preferredMethods && Array.isArray(template.requirements?.methods)) {
        return template.requirements.methods.some((method: string) => preferences.preferredMethods?.includes(method));
      }
      if (difficulty === 'special' && level < 15) {
        return false;
      }
      return true;
    });
  }

  private pickRandom(pool: DailyQuestTemplate[], existing: DailyQuestInstance[]): DailyQuestTemplate {
    const rotation = pool.filter((template) => !existing.some((quest) => quest.templateId === template.id));
    const source = rotation.length > 0 ? rotation : pool;
    return source[Math.floor(Math.random() * source.length)];
  }

  private deriveGoal(template: DailyQuestTemplate): number {
    if (typeof template.requirements?.brews === 'number') {
      return template.requirements.brews;
    }
    if (typeof template.requirements?.methods === 'number') {
      return template.requirements.methods;
    }
    if (typeof template.requirements?.monthlyBrews === 'number') {
      return template.requirements.monthlyBrews;
    }
    if (typeof template.requirements?.communityHelp === 'number') {
      return template.requirements.communityHelp;
    }
    if (typeof template.requirements?.repeatBrew === 'number') {
      return template.requirements.repeatBrew;
    }
    return 1;
  }

  /**
   * Aktualizuje progres questov a odmeňuje XP.
   */
  async applyProgress(questId: string, progressDelta = 1): Promise<void> {
    const state = this.deps.store.getState();
    const quest = state.dailyQuests.find((item) => item.id === questId);
    if (!quest || quest.completed) {
      return;
    }

    const now = new Date();
    if (isBefore(parseISO(quest.expiresAt), now)) {
      return;
    }

    const progress = Math.min(quest.goal, quest.progress + progressDelta);
    const completed = progress >= quest.goal;
    const updatedQuest: DailyQuestInstance = { ...quest, progress, completed };
    this.deps.store.getState().updateQuestProgress(questId, updatedQuest);
    await this.deps.supabase.upsertDailyQuest(updatedQuest);

    if (completed) {
      await this.deps.notifications.cancelQuestReminder(questId);
      await this.deps.analytics.track({
        type: 'quest_completed',
        payload: { questId, templateId: quest.templateId, xpReward: quest.xpReward },
      });
      await this.deps.xpEngine.applyXp({ source: 'daily_quest', baseAmount: quest.xpReward });
      await this.deps.xpEngine.applyXp({ source: 'streak_bonus', baseAmount: this.calculateQuestCombo(state.dailyQuests) });
    }
  }

  private calculateQuestCombo(quests: DailyQuestInstance[]): number {
    const completedToday = quests.filter((quest) => quest.completed && differenceInMinutes(new Date(), parseISO(quest.assignedAt)) < 24 * 60);
    if (completedToday.length === 0) {
      return 0;
    }
    return completedToday.length * 10;
  }

  /**
   * Automatická detekcia splnenia napríklad pri uložení brew.
   */
  async autoCompleteFromEvent(event: { type: string; payload: Record<string, unknown> }): Promise<void> {
    const state = this.deps.store.getState();
    await Promise.all(
      state.dailyQuests.map(async (quest) => {
        if (quest.completed) {
          return;
        }
        const template = this.templates.find((item) => item.id === quest.templateId);
        if (!template) {
          return;
        }
        const shouldComplete = this.matchesEvent(template, event);
        if (shouldComplete) {
          await this.applyProgress(quest.id, quest.goal);
        }
      }),
    );
  }

  private matchesEvent(template: DailyQuestTemplate, event: { type: string; payload: Record<string, unknown> }): boolean {
    switch (template.id) {
      case 'morning-brew': {
        const time = String(event.payload.timestamp ?? '');
        return event.type === 'brew' && /^0[5-9]:|^1[0-1]:/.test(time.split('T')[1] ?? '');
      }
      case 'ai-trust':
        return event.type === 'ai_suggestion';
      case 'photo-note':
        return event.type === 'brew' && Boolean(event.payload.photo && event.payload.note);
      case 'perfect-extraction':
        return event.type === 'brew' && Number(event.payload.rating ?? 0) >= 4;
      case 'experimenter':
        return event.type === 'recipe_new' || Boolean(event.payload.newMethod);
      case 'consistency':
        return event.type === 'brew_repeat';
      case 'master-challenge':
        return event.type === 'brew' && Number(event.payload.rating ?? 0) >= 4 && Array.isArray(event.payload.methods);
      case 'mentor':
        return event.type === 'community_help';
      case 'weekend-warrior':
        return event.type === 'brew' && Array.isArray(event.payload.methods);
      case 'monthly-marathon':
        return event.type === 'monthly_summary' && Number(event.payload.count ?? 0) >= 20;
      default:
        return false;
    }
  }
}
