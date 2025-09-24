/*
 * Generátor denných úloh s personalizáciou podľa úrovne.
 */
import type {DailyQuestInstance, QuestTemplate} from '../../types/gamification';

const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'morning_brew',
    title: 'Ranná káva',
    description: 'Uvar si kávu medzi 5:00 a 11:00 a zdieľ tipy.',
    difficulty: 'easy',
    rewardXpRange: [20, 25],
    rewardSkillPoints: 0,
    requirements: [
      {type: 'time_window', value: {start: '05:00', end: '11:00'}, progressKey: 'time_window'},
      {type: 'streak', value: 1, progressKey: 'brew_count'},
    ],
    tags: ['morning', 'routine'],
  },
  {
    id: 'trust_ai',
    title: 'Dôveruj AI',
    description: 'Vyskúšaj návrh BrewMate AI na dnešný nápoj.',
    difficulty: 'easy',
    rewardXpRange: [20, 25],
    rewardSkillPoints: 0,
    requirements: [{type: 'use_ai', value: true, progressKey: 'ai_used'}],
    tags: ['ai', 'learning'],
  },
  {
    id: 'coffee_photographer',
    title: 'Fotograf',
    description: 'Nahraj fotku a poznámky z dnešného experimentu.',
    difficulty: 'easy',
    rewardXpRange: [20, 25],
    rewardSkillPoints: 0,
    requirements: [
      {type: 'upload_photo', value: true, progressKey: 'photo_uploaded'},
      {type: 'auto_complete', value: true, progressKey: 'notes_added'},
    ],
    tags: ['social', 'creative'],
  },
  {
    id: 'perfect_extraction',
    title: 'Perfektná extrakcia',
    description: 'Dosiahni hodnotenie 4+ hviezdy.',
    difficulty: 'medium',
    rewardXpRange: [35, 45],
    rewardSkillPoints: 0,
    requirements: [{type: 'rating', value: {min: 4}, progressKey: 'rating'}],
    tags: ['quality'],
  },
  {
    id: 'experimenter',
    title: 'Experimentátor',
    description: 'Vyskúšaj novú receptúru alebo metódu.',
    difficulty: 'medium',
    rewardXpRange: [35, 45],
    rewardSkillPoints: 0,
    requirements: [{type: 'new_recipe', value: true, progressKey: 'recipes'}],
    tags: ['exploration'],
  },
  {
    id: 'consistency',
    title: 'Konzistencia',
    description: 'Dvakrát za deň priprav rovnakú kávu.',
    difficulty: 'medium',
    rewardXpRange: [35, 45],
    rewardSkillPoints: 0,
    requirements: [{type: 'repeat_brew', value: 2, progressKey: 'repeats'}],
    tags: ['discipline'],
  },
  {
    id: 'master_challenge',
    title: 'Majstrovská výzva',
    description: 'Použi tri rôzne metódy s hodnotením 4+.',
    difficulty: 'hard',
    rewardXpRange: [80, 100],
    rewardSkillPoints: 1,
    requirements: [
      {type: 'multi_method', value: {methods: 3, minRating: 4}, progressKey: 'methods'},
    ],
    tags: ['hardcore'],
  },
  {
    id: 'mentor',
    title: 'Mentor',
    description: 'Pomôž dvom používateľom komunitnou spätnou väzbou.',
    difficulty: 'hard',
    rewardXpRange: [80, 100],
    rewardSkillPoints: 1,
    requirements: [{type: 'mentor_help', value: 2, progressKey: 'helped'}],
    tags: ['social'],
  },
  {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Počas víkendu priprav Chemex, V60 alebo Syphon.',
    difficulty: 'special',
    rewardXpRange: [150, 180],
    rewardSkillPoints: 2,
    requirements: [
      {type: 'method_specific', value: ['Chemex', 'V60', 'Syphon'], progressKey: 'method'},
      {type: 'time_window', value: {days: ['sat', 'sun']}, progressKey: 'weekend'},
    ],
    tags: ['weekend', 'event'],
  },
  {
    id: 'monthly_event',
    title: 'Mesačná výzva',
    description: 'Splň všetky týždenné ciele v mesiaci.',
    difficulty: 'special',
    rewardXpRange: [180, 220],
    rewardSkillPoints: 3,
    requirements: [{type: 'streak', value: 30, progressKey: 'month'}],
    tags: ['season'],
  },
];

export default class DailyQuestGenerator {
  private history = new Map<string, string[]>();

  constructor(private seed = Date.now()) {}

  /**
   * Vytvorí sadu úloh podľa úrovne a preferencií.
   */
  generate(userId: string, level: number, preferences: string[]): DailyQuestInstance[] {
    const available = this.filterByLevel(level);
    const rotated = this.rotate(userId, available);
    const personalized = this.applyPreferences(rotated, preferences);
    return personalized.slice(0, 3).map((template, index) => this.instantiate(template, userId, index));
  }

  private filterByLevel(level: number) {
    return QUEST_TEMPLATES.filter((template) => {
      switch (template.difficulty) {
        case 'easy':
          return level >= 1;
        case 'medium':
          return level >= 5;
        case 'hard':
          return level >= 10;
        case 'special':
          return level >= 15;
        default:
          return true;
      }
    });
  }

  private rotate(userId: string, templates: QuestTemplate[]) {
    const used = this.history.get(userId) ?? [];
    const filtered = templates.filter((template) => !used.includes(template.id));
    const result = filtered.length >= 3 ? filtered : templates;
    this.history.set(userId, result.map((template) => template.id));
    return result;
  }

  private applyPreferences(templates: QuestTemplate[], preferences: string[]) {
    if (preferences.length === 0) {
      return templates;
    }
    const scored = templates.map((template) => {
      const overlap = template.tags.filter((tag) => preferences.includes(tag)).length;
      return {template, score: overlap};
    });
    return scored
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.template);
  }

  private instantiate(template: QuestTemplate, userId: string, offset: number): DailyQuestInstance {
    const rewardXp = this.randomInRange(template.rewardXpRange);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return {
      id: `${template.id}-${userId}-${start.getTime()}-${offset}`,
      templateId: template.id,
      userId,
      activeFrom: start.toISOString(),
      activeTo: end.toISOString(),
      rewardXp,
      rewardSkillPoints: template.rewardSkillPoints,
      requirements: template.requirements,
    };
  }

  private randomInRange([min, max]: [number, number]) {
    const random = Math.sin(this.seed++) * 10000;
    const normalized = random - Math.floor(random);
    return Math.round(min + normalized * (max - min));
  }
}

export {QUEST_TEMPLATES};
