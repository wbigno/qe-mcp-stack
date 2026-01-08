import { Page, Locator } from '@playwright/test';
import { BaseComponent } from '../../pages';

/**
 * Shared UI components used across multiple applications
 */

export class HeaderComponent extends BaseComponent {
  readonly logo: Locator;
  readonly navMenu: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page, 'header');
    this.logo = this.locator('[data-testid="logo"]');
    this.navMenu = this.locator('nav');
    this.userMenu = this.locator('[data-testid="user-menu"]');
    this.logoutButton = this.locator('[data-testid="logout"]');
  }

  async navigateTo(menuItem: string): Promise<void> {
    await this.navMenu.getByRole('link', { name: menuItem }).click();
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}

export class FooterComponent extends BaseComponent {
  readonly copyrightText: Locator;
  readonly links: Locator;

  constructor(page: Page) {
    super(page, 'footer');
    this.copyrightText = this.locator('.copyright');
    this.links = this.locator('a');
  }

  async clickLink(linkText: string): Promise<void> {
    await this.links.getByText(linkText).click();
  }
}

export class ModalComponent extends BaseComponent {
  readonly title: Locator;
  readonly content: Locator;
  readonly closeButton: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page, modalSelector: string = '[role="dialog"]') {
    super(page, modalSelector);
    this.title = this.locator('.modal-title, h2');
    this.content = this.locator('.modal-content, .modal-body');
    this.closeButton = this.locator('[data-testid="close"], .close');
    this.confirmButton = this.locator('[data-testid="confirm"], .btn-confirm');
    this.cancelButton = this.locator('[data-testid="cancel"], .btn-cancel');
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
    await this.waitForHidden();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.waitForHidden();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.waitForHidden();
  }
}

export class FormComponent extends BaseComponent {
  constructor(page: Page, formSelector: string = 'form') {
    super(page, formSelector);
  }

  async fillField(fieldName: string, value: string): Promise<void> {
    const field = this.locator(`[name="${fieldName}"], [id="${fieldName}"]`);
    await field.fill(value);
  }

  async selectOption(fieldName: string, value: string): Promise<void> {
    const select = this.locator(`select[name="${fieldName}"], select[id="${fieldName}"]`);
    await select.selectOption(value);
  }

  async checkCheckbox(fieldName: string): Promise<void> {
    const checkbox = this.locator(`input[type="checkbox"][name="${fieldName}"]`);
    await checkbox.check();
  }

  async submit(): Promise<void> {
    const submitButton = this.locator('button[type="submit"]');
    await submitButton.click();
  }

  async getErrorMessage(fieldName?: string): Promise<string> {
    const selector = fieldName
      ? `.error[data-field="${fieldName}"], .field-error[data-field="${fieldName}"]`
      : '.error, .field-error';
    return this.locator(selector).first().innerText();
  }
}

export class TableComponent extends BaseComponent {
  readonly headers: Locator;
  readonly rows: Locator;
  readonly pagination: Locator;

  constructor(page: Page, tableSelector: string = 'table') {
    super(page, tableSelector);
    this.headers = this.locator('thead th');
    this.rows = this.locator('tbody tr');
    this.pagination = page.locator('.pagination, [data-testid="pagination"]');
  }

  async getRowCount(): Promise<number> {
    return this.rows.count();
  }

  async getRowByIndex(index: number): Promise<Locator> {
    return this.rows.nth(index);
  }

  async getCellValue(rowIndex: number, columnIndex: number): Promise<string> {
    const row = await this.getRowByIndex(rowIndex);
    const cell = row.locator('td').nth(columnIndex);
    return cell.innerText();
  }

  async clickRowAction(rowIndex: number, actionName: string): Promise<void> {
    const row = await this.getRowByIndex(rowIndex);
    await row.getByRole('button', { name: actionName }).click();
  }

  async goToNextPage(): Promise<void> {
    await this.pagination.getByRole('button', { name: /next/i }).click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.pagination.getByRole('button', { name: /previous/i }).click();
  }
}
