export { getAuthToken } from './ocr/auth';
export { fixTextWithAI, getBrewRecipe, suggestBrewingMethods } from './ocr/aiServices';
export { normalizeEvaluationResponse } from './ocr/evaluation';
export { ensureOnline, loggedFetch, loggedFetchWithStatusRetry, retryableFetch } from './ocr/network';
export { processOCR } from './ocr/processOCR';
export {
  confirmStructuredScan,
  deleteOCRRecord,
  fetchOCRHistory,
  markCoffeePurchased,
  rateOCRResult,
} from './ocr/records';
export { extractCoffeeName } from './ocr/textHelpers';
export { isCoffeeRelatedText } from './ocr/textDetection';
export {
  isServerTasteProfile,
  isTasteProfileComplete,
  mapTasteProfilePayload,
  needsTasteProfileTimestamps,
} from './ocr/tasteProfile';
export { safeParseJSON } from './ocr/utils';
export type {
  CoffeeEvaluationCta,
  CoffeeEvaluationDimensionDiff,
  CoffeeEvaluationInsight,
  CoffeeEvaluationInsightSection,
  CoffeeEvaluationReason,
  CoffeeEvaluationResult,
  CoffeeEvaluationStatus,
  CoffeeEvaluationVerdict,
  ConfirmStructuredPayload,
  OCRHistory,
  OCRResult,
  StructuredCoffeeMetadata,
  VerdictExplanation,
} from './ocr/types';
