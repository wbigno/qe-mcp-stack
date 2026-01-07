import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log('Testing Anthropic API connection...');
console.log('API Key (first 20 chars):', process.env.ANTHROPIC_API_KEY?.substring(0, 20));

try {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-20250610',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'test' }]
  });

  console.log('✅ Success!');
  console.log('Response:', response.content[0].text);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Error details:', JSON.stringify(error, null, 2));
  process.exit(1);
}
