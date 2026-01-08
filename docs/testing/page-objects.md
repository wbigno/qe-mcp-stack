# Page Object Model Guide

## Overview

The QE MCP Stack uses the Page Object Model (POM) pattern to create reusable, maintainable test code.

## Structure

```
packages/test-framework/src/pages/
├── base/
│   └── BasePage.ts           # Base class for all pages
├── payments/
│   ├── CheckoutPage.ts       # Checkout page
│   ├── PaymentPage.ts        # Payment form
│   └── ConfirmationPage.ts   # Order confirmation
├── precare/
│   ├── AppointmentPage.ts
│   └── PatientPage.ts
└── shared/
    ├── LoginPage.ts          # Shared login
    └── NavigationComponent.ts # Shared navigation
```

## Base Page Class

```typescript
// packages/test-framework/src/pages/base/BasePage.ts
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    await this.page.goto(`${process.env.BASE_URL}${path}`);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async clickButton(testId: string) {
    await this.page.click(`[data-testid="${testId}"]`);
  }

  async fillInput(testId: string, value: string) {
    await this.page.fill(`[data-testid="${testId}"]`, value);
  }

  locator(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }
}
```

## Example Page Object

```typescript
// packages/test-framework/src/pages/payments/CheckoutPage.ts
import { BasePage } from '../base/BasePage';
import { Locator } from '@playwright/test';

export class CheckoutPage extends BasePage {
  // Locators
  get cardNumberInput(): Locator {
    return this.locator('card-number');
  }

  get cardExpiryInput(): Locator {
    return this.locator('card-expiry');
  }

  get cardCvcInput(): Locator {
    return this.locator('card-cvc');
  }

  get submitButton(): Locator {
    return this.locator('submit-payment');
  }

  get successMessage(): Locator {
    return this.locator('success-message');
  }

  get errorMessage(): Locator {
    return this.locator('error-message');
  }

  // Actions
  async goto() {
    await super.goto('/checkout');
    await this.waitForLoad();
  }

  async fillCardDetails(cardNumber: string, expiry: string, cvc: string) {
    await this.cardNumberInput.fill(cardNumber);
    await this.cardExpiryInput.fill(expiry);
    await this.cardCvcInput.fill(cvc);
  }

  async submitPayment() {
    await this.submitButton.click();
  }

  async waitForSuccess() {
    await this.successMessage.waitFor({ state: 'visible' });
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }
}
```

## Using Page Objects in Tests

```typescript
import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../pages/payments/CheckoutPage';

test('@smoke Complete checkout', async ({ page }) => {
  const checkoutPage = new CheckoutPage(page);
  
  await checkoutPage.goto();
  await checkoutPage.fillCardDetails(
    '4242424242424242',
    '12/25',
    '123'
  );
  await checkoutPage.submitPayment();
  await checkoutPage.waitForSuccess();
  
  await expect(checkoutPage.successMessage).toHaveText('Payment successful');
});

test('Show error for invalid card', async ({ page }) => {
  const checkoutPage = new CheckoutPage(page);
  
  await checkoutPage.goto();
  await checkoutPage.fillCardDetails(
    '0000000000000000',
    '12/25',
    '123'
  );
  await checkoutPage.submitPayment();
  
  await expect(checkoutPage.errorMessage).toBeVisible();
  const errorText = await checkoutPage.getErrorMessage();
  expect(errorText).toContain('Invalid card number');
});
```

## Component Objects

For reusable components:

```typescript
// packages/test-framework/src/pages/shared/NavigationComponent.ts
import { Page, Locator } from '@playwright/test';

export class NavigationComponent {
  constructor(private page: Page) {}

  get homeLink(): Locator {
    return this.page.locator('[data-testid="nav-home"]');
  }

  get productsLink(): Locator {
    return this.page.locator('[data-testid="nav-products"]');
  }

  get cartLink(): Locator {
    return this.page.locator('[data-testid="nav-cart"]');
  }

  async navigateTo(section: 'home' | 'products' | 'cart') {
    switch (section) {
      case 'home':
        await this.homeLink.click();
        break;
      case 'products':
        await this.productsLink.click();
        break;
      case 'cart':
        await this.cartLink.click();
        break;
    }
  }
}
```

Using component in page:

```typescript
export class CheckoutPage extends BasePage {
  get navigation() {
    return new NavigationComponent(this.page);
  }

  async goToProducts() {
    await this.navigation.navigateTo('products');
  }
}
```

## Best Practices

### 1. One Page Object Per Page
Each logical page should have its own Page Object class.

### 2. Use Getters for Locators
```typescript
// Good
get submitButton(): Locator {
  return this.page.locator('[data-testid="submit"]');
}

// Avoid
submitButton = this.page.locator('[data-testid="submit"]');
```

### 3. Expose Actions, Not Implementation
```typescript
// Good
async fillCardDetails(card: string, expiry: string, cvc: string) {
  await this.cardNumberInput.fill(card);
  await this.cardExpiryInput.fill(expiry);
  await this.cardCvcInput.fill(cvc);
}

// Avoid exposing implementation details
async fillCardNumber(card: string) {
  await this.page.locator('#card-number').fill(card);
}
```

### 4. Return Page Objects for Navigation
```typescript
async clickCheckout(): Promise<CheckoutPage> {
  await this.checkoutButton.click();
  return new CheckoutPage(this.page);
}

// Usage
const checkoutPage = await cartPage.clickCheckout();
```

### 5. Use Type-Safe Parameters
```typescript
type PaymentMethod = 'credit-card' | 'paypal' | 'bank-transfer';

async selectPaymentMethod(method: PaymentMethod) {
  await this.page.click(`[data-testid="payment-${method}"]`);
}
```

## Related Documentation

- [Playwright Guide](playwright-guide.md)
- [Test Organization](test-organization.md)
- [Test Framework Package](../../packages/test-framework/README.md)
