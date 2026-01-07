#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';

console.log('Testing Anthropic API...');
console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('API Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 15) + '...');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

try {
  console.log('\nAttempting API call with model: claude-haiku-4-20250610');
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-20250610',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hello' }]
  });

  console.log('✅ SUCCESS!');
  console.log('Response:', response.content[0].text);
} catch (error) {
  console.error('\n❌ ERROR:');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error status:', error.status);
  console.error('Error type:', error.type);
  console.error('\nFull error:', JSON.stringify(error, null, 2));
  process.exit(1);
}
