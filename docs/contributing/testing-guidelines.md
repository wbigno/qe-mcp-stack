# Testing Guidelines

## Overview

This document provides guidelines for writing tests in the QE MCP Stack.

## Test Pyramid

```
        /\
       /  \    E2E Tests (10%)
      /----\   - Full user journeys
     /      \  - Cross-app flows
    /--------\
   /          \ Integration Tests (20%)
  /------------\ - API tests
 /              \ - Service integration
/----------------\
                  Unit Tests (70%)
                  - Functions
                  - Classes
                  - Utilities
```

## Unit Tests

### Location
```
src/services/user-service.ts
src/services/user-service.spec.ts  # Co-located
```

### Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserService } from './user-service';

describe('UserService', () => {
  let userService: UserService;
  
  beforeEach(() => {
    // Setup before each test
    userService = new UserService();
  });
  
  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });
  
  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 1;
      const expected = { id: 1, name: 'John' };
      
      // Act
      const result = await userService.findById(userId);
      
      // Assert
      expect(result).toEqual(expected);
    });
    
    it('should throw error when not found', async () => {
      // Arrange
      const userId = 999;
      
      // Act & Assert
      await expect(userService.findById(userId)).rejects.toThrow('User not found');
    });
  });
});
```

### Mocking

```typescript
import { jest } from '@jest/globals';

// Mock external dependencies
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

it('should fetch data from API', async () => {
  // Setup mock
  mockedAxios.get.mockResolvedValue({ data: { id: 1 } });
  
  // Test
  const result = await service.fetchData();
  
  // Verify
  expect(mockedAxios.get).toHaveBeenCalledWith('/api/data');
  expect(result).toEqual({ id: 1 });
});
```

### Coverage Goals

- **Minimum**: 80% coverage
- **Target**: 90% coverage
- **Critical paths**: 100% coverage

```bash
npm run test:coverage
```

## Integration Tests

### API Integration Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('User API', () => {
  let apiContext;
  
  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
    });
  });
  
  test('GET /api/users returns list', async () => {
    const response = await apiContext.get('/api/users');
    
    expect(response.status()).toBe(200);
    
    const users = await response.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });
  
  test('POST /api/users creates user', async () => {
    const newUser = {
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    const response = await apiContext.post('/api/users', {
      data: newUser
    });
    
    expect(response.status()).toBe(201);
    
    const created = await response.json();
    expect(created.name).toBe(newUser.name);
    expect(created.id).toBeDefined();
  });
});
```

### MCP Integration Tests

```typescript
test.describe('Risk Analyzer MCP', () => {
  test('should analyze risk for work item', async ({ request }) => {
    const assessment = {
      workItemId: 123,
      changedFiles: ['src/payment.cs'],
      codeMetrics: { complexity: 15 }
    };
    
    const response = await request.post('http://localhost:8300/api/assess', {
      data: assessment
    });
    
    expect(response.status()).toBe(200);
    
    const risk = await response.json();
    expect(risk.riskScore).toBeGreaterThan(0);
    expect(risk.riskLevel).toMatch(/low|medium|high/);
  });
});
```

## E2E Tests

### Location
```
tests/
├── payments/
│   ├── checkout.spec.ts
│   └── payment-methods.spec.ts
```

### Structure

```typescript
import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../pages/CheckoutPage';

test.describe('Checkout Flow', () => {
  test('@smoke Complete checkout with credit card', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);
    
    // Navigate to checkout
    await checkoutPage.goto();
    
    // Fill payment details
    await checkoutPage.fillCardDetails('4242424242424242', '12/25', '123');
    
    // Submit payment
    await checkoutPage.submitPayment();
    
    // Verify success
    await expect(checkoutPage.successMessage).toBeVisible();
    await expect(checkoutPage.successMessage).toHaveText('Payment successful');
  });
  
  test('Show error for invalid card', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);
    
    await checkoutPage.goto();
    await checkoutPage.fillCardDetails('0000000000000000', '12/25', '123');
    await checkoutPage.submitPayment();
    
    await expect(checkoutPage.errorMessage).toBeVisible();
  });
});
```

### Test Data

```typescript
// tests/fixtures/test-data.ts
export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'Test123!',
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrong',
  },
};

// Use in tests
import { testUsers } from '../fixtures/test-data';

test('Login with valid user', async ({ page }) => {
  await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
});
```

## Test Tags

Use tags for selective execution:

```typescript
test('@smoke @critical User can login', async ({ page }) => {
  // Critical smoke test
});

test('@regression @payments Payment flow', async ({ page }) => {
  // Full regression test
});

test.skip('@slow Performance test', async ({ page }) => {
  // Skip slow tests in CI
});
```

Run tagged tests:
```bash
npx playwright test --grep @smoke
npx playwright test --grep @payments
npx playwright test --grep-invert @slow
```

## Test Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
test('should calculate total', () => {
  // Arrange
  const items = [10, 20, 30];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(60);
});
```

### 2. Test One Thing

```typescript
// Good - Tests one behavior
test('should return user when found', async () => {
  const user = await service.findById(1);
  expect(user).toBeDefined();
});

// Bad - Tests multiple things
test('should handle users', async () => {
  const user = await service.findById(1);
  expect(user).toBeDefined();
  
  await service.delete(1);
  const deleted = await service.findById(1);
  expect(deleted).toBeNull();
});
```

### 3. Descriptive Names

```typescript
// Good
test('should throw error when user ID is negative', ...);

// Bad
test('test1', ...);
test('it works', ...);
```

### 4. Avoid Test Interdependence

```typescript
// Good - Each test is independent
test.beforeEach(async () => {
  await db.seed();
});

// Bad - Tests depend on order
test('creates user', ...);  // Must run first
test('updates user', ...);  // Depends on first test
```

### 5. Use Fixtures

```typescript
// Define fixture
export const authenticatedPage = test.extend({
  page: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    await use(page);
  },
});

// Use fixture
authenticatedPage('Dashboard loads', async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard/);
});
```

## CI/CD Integration

Tests run automatically in Azure Pipelines:

```yaml
# azure-pipelines.yml
- stage: Run_Tests
  jobs:
    - job: Unit_Tests
      steps:
        - script: npm run test:unit
    
    - job: Integration_Tests
      steps:
        - script: npm run test:integration
    
    - job: E2E_Tests
      steps:
        - script: npx playwright test
```

## Running Tests Locally

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Specific test file
npx jest user-service.spec.ts
npx playwright test checkout.spec.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Related Documentation

- [Playwright Guide](../testing/playwright-guide.md)
- [Test Organization](../testing/test-organization.md)
- [Page Objects](../testing/page-objects.md)
- [Code Standards](code-standards.md)
