/**
 * Custom Playwright fixtures
 */

import { test as base, Page } from '@playwright/test';

interface TestData {
  users: {
    standard: { email: string; password: string; name: string };
    admin: { email: string; password: string; name: string };
  };
  payments: {
    creditCard: {
      cardNumber: string;
      expiry: string;
      cvv: string;
    };
  };
}

interface CustomFixtures {
  authenticatedPage: Page;
  testData: TestData;
}

const testData: TestData = {
  users: {
    standard: {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'password123',
      name: 'Test User',
    },
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
      name: 'Admin User',
    },
  },
  payments: {
    creditCard: {
      cardNumber: '4242424242424242',
      expiry: '12/25',
      cvv: '123',
    },
  },
};

export const test = base.extend<CustomFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[name="email"]', testData.users.standard.email);
    await page.fill('[name="password"]', testData.users.standard.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await use(page);
  },

  testData: async ({}, use) => {
    await use(testData);
  },
});

export { expect } from '@playwright/test';
