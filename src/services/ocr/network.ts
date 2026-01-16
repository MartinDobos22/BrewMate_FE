import NetInfo from '@react-native-community/netinfo';

/**
 * Ensures the device is online before making network requests.
 *
 * @returns {Promise<void>} Resolves when connectivity is confirmed; rejects when offline.
 * @throws {Error} Throws an `Error` with message `Offline` when no internet connection is detected.
 */
export const ensureOnline = async (): Promise<void> => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    throw new Error('Offline');
  }
};

/**
 * Executes a fetch-like request with exponential backoff retry semantics.
 *
 * @param {() => Promise<Response>} request - Function that triggers the network call to retry.
 * @param {number} [retries=3] - Maximum number of retry attempts when the request rejects.
 * @returns {Promise<Response>} The successful response from the final attempt.
 * @throws {unknown} Re-throws the final error if all retry attempts fail.
 */
export const retryableFetch = async (
  request: () => Promise<Response>,
  retries = 3
): Promise<Response> => {
  let attempt = 0;
  let delay = 500;
  while (true) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= retries) throw error;
      await new Promise(res => setTimeout(res, delay));
      attempt += 1;
      delay *= 2;
    }
  }
};

/**
 * Executes fetch with an AbortController timeout to avoid hanging requests.
 *
 * @param {string} url - Absolute request URL.
 * @param {RequestInit} options - Fetch options including headers and body.
 * @param {number} timeoutMs - Timeout in milliseconds before aborting the request.
 * @returns {Promise<Response>} The fetch response if completed before timeout.
 */
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs = 45000,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Wrapper around `fetch` that enforces online status and logs API traffic for debugging.
 *
 * @param {string} url - Absolute request URL.
 * @param {RequestInit} options - Fetch options including method, headers, and body.
 * @returns {Promise<Response>} Response returned by the underlying fetch request.
 * @throws {Error} Propagates connectivity errors from {@link ensureOnline} or failures from {@link retryableFetch}.
 */
export const loggedFetch = async (url: string, options: RequestInit): Promise<Response> => {
  await ensureOnline();
  console.log('📤 [FE->BE]');
  const res = await retryableFetch(() => fetchWithTimeout(url, options));
  console.log('📥 [BE->FE]', url, res.status);
  return res;
};

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const loggedFetchWithStatusRetry = async (
  url: string,
  options: RequestInit,
  retries = 2,
): Promise<{ response?: Response; error?: unknown; exhaustedRetries: boolean }> => {
  await ensureOnline();
  let attempt = 0;
  let delay = 500;

  while (true) {
    console.log('📤 [FE->BE]');
    try {
      const response = await fetchWithTimeout(url, options);
      console.log('📥 [BE->FE]', url, response.status);

      if (!response.ok && response.status >= 500) {
        if (attempt >= retries) {
          return { response, exhaustedRetries: true };
        }
        await wait(delay);
        attempt += 1;
        delay *= 2;
        continue;
      }

      return { response, exhaustedRetries: false };
    } catch (error) {
      if (attempt >= retries) {
        return { error, exhaustedRetries: true };
      }
      await wait(delay);
      attempt += 1;
      delay *= 2;
    }
  }
};
