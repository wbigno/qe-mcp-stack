# Migration Validation Guide

## Overview

This guide provides step-by-step validation procedures for Core → Core.Common migration.

## Pre-Migration Validation

### 1. Feature Inventory
```bash
# List all features in Core
npm run migration:inventory

# Output: features.json
{
  "features": [
    "User Authentication",
    "Patient Management",
    "Appointment Scheduling"
  ]
}
```

### 2. Test Coverage Check
```bash
# Check test coverage for feature
npm run test:coverage -- --feature="User Authentication"

# Must be >= 80%
```

### 3. API Contract Validation
```bash
# Generate API contract from Core
npm run api:contract:generate --app=Core

# Compare with Core.Common
npm run api:contract:compare --source=Core --target=Core.Common
```

## Migration Validation

### 1. Functional Testing

Run parallel tests:

```bash
npm run test:migration:functional
```

Tests verify:
- Input/output parity
- Business logic correctness
- Error handling
- Edge cases

### 2. Performance Testing

```bash
npm run test:migration:performance
```

Compares:
- Response times
- Throughput
- Resource usage
- Database query performance

### 3. Integration Testing

```bash
npm run test:migration:integration
```

Validates:
- External API integrations
- Database connections
- Third-party services
- Message queues

## Post-Migration Validation

### 1. Smoke Tests

```bash
npm run test:smoke:core-common
```

Critical paths:
- Login
- Key workflows
- Data persistence
- API endpoints

### 2. Monitoring

Enable monitoring:
```bash
# Error rates
# Response times
# User activity
# Resource utilization
```

### 3. Rollback Readiness

Test rollback procedure:
```bash
npm run migration:rollback:test
```

## Validation Report

Generate comprehensive report:

```bash
npm run migration:report
```

**Report Includes**:
- Feature migration status
- Test results
- Performance comparison
- Known issues
- Recommendations

## Automated Validation

Azure Pipeline runs validation automatically:

```yaml
- stage: Migration_Validation
  jobs:
    - job: Validate_Feature_Parity
    - job: Performance_Comparison
    - job: Integration_Tests
```

## Sign-Off Checklist

Before marking migration complete:

- [ ] All tests passing (Core and Core.Common)
- [ ] Performance within 10% of Core
- [ ] No critical bugs found
- [ ] Documentation updated
- [ ] Team sign-off obtained
- [ ] Rollback tested
- [ ] Monitoring configured

## Related Documentation

- [Core to Core.Common Migration](core-to-corecommon.md)
- [Migration Analyzer MCP](../mcps/migration-analyzer.md)
