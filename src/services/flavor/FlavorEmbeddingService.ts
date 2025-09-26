import { cosineSimilarity } from '../../utils/math';
import {
  FlavorEmbeddingVector,
  FlavorJourneyMilestone,
  TasteQuizAnswer,
} from '../../types/PersonalizationAI';
import { BrewHistoryEntry } from '../../types/Personalization';
import { FlavorJourneyRepository } from './FlavorJourneyRepository';

const EMBEDDING_SIZE = 128;

export class FlavorEmbeddingService {
  constructor(private readonly repository: FlavorJourneyRepository) {}

  public async recordQuizEmbeddings(userId: string, answers: TasteQuizAnswer[]): Promise<void> {
    const vectors = answers
      .filter((answer) => Array.isArray(answer.value) || typeof answer.value === 'string')
      .map((answer) => this.generateEmbeddingFromAnswer(answer));

    await this.repository.persistEmbeddings(userId, vectors);
  }

  public async recordDiaryEntry(entry: BrewHistoryEntry): Promise<void> {
    if (!entry.flavorNotes) {
      return;
    }

    const vector: FlavorEmbeddingVector = {
      embedding: this.createEmbeddingFromNotes(entry.flavorNotes),
      createdAt: entry.createdAt,
      label: entry.flavorNotes ? Object.keys(entry.flavorNotes).join(', ') : 'neutrálna',
      source: 'diary',
    };

    await this.repository.persistEmbeddings(entry.userId, [vector]);
  }

  public async getJourney(userId: string): Promise<FlavorJourneyMilestone[]> {
    return this.repository.fetchJourney(userId);
  }

  public calculateSimilarity(a: FlavorEmbeddingVector, b: FlavorEmbeddingVector): number {
    return cosineSimilarity(a.embedding, b.embedding);
  }

  public async suggestExplorationTargets(userId: string): Promise<FlavorJourneyMilestone[]> {
    const journey = await this.getJourney(userId);
    if (!journey.length) {
      return [];
    }

    const latest = journey[journey.length - 1];
    const targets = await this.repository.fetchExplorationCandidates();

    return targets
      .map((target) => ({ target, similarity: this.calculateSimilarity(latest.embedding, target.embedding) }))
      .sort((a, b) => a.similarity - b.similarity)
      .slice(0, 3)
      .map(({ target }) => target);
  }

  private generateEmbeddingFromAnswer(answer: TasteQuizAnswer): FlavorEmbeddingVector {
    return {
      embedding: this.createEmbeddingFromValue(answer.value),
      label: Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value),
      createdAt: answer.timestamp,
      source: 'quiz',
    };
  }

  private createEmbeddingFromValue(value: TasteQuizAnswer['value']): number[] {
    const vector = new Array(EMBEDDING_SIZE).fill(0);
    const normalizedValues = Array.isArray(value) ? value.map((v) => String(v)) : [String(value)];
    normalizedValues.forEach((token, index) => {
      const hash = this.stringToNumber(token + index);
      const slot = hash % EMBEDDING_SIZE;
      vector[slot] = (vector[slot] ?? 0) + 1;
    });
    return this.normalize(vector);
  }

  private createEmbeddingFromNotes(notes: NonNullable<BrewHistoryEntry['flavorNotes']>): number[] {
    const vector = new Array(EMBEDDING_SIZE).fill(0);
    Object.entries(notes).forEach(([note, weight]) => {
      const slot = this.stringToNumber(note) % EMBEDDING_SIZE;
      vector[slot] = (vector[slot] ?? 0) + (weight ?? 0);
    });
    return this.normalize(vector);
  }

  private normalize(vector: number[]): number[] {
    const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (length === 0) {
      return vector;
    }
    return vector.map((value) => value / length);
  }

  private stringToNumber(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
