/**
 * Calculates the cosine similarity between two numeric vectors used for taste and preference comparisons.
 *
 * @param {number[]} a - First vector of equal length containing numeric feature values; must not include NaN values.
 * @param {number[]} b - Second vector matching the length of {@link a} representing comparable feature values.
 * @returns {number} A similarity score between -1 and 1 where higher values indicate closer alignment; returns 0 if either vector has zero magnitude.
 * @throws {Error} If the provided vectors differ in length.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must be of equal length');
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
