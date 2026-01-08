# Test Organization

## Directory Structure

```
tests/
├── payments/
│   ├── ui/              # UI/E2E tests
│   ├── api/             # API tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end scenarios
├── precare/
│   ├── ui/
│   ├── api/
│   └── integration/
├── core-common/
│   ├── unit/
│   └── integration/
├── third-party-integrations/
│   ├── ui/
│   └── api/
├── migration/
│   └── core-to-corecommon/
└── cross-app/
    ├── payment-flow/
    └── integration/
```

## Test Categories

### 1. Unit Tests
**Location**: `tests/{app}/unit/`  
**Purpose**: Test individual units in isolation  
**Run Time**: < 5 seconds

```typescript
test('calculateTotal adds items correctly', () => {
  const result = calculateTotal([10, 20, 30]);
  expect(result).toBe(60);
});
```

### 2. Integration Tests
**Location**: `tests/{app}/integration/`  
**Purpose**: Test component interactions  
**Run Time**: < 30 seconds

```typescript
test('Payment service integrates with Stripe', async () => {
  const paymentService = new PaymentService();
  const result = await paymentService.charge(100, 'usd');
  expect(result.status).toBe('succeeded');
});
```

### 3. API Tests
**Location**: `tests/{app}/api/`  
**Purpose**: Test REST API endpoints  
**Run Time**: < 10 seconds per test

```typescript
test('GET /api/payments returns list', async ({ request }) => {
  const response = await request.get('/api/payments');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(Array.isArray(data)).toBe(true);
});
```

### 4. UI Tests
**Location**: `tests/{app}/ui/`  
**Purpose**: Test user interface  
**Run Time**: 30-60 seconds per test

```typescript
test('User can navigate to checkout', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="checkout-button"]');
  await expect(page).toHaveURL(/\/checkout/);
});
```

### 5. E2E Tests
**Location**: `tests/{app}/e2e/` or `tests/cross-app/`  
**Purpose**: Test complete user journeys  
**Run Time**: 1-5 minutes per test

```typescript
test('@e2e Complete purchase flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('[type="submit"]');
  
  // Add to cart
  await page.goto('/products');
  await page.click('[data-testid="add-to-cart"]');
  
  // Checkout
  await page.click('[data-testid="checkout"]');
  await page.fill('[data-testid="card-number"]', '4242424242424242');
  await page.click('[data-testid="complete-purchase"]');
  
  // Verify
  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});
```

### 6. Migration Tests
**Location**: `tests/migration/`  
**Purpose**: Validate Core → Core.Common migration  
**Run Time**: Varies

```typescript
test('Migrated feature works in Core.Common', async ({ page }) => {
  // Test in Core
  await page.goto('http://localhost:5000/feature');
  const coreResult = await page.textContent('[data-testid="result"]');
  
  // Test in Core.Common
  await page.goto('http://localhost:5001/feature');
  const commonResult = await page.textContent('[data-testid="result"]');
  
  expect(coreResult).toBe(commonResult);
});
```

## Naming Conventions

### File Names
```
{feature}-{type}.spec.ts

Examples:
- checkout.spec.ts
- payment-api.spec.ts
- user-registration.e2e.spec.ts
```

### Test Names
```typescript
test('{Actor} can {Action} {Context}', async ({ page }) => {
  // test
});

Examples:
test('User can complete checkout with valid credit card', ...);
test('Admin can view payment history for all users', ...);
test('Guest cannot access protected resources', ...);
```

## Test Execution Strategy

### Pull Request (PR) Tests
```bash
npm run test:smoke
```
- @smoke tagged tests
- ~5-10 minutes
- Must pass before merge

### Nightly Tests
```bash
npm run test:regression
```
- @regression tagged tests
- Full test suite
- ~45-60 minutes
- Alerts on failure

### Release Tests
```bash
npm run test:e2e
npm run test:migration
```
- All E2E and migration tests
- ~90 minutes
- Must pass before release

## Test Data Management

### Test Data Location
```
tests/
└── fixtures/
    ├── users.json
    ├── products.json
    └── payments.json
```

### Using Test Data
```typescript
import testUsers from '../fixtures/users.json';

test('Login with test user', async ({ page }) => {
  const user = testUsers.validUser;
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="password"]', user.password);
});
```

### Test Data Cleanup
```typescript
test.afterEach(async () => {
  // Clean up test data
  await cleanupTestData();
});
```

## Parallel Execution

### Configuration
```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 1 : 4,
  fullyParallel: true,
});
```

### Test Isolation
Each test runs in isolation:
- Separate browser context
- Clean state
- Independent data

## Related Documentation

- [Playwright Guide](playwright-guide.md)
- [Page Objects](page-objects.md)
- [Test Framework Package](../../packages/test-framework/README.md)
