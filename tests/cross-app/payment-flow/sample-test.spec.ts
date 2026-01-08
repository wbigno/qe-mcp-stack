import { test, expect } from '@playwright/test';

/**
 * Sample Cross-App Test for Payment Flow
 * Tests payment flow across multiple applications
 */

test.describe('Cross-App Payment Flow - Sample Tests', () => {
  test('should complete payment flow across apps', async ({ page, request }) => {
    // Step 1: PreCare - Patient initiates payment
    await page.goto('https://example.com');
    await expect(page.locator('h1')).toContainText('Example Domain');

    // Step 2: Payments - Process payment
    const paymentResponse = await request.post('https://httpbin.org/post', {
      data: {
        source: 'precare',
        patient_id: 'P12345',
        amount: 250.00,
        service: 'consultation'
      }
    });

    expect(paymentResponse.ok()).toBeTruthy();
    const paymentData = await paymentResponse.json();
    expect(paymentData.json.source).toBe('precare');

    // Step 3: Core - Update records
    const coreResponse = await request.post('https://httpbin.org/post', {
      data: {
        action: 'update_record',
        patient_id: 'P12345',
        payment_status: 'completed'
      }
    });

    expect(coreResponse.ok()).toBeTruthy();
  });

  test('should handle cross-app authentication', async ({ request }) => {
    // Authenticate with Core
    const authResponse = await request.post('https://httpbin.org/post', {
      data: {
        app: 'core',
        username: 'test_user',
        action: 'login'
      }
    });

    expect(authResponse.ok()).toBeTruthy();

    // Use token in Payments app
    const paymentResponse = await request.get('https://httpbin.org/get', {
      headers: {
        'Authorization': 'Bearer test-token-from-core'
      }
    });

    expect(paymentResponse.ok()).toBeTruthy();
    const data = await paymentResponse.json();
    expect(data.headers['Authorization']).toContain('Bearer');
  });
});
