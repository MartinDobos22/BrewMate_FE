export {
  processOCR,
  fetchOCRHistory,
  deleteOCRRecord,
  markCoffeePurchased,
  confirmStructuredScan,
  extractCoffeeName,
  rateOCRResult,
  isCoffeeRelatedText,
} from '../../../services/ocrServices';
export type {
  StructuredCoffeeMetadata,
  ConfirmStructuredPayload,
} from '../../../services/ocrServices';
export { incrementProgress } from '../../../services/profileServices';
export { saveOCRResult, loadOCRResult } from '../../../services/offlineCache';
export { addRecentScan } from '../../../services/coffeeServices';
export { coffeeDiary as fallbackCoffeeDiary, preferenceEngine } from '../../../services/personalizationGateway';
export { toggleFavorite } from '../../../services/homePagesService';
export type { OCRHistory } from '../../../services/ocrServices';
