export const appleAuth = {
  performRequest: async () => ({ identityToken: 'mock-token', nonce: 'mock-nonce' }),
  Operation: { LOGIN: 'LOGIN' },
  Scope: { EMAIL: 'EMAIL', FULL_NAME: 'FULL_NAME' },
  Error: { CANCELED: 'CANCELED' },
};
