import EncryptedStorage from 'react-native-encrypted-storage';
import { FlavorEmbeddingVector, FlavorJourneyMilestone } from '../../types/PersonalizationAI';

const STORAGE_KEY = 'brewmate:flavor_journey';

interface StoredJourney {
  userId: string;
  milestones: FlavorJourneyMilestone[];
}

/**
 * Repository responsible for persisting and retrieving flavor journey milestones
 * derived from embeddings. Data is stored in encrypted storage per user.
 */
export class FlavorJourneyRepository {
  /**
   * Saves a batch of embedding vectors as milestones appended to the user's flavor journey.
   *
   * @param {string} userId - Identifier of the user whose journey is being updated. Used for namespacing storage keys.
   * @param {FlavorEmbeddingVector[]} embeddings - Ordered list of embedding vectors created from quiz answers or diary entries.
   * @returns {Promise<void>} Promise that resolves once the data is written to encrypted storage.
   */
  public async persistEmbeddings(userId: string, embeddings: FlavorEmbeddingVector[]): Promise<void> {
    const journey = await this.loadJourney(userId);
    const milestones = embeddings.map((embedding, index) => ({
      id: `${embedding.createdAt}-${index}`,
      date: embedding.createdAt,
      title: `Chuťový moment ${index + 1}`,
      description: embedding.label,
      embedding,
    } satisfies FlavorJourneyMilestone));

    const updated: StoredJourney = {
      userId,
      milestones: [...journey.milestones, ...milestones].slice(-100),
    };

    await this.saveJourney(updated);
  }

  /**
   * Retrieves the full flavor journey milestones for a given user.
   *
   * @param {string} userId - Identifier of the user whose journey is requested.
   * @returns {Promise<FlavorJourneyMilestone[]>} Promise resolving to a chronological list of milestones; empty when none exist.
   */
  public async fetchJourney(userId: string): Promise<FlavorJourneyMilestone[]> {
    return (await this.loadJourney(userId)).milestones;
  }

  /**
   * Reads a cached collection of exploration candidate milestones used for recommendations.
   *
   * @returns {Promise<FlavorJourneyMilestone[]>} Promise resolving to exploration milestones; empty array when cache is missing or invalid.
   */
  public async fetchExplorationCandidates(): Promise<FlavorJourneyMilestone[]> {
    const raw = await EncryptedStorage.getItem(`${STORAGE_KEY}:candidates`);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as FlavorJourneyMilestone[];
      return parsed;
    } catch (error) {
      console.warn('FlavorJourneyRepository: failed to parse candidates', error);
      return [];
    }
  }

  /**
   * Loads the persisted journey for the given user, returning an empty structure when unavailable.
   *
   * @param {string} userId - Identifier of the user whose journey should be loaded.
   * @returns {Promise<StoredJourney>} Parsed journey object containing milestones and user metadata.
   */
  private async loadJourney(userId: string): Promise<StoredJourney> {
    try {
      const raw = await EncryptedStorage.getItem(`${STORAGE_KEY}:${userId}`);
      if (!raw) {
        return { userId, milestones: [] };
      }
      return JSON.parse(raw) as StoredJourney;
    } catch (error) {
      console.warn('FlavorJourneyRepository: loadJourney failed', error);
      return { userId, milestones: [] };
    }
  }

  /**
   * Persists the provided journey payload to encrypted storage.
   *
   * @param {StoredJourney} journey - Journey payload containing the user id and milestone list to store.
   * @returns {Promise<void>} Promise that resolves when storage completes; logs warning on failure.
   */
  private async saveJourney(journey: StoredJourney): Promise<void> {
    try {
      await EncryptedStorage.setItem(`${STORAGE_KEY}:${journey.userId}`, JSON.stringify(journey));
    } catch (error) {
      console.warn('FlavorJourneyRepository: saveJourney failed', error);
    }
  }
}
