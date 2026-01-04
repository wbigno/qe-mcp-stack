# Unit Test Generator - STDIO MCP

**Type:** STDIO MCP (On-Demand Process)  
**Location:** `mcps/unit-test-generator/`  
**Technology:** Node.js + Anthropic Claude API  
**Communication:** JSON via stdin/stdout  
**Status:** ✅ Production Ready

---

## Overview

The **Unit Test Generator** is a STDIO MCP that uses AI (Anthropic Claude) to generate comprehensive xUnit unit tests for .NET C# classes and methods. It creates production-ready test code following best practices with proper Arrange-Act-Assert patterns, mocking, and comprehensive coverage.

### Purpose

- ✅ Generate xUnit unit tests for C# classes
- ✅ Create test fixtures with proper setup/teardown
- ✅ Generate mock objects using Moq
- ✅ Follow Arrange-Act-Assert (AAA) pattern
- ✅ Include positive, negative, and edge case tests
- ✅ Proper test naming conventions
- ✅ Complete, runnable test files

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
curl -X POST http://localhost:3000/api/tests/generate-unit-tests \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "className": "UserService",
    "methodName": "GetUserById"
  }'
```

### Direct Testing (Development)

```bash
cd mcps/unit-test-generator

# Install dependencies
npm install

# Test with sample input
cat sample-input.json | node index.js

# Run test suite
npm test
```

---

## Input Schema

```typescript
{
  data: {
    app: string;                      // Required: App name from apps.json
    className: string;                // Required: Class to test
    methodName?: string;              // Optional: Specific method (default: all)
    sourceCode?: string;              // Optional: C# source code (or loaded from file)
    includeNegativeTests?: boolean;   // Default: true
    includeMocks?: boolean;           // Default: true
  }
}
```

---

## Output Schema

```typescript
{
  success: boolean;
  result: {
    tests: Array<{
      testName: string;               // e.g., "GetUserById_ValidId_ReturnsUser"
      testCode: string;               // Complete xUnit test method
      description: string;            // What the test validates
      category: "positive" | "negative" | "edge-case";
      dependencies: string[];         // Required mocks/dependencies
      assertions: string[];           // Assertions used
    }>;
    mocks: Array<{
      interfaceName: string;          // e.g., "IUserRepository"
      mockCode: string;               // Mock setup code
      purpose: string;                // Why this mock is needed
    }>;
    testFixture: {
      className: string;              // e.g., "UserServiceTests"
      namespaces: string[];           // Using statements
      setupCode: string;              // Constructor or setup method
    };
    completeTestFile: string;         // Full .cs file ready to use
    statistics: {
      totalTests: number;
      byCategory: {
        positive: number;
        negative: number;
        edgeCase: number;
      };
      assertions: {
        total: number;
        unique: number;
        types: string[];
      };
      dependencies: {
        total: number;
        list: string[];
      };
      mocks: {
        total: number;
        interfaces: string[];
      };
    };
    metadata: {
      app: string;
      className: string;
      methodName: string;
      generatedAt: string;
      version: string;
      includeNegativeTests: boolean;
      includeMocks: boolean;
    };
  }
}
```

---

## Example Output

```json
{
  "success": true,
  "result": {
    "tests": [
      {
        "testName": "GetUserById_ValidId_ReturnsUser",
        "testCode": "[Fact]\npublic void GetUserById_ValidId_ReturnsUser()\n{\n    // Arrange\n    var userId = 1;\n    var expectedUser = new User { Id = 1, Name = \"John Doe\" };\n    var mockRepository = new Mock<IUserRepository>();\n    mockRepository.Setup(r => r.GetById(userId)).Returns(expectedUser);\n    var mockEmailService = new Mock<IEmailService>();\n    var service = new UserService(mockRepository.Object, mockEmailService.Object);\n\n    // Act\n    var result = service.GetUserById(userId);\n\n    // Assert\n    Assert.NotNull(result);\n    Assert.Equal(expectedUser.Id, result.Id);\n    Assert.Equal(expectedUser.Name, result.Name);\n    mockRepository.Verify(r => r.GetById(userId), Times.Once);\n}",
        "description": "Verifies that GetUserById returns the correct user when given a valid user ID",
        "category": "positive",
        "dependencies": ["IUserRepository", "IEmailService"],
        "assertions": ["Assert.NotNull", "Assert.Equal", "mockRepository.Verify"]
      },
      {
        "testName": "GetUserById_InvalidId_ThrowsArgumentException",
        "testCode": "[Fact]\npublic void GetUserById_InvalidId_ThrowsArgumentException()\n{\n    // Arrange\n    var invalidUserId = -1;\n    var mockRepository = new Mock<IUserRepository>();\n    var mockEmailService = new Mock<IEmailService>();\n    var service = new UserService(mockRepository.Object, mockEmailService.Object);\n\n    // Act & Assert\n    var exception = Assert.Throws<ArgumentException>(() => service.GetUserById(invalidUserId));\n    Assert.Contains(\"must be positive\", exception.Message);\n}",
        "description": "Verifies that GetUserById throws ArgumentException when user ID is negative or zero",
        "category": "negative",
        "dependencies": ["IUserRepository", "IEmailService"],
        "assertions": ["Assert.Throws", "Assert.Contains"]
      }
    ],
    "mocks": [
      {
        "interfaceName": "IUserRepository",
        "mockCode": "private Mock<IUserRepository> CreateUserRepositoryMock()\n{\n    var mock = new Mock<IUserRepository>();\n    return mock;\n}",
        "purpose": "Mock user repository for database operations"
      },
      {
        "interfaceName": "IEmailService",
        "mockCode": "private Mock<IEmailService> CreateEmailServiceMock()\n{\n    var mock = new Mock<IEmailService>();\n    return mock;\n}",
        "purpose": "Mock email service for sending notifications"
      }
    ],
    "testFixture": {
      "className": "UserServiceTests",
      "namespaces": [
        "using Xunit;",
        "using Moq;",
        "using System;",
        "using System.Threading.Tasks;"
      ],
      "setupCode": ""
    },
    "completeTestFile": "// Full C# test file content here...",
    "statistics": {
      "totalTests": 6,
      "byCategory": {
        "positive": 2,
        "negative": 3,
        "edgeCase": 1
      },
      "assertions": {
        "total": 15,
        "unique": 6,
        "types": ["Assert.NotNull", "Assert.Equal", "Assert.Throws", "Assert.Contains", "Assert.True", "mockRepository.Verify"]
      },
      "dependencies": {
        "total": 2,
        "list": ["IUserRepository", "IEmailService"]
      },
      "mocks": {
        "total": 2,
        "interfaces": ["IUserRepository", "IEmailService"]
      }
    }
  }
}
```

---

## Generated Test Structure

### Test File Template

```csharp
// Generated Unit Tests
// Generated by QE MCP Stack - Unit Test Generator

using Xunit;
using Moq;
using System;

namespace UnitTests
{
    public class UserServiceTests
    {
        // Mock Setup Methods
        
        private Mock<IUserRepository> CreateUserRepositoryMock()
        {
            var mock = new Mock<IUserRepository>();
            return mock;
        }

        // Test Methods

        /// <summary>
        /// Verifies that GetUserById returns user when valid ID provided
        /// </summary>
        [Fact]
        public void GetUserById_ValidId_ReturnsUser()
        {
            // Arrange
            var userId = 1;
            var expectedUser = new User { Id = 1, Name = "John Doe" };
            var mockRepository = new Mock<IUserRepository>();
            mockRepository.Setup(r => r.GetById(userId)).Returns(expectedUser);
            var service = new UserService(mockRepository.Object);

            // Act
            var result = service.GetUserById(userId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(expectedUser.Id, result.Id);
            mockRepository.Verify(r => r.GetById(userId), Times.Once);
        }
    }
}
```

---

## Test Naming Convention

Generated tests follow the pattern: **`MethodName_Scenario_ExpectedBehavior`**

**Examples:**
- `GetUserById_ValidId_ReturnsUser`
- `GetUserById_InvalidId_ThrowsArgumentException`
- `GetUserById_UserNotFound_ThrowsUserNotFoundException`
- `CreateUser_NullUser_ThrowsArgumentNullException`
- `CreateUser_EmptyEmail_ThrowsArgumentException`

---

## Test Categories

### Positive Tests
- Happy path scenarios
- Valid inputs
- Expected successful operations
- **Example:** `GetUserById_ValidId_ReturnsUser`

### Negative Tests
- Invalid inputs
- Null arguments
- Business rule violations
- Expected exceptions
- **Example:** `GetUserById_InvalidId_ThrowsArgumentException`

### Edge Cases
- Boundary values
- Empty strings/collections
- Special characters
- Concurrent operations
- **Example:** `GetUserById_MaxInt_HandlesCorrectly`

---

## Mocking with Moq

Generated tests use Moq for mocking dependencies:

```csharp
// Setup mock
var mockRepository = new Mock<IUserRepository>();
mockRepository.Setup(r => r.GetById(1))
    .Returns(new User { Id = 1, Name = "John" });

// Use mock
var service = new UserService(mockRepository.Object);
var result = service.GetUserById(1);

// Verify mock was called
mockRepository.Verify(r => r.GetById(1), Times.Once);
```

---

## Arrange-Act-Assert Pattern

All generated tests follow the AAA pattern:

```csharp
[Fact]
public void MethodName_Scenario_ExpectedResult()
{
    // Arrange
    // Set up test data
    // Create mocks
    // Initialize SUT (System Under Test)
    
    // Act
    // Call the method being tested
    
    // Assert
    // Verify the result
    // Verify mock interactions
}
```

---

## Environment Requirements

### Required Environment Variables

```bash
# .env file (root directory)
ANTHROPIC_API_KEY=sk-ant-...     # Required: Anthropic API key
CLAUDE_MODEL=claude-sonnet-4-20250514  # Optional: Model to use
NODE_ENV=production              # Optional: Environment
```

---

## Source Code Loading

The generator can work in two modes:

### Mode 1: Provide Source Code (Recommended)
```json
{
  "data": {
    "app": "App1",
    "className": "UserService",
    "sourceCode": "public class UserService { ... }"
  }
}
```

### Mode 2: Auto-Load from File System
```json
{
  "data": {
    "app": "App1",
    "className": "UserService"
  }
}
```

The generator will search in:
- `/mnt/apps/{app}/Services/{className}.cs`
- `/mnt/apps/{app}/Controllers/{className}.cs`
- `/mnt/apps/{app}/Models/{className}.cs`
- `/mnt/apps/{app}/{className}.cs`

---

## Testing

### Run Test Suite

```bash
cd mcps/unit-test-generator
npm test
```

### Manual Testing

```bash
cat > test-input.json << EOF
{
  "data": {
    "app": "App1",
    "className": "UserService",
    "sourceCode": "public class UserService { public User GetById(int id) { return new User(); } }",
    "includeNegativeTests": true,
    "includeMocks": true
  }
}
EOF

cat test-input.json | node index.js
```

---

## Error Handling

### Common Errors

**Missing API Key:**
```json
{
  "success": false,
  "error": "Claude API error: Missing API key"
}
```

**Missing Class Name:**
```json
{
  "success": false,
  "error": "className must be a string"
}
```

**Source File Not Found:**
```json
{
  "success": false,
  "error": "Could not find source file for UserService. Please provide sourceCode in the input."
}
```

---

## Integration with Orchestrator

The orchestrator calls this MCP to generate unit tests as part of the test automation workflow:

**Workflow:**
1. Code is written
2. **unit-test-generator** creates tests
3. Tests are added to test project
4. CI/CD runs tests

---

## Performance

- **Typical Generation Time:** 5-10 seconds
- **API Tokens Used:** ~2,000-3,000 tokens per class
- **Memory Usage:** ~50-100 MB per process
- **Tests Generated:** 4-8 per method

---

## Best Practices

1. **Provide complete source code** - More context = better tests
2. **Include all dependencies** - Better mock generation
3. **Review generated tests** - AI suggestions may need tweaking
4. **Run generated tests** - Ensure they compile and pass
5. **Customize as needed** - Generated tests are starting points

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ xUnit test generation
- ✅ Moq mock support
- ✅ Arrange-Act-Assert pattern
- ✅ Complete test files

---

**Need help?** Check the test suite in `tests/test.js` for examples.
