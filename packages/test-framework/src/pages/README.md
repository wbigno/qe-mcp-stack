# Page Object Model

This directory contains page objects organized by application. Page objects provide a clean abstraction layer for UI interactions in tests.

## Directory Structure

```
pages/
├── shared/           # Shared components used across applications
│   └── components.ts # Reusable UI components (Header, Modal, Form, etc.)
├── payments/         # Payments application pages
│   └── payment-page.ts
├── precare/          # PreCare application pages
│   └── patient-page.ts
├── core-common/      # Core.Common application pages
│   └── admin-page.ts
└── index.ts          # Exports all page objects
```

## Usage

### Import Page Objects

```typescript
import {
  PaymentPage,
  PatientPortalPage,
  UserManagementPage
} from '@qe-mcp-stack/test-framework/pages';
```

### Using Page Objects in Tests

```typescript
import { test, expect } from '@playwright/test';
import { PaymentPage } from '@qe-mcp-stack/test-framework/pages';

test('process payment successfully', async ({ page }) => {
  const paymentPage = new PaymentPage(page);

  await paymentPage.goto();
  await paymentPage.processPayment('100.00', '4111111111111111', '12/25', '123');

  expect(await paymentPage.isPaymentSuccessful()).toBeTruthy();
});
```

### Using Shared Components

```typescript
import { test, expect } from '@playwright/test';
import { HeaderComponent, ModalComponent } from '@qe-mcp-stack/test-framework/pages';

test('navigate using header', async ({ page }) => {
  await page.goto('/');

  const header = new HeaderComponent(page);
  await header.navigateTo('Payments');

  await expect(page).toHaveURL(/.*payments/);
});

test('confirm modal action', async ({ page }) => {
  await page.goto('/settings');

  // Trigger modal
  await page.click('[data-testid="delete-account"]');

  const modal = new ModalComponent(page);
  await modal.waitForVisible();
  await modal.confirm();

  await expect(modal.root).not.toBeVisible();
});
```

## Page Object Patterns

### Base Page Class

All page objects extend `BasePage` which provides common functionality:

```typescript
export class MyPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await super.goto('/my-path');
    await this.waitForLoad();
  }
}
```

### Component Pattern

For reusable UI components, extend `BaseComponent`:

```typescript
export class MyComponent extends BaseComponent {
  constructor(page: Page) {
    super(page, '.my-component-selector');
  }

  async doSomething(): Promise<void> {
    await this.locator('.button').click();
  }
}
```

## Available Page Objects

### Payments

- **PaymentPage**: Process payments, enter card details
- **PaymentHistoryPage**: View and search payment history

### PreCare

- **PatientRegistrationPage**: Register new patients
- **PatientPortalPage**: Navigate patient portal sections
- **AppointmentSchedulingPage**: Schedule appointments

### Core.Common

- **UserManagementPage**: Manage users, roles, permissions
- **SettingsPage**: Configure application settings
- **ReportsPage**: Generate and download reports

### Shared Components

- **HeaderComponent**: Navigation bar
- **FooterComponent**: Footer with links
- **ModalComponent**: Modal dialogs
- **FormComponent**: Form interactions
- **TableComponent**: Table operations

## Best Practices

1. **Use locators, not selectors**: Store locators as class properties
   ```typescript
   readonly submitButton = page.locator('button[type="submit"]');
   ```

2. **Compose complex actions**: Create high-level methods that combine multiple steps
   ```typescript
   async processPayment(amount, card, expiry, cvv) {
     await this.enterAmount(amount);
     await this.enterCardDetails(card, expiry, cvv);
     await this.submitPayment();
   }
   ```

3. **Wait for state**: Always wait for the appropriate state after actions
   ```typescript
   await this.submitButton.click();
   await this.page.waitForLoadState('networkidle');
   ```

4. **Return meaningful data**: Methods should return useful information for assertions
   ```typescript
   async isPaymentSuccessful(): Promise<boolean> {
     return this.successMessage.isVisible();
   }
   ```

5. **Use data-testid**: Prefer data-testid attributes for more stable selectors
   ```typescript
   readonly deleteButton = page.locator('[data-testid="delete-button"]');
   ```

## Adding New Pages

1. Create a new file in the appropriate application directory
2. Extend `BasePage` or `BaseComponent`
3. Define locators and methods
4. Export from `index.ts`

Example:

```typescript
// pages/payments/refund-page.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../pages';

export class RefundPage extends BasePage {
  readonly amountInput: Locator;
  readonly reasonSelect: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.amountInput = page.locator('[name="refundAmount"]');
    this.reasonSelect = page.locator('[name="reason"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto(): Promise<void> {
    await super.goto('/payments/refund');
    await this.waitForLoad();
  }

  async processRefund(amount: string, reason: string): Promise<void> {
    await this.amountInput.fill(amount);
    await this.reasonSelect.selectOption(reason);
    await this.submitButton.click();
    await this.waitForLoad();
  }
}
```

Then add to `pages/index.ts`:
```typescript
export * from './payments/refund-page';
```
