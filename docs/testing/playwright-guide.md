# Playwright Testing Guide

## Overview

The QE MCP Stack uses Playwright for end-to-end (E2E) testing across all applications. Tests are organized by application and follow the Page Object Model pattern.

## Installation

Playwright is already configured as part of the monorepo setup:

```bash
npm run setup
npx playwright install
```

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### Specific Application

```bash
npm run test:payments      # Payments app
npm run test:precare       # PreCare app
npm run test:core-common   # Core.Common app
```

### Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Tagged Tests

```bash
npm run test:smoke                   # @smoke tagged tests
npx playwright test --grep @payments # @payments tagged tests
npx playwright test --grep @regression
```

### Interactive UI Mode

```bash
npx playwright test --ui
```

### Debug Mode

```bash
npx playwright test --debug
```

## Test Structure

```
tests/
├── payments/
│   ├── ui/
│   │   ├── checkout.spec.ts
│   │   └── payment-methods.spec.ts
│   ├── api/
│   │   └── payment-api.spec.ts
│   └── integration/
│       └── payment-flow.spec.ts
├── precare/
├── core-common/
├── third-party-integrations/
├── migration/
└── cross-app/
```

## Writing Tests

### Basic Test

```typescript
import { test, expect } from '@playwright/test';

test('@smoke Payment with credit card', async ({ page }) => {
  await page.goto('http://localhost:5002/checkout');
  
  // Fill payment form
  await page.fill('[data-testid="card-number"]', '4242424242424242');
  await page.fill('[data-testid="card-expiry"]', '12/25');
  await page.fill('[data-testid="card-cvc"]', '123');
  
  // Submit payment
  await page.click('[data-testid="submit-payment"]');
  
  // Verify success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../pages/CheckoutPage';

test('@payments Complete checkout flow', async ({ page }) => {
  const checkoutPage = new CheckoutPage(page);
  
  await checkoutPage.goto();
  await checkoutPage.fillCardDetails('4242424242424242', '12/25', '123');
  await checkoutPage.submitPayment();
  
  await expect(checkoutPage.successMessage).toBeVisible();
});
```

### Using Fixtures

```typescript
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type MyFixtures = {
  authenticatedPage: Page;
};

const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('user@example.com', 'password');
    await use(page);
  }
});

test('Dashboard loads', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage).toHaveTitle(/Dashboard/);
});
```

## Test Tags

Use tags for selective test execution:

| Tag | Purpose | When to Run |
|-----|---------|-------------|
| `@smoke` | Critical paths | Every commit |
| `@regression` | Full test suite | Before release |
| `@payments` | Payments app | Payment changes |
| `@precare` | PreCare app | PreCare changes |
| `@migration` | Migration tests | Migration work |
| `@slow` | Long-running tests | Nightly |

Example:
```typescript
test('@smoke @payments Quick checkout', async ({ page }) => {
  // test code
});
```

## Configuration

### playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5002',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

## Best Practices

### 1. Use Data Test IDs

```html
<!-- Good -->
<button data-testid="submit-payment">Pay</button>

<!-- Avoid -->
<button class="btn btn-primary">Pay</button>
```

### 2. Wait for Elements

```typescript
// Good
await expect(page.locator('[data-testid="message"]')).toBeVisible();

// Avoid
await page.waitForTimeout(1000);
```

### 3. Isolate Tests

Each test should be independent:

```typescript
test.beforeEach(async ({ page }) => {
  // Reset state before each test
  await page.goto('/reset-state');
});
```

### 4. Use Descriptive Names

```typescript
// Good
test('User can complete checkout with valid credit card', async ({ page }) => {

// Avoid
test('Test 1', async ({ page }) => {
```

## Debugging

### Show Browser

```bash
npx playwright test --headed
```

### Slow Motion

```bash
npx playwright test --headed --slow-mo=1000
```

### Trace Viewer

```bash
npx playwright show-trace trace.zip
```

### Screenshots

Screenshots are automatically captured on failure:
```
test-results/
└── payments-checkout-chromium/
    └── test-failed-1.png
```

## CI/CD Integration

Tests run automatically in Azure Pipelines:

```yaml
- script: npx playwright test
  displayName: 'Run Playwright Tests'
  
- task: PublishTestResults@2
  condition: succeededOrFailed()
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: '**/test-results/**/*.xml'
```

## Related Documentation

- [Test Organization](test-organization.md)
- [Page Objects](page-objects.md)
- [Test Framework Package](../../packages/test-framework/README.md)
