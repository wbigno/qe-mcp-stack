import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../pages';
import { TableComponent } from '../shared/components';

/**
 * User management page object
 */
export class UserManagementPage extends BasePage {
  readonly heading: Locator;
  readonly addUserButton: Locator;
  readonly searchInput: Locator;
  readonly usersTable: TableComponent;
  readonly roleFilter: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('h1');
    this.addUserButton = page.locator('[data-testid="add-user"]');
    this.searchInput = page.locator('[name="search"]');
    this.roleFilter = page.locator('select[name="roleFilter"]');
    this.usersTable = new TableComponent(page, '#users-table');
  }

  async goto(): Promise<void> {
    await super.goto('/admin/users');
    await this.waitForLoad();
  }

  async searchUsers(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForLoad();
  }

  async filterByRole(role: string): Promise<void> {
    await this.roleFilter.selectOption(role);
    await this.waitForLoad();
  }

  async clickAddUser(): Promise<void> {
    await this.addUserButton.click();
  }

  async editUser(userIndex: number): Promise<void> {
    await this.usersTable.clickRowAction(userIndex, 'Edit');
  }

  async deleteUser(userIndex: number): Promise<void> {
    await this.usersTable.clickRowAction(userIndex, 'Delete');
  }

  async getUserCount(): Promise<number> {
    return this.usersTable.getRowCount();
  }
}

/**
 * Settings page object
 */
export class SettingsPage extends BasePage {
  readonly heading: Locator;
  readonly generalTab: Locator;
  readonly securityTab: Locator;
  readonly notificationsTab: Locator;
  readonly integrationsTab: Locator;
  readonly saveButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('h1');
    this.generalTab = page.locator('[data-tab="general"]');
    this.securityTab = page.locator('[data-tab="security"]');
    this.notificationsTab = page.locator('[data-tab="notifications"]');
    this.integrationsTab = page.locator('[data-tab="integrations"]');
    this.saveButton = page.locator('button[type="submit"]');
    this.successMessage = page.locator('.success-message');
  }

  async goto(): Promise<void> {
    await super.goto('/admin/settings');
    await this.waitForLoad();
  }

  async navigateToGeneral(): Promise<void> {
    await this.generalTab.click();
    await this.waitForLoad();
  }

  async navigateToSecurity(): Promise<void> {
    await this.securityTab.click();
    await this.waitForLoad();
  }

  async navigateToNotifications(): Promise<void> {
    await this.notificationsTab.click();
    await this.waitForLoad();
  }

  async navigateToIntegrations(): Promise<void> {
    await this.integrationsTab.click();
    await this.waitForLoad();
  }

  async updateSetting(settingName: string, value: string): Promise<void> {
    const input = this.page.locator(`[name="${settingName}"]`);
    await input.fill(value);
  }

  async saveSettings(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async isSettingsSaved(): Promise<boolean> {
    return this.successMessage.isVisible();
  }
}

/**
 * Reports page object
 */
export class ReportsPage extends BasePage {
  readonly heading: Locator;
  readonly reportTypeSelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly generateButton: Locator;
  readonly downloadButton: Locator;
  readonly reportTable: TableComponent;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('h1');
    this.reportTypeSelect = page.locator('select[name="reportType"]');
    this.startDateInput = page.locator('[name="startDate"]');
    this.endDateInput = page.locator('[name="endDate"]');
    this.generateButton = page.locator('[data-testid="generate-report"]');
    this.downloadButton = page.locator('[data-testid="download-report"]');
    this.reportTable = new TableComponent(page, '#report-table');
  }

  async goto(): Promise<void> {
    await super.goto('/admin/reports');
    await this.waitForLoad();
  }

  async selectReportType(reportType: string): Promise<void> {
    await this.reportTypeSelect.selectOption(reportType);
  }

  async setDateRange(startDate: string, endDate: string): Promise<void> {
    await this.startDateInput.fill(startDate);
    await this.endDateInput.fill(endDate);
  }

  async generateReport(): Promise<void> {
    await this.generateButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async downloadReport(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadButton.click();
    await downloadPromise;
  }

  async getReportData(): Promise<number> {
    return this.reportTable.getRowCount();
  }
}
