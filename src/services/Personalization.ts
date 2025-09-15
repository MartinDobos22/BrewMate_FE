import { privacyManager as basePrivacyManager, preferenceEngine, PERSONALIZATION_USER_ID } from './personalizationGateway';
import type { TrackingPreferences, TasteProfileVector } from '../types/Personalization';
import type { ExportPayload } from '../types/Personalization';
import { PrivacyManager } from './PrivacyManager';

export const DEFAULT_COMMUNITY_AVERAGE: TasteProfileVector = {
  sweetness: 5,
  acidity: 5,
  bitterness: 5,
  body: 5,
};

export const optIn: { dataControl: (keyof TrackingPreferences)[] } = {
  dataControl: ['analytics', 'autoTracking', 'communityInsights'],
};

const manager: PrivacyManager = basePrivacyManager;

export const privacyManager = {
  manager,
  loadPreferences(): Promise<TrackingPreferences> {
    return manager.loadPreferences(PERSONALIZATION_USER_ID);
  },
  exportData(): Promise<ExportPayload> {
    return manager.exportUserData(PERSONALIZATION_USER_ID);
  },
  deleteData(): Promise<void> {
    return manager.deleteUserData(PERSONALIZATION_USER_ID);
  },
  canProcess(flag: keyof TrackingPreferences): Promise<boolean> {
    return manager.canProcess(flag, PERSONALIZATION_USER_ID);
  },
  buildCommunityInsights(): ReturnType<PrivacyManager['buildCommunityInsights']> {
    return manager.buildCommunityInsights(PERSONALIZATION_USER_ID);
  },
};

export { preferenceEngine, PERSONALIZATION_USER_ID };
