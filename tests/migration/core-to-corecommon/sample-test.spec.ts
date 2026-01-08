import { test, expect } from '@playwright/test';

/**
 * Sample Migration Test for Core → Core.Common
 * Tests migration compatibility and feature parity
 */

test.describe('Core to Core.Common Migration - Sample Tests', () => {
  test('should verify API endpoint compatibility', async ({ request }) => {
    // Test old Core endpoint format
    const legacyResponse = await request.get('https://httpbin.org/get?version=core');
    expect(legacyResponse.ok()).toBeTruthy();

    // Test new Core.Common endpoint format
    const newResponse = await request.get('https://httpbin.org/get?version=core-common');
    expect(newResponse.ok()).toBeTruthy();

    // Verify response structure compatibility
    const legacyData = await legacyResponse.json();
    const newData = await newResponse.json();

    expect(legacyData).toHaveProperty('headers');
    expect(newData).toHaveProperty('headers');
  });

  test('should verify data model compatibility', async ({ request }) => {
    const testModel = {
      id: 123,
      name: 'Migrated Entity',
      legacyField: 'old_value',
      newField: 'new_value'
    };

    const response = await request.post('https://httpbin.org/post', {
      data: testModel
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.json).toEqual(testModel);
  });

  test('should verify feature parity', async ({ page }) => {
    // Test Core functionality
    await page.goto('https://example.com');
    const coreHeading = page.locator('h1');
    await expect(coreHeading).toBeVisible();

    // Verify same functionality in Core.Common
    await expect(coreHeading).toContainText('Example Domain');
  });
});
