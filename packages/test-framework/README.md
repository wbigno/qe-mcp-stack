# @qe-mcp-stack/test-framework

Playwright test framework with custom fixtures, helpers, page objects, and reporters.

## Features

- **Custom Fixtures**: Reusable Playwright fixtures for common test scenarios
- **Test Helpers**: Utility functions for test setup and assertions
- **Base Page Objects**: Base classes for Page Object Model pattern
- **Custom Reporters**: Specialized test reporters for different outputs

## Usage

### Custom Fixtures

```typescript
import { test } from '@qe-mcp-stack/test-framework/fixtures';

test('example test with custom fixtures', async ({ authenticatedPage, testData }) => {
  // authenticatedPage is already logged in
  // testData provides test data management
  await authenticatedPage.goto('/dashboard');
});
```

### Test Helpers

```typescript
import { waitForElement, assertElementText } from '@qe-mcp-stack/test-framework/helpers';

await waitForElement(page, '#loading-spinner', { state: 'hidden' });
await assertElementText(page, '.title', 'Expected Title');
```

### Page Objects

```typescript
import { BasePage } from '@qe-mcp-stack/test-framework/pages';

class LoginPage extends BasePage {
  readonly usernameInput = this.page.locator('#username');
  readonly passwordInput = this.page.locator('#password');
  readonly loginButton = this.page.locator('button[type="submit"]');

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.waitForNavigation();
  }
}
```

### Custom Reporters

```typescript
// playwright.config.ts
import { customReporter } from '@qe-mcp-stack/test-framework/reporters';

export default defineConfig({
  reporter: [
    ['html'],
    [customReporter, { outputFile: 'test-results/custom-report.json' }]
  ]
});
```

## Modules

### fixtures/

Custom Playwright fixtures:
- `authenticatedPage` - Pre-authenticated page context
- `testData` - Test data management
- `mockAPI` - API mocking utilities
- `testContext` - Enhanced test context with utilities

### helpers/

Test utility functions:
- Element waiting and assertions
- Form filling helpers
- Navigation utilities
- Screenshot and video helpers
- Test data generators

### pages/

Base page object classes:
- `BasePage` - Base page with common functionality
- `BaseComponent` - Base component class
- Navigation helpers
- Common assertions

### reporters/

Custom test reporters:
- Azure DevOps reporter
- Slack notification reporter
- Custom JSON reporter
- Failure screenshot reporter

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm run test

# Lint
npm run lint
```

## Examples

### Complete Test Example

```typescript
import { test, expect } from '@qe-mcp-stack/test-framework/fixtures';
import { LoginPage } from './pages/login-page';
import { DashboardPage } from './pages/dashboard-page';

test.describe('Payment Flow', () => {
  test('successful payment with credit card', async ({ page, testData }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Login
    await loginPage.goto();
    await loginPage.login(testData.user.email, testData.user.password);

    // Verify dashboard
    await expect(dashboardPage.welcomeMessage).toBeVisible();
    await expect(dashboardPage.userName).toHaveText(testData.user.name);

    // Continue with payment flow...
  });
});
```
