import { test, expect } from '@playwright/test';

/**
 * Sample Cross-App Integration Test
 * Tests integration between multiple applications
 */

test.describe('Cross-App Integration - Sample Tests', () => {
  test('should verify data sync across applications', async ({ request }) => {
    // Create record in Core
    const coreResponse = await request.post('https://httpbin.org/post', {
      data: {
        app: 'core',
        entity_id: 'E12345',
        data: { status: 'active' }
      }
    });

    expect(coreResponse.ok()).toBeTruthy();

    // Verify sync to Core.Common
    const commonResponse = await request.get('https://httpbin.org/get?entity_id=E12345');
    expect(commonResponse.ok()).toBeTruthy();

    const commonData = await commonResponse.json();
    expect(commonData.args.entity_id).toBe('E12345');
  });

  test('should handle event propagation', async ({ request }) => {
    const event = {
      type: 'entity_updated',
      source: 'payments',
      target: ['core', 'precare'],
      payload: { id: 123, status: 'processed' }
    };

    const response = await request.post('https://httpbin.org/post', {
      data: event
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.json.type).toBe('entity_updated');
    expect(data.json.target).toContain('core');
    expect(data.json.target).toContain('precare');
  });

  test('should verify API gateway routing', async ({ request }) => {
    // Request routed to Payments
    const paymentsRoute = await request.get('https://httpbin.org/get?service=payments');
    expect(paymentsRoute.ok()).toBeTruthy();

    // Request routed to PreCare
    const precareRoute = await request.get('https://httpbin.org/get?service=precare');
    expect(precareRoute.ok()).toBeTruthy();

    // Request routed to Core
    const coreRoute = await request.get('https://httpbin.org/get?service=core');
    expect(coreRoute.ok()).toBeTruthy();
  });
});
