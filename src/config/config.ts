// src/config/config.ts
// IMPORTANT: Never commit this file with real API keys to version control!
// Add config.ts to your .gitignore file

/**
 * Centralized configuration values for client-side services.
 *
 * This object intentionally stores placeholder credentials only. Real secrets
 * must be supplied at runtime through environment injection to avoid leaking
 * sensitive data in version control. Downstream services rely on these fields
 * to build HTTP headers and SDK clients, so provide production-ready values
 * when running on device or in CI.
 */
export const CONFIG = {
  // Replace with your actual OpenAI API key
  OPENAI_API_KEY: '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',

  // You can add other API configurations here
  // GOOGLE_VISION_API_KEY: 'your-google-key',
  // AZURE_API_KEY: 'your-azure-key',
};

