# Core to Core.Common Migration Guide

## Overview

This guide tracks the ongoing migration from the Core application to Core.Common, including how to validate that features work consistently in both applications.

## Migration Status

### Completed Migrations
- ✅ User Authentication
- ✅ Patient Management
- ✅ Appointment Scheduling
- ✅ Billing Integration

### In Progress
- 🟡 Reporting Module (60% complete)
- 🟡 Analytics Dashboard (40% complete)

### Pending
- ⏳ Admin Tools
- ⏳ Advanced Search

## Testing Strategy

### 1. Parallel Testing

Run tests against both Core and Core.Common:

```bash
# Core tests
npm run test:core

# Core.Common tests
npm run test:core-common

# Comparison tests
npm run test:migration
```

### 2. Feature Parity Validation

```typescript
import { test, expect } from '@playwright/test';

test('User authentication works in both apps', async ({ page }) => {
  // Test in Core
  await page.goto('http://localhost:5000/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('[type="submit"]');
  const coreAuth = await page.url();
  
  // Test in Core.Common
  await page.goto('http://localhost:5001/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('[type="submit"]');
  const commonAuth = await page.url();
  
  // Both should redirect to dashboard
  expect(coreAuth).toContain('/dashboard');
  expect(commonAuth).toContain('/dashboard');
});
```

## Migration Analyzer MCP

The Migration Analyzer MCP (port 8203) tracks migration progress:

### Check Migration Status

```bash
curl http://localhost:8203/api/migration/status
```

**Response**:
```json
{
  "totalFeatures": 25,
  "migrated": 15,
  "inProgress": 5,
  "pending": 5,
  "percentComplete": 60,
  "features": [
    {
      "name": "User Authentication",
      "status": "migrated",
      "testCoverage": 95,
      "lastValidated": "2026-01-08T10:00:00Z"
    }
  ]
}
```

### Validate Feature Compatibility

```bash
curl -X POST http://localhost:8203/api/migration/validate \
  -H "Content-Type: application/json" \
  -d '{"featureName": "User Authentication"}'
```

## Validation Checklist

For each migrated feature:

- [ ] UI elements render identically
- [ ] API endpoints return same data structure
- [ ] Business logic produces same results
- [ ] Performance is comparable
- [ ] Error handling is consistent
- [ ] Test coverage >= 80%
- [ ] Documentation updated

## Known Differences

### Database Schema
Core.Common uses a slightly different schema:
- Table names use PascalCase instead of snake_case
- Some columns renamed for clarity

### API Endpoints
```
Core:        /api/users/{id}
Core.Common: /api/v2/users/{id}
```

### Configuration
```
Core:        Web.config (XML)
Core.Common: appsettings.json (JSON)
```

## Rollback Plan

If issues are found in Core.Common:

1. **Immediate**: Route traffic back to Core
2. **Investigation**: Analyze differences
3. **Fix**: Apply corrections to Core.Common
4. **Validation**: Re-run tests
5. **Retry**: Migrate traffic again

## Related Documentation

- [Migration Validation](migration-validation.md)
- [Migration Analyzer MCP](../mcps/migration-analyzer.md)
