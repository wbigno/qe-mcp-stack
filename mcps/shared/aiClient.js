/**
 * Unified AI Client
 *
 * Abstracts Anthropic (Claude) and OpenAI APIs behind a single interface.
 * Supports on-demand model selection for all AI-powered MCP services.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Initialize clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Default models
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-20250610';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

/**
 * Detect provider from model name
 * @param {string} model - Model identifier
 * @returns {string} Provider name ('anthropic' or 'openai')
 */
function detectProvider(model) {
  if (!model) return 'anthropic'; // Default to Anthropic
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gpt-') || model.startsWith('o1')) return 'openai';
  throw new Error(`Unknown model format: ${model}`);
}

/**
 * Generate AI completion using specified model
 *
 * @param {Object} params - Generation parameters
 * @param {string} params.model - Model ID (e.g., 'claude-sonnet-4-20250514', 'gpt-4o')
 * @param {Array} params.messages - Array of message objects [{role: 'user', content: '...'}]
 * @param {number} params.maxTokens - Maximum tokens to generate (default: 4096)
 * @param {number} params.temperature - Temperature 0-1 (default: 0.4)
 * @param {Object} params.options - Additional provider-specific options
 * @returns {Promise<{text: string, usage: object, provider: string, model: string}>}
 */
export async function generateCompletion({
  model,
  messages,
  maxTokens = 4096,
  temperature = 0.4,
  options = {}
}) {
  // Determine effective model (with fallbacks)
  const effectiveModel = model || process.env.CLAUDE_MODEL || DEFAULT_ANTHROPIC_MODEL;
  const provider = detectProvider(effectiveModel);

  try {
    if (provider === 'anthropic') {
      return await callAnthropic({
        model: effectiveModel,
        messages,
        maxTokens,
        temperature,
        options
      });
    } else {
      return await callOpenAI({
        model: effectiveModel,
        messages,
        maxTokens,
        temperature,
        options
      });
    }
  } catch (error) {
    throw new Error(`AI API error (${provider}/${effectiveModel}): ${error.message}`);
  }
}

/**
 * Call Anthropic Claude API
 * @private
 */
async function callAnthropic({ model, messages, maxTokens, temperature, options }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
    ...options
  });

  return {
    text: response.content[0].text,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens
    },
    provider: 'anthropic',
    model
  };
}

/**
 * Call OpenAI API
 * @private
 */
async function callOpenAI({ model, messages, maxTokens, temperature, options }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    ...options
  });

  return {
    text: response.choices[0].message.content,
    usage: {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens
    },
    provider: 'openai',
    model
  };
}

/**
 * Validate API keys are configured
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
export function validateApiKeys() {
  const errors = [];

  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push('ANTHROPIC_API_KEY not configured');
  }

  if (!process.env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY not configured');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  generateCompletion,
  validateApiKeys
};
