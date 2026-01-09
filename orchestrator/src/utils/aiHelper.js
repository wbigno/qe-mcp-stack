/**
 * AI Helper for Orchestrator
 * Provides Claude AI integration for requirements analysis and test case generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY?.trim()
});

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Call Claude AI with a prompt
 * @param {string} prompt - The prompt to send
 * @param {string} model - Optional model override
 * @param {number} maxTokens - Max tokens for response
 * @returns {Promise<string>} AI response text
 */
export async function callClaude(prompt, model = null, maxTokens = 4096) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const effectiveModel = model || process.env.CLAUDE_MODEL || DEFAULT_MODEL;

  try {
    logger.info(`Calling Claude API with model: ${effectiveModel}`);

    const response = await anthropic.messages.create({
      model: effectiveModel,
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const text = response.content[0].text;

    logger.info(`Claude API response: ${response.usage.input_tokens} input tokens, ${response.usage.output_tokens} output tokens`);

    return text;

  } catch (error) {
    logger.error(`Claude API error: ${error.message}`);
    throw new Error(`AI API error: ${error.message}`);
  }
}

export default {
  callClaude
};
