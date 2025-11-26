import { API_URL } from './api';

/**
 * Retrieves the authenticated user's badges from the backend API.
 *
 * @returns {Promise<unknown>} A promise that resolves with the parsed JSON payload of badge data returned by the API.
 * @throws {Error} Throws when the network request fails or the response cannot be parsed as JSON.
 */
export async function getBadgesFromApi(): Promise<unknown> {
  const res = await fetch(`${API_URL}/badges`);
  return res.json();
}

/**
 * Persists the provided badge collection and level for the current user.
 *
 * @param {string[]} badges - Array of badge identifiers to be associated with the user. Each entry should be a stable badge key.
 * @param {number} level - Current gamification level of the user; must be a non-negative integer.
 * @returns {Promise<void>} A promise that resolves when the server acknowledges the update request.
 * @throws {Error} Throws when the request fails or the connection is unavailable.
 */
export async function saveBadgesToApi(badges: string[], level: number): Promise<void> {
  await fetch(`${API_URL}/badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badges, level }),
  });
}
