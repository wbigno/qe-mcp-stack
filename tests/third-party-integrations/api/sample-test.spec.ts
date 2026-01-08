import { test, expect } from '@playwright/test';

/**
 * Sample API Test for Third Party Integrations
 * Tests external service API calls
 */

test.describe('Third Party Integrations API - Sample Tests', () => {
  test('should test external API connectivity', async ({ request }) => {
    const response = await request.get('https://httpbin.org/get');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('should handle authentication headers', async ({ request }) => {
    const response = await request.get('https://httpbin.org/get', {
      headers: {
        'Authorization': 'Bearer test-token-12345',
        'X-API-Key': 'test-api-key'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.headers['Authorization']).toBe('Bearer test-token-12345');
    expect(data.headers['X-Api-Key']).toBe('test-api-key');
  });

  test('should test webhook endpoints', async ({ request }) => {
    const webhookPayload = {
      event: 'payment.completed',
      timestamp: new Date().toISOString(),
      data: { amount: 100 }
    };

    const response = await request.post('https://httpbin.org/post', {
      data: webhookPayload
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.json.event).toBe('payment.completed');
  });
});
