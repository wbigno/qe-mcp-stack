# Migration Helper

CLI tool to track Core to Core.Common migration progress, identify gaps, and generate reports.

## Usage

From the root of the monorepo:

```bash
npm run migration:check
```

Or directly:

```bash
node tools/migration-helper/bin/check.js
```

## Features

### 1. Feature Comparison

Compares features between Core and Core.Common:

```bash
$ npm run migration:check

╔══════════════════════════════════════════════════════════════╗
║            Core → Core.Common Migration Status               ║
╚══════════════════════════════════════════════════════════════╝

Feature Analysis:
┌─────────────────────────┬────────┬──────────────┬──────────┐
│ Feature                 │ Core   │ Core.Common  │ Status   │
├─────────────────────────┼────────┼──────────────┼──────────┤
│ Payment Processing      │ ✓      │ ✓            │ Migrated │
│ User Authentication     │ ✓      │ ✓            │ Migrated │
│ Billing                 │ ✓      │ ✗            │ Pending  │
│ Reporting               │ ✓      │ Partial      │ In Prog  │
│ Admin Dashboard         │ ✓      │ ✗            │ Pending  │
└─────────────────────────┴────────┴──────────────┴──────────┘

Summary:
  ✓ Migrated: 2 (40%)
  ⚠ In Progress: 1 (20%)
  ✗ Pending: 2 (40%)
```

### 2. Test Coverage Comparison

Compares test coverage between repositories:

```bash
Test Coverage:
┌─────────────────────────┬────────┬──────────────┬──────────┐
│ Feature                 │ Core   │ Core.Common  │ Delta    │
├─────────────────────────┼────────┼──────────────┼──────────┤
│ Payment Processing      │ 85%    │ 90%          │ +5%      │
│ User Authentication     │ 78%    │ 82%          │ +4%      │
│ Billing                 │ 65%    │ N/A          │ N/A      │
│ Reporting               │ 72%    │ 45%          │ -27%     │
└─────────────────────────┴────────┴──────────────┴──────────┘
```

### 3. Risk Assessment

Identifies high-risk areas for migration:

```bash
Risk Assessment:
┌─────────────────────────┬────────────┬─────────────────────┐
│ Feature                 │ Risk Level │ Reason              │
├─────────────────────────┼────────────┼─────────────────────┤
│ Billing                 │ HIGH       │ Not migrated,       │
│                         │            │ complex logic       │
│ Reporting               │ MEDIUM     │ Partial migration,  │
│                         │            │ test coverage drop  │
│ Admin Dashboard         │ HIGH       │ Not migrated,       │
│                         │            │ many dependencies   │
└─────────────────────────┴────────────┴─────────────────────┘
```

### 4. Dependency Analysis

Maps dependencies and shared code:

```bash
Dependencies:
┌─────────────────────────┬────────────────────────────────────┐
│ Core Feature            │ Dependencies in Core.Common        │
├─────────────────────────┼────────────────────────────────────┤
│ Payment Processing      │ ✓ Data Models                      │
│                         │ ✓ API Endpoints                    │
│                         │ ✓ Business Logic                   │
│ Billing                 │ ✗ Data Models (missing)            │
│                         │ ✗ API Endpoints (missing)          │
└─────────────────────────┴────────────────────────────────────┘
```

## Configuration

Create `migration-config.json` in the root:

```json
{
  "sourceRepo": {
    "name": "Core",
    "path": "/Users/williambigno/dev/git/Core"
  },
  "targetRepo": {
    "name": "Core.Common",
    "path": "/Users/williambigno/dev/git/Core.Common"
  },
  "features": [
    {
      "name": "Payment Processing",
      "sourcePaths": ["Core/Payment", "Core/Billing/Payment"],
      "targetPaths": ["Core.Common/Payments"]
    },
    {
      "name": "User Authentication",
      "sourcePaths": ["Core/Auth"],
      "targetPaths": ["Core.Common/Authentication"]
    }
  ],
  "exclude": [
    "**/bin/**",
    "**/obj/**",
    "**/node_modules/**"
  ]
}
```

## Output Formats

### Console (default)

Pretty-printed tables with colors.

### JSON

```bash
npm run migration:check -- --format=json > migration-report.json
```

### HTML

```bash
npm run migration:check -- --format=html > migration-report.html
```

### Markdown

```bash
npm run migration:check -- --format=md > migration-report.md
```

## Options

```bash
npm run migration:check -- [options]

Options:
  --format=<format>    Output format: console, json, html, md (default: console)
  --detailed           Show detailed feature breakdown
  --risks-only         Show only high and medium risk items
  --output=<file>      Write to file instead of stdout
  --config=<file>      Path to config file (default: migration-config.json)
```

## Examples

### Basic Check

```bash
npm run migration:check
```

### Detailed Report

```bash
npm run migration:check -- --detailed
```

### High Risks Only

```bash
npm run migration:check -- --risks-only
```

### Generate HTML Report

```bash
npm run migration:check -- --format=html --output=reports/migration.html
```

## Integration

### Dashboard

The migration helper integrates with the dashboard:
- Real-time migration status
- Visual progress indicators
- Drill-down into specific features

### CI/CD

Add to GitHub Actions to track migration progress over time:

```yaml
- name: Check migration status
  run: npm run migration:check -- --format=json --output=migration-status.json

- name: Upload migration report
  uses: actions/upload-artifact@v4
  with:
    name: migration-report
    path: migration-status.json
```

## Development

```bash
cd tools/migration-helper
npm install
npm run check
```
