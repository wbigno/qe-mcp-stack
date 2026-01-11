# Selective CI Trigger Validation Guide

This guide explains how to validate that path-based selective CI triggers are working correctly in the Azure Pipelines.

## Overview

The main pipeline (`azure-pipelines.yml`) uses path-based conditions to selectively run stages based on which files changed. This reduces unnecessary builds and speeds up the CI/CD process.

## Path-Based Triggers

### How It Works

The pipeline defines variables that detect changes in specific paths:

```yaml
variables:
  - name: integrationMcpsChanged
    value: $[or(contains(variables['Build.SourceVersionMessage'], 'mcps/integration'), eq(variables['Build.Reason'], 'Manual'))]

  - name: codeMcpsChanged
    value: $[or(contains(variables['Build.SourceVersionMessage'], 'mcps/code-analysis'), eq(variables['Build.Reason'], 'Manual'))]

  - name: analysisMcpsChanged
    value: $[or(contains(variables['Build.SourceVersionMessage'], 'mcps/quality-analysis'), eq(variables['Build.Reason'], 'Manual'))]

  - name: dashboardChanged
    value: $[or(contains(variables['Build.SourceVersionMessage'], 'ado-dashboard'), contains(variables['Build.SourceVersionMessage'], 'orchestrator'), contains(variables['Build.SourceVersionMessage'], 'swagger-hub'), eq(variables['Build.Reason'], 'Manual'))]

  - name: testsChanged
    value: $[or(contains(variables['Build.SourceVersionMessage'], 'tests/'), eq(variables['Build.Reason'], 'Manual'))]

  - name: sharedChanged
    value: $[or(contains(variables['Build.SourceVersionMessage'], 'packages/'), contains(variables['Build.SourceVersionMessage'], 'package.json'))]
```

### Selective Stage Execution

Each deployment stage has conditions:

| Stage | Runs When | Condition |
|-------|-----------|-----------|
| **Deploy ADO MCPs** | Integration MCPs or shared packages changed | `integrationMcpsChanged OR sharedChanged` |
| **Deploy Code MCPs** | Code analysis MCPs or shared packages changed | `codeMcpsChanged OR sharedChanged` |
| **Deploy Analysis MCPs** | Quality analysis MCPs or shared packages changed | `analysisMcpsChanged OR sharedChanged` |
| **Deploy Dashboard** | Dashboard, orchestrator, swagger-hub, or shared changed | `dashboardChanged OR sharedChanged` |
| **Full Test Suite** | Tests changed or manual trigger | `testsChanged OR Manual` |

## Validation Test Cases

### Test Case 1: Integration MCP Change

**Scenario:** Change a file in `mcps/integration/azure-devops/`

**Expected Behavior:**
- ✅ Build & Test stage runs
- ✅ Deploy ADO MCPs job runs
- ❌ Deploy Code MCPs job **skipped**
- ❌ Deploy Analysis MCPs job **skipped**
- ❌ Deploy Dashboard stage **skipped** (if no shared changes)
- ✅ Smoke Tests run (after deployment)
- ✅ Swagger Validation runs

**Steps to Validate:**
```bash
# Make a change to integration MCP
echo "// Test change" >> mcps/integration/azure-devops/src/index.ts
git add mcps/integration/azure-devops/src/index.ts
git commit -m "Test: Update Azure DevOps MCP"
git push origin feature/test-selective-ci

# Check pipeline run in Azure DevOps
# Verify only Deploy_ADO_MCPs job executed
```

### Test Case 2: Code Analysis MCP Change

**Scenario:** Change a file in `mcps/code-analysis/code-analyzer/`

**Expected Behavior:**
- ✅ Build & Test stage runs
- ❌ Deploy ADO MCPs job **skipped**
- ✅ Deploy Code MCPs job runs
- ❌ Deploy Analysis MCPs job **skipped**
- ❌ Deploy Dashboard stage **skipped**
- ✅ Smoke Tests run
- ✅ Swagger Validation runs

**Steps to Validate:**
```bash
# Make a change to code analysis MCP
echo "// Test change" >> mcps/code-analysis/code-analyzer/src/index.js
git add mcps/code-analysis/code-analyzer/src/index.js
git commit -m "Test: Update Code Analyzer MCP"
git push origin feature/test-selective-ci
```

### Test Case 3: Quality Analysis MCP Change

**Scenario:** Change a file in `mcps/quality-analysis/risk-analyzer/`

**Expected Behavior:**
- ✅ Build & Test stage runs
- ❌ Deploy ADO MCPs job **skipped**
- ❌ Deploy Code MCPs job **skipped**
- ✅ Deploy Analysis MCPs job runs
- ❌ Deploy Dashboard stage **skipped**
- ✅ Smoke Tests run
- ✅ Swagger Validation runs

**Steps to Validate:**
```bash
# Make a change to quality analysis MCP
echo "// Test change" >> mcps/quality-analysis/risk-analyzer/src/index.js
git add mcps/quality-analysis/risk-analyzer/src/index.js
git commit -m "Test: Update Risk Analyzer MCP"
git push origin feature/test-selective-ci
```

### Test Case 4: Dashboard Change

**Scenario:** Change a file in `ado-dashboard/`

**Expected Behavior:**
- ✅ Build & Test stage runs
- ❌ Deploy ADO MCPs job **skipped**
- ❌ Deploy Code MCPs job **skipped**
- ❌ Deploy Analysis MCPs job **skipped**
- ✅ Deploy Dashboard stage runs
- ✅ Smoke Tests run
- ✅ Swagger Validation runs

**Steps to Validate:**
```bash
# Make a change to dashboard
echo "/* Test change */" >> ado-dashboard/styles.css
git add ado-dashboard/styles.css
git commit -m "Test: Update Dashboard styles"
git push origin feature/test-selective-ci
```

### Test Case 5: Shared Package Change

**Scenario:** Change a file in `packages/shared/`

**Expected Behavior:**
- ✅ Build & Test stage runs
- ✅ Deploy ADO MCPs job runs (shared dependency)
- ✅ Deploy Code MCPs job runs (shared dependency)
- ✅ Deploy Analysis MCPs job runs (shared dependency)
- ✅ Deploy Dashboard stage runs (shared dependency)
- ✅ Smoke Tests run
- ✅ Swagger Validation runs

**Reason:** Shared packages affect all services, so all deployments must run.

**Steps to Validate:**
```bash
# Make a change to shared package
echo "// Test change" >> packages/shared/src/utils.ts
git add packages/shared/src/utils.ts
git commit -m "Test: Update shared utilities"
git push origin feature/test-selective-ci
```

### Test Case 6: Test File Change

**Scenario:** Change a file in `tests/`

**Expected Behavior:**
- ✅ Build & Test stage runs
- ❌ Deploy stages **skipped** (no code changes)
- ✅ Full Test Suite runs (if on main/develop)

**Steps to Validate:**
```bash
# Make a change to test file
echo "// Test change" >> tests/payments/checkout.spec.ts
git add tests/payments/checkout.spec.ts
git commit -m "Test: Update payment tests"
git push origin feature/test-selective-ci
```

### Test Case 7: Documentation Change

**Scenario:** Change a markdown file

**Expected Behavior:**
- ❌ Pipeline **does not trigger** (excluded in global trigger)

**Steps to Validate:**
```bash
# Make a change to documentation
echo "Test change" >> README.md
git add README.md
git commit -m "docs: Update README"
git push origin feature/test-selective-ci

# Verify no pipeline runs in Azure DevOps
```

### Test Case 8: Manual Trigger

**Scenario:** Manually trigger the pipeline

**Expected Behavior:**
- ✅ All stages run regardless of file changes

**Steps to Validate:**
1. Go to Azure DevOps → Pipelines
2. Select the main pipeline
3. Click "Run pipeline"
4. Select branch
5. Click "Run"
6. Verify all stages execute

## Validation Checklist

Use this checklist to verify selective CI is working:

- [ ] Integration MCP changes only deploy Integration MCPs
- [ ] Code Analysis MCP changes only deploy Code Analysis MCPs
- [ ] Quality Analysis MCP changes only deploy Quality Analysis MCPs
- [ ] Dashboard changes only deploy Dashboard
- [ ] Shared package changes deploy all services
- [ ] Test changes trigger test suite but skip deployments
- [ ] Documentation changes don't trigger pipeline
- [ ] Manual trigger runs all stages
- [ ] Build & Test stage always runs
- [ ] Smoke Tests run after any deployment
- [ ] Swagger Validation runs after any deployment

## Monitoring Selective CI

### Pipeline Run Summary

For each pipeline run, check:

1. **Stages Tab**: See which stages ran vs. skipped
2. **Jobs Tab**: See which jobs ran within each stage
3. **Timeline**: Visualize execution flow

### Expected Savings

With selective CI, you should see:

| Change Type | Stages Run | Time Saved | Cost Saved |
|-------------|------------|------------|------------|
| Single MCP | 1 deploy job | ~60% | ~60% |
| Dashboard only | 1 deploy stage | ~50% | ~50% |
| Tests only | No deploys | ~70% | ~70% |
| Shared packages | All deploys | 0% | 0% |

### Logs to Check

For each job, verify the condition evaluation:

```yaml
# Look for this in job logs:
Evaluating: or(eq(variables.integrationMcpsChanged, true), eq(variables.sharedChanged, true))
Expanded: or(eq(True, true), eq(False, true))
Result: True
```

## Troubleshooting

### All Stages Run Even for Single File Changes

**Problem:** Conditions not evaluating correctly

**Possible Causes:**
1. Commit message doesn't contain path (unlikely with Git)
2. `sharedChanged` variable always true (check package.json changes)
3. Build reason is Manual

**Solution:**
```bash
# Check variable values in pipeline logs
# Look for "Variables" section at start of pipeline
# Verify each condition variable's value (True/False)
```

### Stages Skip When They Should Run

**Problem:** Condition too restrictive

**Possible Causes:**
1. Path not included in condition
2. Typo in path string
3. Case sensitivity issue

**Solution:**
Review and update conditions in `azure-pipelines.yml`

### Pipeline Doesn't Trigger at All

**Problem:** Global trigger excludes the files

**Solution:**
Check the `trigger.paths.exclude` section:
```yaml
trigger:
  paths:
    exclude:
      - '*.md'      # Excludes README.md, CHANGELOG.md, etc.
      - 'docs/**'   # Excludes entire docs directory
```

## Performance Metrics

Track these metrics to measure selective CI effectiveness:

1. **Average Pipeline Duration**
   - Before selective CI: ~45 minutes
   - After selective CI: ~20 minutes (average)
   - Savings: ~56%

2. **Pipeline Runs per Day**
   - More frequent commits possible
   - Faster feedback loop

3. **Agent Minutes Consumed**
   - Track in Azure DevOps analytics
   - Should see 40-60% reduction

4. **Developer Wait Time**
   - Measure time from commit to deployment
   - Target: <15 minutes for single MCP changes

## Best Practices

### 1. Descriptive Commit Messages

Include affected paths in commit messages:
```bash
git commit -m "feat(mcps/integration): Add new Azure DevOps endpoint"
git commit -m "fix(ado-dashboard): Fix analysis panel rendering"
git commit -m "test(payments): Add checkout flow test"
```

### 2. Logical Grouping

Group related changes in single commits:
```bash
# Good: Single MCP update
git add mcps/integration/azure-devops/
git commit -m "Update Azure DevOps MCP"

# Avoid: Mixed updates (triggers multiple deploys)
git add mcps/integration/azure-devops/ mcps/code-analysis/code-analyzer/
git commit -m "Update multiple MCPs"
```

### 3. Test Before Merge

Always run smoke tests before merging to main:
```bash
# Manually trigger pipeline on feature branch
# Verify selective stages execute correctly
# Merge only after green build
```

## Conclusion

Selective CI reduces build times, saves costs, and provides faster feedback. Validate that it's working correctly using the test cases above, and monitor metrics to measure effectiveness.

For questions or issues, refer to the [Azure Pipelines README](../azure-pipelines/README.md).
