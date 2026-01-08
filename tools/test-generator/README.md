# Test Generator

CLI tool to generate Playwright tests from templates based on test type and application.

## Usage

From the root of the monorepo:

```bash
npm run test:gen
```

Or directly:

```bash
node tools/test-generator/bin/generate.js
```

## Interactive Prompts

The generator will ask you:

1. **Application**: Choose from:
   - Payments
   - PreCare
   - Core.Common
   - Third-Party Integrations
   - Cross-App

2. **Test Type**: Choose from:
   - UI Test
   - API Test
   - Integration Test
   - E2E Test

3. **Test Name**: Descriptive name for the test (e.g., "payment-with-credit-card")

4. **Page Objects**: Whether to generate page objects (for UI tests)

5. **Test Data**: Whether to include test data fixtures

## Generated Structure

### UI Test Example

```
tests/payments/ui/
├── payment-flow.spec.ts
└── page-objects/
    ├── payment-page.ts
    └── confirmation-page.ts
```

### API Test Example

```
tests/payments/api/
└── payment-api.spec.ts
```

## Templates

### UI Test Template

```typescript
import { test, expect } from '@qe-mcp-stack/test-framework/fixtures';
import { {{PAGE_OBJECT}} } from './page-objects/{{page-object}}';

test.describe('{{TEST_NAME}}', () => {
  test('@smoke should complete successfully', async ({ page }) => {
    const {{pageObject}} = new {{PAGE_OBJECT}}(page);

    await {{pageObject}}.goto();
    // Test implementation
  });
});
```

### API Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('{{TEST_NAME}} API', () => {
  test('should return success response', async ({ request }) => {
    const response = await request.post('/api/{{endpoint}}', {
      data: {
        // Request data
      }
    });

    expect(response.ok()).toBeTruthy();
  });
});
```

### Page Object Template

```typescript
import { BasePage } from '@qe-mcp-stack/test-framework/pages';

export class {{PAGE_NAME}}Page extends BasePage {
  readonly {{element}} = this.page.locator('[data-testid="{{element}}"]');

  async goto() {
    await this.page.goto('/{{path}}');
    await this.waitForLoad();
  }

  async {{action}}() {
    await this.{{element}}.click();
  }
}
```

## Example

```bash
$ npm run test:gen

? Select application: Payments
? Test type: UI Test
? Test name: payment-with-credit-card
? Generate page objects? Yes
? Include test data fixtures? Yes

✓ Created tests/payments/ui/payment-with-credit-card.spec.ts
✓ Created tests/payments/ui/page-objects/payment-page.ts
✓ Created tests/payments/ui/page-objects/confirmation-page.ts
✓ Created test data fixtures

Next steps:
  npm run test:payments
  # or run specific test:
  npx playwright test tests/payments/ui/payment-with-credit-card.spec.ts
```

## Available Templates

Located in `tools/test-generator/templates/`:

- `ui-test.template.ts` - UI test with page objects
- `api-test.template.ts` - API test
- `integration-test.template.ts` - Integration test
- `e2e-test.template.ts` - End-to-end test
- `page-object.template.ts` - Page object class

## Customization

Modify templates in `tools/test-generator/templates/` to change the generated tests.

## Development

```bash
cd tools/test-generator
npm install
npm run generate
```
