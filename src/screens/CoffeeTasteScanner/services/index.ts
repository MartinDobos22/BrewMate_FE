export {
  processOCR,
  deleteOCRRecord,
  extractCoffeeName,
  isCoffeeRelatedText,
} from '../../../services/ocrServices';
export type {
  CoffeeEvaluationResult,
} from '../../../services/ocrServices';
export type { StructuredCoffeeMetadata } from '../../../services/ocr/types';
export { saveOCRResult, loadOCRResult } from '../../../services/offlineCache';
export { addRecentScan } from '../../../services/coffeeServices';
export { coffeeDiary as fallbackCoffeeDiary, preferenceEngine } from '../../../services/personalizationGateway';
export { toggleFavorite } from '../../../services/homePagesService';
export type { OCRHistory } from '../../../services/ocr/types';
