/**
 * Model Mapper
 *
 * Defines model catalog, tier mappings, and metadata for AI model selection.
 * Central source of truth for all supported models across providers.
 */

export const MODEL_TIERS = {
  FAST: 'fast',
  BALANCED: 'balanced',
  ADVANCED: 'advanced'
};

/**
 * Model catalog with metadata and tier mappings
 */
export const MODEL_CATALOG = {
  // Anthropic Claude Models
  'claude-haiku-4-20250610': {
    provider: 'anthropic',
    tier: MODEL_TIERS.FAST,
    displayName: 'Claude Haiku 4',
    description: 'Fast and efficient for routine tasks',
    costPerMToken: { input: 0.25, output: 1.25 },
    tierMapping: 'gpt-4o-mini',
    default: true
  },
  'claude-sonnet-4-20250514': {
    provider: 'anthropic',
    tier: MODEL_TIERS.BALANCED,
    displayName: 'Claude Sonnet 4',
    description: 'Balanced performance and reasoning',
    costPerMToken: { input: 3.0, output: 15.0 },
    tierMapping: 'gpt-4o'
  },
  'claude-opus-4-20250514': {
    provider: 'anthropic',
    tier: MODEL_TIERS.ADVANCED,
    displayName: 'Claude Opus 4',
    description: 'Most capable for complex reasoning',
    costPerMToken: { input: 15.0, output: 75.0 },
    tierMapping: 'o1'
  },

  // OpenAI Models
  'gpt-4o-mini': {
    provider: 'openai',
    tier: MODEL_TIERS.FAST,
    displayName: 'GPT-4o Mini',
    description: 'Fast and cost-effective',
    costPerMToken: { input: 0.15, output: 0.6 },
    tierMapping: 'claude-haiku-4-20250610',
    default: true
  },
  'gpt-4o': {
    provider: 'openai',
    tier: MODEL_TIERS.BALANCED,
    displayName: 'GPT-4o',
    description: 'Balanced intelligence and speed',
    costPerMToken: { input: 5.0, output: 15.0 },
    tierMapping: 'claude-sonnet-4-20250514'
  },
  'o1': {
    provider: 'openai',
    tier: MODEL_TIERS.ADVANCED,
    displayName: 'O1',
    description: 'Advanced reasoning capabilities',
    costPerMToken: { input: 15.0, output: 60.0 },
    tierMapping: 'claude-opus-4-20250514'
  },
  'o1-mini': {
    provider: 'openai',
    tier: MODEL_TIERS.FAST,
    displayName: 'O1 Mini',
    description: 'Efficient reasoning model',
    costPerMToken: { input: 3.0, output: 12.0 },
    tierMapping: 'claude-haiku-4-20250610'
  }
};

/**
 * Get tier-equivalent model for opposite provider
 * @param {string} modelId - Current model ID
 * @returns {string|null} Equivalent model ID or null
 */
export function getTierMapping(modelId) {
  const model = MODEL_CATALOG[modelId];
  return model?.tierMapping || null;
}

/**
 * Get all models for a specific provider
 * @param {string} provider - Provider name ('anthropic' or 'openai')
 * @returns {Array} Array of model objects with id and metadata
 */
export function getModelsByProvider(provider) {
  return Object.entries(MODEL_CATALOG)
    .filter(([_, model]) => model.provider === provider)
    .map(([id, model]) => ({ id, ...model }));
}

/**
 * Get model metadata by ID
 * @param {string} modelId - Model identifier
 * @returns {Object|null} Model metadata or null
 */
export function getModelMetadata(modelId) {
  return MODEL_CATALOG[modelId] || null;
}

/**
 * Get default model for provider
 * @param {string} provider - Provider name ('anthropic' or 'openai')
 * @returns {string} Default model ID
 */
export function getDefaultModel(provider) {
  const models = getModelsByProvider(provider);
  const defaultModel = models.find(m => m.default);
  return defaultModel?.id || models[0]?.id || null;
}

/**
 * Validate model ID exists in catalog
 * @param {string} modelId - Model identifier to validate
 * @returns {boolean} True if valid
 */
export function isValidModel(modelId) {
  return modelId in MODEL_CATALOG;
}

/**
 * Get all available model IDs
 * @returns {Array<string>} Array of model IDs
 */
export function getAllModelIds() {
  return Object.keys(MODEL_CATALOG);
}

export default {
  MODEL_TIERS,
  MODEL_CATALOG,
  getTierMapping,
  getModelsByProvider,
  getModelMetadata,
  getDefaultModel,
  isValidModel,
  getAllModelIds
};
