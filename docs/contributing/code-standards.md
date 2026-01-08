# Code Standards

## Overview

This document outlines coding standards for the QE MCP Stack monorepo.

## TypeScript/JavaScript

### Style Guide

Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) with TypeScript extensions.

### Naming Conventions

```typescript
// Classes: PascalCase
class UserService {}

// Interfaces: PascalCase with 'I' prefix (optional)
interface IUser {} or interface User {}

// Functions/Methods: camelCase
function fetchUserData() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// Private properties: underscore prefix
private _internalState: string;

// Boolean variables: is/has/should prefix
const isLoading = true;
const hasPermission = false;
```

### File Naming

```
src/
├── controllers/
│   └── user-controller.ts      # kebab-case for files
├── services/
│   └── payment-service.ts
├── models/
│   └── user.model.ts           # suffix for type
└── utils/
    └── string-utils.ts
```

### Imports

Order imports:

```typescript
// 1. External libraries
import { Router } from 'express';
import axios from 'axios';

// 2. Internal packages
import { logger } from '@qe-mcp-stack/shared';
import { BaseMCP } from '@qe-mcp-stack/mcp-sdk';

// 3. Relative imports
import { UserService } from './services/user-service';
import { User } from './models/user';
```

### Type Definitions

```typescript
// Use interfaces for objects
interface User {
  id: number;
  name: string;
  email: string;
}

// Use types for unions, tuples
type Status = 'active' | 'inactive' | 'pending';
type Coordinates = [number, number];

// Always type function parameters and returns
function fetchUser(id: number): Promise<User> {
  // implementation
}
```

### Error Handling

```typescript
// Use try-catch for async operations
async function fetchData(): Promise<Data> {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch data', { error });
    throw new AppError('Data fetch failed', 500);
  }
}

// Custom error classes
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Async/Await

```typescript
// Use async/await over promises
// Good
async function loadUser() {
  const user = await userService.find(id);
  return user;
}

// Avoid
function loadUser() {
  return userService.find(id).then(user => user);
}
```

## Code Organization

### Service Layer Pattern

```typescript
// controllers/user-controller.ts
export class UserController {
  constructor(private userService: UserService) {}
  
  async getUser(req: Request, res: Response) {
    try {
      const user = await this.userService.findById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

// services/user-service.ts
export class UserService {
  async findById(id: number): Promise<User> {
    // business logic
  }
}
```

### Dependency Injection

```typescript
// index.ts
const userService = new UserService(userRepository);
const userController = new UserController(userService);
```

## Testing

### Test File Location

```
src/
├── services/
│   ├── user-service.ts
│   └── user-service.spec.ts     # Co-located with source
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('UserService', () => {
  let userService: UserService;
  
  beforeEach(() => {
    userService = new UserService();
  });
  
  describe('findById', () => {
    it('should return user when ID exists', async () => {
      const user = await userService.findById(1);
      expect(user).toBeDefined();
      expect(user.id).toBe(1);
    });
    
    it('should throw error when ID does not exist', async () => {
      await expect(userService.findById(999)).rejects.toThrow();
    });
  });
});
```

## Documentation

### JSDoc Comments

```typescript
/**
 * Fetches user by ID from the database
 * @param id - The user ID to fetch
 * @returns Promise resolving to User object
 * @throws {AppError} When user is not found
 * @example
 * const user = await userService.findById(123);
 */
async findById(id: number): Promise<User> {
  // implementation
}
```

### Inline Comments

```typescript
// Comment above line explaining why
const maxRetries = 3; // Not what (obvious from code)

// Good: Explains why
// Retry 3 times due to API rate limiting
const maxRetries = 3;

// Bad: States the obvious
// Set max retries to 3
const maxRetries = 3;
```

## Git Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process, tooling

### Examples

```
feat(azure-devops): Add work item filtering by tag

Implement query parameter to filter work items by tags.
Supports multiple tags with OR logic.

Closes #123

---

fix(risk-analyzer): Correct AI prompt for edge cases

The previous prompt didn't handle null values correctly.
Updated to provide default values.

---

docs(readme): Update installation instructions

Added Docker prerequisites and troubleshooting section.
```

## Code Review Guidelines

### Reviewer Checklist

- [ ] Code follows style guide
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No secrets or credentials in code
- [ ] Error handling is appropriate
- [ ] Performance considerations addressed
- [ ] Breaking changes are documented

### Pull Request Size

- **Small**: < 200 lines (ideal)
- **Medium**: 200-500 lines
- **Large**: > 500 lines (split if possible)

## Tools

### Linting

```bash
npm run lint        # Check all files
npm run lint:fix    # Auto-fix issues
```

### Formatting

```bash
npm run format       # Format all files
npm run format:check # Check formatting
```

### Type Checking

```bash
npm run typecheck   # Check TypeScript types
```

## Related Documentation

- [PR Guidelines](pr-guidelines.md)
- [Testing Guidelines](testing-guidelines.md)
- [Contributing Guide](../../README.md#contributing)
