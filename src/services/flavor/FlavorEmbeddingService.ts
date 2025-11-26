import { cosineSimilarity } from '../../utils/math';
import {
  FlavorEmbeddingVector,
  FlavorJourneyMilestone,
  TasteQuizAnswer,
} from '../../types/PersonalizationAI';
import { BrewHistoryEntry } from '../../types/Personalization';
import { FlavorJourneyRepository } from './FlavorJourneyRepository';

const EMBEDDING_SIZE = 128;

/**
 * Service responsible for generating and comparing flavor embeddings derived from user interactions.
 * It transforms quiz answers and diary entries into normalized vectors for similarity calculations.
 */
export class FlavorEmbeddingService {
  /**
   * Creates a new flavor embedding service with a backing repository used to persist journey milestones.
   *
   * @param {FlavorJourneyRepository} repository - Storage abstraction used to save and retrieve embedding journeys.
   */
  constructor(private readonly repository: FlavorJourneyRepository) {}

  /**
   * Records embeddings generated from taste quiz answers for a specific user.
   *
   * @param {string} userId - Identifier of the user who completed the quiz.
   * @param {TasteQuizAnswer[]} answers - Answer payloads containing values and timestamps from the quiz flow.
   * @returns {Promise<void>} Promise that resolves after embeddings have been persisted.
   */
  public async recordQuizEmbeddings(userId: string, answers: TasteQuizAnswer[]): Promise<void> {
    const vectors = answers
      .filter((answer) => Array.isArray(answer.value) || typeof answer.value === 'string')
      .map((answer) => this.generateEmbeddingFromAnswer(answer));

    await this.repository.persistEmbeddings(userId, vectors);
  }

  /**
   * Generates and stores a new embedding vector from a brew diary entry's flavor notes.
   *
   * @param {BrewHistoryEntry} entry - Logged brew entry containing flavor note intensities and metadata.
   * @returns {Promise<void>} Promise resolving once the embedding is persisted; resolves early if entry lacks flavor notes.
   */
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

  /**
   * Retrieves the stored flavor journey milestones for the provided user.
   *
   * @param {string} userId - Identifier of the user requesting their journey data.
   * @returns {Promise<FlavorJourneyMilestone[]>} Promise resolving to existing milestones or an empty array.
   */
  public async getJourney(userId: string): Promise<FlavorJourneyMilestone[]> {
    return this.repository.fetchJourney(userId);
  }

  /**
   * Computes cosine similarity between two embedding vectors.
   *
   * @param {FlavorEmbeddingVector} a - First embedding vector to compare.
   * @param {FlavorEmbeddingVector} b - Second embedding vector to compare.
   * @returns {number} Similarity score ranging from -1 to 1 where 1 indicates identical orientation.
   */
  public calculateSimilarity(a: FlavorEmbeddingVector, b: FlavorEmbeddingVector): number {
    return cosineSimilarity(a.embedding, b.embedding);
  }

  /**
   * Suggests flavor milestones for exploration based on similarity to the user's latest embedding.
   *
   * @param {string} userId - Identifier of the user seeking recommendations.
   * @returns {Promise<FlavorJourneyMilestone[]>} Sorted list of the three least similar candidates encouraging diversity.
   */
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

  /**
   * Builds an embedding vector from a single quiz answer payload.
   *
   * @param {TasteQuizAnswer} answer - Quiz answer containing value and timestamp metadata.
   * @returns {FlavorEmbeddingVector} Embedding vector with source metadata for persistence.
   */
  private generateEmbeddingFromAnswer(answer: TasteQuizAnswer): FlavorEmbeddingVector {
    return {
      embedding: this.createEmbeddingFromValue(answer.value),
      label: Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value),
      createdAt: answer.timestamp,
      source: 'quiz',
    };
  }

  /**
   * Converts quiz answer values into a normalized embedding vector using hashed token placement.
   *
   * @param {TasteQuizAnswer['value']} value - Raw answer value, either an array of strings or a primitive value.
   * @returns {number[]} Normalized embedding vector sized to the embedding dimension.
   */
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

  /**
   * Creates an embedding vector from flavor notes recorded in a brew diary entry.
   *
   * @param {NonNullable<BrewHistoryEntry['flavorNotes']>} notes - Map of flavor note labels to numeric weights.
   * @returns {number[]} Normalized embedding vector representing the notes distribution.
   */
  private createEmbeddingFromNotes(notes: NonNullable<BrewHistoryEntry['flavorNotes']>): number[] {
    const vector = new Array(EMBEDDING_SIZE).fill(0);
    Object.entries(notes).forEach(([note, weight]) => {
      const slot = this.stringToNumber(note) % EMBEDDING_SIZE;
      vector[slot] = (vector[slot] ?? 0) + (weight ?? 0);
    });
    return this.normalize(vector);
  }

  /**
   * Normalizes a numeric vector to unit length, preserving direction while avoiding division by zero.
   *
   * @param {number[]} vector - Vector to normalize; may contain zeros.
   * @returns {number[]} Unit-length vector or original vector when magnitude is zero.
   */
  private normalize(vector: number[]): number[] {
    const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (length === 0) {
      return vector;
    }
    return vector.map((value) => value / length);
  }

  /**
   * Generates a deterministic hash-based number from a string for embedding slot assignment.
   *
   * @param {string} value - Input text token to convert.
   * @returns {number} Non-negative integer derived from the string's character codes.
   */
  private stringToNumber(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
