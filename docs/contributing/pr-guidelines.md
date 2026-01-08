# Pull Request Guidelines

## Overview

This document outlines the process for submitting pull requests to the QE MCP Stack.

## Before Creating a PR

### 1. Create a Branch

```bash
git checkout -b feature/add-user-authentication
git checkout -b fix/risk-analyzer-null-error
git checkout -b docs/update-readme
```

Branch naming:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test updates

### 2. Make Changes

```bash
# Make your changes
git add .
git commit -m "feat(auth): Add JWT authentication"
```

### 3. Sync with Main

```bash
git fetch origin
git rebase origin/main
```

### 4. Run Tests

```bash
npm run test            # All tests
npm run lint            # Linting
npm run typecheck       # Type checking
npm run test:e2e        # E2E tests
```

### 5. Update Documentation

- Update README if adding features
- Add/update API documentation (Swagger)
- Update relevant docs/ files

## Creating the PR

### 1. Push Branch

```bash
git push origin feature/add-user-authentication
```

### 2. Open PR in Azure DevOps

1. Go to **Repos** → **Pull Requests**
2. Click **New Pull Request**
3. Select your branch
4. Fill in the PR template

### 3. PR Template

The template (`.azuredevops/pull_request_template.md`) will auto-populate.

**Required Sections**:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [x] New feature
- [ ] Breaking change

## Related Work Items
- Fixes #123
- Related to #456

## Changes Made
- Added JWT authentication
- Updated user service
- Added auth middleware

## Testing Performed
- [x] Unit tests added
- [x] Integration tests added
- [x] Manual testing performed

## Checklist
- [x] Code follows style guidelines
- [x] Self-reviewed code
- [x] Documentation updated
- [x] Tests pass locally
```

## PR Review Process

### 1. Automated Checks

Azure Pipeline runs automatically:
- ✅ Build succeeds
- ✅ Tests pass
- ✅ Linting passes
- ✅ Type checking passes

### 2. Code Review

Assigned reviewers will:
- Review code quality
- Check test coverage
- Verify documentation
- Test functionality

### 3. Address Feedback

```bash
# Make changes based on feedback
git add .
git commit -m "fix: Address PR feedback"
git push origin feature/add-user-authentication
```

### 4. Approval

- Requires at least 1 approval
- All comments resolved
- All checks passing

### 5. Merge

Maintainer will merge using **Squash merge**:
- Combines all commits into one
- Clean commit history
- Preserves PR reference

## PR Size Guidelines

### Small PR (< 200 lines)
✅ **Recommended**: Fast review, easy to understand

**Example**:
- Single bug fix
- Small feature
- Documentation update

### Medium PR (200-500 lines)
⚠️ **Acceptable**: May take longer to review

**Example**:
- Medium feature
- Refactoring
- Multiple related changes

### Large PR (> 500 lines)
❌ **Discouraged**: Hard to review, high risk

**Solution**: Split into smaller PRs

## What Makes a Good PR?

### ✅ Good PR

```markdown
## Description
Add JWT authentication to API endpoints

## Changes
- Created AuthService for token generation/validation
- Added auth middleware to protect routes
- Updated Swagger docs with auth examples
- Added 15 unit tests for auth logic

## Testing
- All tests passing (95% coverage)
- Manually tested login flow
- Tested with Postman collection

## Screenshots
[Login flow diagram]
```

### ❌ Bad PR

```markdown
## Description
Updates

## Changes
- Fixed stuff
- Updated things

(No tests, no documentation, 1000+ lines)
```

## Common Issues

### Issue: CI Fails

**Solution**:
```bash
# Run checks locally
npm run lint
npm run typecheck
npm run test
```

### Issue: Merge Conflicts

**Solution**:
```bash
git fetch origin
git rebase origin/main
# Resolve conflicts
git add .
git rebase --continue
git push --force origin feature/your-branch
```

### Issue: Reviewers Request Changes

**Solution**:
1. Make requested changes
2. Commit and push
3. Reply to comments
4. Re-request review

## PR Etiquette

### For Authors

- Keep PRs small and focused
- Respond to feedback promptly
- Be open to suggestions
- Thank reviewers for their time

### For Reviewers

- Be respectful and constructive
- Explain reasoning for changes
- Approve quickly if code is good
- Don't be overly pedantic

## Related Documentation

- [Code Standards](code-standards.md)
- [Testing Guidelines](testing-guidelines.md)
- [PR Template](../../.azuredevops/pull_request_template.md)
