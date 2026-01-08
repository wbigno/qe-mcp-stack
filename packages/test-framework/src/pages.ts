/**
 * Base page object classes
 */

import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  protected page: Page;
  protected baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:8001';
  }

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`);
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async getURL(): Promise<string> {
    return this.page.url();
  }

  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  async getText(selector: string): Promise<string> {
    return this.page.locator(selector).innerText();
  }

  async isVisible(selector: string): Promise<boolean> {
    return this.page.locator(selector).isVisible();
  }

  async isHidden(selector: string): Promise<boolean> {
    return this.page.locator(selector).isHidden();
  }

  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  async expectTitle(title: string): Promise<void> {
    await expect(this.page).toHaveTitle(title);
  }

  async expectURL(url: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(url);
  }

  async expectElementVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementHidden(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async expectElementText(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveText(text);
  }

  async expectElementCount(selector: string, count: number): Promise<void> {
    await expect(this.page.locator(selector)).toHaveCount(count);
  }
}

export class BaseComponent {
  protected page: Page;
  protected root: Locator;

  constructor(page: Page, rootSelector: string) {
    this.page = page;
    this.root = page.locator(rootSelector);
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  async waitForVisible(): Promise<void> {
    await this.root.waitFor({ state: 'visible' });
  }

  async waitForHidden(): Promise<void> {
    await this.root.waitFor({ state: 'hidden' });
  }

  protected locator(selector: string): Locator {
    return this.root.locator(selector);
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.root).not.toBeVisible();
  }
}

export class LoginPage extends BasePage {
  readonly emailInput = this.page.locator('[name="email"]');
  readonly passwordInput = this.page.locator('[name="password"]');
  readonly submitButton = this.page.locator('button[type="submit"]');
  readonly errorMessage = this.page.locator('.error-message');

  async goto(): Promise<void> {
    await super.goto('/login');
    await this.waitForLoad();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectErrorMessage(message: string): Promise<void> {
    await expect(this.errorMessage).toHaveText(message);
  }
}

export class DashboardPage extends BasePage {
  readonly welcomeMessage = this.page.locator('.welcome-message');
  readonly userName = this.page.locator('.user-name');
  readonly logoutButton = this.page.locator('[data-testid="logout-button"]');

  async goto(): Promise<void> {
    await super.goto('/dashboard');
    await this.waitForLoad();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.waitForNavigation();
  }
}
