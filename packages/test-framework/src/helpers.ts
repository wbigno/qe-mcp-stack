/**
 * Test helper utilities
 */

import { Page, Locator, expect } from '@playwright/test';

export async function waitForElement(
  page: Page,
  selector: string,
  options?: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number }
): Promise<Locator> {
  const locator = page.locator(selector);
  await locator.waitFor(options);
  return locator;
}

export async function assertElementText(page: Page, selector: string, expectedText: string): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toHaveText(expectedText);
}

export async function assertElementVisible(page: Page, selector: string): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
}

export async function assertElementHidden(page: Page, selector: string): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).not.toBeVisible();
}

export async function fillForm(page: Page, fields: Record<string, string>): Promise<void> {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
  }
}

export async function clickAndWaitForNavigation(page: Page, selector: string): Promise<void> {
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector),
  ]);
}

export async function selectDropdown(page: Page, selector: string, value: string): Promise<void> {
  await page.selectOption(selector, value);
}

export async function uploadFile(page: Page, selector: string, filePath: string): Promise<void> {
  const fileInput = page.locator(selector);
  await fileInput.setInputFiles(filePath);
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}

export function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function generateRandomEmail(): string {
  return `test_${generateRandomString(8)}@example.com`;
}

export function generateUser() {
  return {
    email: generateRandomEmail(),
    password: generateRandomString(12),
    name: `Test User ${generateRandomString(4)}`,
    phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
  };
}

export function generatePayment() {
  return {
    cardNumber: '4242424242424242',
    expiry: '12/25',
    cvv: '123',
    amount: Math.floor(Math.random() * 10000) + 1000,
  };
}

export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  callback: () => Promise<void>
): Promise<any> {
  const responsePromise = page.waitForResponse(
    response => {
      const url = response.url();
      return typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
    }
  );

  await callback();

  const response = await responsePromise;
  return response.json();
}

export async function mockAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  responseData: any,
  status: number = 200
): Promise<void> {
  await page.route(urlPattern, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(responseData),
    });
  });
}

export async function waitForLoadingToFinish(page: Page, loadingSelector: string = '.loading'): Promise<void> {
  try {
    await page.waitForSelector(loadingSelector, { state: 'hidden', timeout: 10000 });
  } catch {
    // Loading indicator might not exist, which is fine
  }
}
