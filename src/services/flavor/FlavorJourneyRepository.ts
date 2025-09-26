import EncryptedStorage from 'react-native-encrypted-storage';
import { FlavorEmbeddingVector, FlavorJourneyMilestone } from '../../types/PersonalizationAI';

const STORAGE_KEY = 'brewmate:flavor_journey';

interface StoredJourney {
  userId: string;
  milestones: FlavorJourneyMilestone[];
}

export class FlavorJourneyRepository {
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

  public async fetchJourney(userId: string): Promise<FlavorJourneyMilestone[]> {
    return (await this.loadJourney(userId)).milestones;
  }

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

  private async saveJourney(journey: StoredJourney): Promise<void> {
    try {
      await EncryptedStorage.setItem(`${STORAGE_KEY}:${journey.userId}`, JSON.stringify(journey));
    } catch (error) {
      console.warn('FlavorJourneyRepository: saveJourney failed', error);
    }
  }
}
