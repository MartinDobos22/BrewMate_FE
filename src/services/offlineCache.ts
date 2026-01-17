/**
 * Stubbed out OCR cache write to avoid persisting scan results locally.
 *
 * @param {string} id - Unique identifier of the OCR run, typically derived from
 * the source image or scan session.
 * @param {any} payload - Arbitrary OCR result payload to store; it is
 * serialized to JSON before persistence.
 * @returns {Promise<void>} Resolves immediately without performing any storage.
 */
export const saveOCRResult = async (_id: string, _payload: any) => {};

/**
 * Stubbed out OCR cache read to avoid returning locally stored scan results.
 *
 * @param {string} [id] - Optional identifier of the OCR run to load; when
 * omitted the most recent saved ID is used.
 * @returns {Promise<any|null>} Always resolves to `null` because caching is disabled.
 */
export const loadOCRResult = async (_id?: string) => null;
