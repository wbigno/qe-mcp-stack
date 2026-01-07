#!/usr/bin/env node
import https from 'https';

console.log('Testing HTTPS connection to api.anthropic.com...\n');

const options = {
  hostname: 'api.anthropic.com',
  port: 443,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY || 'test-key',
    'anthropic-version': '2023-06-01'
  }
};

const req = https.request(options, (res) => {
  console.log('✅ Connection successful!');
  console.log('Status code:', res.statusCode);
  console.log('Status message:', res.statusMessage);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse body:', data);
  });
});

req.on('error', (error) => {
  console.error('❌ Connection failed!');
  console.error('Error:', error.message);
  console.error('Code:', error.code);
  console.error('Full error:', JSON.stringify(error, null, 2));
  process.exit(1);
});

req.write(JSON.stringify({
  model: 'claude-3-haiku-20240307',
  max_tokens: 10,
  messages: [{ role: 'user', content: 'test' }]
}));

req.end();
